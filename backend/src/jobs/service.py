import uuid
import datetime
from sqlalchemy.orm import Session
from ..jobs.models import ProcessingJob, JobStatus
from ..logs.models import LogFile
from ..celery.celery import create_task


def create_processing_job(file_id: int, user_id: int, db: Session):
    try:
        job_id = str(uuid.uuid4())
        job = ProcessingJob(
            id=job_id,
            user_id=user_id,
            file_id=file_id,
            status=JobStatus.QUEUED,
            # created_at=datetime.utcnow()
        )

        db.add(job)
        db.commit()
        db.refresh(job)

        task = create_task.delay(job_id)

        job.celery_task_id = task.id
        db.commit()

        log_file = db.query(LogFile).filter(LogFile.id == file_id).first()

        return {
            "error": False,
            "message": "Processing job queued successfully",
            "data": {
                "job_id": job_id,
                "celery_task_id": task.id,
                "filename": log_file.filename if log_file else "unknown",
                "status": JobStatus.QUEUED.value
            }
        }
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating processing job: {e}")
        return {"error": True, 
                "message": f"Failed to create processing job: {str(e)}"
        }


