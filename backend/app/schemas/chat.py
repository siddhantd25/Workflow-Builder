from pydantic import BaseModel
from uuid import UUID

class ChatQuery(BaseModel):
    workflow_id: UUID
    query: str
