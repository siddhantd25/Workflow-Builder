# backend/app/api/routes_workflows.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List
from uuid import UUID
from sqlalchemy.orm import Session
from app.db import models
from app.db.session import get_db

router = APIRouter()

class WorkflowCreate(BaseModel):
    name: str
    graph_json: Dict[str, Any]

class WorkflowResponse(WorkflowCreate):
    id: UUID  

@router.post("/", response_model=WorkflowResponse)
def create_workflow(payload: WorkflowCreate, db: Session = Depends(get_db)):
    workflow = models.Workflow(name=payload.name, graph_json=payload.graph_json)
    db.add(workflow)
    db.commit()
    db.refresh(workflow)
    return workflow

@router.get("/", response_model=List[WorkflowResponse])
def list_workflows(db: Session = Depends(get_db)):
    return db.query(models.Workflow).all()

@router.get("/{workflow_id}", response_model=WorkflowResponse)
def get_workflow(workflow_id: str, db: Session = Depends(get_db)):
    workflow = db.query(models.Workflow).filter(models.Workflow.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return workflow

@router.delete("/{workflow_id}")
def delete_workflow(workflow_id: str, db: Session = Depends(get_db)):
    workflow = db.query(models.Workflow).filter(models.Workflow.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    db.delete(workflow)
    db.commit()  

    return {"message": f"Workflow {workflow_id} deleted"}

@router.delete("/")
def delete_all_workflows(db: Session = Depends(get_db)):
    deleted = db.query(models.Workflow).delete()
    db.commit()  

    return {"message": f"Deleted {deleted} workflows"}


