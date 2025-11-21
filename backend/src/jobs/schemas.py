from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class RecentJobResponse(BaseModel):
    """Schema for recent job response"""
    job_id: str
    filename: str
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True  # For SQLAlchemy ORM compatibility
