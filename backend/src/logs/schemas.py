from datetime import datetime
from pydantic import BaseModel

from ..auth.schemas import UserResponse

class LogFileResponse(BaseModel):
    id: int
    filename: str
    file_size: float
    upload_date: datetime
    user_id: int
    owner: UserResponse

class LogFileResponseBasic(BaseModel):
    filename: str
    file_path: str
    message: str

class LogFileMinio(BaseModel):
    bucket: str
    object_name: str
    url: str
    message: str