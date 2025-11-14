from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Enum
from datetime import datetime
from src.database import Base
import enum
from sqlalchemy.orm import relationship



class LogFile(Base):
    __tablename__ = "log_files"

    id = Column(Integer, primary_key=True, index=True)

    filename = Column(String, index=True)
    original_filename = Column(String)

    minio_object_name = Column(String, unique=True)  # MinIO object path
    minio_bucket = Column(String)

    file_size = Column(Integer)
    content_type = Column(String)

    upload_date = Column(DateTime, default=datetime.utcnow)

    user_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("Users", back_populates="log_files")
