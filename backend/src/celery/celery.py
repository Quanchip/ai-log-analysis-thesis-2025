import datetime
import os
import tempfile
import time

from fastapi import logger 
from celery import Celery, Task
from dotenv import load_dotenv

from ..ml.models import AnalysisResult
from ..ml.service import get_ml_service
from ..database import SessionLocal
from ..auth.models import Users  # Import first to register in SQLAlchemy registry
from ..logs.models import LogFile
from ..jobs.models import JobStatus, ProcessingJob
from ..storage.minio_client import minio_client
from ..parser.parser_service import parse_log_content
import pandas as pd

load_dotenv("../../.env")

celery = Celery(__name__)

celery.conf.broker_url = os.environ.get("CELERY_BROKER_URL")
celery.conf.result_backend = os.environ.get("CELERY_RESULT_BACKEND")


class DatabaseTask(Task):
    """Base task with database session management"""
    _db = None

    @property
    def db(self):
        if self._db is None:
            self._db = SessionLocal()
        return self._db

    def after_return(self, *args, **kwargs):
        if self._db is not None:
            self._db.close()
            self._db = None


@celery.task(name="create_task", bind=True, base=DatabaseTask)
def create_task(self, job_id: str):

    db = self.db
    start_time = time.time()
    job = None  # Initialize to None for exception handler

    try:
        # timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")

        job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
        
        if not job:
            raise ValueError(f"ProcessingJob with id {job_id} not found")
        
        # Query log file ID
        log_file = db.query(LogFile).filter(LogFile.id == job.file_id).first()

        if not log_file:
            raise ValueError(f"LogFile with id {job.file_id} not found")
        
        print("===JOB BEFORE UPDATE===", job.status)

        job.status = JobStatus.PROCESSING
        job.celery_task_id = self.request.id
        # job.processing_started_at = datetime.utcnow()
        db.commit()

        print("===JOB BEFORE UPDATE===", job.status)

        print(f"[Task {self.request.id}] Processing job {job_id}")
        print(f"[Task {self.request.id}] File: {log_file.filename}")
        print(f"[Task {self.request.id}] MinIO path: {log_file.minio_object_name}")

        file_data = minio_client.get_file_raw(log_file.minio_object_name)

        if not file_data:
            raise ValueError("Downloaded file is empty")
        
        log_content = file_data.decode('utf-8', errors='ignore')

        print(f"[Task {self.request.id}] Starting log parsing...")

        # Parse log with HDFS format (or auto-detect)
        parse_result = parse_log_content(
            log_content=log_content,
            log_format_name="hdfs",  # Specify format for HDFS logs
            st=0.5,
            depth=4
        )

        # Check if parsing was successful
        if not parse_result.get('success', False):
            error_msg = parse_result.get('error', 'Unknown parsing error')
            raise ValueError(f"Log parsing failed: {error_msg}")

        print(f"[Task {self.request.id}] ✓ Parsed {parse_result['statistics']['total_log_lines']} lines")
        print(f"[Task {self.request.id}] ✓ Found {parse_result['statistics']['unique_templates']} templates")

        # Prepare file paths
        base_path = f"processed/{job.user_id}/{log_file.filename}"

        # Convert structured logs to CSV
        df_structured = pd.DataFrame(parse_result['structured_logs'])
        structured_csv = df_structured.to_csv(index=False)

        # Convert templates to CSV
        # df_templates = pd.DataFrame(parse_result['templates'])
        # templates_csv = df_templates.to_csv(index=False)

        # result_data = parse_result.encode('utf-8')

        minio_client.upload_process_file(
            file_data=structured_csv.encode('utf-8'),
            object_name=f"{base_path}_structured.csv",
            content_type="text/plain",
            bucket_name="processed-logs"  # Different bucket
        )

        # Save the full path to the structured CSV
        job.result_file_path = f"{base_path}_structured.csv"
        # Don't mark as COMPLETED yet - ML analysis still pending
        # job.status = JobStatus.COMPLETED

        db.commit()

        print(f"[Task {self.request.id}] ✓ Parsing completed, queueing ML analysis...")

        try:
            ml_task = ml_analysis_task.delay(job_id)
            print(f"[Task {self.request.id}] ✓ ML task queued with ID: {ml_task.id}")
        except Exception as ml_error:
            print(f"[Task {self.request.id}] ❌ Failed to queue ML task: {str(ml_error)}")
            import traceback
            traceback.print_exc()

    except Exception as e:
        print(f"[Task {self.request.id}] ❌ Error: {str(e)}")

        # Update job status to FAILED
        if job:
            job.status = JobStatus.FAILED
            db.commit()

        raise  # Re-raise to let Celery handle retry logic


@celery.task(bind=True, base=DatabaseTask, name="ml_analysis_task")
def ml_analysis_task(self, job_id: str):
    """
    Celery task to run ML anomaly detection on parsed CSV.

    This runs AFTER parse_log_task completes.

    Args:
        job_id: The ProcessingJob UUID

    Flow:
        1. Query job and get CSV location
        2. Download CSV from MinIO
        3. Run ML prediction
        4. Save results to database
        5. Update job status
    """
              
    db = self.db

    try:
        print(f"[ML Task] Starting ML analysis for job {job_id}")

        job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
        if not job:
            raise ValueError(f"Job {job_id} not found")
        if not job.result_file_path:
            raise ValueError(f"Job {job_id} has no CSV file (parsing may have failed)")

        print(f"[ML Task] Downloading CSV from MinIO: {job.result_file_path}")

        csv_data = minio_client.get_object(
            bucket_name="processed-logs",
            object_name=job.result_file_path
        )

        temp_csv = tempfile.NamedTemporaryFile(mode='wb', delete=False, suffix='.csv')

        try:
            for chunk in csv_data.stream(32*1024):
                temp_csv.write(chunk)
            temp_csv.close()

            print(f"[ML Task] CSV downloaded to {temp_csv.name}")

            # Step 3: Run ML prediction
            print(f"[ML Task] Loading ML service and running prediction...")
            ml_service = get_ml_service()
            result = ml_service.predict_from_csv(temp_csv.name)

            print(f"[ML Task] ✓ ML prediction completed: {result['anomaly_count']} anomalies found")

            analysis_result = AnalysisResult(
                log_file_id=job.file_id,
                total_logs=result["total_logs"],
                anomaly_count=result["anomaly_count"],
                normal_count=result["normal_count"],
                anomaly_percentage=result["anomaly_percentage"],
                predictions=result["predictions"]
            )

            db.add(analysis_result)
            db.commit()
            db.refresh(analysis_result)

            print(f"[ML Task] ✓ Analysis result saved with ID {analysis_result.id}")

            job.status = JobStatus.COMPLETED
            db.commit()

            print(f"[ML Task] ✓ Job {job_id} marked as COMPLETED")

            return {
                "job_id": job_id,
                "analysis_id": analysis_result.id,
                "anomaly_count": result["anomaly_count"],
                "status": "success"
            }
            
        finally:
            # Cleanup: Delete temporary file
            if os.path.exists(temp_csv.name):
                os.unlink(temp_csv.name)
                # logger.info(f"Cleaned up temp file {temp_csv.name}")        

    except Exception as e:
        print(f"[ML Task] ❌ ML analysis failed for job {job_id}: {str(e)}")
        import traceback
        traceback.print_exc()

        # Update job with error
        if job:
            job.status = JobStatus.FAILED
            db.commit()

        raise