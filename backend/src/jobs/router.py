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

    Returns analysis statistics and anomaly session summaries
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
        "anomaly_logs": analysis.anomaly_logs,  # Session summaries with log counts
        "created_at": analysis.created_at.isoformat()
    }


@router.get("/{job_id}/session/{block_id}")
async def get_session_details(
    job_id: str,
    block_id: str,
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    """
    Get all logs for a specific session (BlockId)

    Args:
        job_id: The processing job ID
        block_id: The BlockId of the session to retrieve

    Returns:
        All log entries for the specified session
    """
    from ..storage.minio_client import minio_client
    import pandas as pd
    import io

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

    if not job.result_file_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Processed CSV not found"
        )

    # Download CSV from MinIO
    csv_data = minio_client.get_object(
        bucket_name="processed-logs",
        object_name=job.result_file_path
    )

    # Read CSV data
    csv_bytes = csv_data.read()
    df = pd.read_csv(io.BytesIO(csv_bytes))

    # Recreate sessions the same way loglizer does (extract BlockId from Content)
    import re
    from collections import OrderedDict

    data_dict = OrderedDict()

    for idx, row in df.iterrows():
        # Extract BlockIds from content using same regex as loglizer
        blkId_list = re.findall(r'(blk_-?\d+)', str(row.get('Content', '')))
        blkId_set = set(blkId_list)

        for blk_Id in blkId_set:
            if blk_Id not in data_dict:
                data_dict[blk_Id] = []
            data_dict[blk_Id].append(idx)  # Store row indices

    # Find the requested session
    if block_id not in data_dict:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {block_id} not found"
        )

    # Get all logs in this session
    log_indices = data_dict[block_id]
    session_logs = df.iloc[log_indices]

    return {
        "block_id": block_id,
        "log_count": len(session_logs),
        "logs": session_logs.to_dict('records')
    }
