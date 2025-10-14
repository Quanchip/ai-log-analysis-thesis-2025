import os
import shutil
import datetime
from fastapi import UploadFile
import uuid
from sqlalchemy.orm import Session
from ..jobs.service import create_processing_job
from .models import LogFile
from ..storage.minio_client import minio_client


UPLOAD_DIR = "uploaded_file"

os.makedirs(UPLOAD_DIR, exist_ok=True)

def save_log_file(file: UploadFile, user_id: int, db: Session):
    try:
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        object_name = f"logs/{user_id}/{timestamp}_{unique_id}_{file.filename}"
        # unique_filename = f"{timestamp}_{file.filename}"
        file_content = file.file.read()
        file_size = len(file_content)
        # file_path = os.path.join(UPLOAD_DIR, unique_filename)

        # Lưu file vào minio
        # with open(file_path, "wb") as buffer:
        #     shutil.copyfileobj(file.file, buffer)

        user_id = user_id

        minio_result = minio_client.upload_file(
            file_data=file_content,
            object_name=object_name,
            content_type=file.content_type or "text/plain"
        )

        log_file = LogFile(
            user_id=user_id,
            filename=file.filename,
            original_filename=file.filename,
            minio_object_name=object_name,
            minio_bucket="raw-logs",
            file_size=file_size,
            content_type=file.content_type or "text/plain",
            upload_date = datetime.datetime.now(datetime.timezone.utc)
        )

        db.add(log_file)
        db.commit()
        db.refresh(log_file)
        # url = minio_client

        job_result = create_processing_job(log_file.id, user_id, db)

        if job_result.get("error"):
            # Có thể cleanup MinIO nếu cần
            print("⚠️ Job creation failed, rolling back...")
            return {
                "error": True,
                "message": job_result["message"]
            }

        job_info = job_result["data"]

        return {
            "error": False,
            "message": "File uploaded successfully, processing queued",
            "file_id": log_file.id,
            "bucket": minio_result["bucket"],
            "object_name": object_name,
            "user_id": user_id,
            "job_data": job_info
        }
    except Exception as e:
        db.rollback()
        print(f"❌ Error saving log file: {e}")
        return {
            "error": True,
            "message": f"Failed to upload or save log file: {str(e)}"
        }