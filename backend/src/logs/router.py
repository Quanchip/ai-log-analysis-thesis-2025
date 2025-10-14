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

@router.post("/upload", response_model=schemas.UploadResponse)
async def upload_log_file(current_user: CurrentUser,
                          file: UploadFile = File(...),
                          db: Session = Depends(get_db)):
    allowed_extensions = [".log", ".csv", ".png", ".txt"]
    file_extension = os.path.splitext(file.filename)[1].lower()

    if file_extension not in allowed_extensions:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"File type not allowed.")
    

    result = service.save_log_file(file, current_user["id"], db)

    if result["error"]:
        return schemas.UploadResponseFail(message=result["message"], error=True)
    
    return schemas.UploadResponseSuccess(
        file_id=result["file_id"],
        bucket=result["bucket"],
        object_name=result["object_name"],
        message=result["message"],
        user_id =result["user_id"],
        error=False
    )