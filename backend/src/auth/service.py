from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import Dict, List
from . import models, schemas
from .exceptions import UserNotFound
from .utils import bcrypt_context
from jose import jwt, JWTError
from .constants import ALGORITHM
import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "025ee95f1b360868c969aa2e8fcb280e")

class UserService: 
    def __init__(self, db: Session):
        self.db = db

    def create_user(self, user_data: schemas.User)  -> models.Users:
        new_user = models.Users(username = user_data.username, email=user_data.email, password=bcrypt_context.hash(user_data.password))
        self.db.add(new_user)
        self.db.commit()
        self.db.refresh(new_user)
        return new_user
    
    def get_all_users(self) -> List[models.Users]:
        """Get all users"""
        users =  self.db.query(models.Users).all()
        return users
    
    def get_username(self, user_data: None):
        if user_data is None:
            raise HTTPException(status_code=401, detail='Authentication failed')
        return {"User": user_data}
    
    def authenticate_user(self, username: str, password: str):
        user = self.db.query(models.Users).filter(models.Users.username == username).first()
        if not user:
            return False
        if not bcrypt_context.verify(password, user.password):
            return False
        return user

    def login_for_access_token(self, form_data: OAuth2PasswordRequestForm) -> Dict[str, str]:
        user = self.authenticate_user(form_data.username, form_data.password)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Validation failed')
        token = self.create_access_token(user.username, user.id, timedelta(minutes=30))

        return {'access_token': token, 'token_type': 'bearer'}
    
    def create_access_token(self, username: str, user_id: int, expires_delta: timedelta):
        encode = {'sub': username, 'id': user_id}
        expires = datetime.now(timezone.utc) + expires_delta
        encode.update({'exp': expires})
        return jwt.encode(encode, SECRET_KEY, algorithm=ALGORITHM)
    
    def decode_token(self, token: str, secret_key: str, algorithm: str) -> Dict:
        """Decode JWT token"""
        try:
            payload = jwt.decode(token, secret_key, algorithms=[algorithm])
            return payload
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate token"
            )

    def get_current_user(self, token: str) -> Dict:
        try:
            """Get current user from JWT token"""
            # Decode token first
            payload = self.decode_token(token, SECRET_KEY, ALGORITHM)

            username: str = payload.get('sub')
            user_id: int = payload.get('id')

            if username is None or user_id is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Could not validate user"
                )
            return {'username': username, 'id': user_id}
        except JWTError:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                detail='Could not validate user')



