import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from . import schemas, service
from ..auth.dependencies import CurrentUser, AdminUser
from .service import LogService

router = APIRouter(
    prefix="/api/logs",
    tags=['logs']
)

@router.post("/upload", response_model=schemas.UploadResponse)
async def upload_log_file(current_user: CurrentUser,
                          file: UploadFile = File(...),
                          db: Session = Depends(get_db)):
    
    log_service = LogService(db)
    allowed_extensions = [".log", ".csv", ".png", ".txt"]
    file_extension = os.path.splitext(file.filename)[1].lower()

    if file_extension not in allowed_extensions:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"File type not allowed.")
    

    result = log_service.save_log_file(file, current_user["id"])

    if result["error"]:
        return schemas.UploadResponseFail(message=result["message"], error=True)

    # Extract job_id from job_data
    job_id = result.get("job_data", {}).get("job_id")

    return schemas.UploadResponseSuccess(
        file_id=result["file_id"],
        bucket=result["bucket"],
        object_name=result["object_name"],
        message=result["message"],
        user_id=result["user_id"],
        job_id=job_id,  # Add job_id to response
        error=False
    )

@router.get("/logs", response_model=List[schemas.LogFileResponseBasic])
async def get_log_files(current_admin: AdminUser, db: Session = Depends(get_db)):
    log_service = LogService(db)
    log_files = log_service.get_log_files()
    return log_files


@router.get("/logs-size")
async def get_log_files(current_admin: AdminUser, db: Session = Depends(get_db)):
    log_service = LogService(db)
    log_files_size = log_service.calculate_total_size()
    return log_files_size

@router.get("/uploads-by-date")
async def get_uploads_by_date(current_admin: AdminUser, db: Session = Depends(get_db), days: int = 14):
    log_service = LogService(db)
    return log_service.get_uploads_by_date(days=days)