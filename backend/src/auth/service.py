from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List
from . import models, schemas
from .exceptions import UserNotFound

class UserService: 
    def __init__(self, db: Session):
        self.db = db

    def get_all_users(self) 