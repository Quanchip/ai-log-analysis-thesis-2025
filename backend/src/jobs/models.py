from sqlalchemy import Column, Integer, String, ForeignKey, Enum, DateTime
from sqlalchemy.sql import func
from src.database import Base
from sqlalchemy.orm import relationship
import enum

class JobStatus(str, enum.Enum):
    PENDING = "pending"      # Job created, not queued yet
    QUEUED = "queued"        # Pushed to Redis queue
    PROCESSING = "processing" # Worker picked up
    COMPLETED = "completed"   # Successfully processed
    FAILED = "failed"         # Processing failed
    RETRYING = "retrying"     # Retrying after failure


class ProcessingJob(Base):
    __tablename__ = "processing_jobs"
    
    id = Column(String(36), primary_key=True)  # UUID
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    file_id = Column(Integer, ForeignKey("log_files.id"), nullable=False)
    celery_task_id = Column(String(36), unique=True, nullable=True)  # Celery task ID
    status = Column(Enum(JobStatus), default=JobStatus.PENDING, nullable=False)
    result_file_path = Column(String(500), nullable=True) 

    # Relationships
    user = relationship("Users")
    log_file = relationship("LogFile")

    # Relationship
    

