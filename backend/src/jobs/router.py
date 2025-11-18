from multiprocessing.pool import AsyncResult
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import asyncio
import json

from ..celery import celery

from ..database import get_db
from ..auth.dependencies import CurrentUser
from ..jobs.models import ProcessingJob, JobStatus
from ..logs.models import LogFile
from ..ml.models import AnalysisResult

router = APIRouter(prefix="/api/jobs", tags=["Jobs"])


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
    # Expire all cached data to ensure fresh query
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


    # if job.celery_task_id:
    #     task = AsyncResult(job.celery_task_id, app=celery)
        
    #     # Check Celery task state
    #     if task.state == 'PROGRESS':
    #         # Get progress from Celery task metadata
    #         task_progress = task.info.get('progress', 0) if task.info else 0
    #         task_message = task.info.get('message', 'Processing...') if task.info else 'Processing...'
            
    #         # Map Celery progress (0-100) to our range (30-100)
    #         mapped_progress = 30 + int((task_progress * 70) / 100)
            
    #         return {
    #             "job_id": job.id,
    #             "status": "PROCESSING",
    #             "progress": mapped_progress,
    #             "message": task_message
    #         }
    #     elif task.state == 'SUCCESS':
    #         # Update job status if not already done
    #         if job.status != JobStatus.COMPLETED:
    #             job.status = JobStatus.COMPLETED
    #             db.commit()
            
    #         return {
    #             "job_id": job.id,
    #             "status": "COMPLETED",
    #             "progress": 100,
    #             "message": "Analysis complete!"
    #         }
    #     elif task.state == 'FAILURE':
    #         # Update job status if not already done
    #         if job.status != JobStatus.FAILED:
    #             job.status = JobStatus.FAILED
    #             db.commit()
            
    #         return {
    #             "job_id": job.id,
    #             "status": "FAILED",
    #             "progress": 0,
    #             "message": str(task.info) if task.info else "Processing failed"
    #         }    

    # Calculate progress based on status
    # Upload is 0-30%, so processing starts at 30%
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
