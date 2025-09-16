from typing import List
from fastapi import APIRouter
from sqlalchemy.orm import Session
from fastapi import status, Response, HTTPException
from fastapi.params import Depends
from passlib.context import CryptContext
from . import models, schemas

from ..database import get_db

router = APIRouter()

@router.post('/users', status_code=status.HTTP_201_CREATED)
def addUser(request: schemas.User, db: Session = Depends(get_db)):
    new_user = models.Users(username = request.username, email=request.email, password=request.password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return request

@router.get('/users', response_model=List[schemas.User])
def getAllUser(db: Session = Depends(get_db)):
    users = db.query(models.Users).all()
    return users