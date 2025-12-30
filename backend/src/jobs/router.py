from multiprocessing.pool import AsyncResult
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List
import asyncio
import json

from ..celery import celery

from ..database import get_db
from ..auth.dependencies import CurrentUser
from ..jobs.models import ProcessingJob, JobStatus
from ..jobs.schemas import RecentJobResponse
from ..jobs.service import get_recent_jobs
from ..logs.models import LogFile
from ..ml.models import AnalysisResult

router = APIRouter(prefix="/api/jobs", tags=["Jobs"])


@router.get("/recent", response_model=List[RecentJobResponse])
async def get_user_recent_jobs(
    current_user: CurrentUser,
    db: Session = Depends(get_db),
    limit: int = 10
):
    """
    Get user's recent processing jobs

    Args:
        limit: Maximum number of jobs to return (default 10, max 50)

    Returns:
        List of recent jobs with filename, status, and timestamps
    """
    # Limit maximum to 50
    limit = min(limit, 50)

    result = get_recent_jobs(
        user_id=current_user["id"],
        limit=limit,
        db=db
    )

    if result["error"]:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result["message"]
        )

    return result["data"]


@router.get("/{job_id}/stream")
async def stream_job_progress(
    job_id: str,
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    """
    Server-Sent Events endpoint for real-time job progress
    Streams progress updates as they happen
    """
    # Verify job belongs to user
    job = db.query(ProcessingJob).filter(
        ProcessingJob.id == job_id,
        ProcessingJob.user_id == current_user["id"]
    ).first()

    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    async def event_generator():
        """Generate SSE events"""
        previous_status = None

        # Keep streaming until job completes or fails
        while True:
            # Refresh job from database
            db.refresh(job)
            current_status = job.status

            # Only send event if status changed
            if current_status != previous_status:
                progress_map = {
                    JobStatus.PENDING: {"progress": 30, "message": "Initializing..."},
                    JobStatus.QUEUED: {"progress": 35, "message": "Waiting in queue..."},
                    JobStatus.PROCESSING: {"progress": 60, "message": "Analyzing log file..."},
                    JobStatus.COMPLETED: {"progress": 100, "message": "Analysis complete!"},
                    JobStatus.FAILED: {"progress": 0, "message": "Processing failed"},
                    JobStatus.RETRYING: {"progress": 40, "message": "Retrying..."}
                }

                event_data = {
                    "job_id": job.id,
                    "status": current_status.value,
                    **progress_map.get(current_status, {"progress": 0, "message": "Unknown"})
                }

                # Send SSE event
                yield f"data: {json.dumps(event_data)}\n\n"

                previous_status = current_status

                # Stop streaming if job completed or failed
                if current_status in [JobStatus.COMPLETED, JobStatus.FAILED]:
                    break

            # Wait 1 second before checking again
            await asyncio.sleep(1)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Disable nginx buffering
        }
    )


@router.get("/{job_id}/status")
async def get_job_status(
    job_id: str,
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    """
    Get current status of a processing job

    Returns:
        {
            "job_id": "uuid",
            "status": "PROCESSING",
            "progress": 50,  # Percentage (0-100)
            "message": "Parsing log file..."
        }
    """

    db.expire_all()

    job = db.query(ProcessingJob).filter(
        ProcessingJob.id == job_id,
        ProcessingJob.user_id == current_user["id"]
    ).first()

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )

    progress_map = {
        JobStatus.PENDING: 30,
        JobStatus.QUEUED: 35,
        JobStatus.PROCESSING: 60,
        JobStatus.COMPLETED: 100,
        JobStatus.FAILED: 0,
        JobStatus.RETRYING: 40
    }

    status_messages = {
        JobStatus.PENDING: "Initializing...",
        JobStatus.QUEUED: "Waiting in queue...",
        JobStatus.PROCESSING: "Analyzing log file...",
        JobStatus.COMPLETED: "Analysis complete!",
        JobStatus.FAILED: "Processing failed",
        JobStatus.RETRYING: "Retrying..."
    }

    return {
        "job_id": job.id,
        "status": job.status.value,
        "progress": progress_map.get(job.status, 0),
        "message": status_messages.get(job.status, "Unknown status")
    }


@router.get("/{job_id}/results")
async def get_job_results(
    job_id: str,
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    """
    Get ML analysis results for completed job

    Returns analysis statistics and anomaly logs
    """
    # Verify job belongs to user
    job = db.query(ProcessingJob).filter(
        ProcessingJob.id == job_id,
        ProcessingJob.user_id == current_user["id"]
    ).first()

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )

    if job.status != JobStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Job is not completed. Status: {job.status.value}"
        )

    # Get analysis results
    analysis = db.query(AnalysisResult).filter(
        AnalysisResult.log_file_id == job.file_id
    ).first()

    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis results not found"
        )

    # Get log file info
    log_file = db.query(LogFile).filter(LogFile.id == job.file_id).first()

    return {
        "job_id": job.id,
        "filename": log_file.filename if log_file else "Unknown",
        "total_logs": analysis.total_logs,
        "anomaly_count": analysis.anomaly_count,
        "normal_count": analysis.normal_count,
        "anomaly_percentage": analysis.anomaly_percentage,
        "predictions": analysis.predictions,  # Array of predictions (0=normal, 1=anomaly)
        "anomaly_logs": analysis.anomaly_logs,  # Actual anomaly log entries with content
        "created_at": analysis.created_at.isoformat()
    }
