from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Annotated
from ..database import get_db
from .utils import oauth2_bearer
from .service import UserService

def get_database() -> Session:
    """Get database session"""
    return Depends(get_db)

def get_current_user_dependency(token: Annotated[str, Depends(oauth2_bearer)], db: Session = Depends(get_db)) -> dict:
    """Get current user from JWT token"""
    user_service = UserService(db)
    return user_service.get_current_user(token)

def require_admin_role(current_user: Annotated[dict, Depends(get_current_user_dependency)]) -> dict:
    """Require admin role for accessing protected routes"""

    if current_user.get('role') != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

# Type annotations for easy use
CurrentUser = Annotated[dict, Depends(get_current_user_dependency)]
AdminUser = Annotated[dict, Depends(require_admin_role)]