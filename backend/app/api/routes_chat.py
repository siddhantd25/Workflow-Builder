from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db import models
import google.generativeai as genai
import chromadb
from chromadb.utils import embedding_functions
import os
import traceback

router = APIRouter()

# ✅ Load Gemini API key
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("❌ GEMINI_API_KEY not found. Please check your .env file.")

genai.configure(api_key=GEMINI_API_KEY)

# ✅ Initialize ChromaDB client
CHROMA_DIR = "chroma_data"
os.makedirs(CHROMA_DIR, exist_ok=True)
chroma_client = chromadb.PersistentClient(path=CHROMA_DIR)

# ✅ Use Gemini embedding function
gemini_ef = embedding_functions.GoogleGenerativeAiEmbeddingFunction(
    api_key=GEMINI_API_KEY,
    model_name="models/text-embedding-004"
)

DEFAULT_MODEL = "models/gemini-2.0-flash"


@router.post("/")
async def run_pipeline_chat(request: Request, db: Session = Depends(get_db)):
    """
    Executes a visual workflow pipeline:
    🟦 userQuery → (optional) 🟪 knowledgeBase → 🟩 llmEngine → 🟨 output
    """
    data = await request.json()
    workflow_id = data.get("workflow_id")
    query = data.get("query")
    pipeline = data.get("pipeline", [])

    if not workflow_id or not query or not pipeline:
        raise HTTPException(status_code=400, detail="Missing workflow_id, query, or pipeline in request.")

    workflow = db.query(models.Workflow).filter(models.Workflow.id == str(workflow_id)).first()
    workflow_name = workflow.name if workflow else "Unnamed Workflow"

    print(f"\n🚀 Executing workflow: {workflow_name}")
    print(f"📨 Incoming query: {query}")

    context = ""
    intermediate_text = query.strip()
    final_output = None

    try:
        for step in pipeline:
            node_type = step.get("type")
            config = step.get("config", {})

            print(f"\n🔹 Running node: {node_type}")
            print(f"   Config: {config}")

            # 🟦 USER QUERY NODE
            if node_type == "userQuery":
                desc = config.get("description", "")
                intermediate_text = f"{desc}\n\n{intermediate_text}".strip()

           # 🟪 KNOWLEDGE BASE NODE
            elif node_type == "knowledgeBase":
                source_name = config.get("sourceName", "default_kb")
                top_k = int(config.get("topK", 3))

                # ✅ Safe get/rebuild for KB collection
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

                collection = get_or_rebuild_collection(source_name)

                try:
                    results = collection.query(query_texts=[intermediate_text], n_results=top_k)
                    retrieved_docs = [doc for sublist in results["documents"] for doc in sublist]
                    context = "\n".join(retrieved_docs)
                    print(f"📚 Retrieved {len(retrieved_docs)} context chunks from '{source_name}'")
                except Exception as e:
                    print(f"⚠️ KnowledgeBase query error: {e}")
                    context = ""

            # 🟩 LLM ENGINE NODE
            elif node_type == "llmEngine":
                model_name = config.get("model", DEFAULT_MODEL)
                custom_prompt = config.get("customPrompt", "Answer the question clearly and concisely.")
                temperature = float(config.get("temperature", 0.7))

                prompt = f"{custom_prompt}\n\nContext:\n{context}\n\nUser Query:\n{intermediate_text}"
                print(f"🤖 Sending prompt to {model_name} (temp={temperature}):")
                print(prompt[:400] + "..." if len(prompt) > 400 else prompt)

                try:
                    model = genai.GenerativeModel(model_name)
                    response = model.generate_content(prompt)
                    intermediate_text = response.text or "(No output returned by model.)"
                    print("✅ Model response received.")
                except Exception as e:
                    traceback.print_exc()
                    raise HTTPException(status_code=500, detail=f"Gemini Error: {str(e)}")

            # 🟨 OUTPUT NODE
            elif node_type == "output":
                display_name = config.get("displayName", "Output")
                response_format = config.get("responseFormat", "text")
                final_output = f"{display_name}:\n{intermediate_text}"

        return {
            "workflow": workflow_name,
            "steps_executed": [s.get("type") for s in pipeline],
            "response": final_output or intermediate_text,
            "context_used": bool(context),
            "context_length": len(context),
        }

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error executing workflow: {str(e)}")
