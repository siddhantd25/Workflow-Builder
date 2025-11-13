from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import routes_documents, routes_workflows, routes_chat, routes_health

from app.api.routes_knowledgebase import router as kb_router

app = FastAPI(title="AI Workflow Builder API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routes_health.router, prefix="/health", tags=["Health"])
app.include_router(routes_documents.router, prefix="/documents", tags=["Documents"])
app.include_router(routes_workflows.router, prefix="/workflows", tags=["Workflows"])
app.include_router(routes_chat.router, prefix="/chat", tags=["Chat"])
app.include_router(kb_router, prefix="/knowledgebase", tags=["KnowledgeBase"])
