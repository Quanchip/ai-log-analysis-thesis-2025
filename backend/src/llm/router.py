from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Dict, Optional

from ..auth.dependencies import CurrentUser
from ..database import get_db
from .service import get_llm_service


router = APIRouter(prefix="/api/llm", tags=["LLM Analysis"])

class AnalyzeAnomalyRequest(BaseModel):
    """Request to analyze an anomaly with context."""
    log_entry: Dict
    block_id: Optional[str] = None
    event_id: Optional[str] = None
    job_id: Optional[str] = None  # For fetching session context


class AnalysisResponse(BaseModel):
    """Enhanced response with session info."""
    explanation: str
    root_causes: List[str]
    severity: str
    recommended_actions: List[str]
    session_size: int = 0  # Number of logs in session

@router.post("/analyze-anomaly", response_model=AnalysisResponse)
async def analyze_anomaly(
    request: AnalyzeAnomalyRequest,
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    """
    Analyze anomaly log with full session context.

    Now includes:
    - The target anomaly log
    - All other logs in the same session (same BlockId)
    - Enhanced context for better LLM analysis

    Example request:
    {
      "log_entry": {...},
      "block_id": "blk_-1608999687919862906",
      "event_id": "09a53393",
      "job_id": "2f9317a8-269e-4d1f-9686-0ddf443dbdc0"
    }
    """
    try:
        llm_service = get_llm_service(db)

        analysis = await llm_service.analyze_anomaly_with_context(
            log_entry=request.log_entry,
            block_id=request.block_id,
            event_id=request.event_id,
            job_id=request.job_id
        )

        return analysis

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"LLM analysis failed: {str(e)}"
        )