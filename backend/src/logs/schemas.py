from datetime import datetime
from typing import Union
from pydantic import BaseModel

from ..auth.schemas import UserResponse

class LogFileResponse(BaseModel):
    id: int
    filename: str
    file_size: float
    upload_date: datetime
    user_id: int
    # owner: UserResponse
    error: bool = False

class UploadResponseSuccess(BaseModel):
    file_id: int
    bucket: str
    object_name: str
    message: str
    user_id: int
    error: bool = False

class UploadResponseFail(BaseModel):
    message: str
    error: bool = True


class LogFileResponseBasic(BaseModel):
    id: int
    filename: str
    file_size: float
    upload_date: datetime
    user_id: int

class LogFileMinio(BaseModel):
    bucket: str
    object_name: str
    url: str
    message: str

UploadResponse = Union[UploadResponseSuccess, UploadResponseFail]