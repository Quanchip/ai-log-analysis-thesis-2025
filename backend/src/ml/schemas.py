"""
Pydantic schemas for ML API requests and responses.
These define what data looks like in API calls.
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class AnalysisResultBase(BaseModel):
    """Basic statistics about analysis."""
    total_logs: int = Field(..., description="Total number of log entries")
    anomaly_count: int = Field(..., description="Number of anomalies detected")
    normal_count: int = Field(..., description="Number of normal logs")
    anomaly_percentage: float = Field(..., description="Percentage of anomalies")

class AnalysisResultResponse(AnalysisResultBase):
    """What the API returns when you query an analysis result."""
    id: int
    log_file_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class AnomalyDetail(BaseModel):
    """Details about a specific anomalous log entry."""
    index: int = Field(..., description="Row number in CSV (0-indexed)")
    log_entry: dict = Field(..., description="The actual log data")