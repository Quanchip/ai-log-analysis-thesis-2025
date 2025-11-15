import os
import shutil, datetime
from datetime import datetime, timedelta, timezone

from typing import List, Optional
from fastapi import UploadFile
import uuid
from sqlalchemy import func, cast, Date
from sqlalchemy.orm import Session
from ..jobs.service import create_processing_job
from .models import LogFile
from ..storage.minio_client import minio_client
from . import models


UPLOAD_DIR = "uploaded_file"

os.makedirs(UPLOAD_DIR, exist_ok=True)


class LogService:
    def __init__(self, db: Session):
        self.db = db

    def save_log_file(self, file: UploadFile, user_id: int):
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
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
                upload_date = datetime.now(timezone.utc)
            )

            self.db.add(log_file)
            self.db.commit()
            self.db.refresh(log_file)
            # url = minio_client

            job_result = create_processing_job(log_file.id, user_id, self.db)

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
            self.db.rollback()
            print(f"❌ Error saving log file: {e}")
            return {
                "error": True,
                "message": f"Failed to upload or save log file: {str(e)}"
            }
        
    def get_log_files(self) -> List[models.LogFile]:
        """Get all users"""
        log_files =  self.db.query(models.LogFile).all()
        return log_files
    
    def calculate_total_size (self, user_id: Optional[int] = None) -> dict:
        try:    
            log_files =  self.db.query(models.LogFile).all()
            total_size = sum(file.file_size for file in log_files)

            return {
                "total_files": len(log_files),
                "total_size_bytes": total_size,
                "total_size_mb": round(total_size / (1024 * 1024), 2)
            }

        except Exception as e:
            self.db.rollback()
            print(f"❌ Error calculate log file size: {e}")


    def get_uploads_by_date(self, days: int = 14) -> List[dict]:
        """Lấy số lượng file upload theo ngày (7 ngày gần nhất)"""

        # calculate start day
        start_date = datetime.now() - timedelta(days=days)

        results = (
            self.db.query(
                cast(models.LogFile.upload_date, Date).label('date'),
                func.count(models.LogFile.id).label('count')
            )
            .filter(models.LogFile.upload_date >= start_date)
            .group_by(cast(models.LogFile.upload_date, Date))
            .order_by(cast(models.LogFile.upload_date, Date))
            .all()
        )
    
        # Format kết quả
        return [
            {
                "date": result.date.strftime("%Y-%m-%d"),
                "count": result.count
            }
            for result in results
        ]