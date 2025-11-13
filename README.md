# 🚀 AI Workflow Builder

A Drag-and-Drop Visual Workflow Engine with LLMs, PDF Knowledge Bases, and Real-Time Chat Execution

## 📌 Overview

AI Workflow Builder is a full-stack application that lets you visually design, configure, and execute AI workflows using a node-based interface (similar to Langflow, Flowise, or n8n).

You can drag and connect different nodes like:

**🟦 User Query Node**

**🟪 Knowledge Base Node (PDF Upload + ChromaDB Vector Search)**

**🟩 LLM Engine Node (Gemini/OpenAI-style LLM calls)**

**🟨 Output Node (final formatted response)**

Workflows are stored in PostgreSQL and can be executed using a built-in chat interface.

## ✨ Key Features
#### 🧩 Drag & Drop Node Editor
- Create workflows visually using ReactFlow
- Live configuration panel for each node
- Supports save, rename, duplicate, delete, and context menu actions

#### 📚 Knowledge Base Node with PDF Support
- Upload multiple PDFs
- Auto extract text using PyMuPDF
- Auto-generate embeddings using Gemini text-embedding-004
- Stored in ChromaDB
- Shared state: uploads sync between node view and config panel

#### 🤖 LLM Engine Integration
- Uses Google Gemini API
- Custom prompts, temperature control, model selection

#### 💬 Chat Interface
- Run any workflow
- Query processed using the node pipeline
- Retrieved context from ChromaDB
- Final output shown in chat modal

#### 💾 Workflow Storage (PostgreSQL + SQLAlchemy)
- Create workflow
- List workflows
- Load workflow
- Delete workflow
- Delete all workflows

#### 🗑 Data Reset
- Reset all Knowledge Base data (ChromaDB + uploaded files)

## 🚀 Getting Started
Below are the complete setup instructions.

### ⚙️ Backend Setup (FastAPI + PostgreSQL + ChromaDB)
#### 1️⃣ Navigate to backend folder
```
cd backend
```

#### 2️⃣ Create virtual environment
```
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
```

#### 3️⃣ Install dependencies
```
pip install -r requirements.txt
```

#### 4️⃣ Create .env file in backend
```
backend/.env
```

```
DATABASE_URL=postgresql+psycopg2://postgres:password@localhost:5432/workflow
GEMINI_API_KEY=your_gemini_key_here
```
**Replace DB credentials accordingly**

#### 5️⃣ Apply Alembic migrations
```
alembic upgrade head
```

#### 6️⃣ Start the backend server
```
uvicorn app.main:app --reload
```

**Backend runs at:**
[http://localhost:8000](http://localhost:8000)


### ⚙️ Frontend Setup (React + Vite)
#### 1️⃣ Navigate to frontend folder
```
cd frontend
```

#### 2️⃣ Install dependencies
```
npm install
```

#### 3️⃣ Create .env file inside frontend
```
VITE_API_BASE=http://localhost:8000
```

#### 4️⃣ Start Frontend Server
```
npm run dev
```

**frontend runs at:**
[http://localhost:5173](http://localhost:5173)

### Important Development Notes
#### 🔄 Reset Entire Knowledge Base
**Clears**
- ChromaDB database
- Uploaded PDF files
- Reinitializes directories

**Endpoint**
```
DELETE /knowledgebase/reset-all/
```

### 📚 API Summary
#### Workflows
```
POST   /workflows/
GET    /workflows/
GET    /workflows/{id}
DELETE /workflows/{id}
DELETE /workflows/
```

#### Knowledge Base
```
POST   /knowledgebase/upload-pdf/
GET    /knowledgebase/collections/{collection}/files
GET    /knowledgebase/collections/{collection}/files/{file}/download
DELETE /knowledgebase/collections/{collection}/files/{file}
DELETE /knowledgebase/collections/{collection}
DELETE /knowledgebase/reset-all/
```

## 🌐 Technologies Used
### Frontend
- React + Vite
- ReactFlow (Node Editor)
- TailwindCSS
- Fetch API

### Backend
- FastAPI
- SQLAlchemy
- Alembic
- ChromaDB
- PyMuPDF (PDF reading)
- Google Gemini (LLM + embeddings)

### Database
- PostgreSQL

#### 🧹 Cleaning Up Local Data
**To remove all vector data and uploaded files:**
```
curl -X DELETE http://localhost:8000/knowledgebase/reset-all/
```

**To wipe all workflows**
```
curl -X DELETE http://localhost:8000/workflows/
```
