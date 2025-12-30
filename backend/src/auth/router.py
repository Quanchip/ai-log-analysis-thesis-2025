from typing import Annotated, List
from fastapi import APIRouter, status, Depends
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from . import schemas
from .service import UserService
from .dependencies import CurrentUser, AdminUser
from .utils import oauth2_bearer
from ..database import get_db



# def get_current_user_dependency(token: Annotated[str, Depends(oauth2_bearer)], db: Session = Depends(get_db)) -> dict:
#     user_service = UserService(db)
#     return user_service.get_current_user(token)

# user_dependency = Annotated[dict, Depends(get_current_user_dependency)]
router = APIRouter(prefix="/auth", tags=["Authentication"])

# Get user login
@router.get('/user', status_code=status.HTTP_200_OK)
def get_user_login(current_user: CurrentUser, db: Session = Depends(get_db)):
    user_service = UserService(db)
    user_login = user_service.get_username(current_user)
    return user_login

# Get all users
@router.get('/admin/users', status_code=status.HTTP_200_OK,
             response_model=List[schemas.UserResponse], summary="Get all users")

def get_all_user(current_admin: AdminUser, db: Session = Depends(get_db)):
    user_service = UserService(db)
    users = user_service.get_all_users()
    return users


@router.post('/users', status_code=status.HTTP_201_CREATED,
              response_model=schemas.User, summary="Create new user")

def create_user(request: schemas.User, db: Session = Depends(get_db)):
    user_service = UserService(db)
    new_user = user_service.create_user(request)
    return new_user

@router.post('/token', response_model=schemas.Token)
def login_for_token(form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
                    db: Session = Depends(get_db) ):
    auth_service = UserService(db)
    token_data = auth_service.login_for_access_token(form_data)
    return token_data

@router.put('/change-password', status_code=status.HTTP_200_OK,
            summary="Change user password")
def change_password(
    password_data: schemas.PasswordChange,
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    """Change password for currently authenticated user"""
    user_service = UserService(db)
    result = user_service.change_password(current_user["id"], password_data)
    return result
