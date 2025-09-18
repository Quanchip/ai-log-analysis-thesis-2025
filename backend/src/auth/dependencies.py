from fastapi import Depends
from sqlalchemy.orm import Session
from ..database import get_db

def get_database() -> Session:
    """Get database session"""
    return Depends(get_db)