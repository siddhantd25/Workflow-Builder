import uuid
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import Column, String, JSON
from app.db.session import Base

class Workflow(Base):
    __tablename__ = "workflows"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    graph_json = Column(JSON, nullable=False)
