from sqlalchemy import Column, Integer, String, ForeignKey, Enum, DateTime
from sqlalchemy.sql import func
from src.database import Base
from sqlalchemy.orm import relationship
import enum

class UserRole(enum.Enum):
    user = "user"
    admin = "admin"

class Users(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(255), unique=True)
    email = Column(String(255))
    password = Column(String(255))
    role = Column(Enum(UserRole), default=UserRole.user, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    log_files = relationship("LogFile", back_populates="owner")
