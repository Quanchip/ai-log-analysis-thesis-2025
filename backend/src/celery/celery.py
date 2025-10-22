import datetime
import os
import time 
from celery import Celery, Task
from dotenv import load_dotenv
from ..database import SessionLocal
from ..jobs.models import JobStatus, ProcessingJob
from ..logs.models import LogFile
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

    try:
        # timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")

        job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
        
        if not job:
            raise ValueError(f"ProcessingJob with id {job_id} not found")
        
        # Query log file ID
        log_file = db.query(LogFile).filter(LogFile.id == job.file_id).first()

        if not log_file:
            raise ValueError(f"LogFile with id {job.file_id} not found")
        
        job.status = JobStatus.PROCESSING
        job.celery_task_id = self.request.id
        # job.processing_started_at = datetime.utcnow()
        db.commit()

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

        job.result_file_path = base_path
        job.status = JobStatus.COMPLETED

        db.commit()
    
    except Exception as e:
        print(f"[Task {self.request.id}] ❌ Error: {str(e)}")
        # job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
