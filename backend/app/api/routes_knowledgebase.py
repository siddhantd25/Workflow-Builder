import os
import shutil
from datetime import datetime
from fastapi import APIRouter, UploadFile, Form, HTTPException
from fastapi.responses import FileResponse
import chromadb
from chromadb.utils import embedding_functions
import fitz  # PyMuPDF

router = APIRouter(tags=["KnowledgeBase"])

# ---- Setup ----
UPLOAD_DIR = "uploaded_files"
CHROMA_DIR = "chroma_data"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(CHROMA_DIR, exist_ok=True)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("❌ GEMINI_API_KEY not found in .env")

chroma_client = chromadb.PersistentClient(path=CHROMA_DIR)

gemini_ef = embedding_functions.GoogleGenerativeAiEmbeddingFunction(
    api_key=GEMINI_API_KEY,
    model_name="models/text-embedding-004"
)

# ---- Utility ----
def extract_text_from_pdf(pdf_path):
    """Extracts text from PDF using PyMuPDF"""
    text = ""
    with fitz.open(pdf_path) as doc:
        for page in doc:
            text += page.get_text()
    return text.strip()

# ---- Upload PDF ----
@router.post("/upload-pdf/")
async def upload_pdf(collection_name: str = Form(...), files: list[UploadFile] = None):
    """Upload one or more PDFs, extract text, and index into ChromaDB (auto-rebuild if dimension mismatch)."""
    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="No files provided")

    # Helper for safe collection get/rebuild
    def get_or_rebuild_collection(name: str):
        try:
            return chroma_client.get_or_create_collection(name=name, embedding_function=gemini_ef)
        except Exception as e:
            if "dimension" in str(e).lower():
                print(f"⚠️ Rebuilding Chroma collection '{name}' due to dimension mismatch...")
                chroma_client.delete_collection(name)
                return chroma_client.get_or_create_collection(name=name, embedding_function=gemini_ef)
            else:
                raise e

    kb_collection = get_or_rebuild_collection(collection_name)
    file_collection = get_or_rebuild_collection(f"{collection_name}__files")

    uploaded_files_info = []

    for file in files:
        collection_dir = os.path.join(UPLOAD_DIR, collection_name)
        os.makedirs(collection_dir, exist_ok=True)

        # Save uploaded file
        file_path = os.path.join(collection_dir, file.filename)
        with open(file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)

        # Extract text
        text_content = extract_text_from_pdf(file_path)
        if not text_content.strip():
            print(f"⚠️ Skipping {file.filename}: no readable text.")
            continue

        # Chunk and embed
        chunk_size = 1000
        chunks = [text_content[i:i + chunk_size] for i in range(0, len(text_content), chunk_size)]
        file_prefix = f"{file.filename}_{datetime.now().strftime('%Y%m%d%H%M%S')}"

        # Add to knowledge base collection
        kb_collection.add(
            ids=[f"{file_prefix}_chunk{i}" for i in range(len(chunks))],
            documents=chunks,
            metadatas=[{"source": file.filename, "chunk": i} for i in range(len(chunks))],
        )

        # Add metadata to file tracker
        file_collection.add(
            ids=[file.filename],
            documents=[file.filename],
            metadatas=[{
                "filename": file.filename,
                "path": file_path,
                "size_bytes": os.path.getsize(file_path),
                "uploaded_at": datetime.now().isoformat(),
            }],
        )

        uploaded_files_info.append({
            "filename": file.filename,
            "chunks": len(chunks),
            "status": "indexed"
        })

    return {
        "message": f"✅ Uploaded and indexed {len(uploaded_files_info)} file(s)",
        "collection_name": collection_name,
        "files": uploaded_files_info,
    }


