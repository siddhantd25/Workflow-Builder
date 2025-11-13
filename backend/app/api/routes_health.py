# backend/app/api/routes_health.py
from fastapi import APIRouter

router = APIRouter()

@router.get("/ping")
async def ping():
    return {"status": "ok", "message": "pong"}
