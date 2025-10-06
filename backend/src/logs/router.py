import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from . import schemas, service
from ..auth.dependencies import CurrentUser

router = APIRouter(
    prefix="/api/logs",
    tags=['logs']
)

@router.post("/upload", response_model=schemas.LogFileMinio)
async def upload_log_file(current_user: CurrentUser,
                          file: UploadFile = File(...),
                          db: Session = Depends(get_db)):
    allowed_extensions = [".log", ".csv", ".png"]
    file_extension = os.path.splitext(file.filename)[1].lower()

    if file_extension not in allowed_extensions:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"File type not allowed.")
    
    try:
        log_file_info = service.save_log_file(file, current_user["id"])
        return log_file_info
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading file: {str(e)}"
        )