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