# ---- List Files ----
@router.get("/collections/{collection_name}/files")
def list_files(collection_name: str):
    """List indexed files for a collection."""
    try:
        files_collection = chroma_client.get_collection(name=f"{collection_name}__files")
    except Exception:
        return {"files": []}

    res = files_collection.get(include=["metadatas", "documents"])
    files = []
    for i, fid in enumerate(res["ids"]):
        md = res["metadatas"][i] or {}
        files.append({
            "id": fid,
            "filename": md.get("filename"),
            "size": md.get("size_bytes"),
            "uploaded_at": md.get("uploaded_at"),
        })
    return {"files": files}

# ---- Download File ----
@router.get("/collections/{collection_name}/files/{file_id}/download")
def download_file(collection_name: str, file_id: str):
    """Download a specific uploaded file by filename."""
    collection_dir = os.path.join(UPLOAD_DIR, collection_name)
    file_path = os.path.join(collection_dir, file_id)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(
        file_path,
        filename=file_id,
        media_type="application/pdf"
    )

# ---- Delete File ----
@router.delete("/collections/{collection_name}/files/{file_id}")
def delete_file(collection_name: str, file_id: str):
    """Delete a file from disk and ChromaDB."""
    file_path = os.path.join(UPLOAD_DIR, collection_name, file_id)

    try:
        os.remove(file_path)
    except FileNotFoundError:
        pass

    # Remove from collections
    try:
        chroma_client.get_collection(f"{collection_name}__files").delete(ids=[file_id])
    except Exception:
        pass

    kb_collection = chroma_client.get_or_create_collection(collection_name, embedding_function=gemini_ef)
    ids_to_delete = [i for i in kb_collection.get()["ids"] if i.startswith(file_id)]
    if ids_to_delete:
        kb_collection.delete(ids=ids_to_delete)

    return {"message": f"🗑️ Deleted {file_id} and associated embeddings"}

# ---- Delete Entire Collection ----
@router.delete("/collections/{collection_name}")
def delete_collection(collection_name: str):
    """Completely deletes a ChromaDB collection (and related file collection)."""
    try:
        # Delete ChromaDB collections
        chroma_client.delete_collection(collection_name)
        try:
            chroma_client.delete_collection(f"{collection_name}__files")
        except Exception:
            pass

        # Optionally delete uploaded files from disk
        collection_dir = os.path.join(UPLOAD_DIR, collection_name)
        if os.path.exists(collection_dir):
            shutil.rmtree(collection_dir)

        return {"message": f"✅ Deleted collection '{collection_name}' and its files."}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting collection '{collection_name}': {str(e)}")

@router.delete("/reset-all/")
def reset_all():
    """⚠️ Forcefully clears all ChromaDB collections and uploaded files safely (Windows-compatible)."""
    import shutil
    import time

    try:
        # 1️⃣ Try to close the Chroma client safely
        try:
            print("🧩 Closing active Chroma client...")
            del chroma_client
            time.sleep(1)  # Give OS time to release file handles
        except Exception as e:
            print(f"⚠️ Failed to close client: {e}")

        # 2️⃣ Delete Chroma data directory safely
        CHROMA_DIR = "chroma_data"
        UPLOAD_DIR = "uploaded_files"

        if os.path.exists(CHROMA_DIR):
            for i in range(3):  # retry up to 3 times
                try:
                    shutil.rmtree(CHROMA_DIR)
                    print("📂 Cleared chroma_data directory")
                    break
                except PermissionError:
                    print("⚠️ Waiting for Chroma to release lock...")
                    time.sleep(1)
            else:
                raise Exception("Failed to delete chroma_data after retries")

        # 3️⃣ Delete uploads folder
        if os.path.exists(UPLOAD_DIR):
            shutil.rmtree(UPLOAD_DIR)
            print("🧾 Cleared uploaded_files directory")

        # 4️⃣ Recreate clean directories
        os.makedirs(CHROMA_DIR, exist_ok=True)
        os.makedirs(UPLOAD_DIR, exist_ok=True)

        return {"message": "✅ All knowledge base data cleared successfully (fresh start)"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error resetting: {str(e)}")
