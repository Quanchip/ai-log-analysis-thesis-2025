from typing import Optional
from pydantic import BaseModel


class User(BaseModel):
    username: str
    email:str
    password:str

class UserLogin (BaseModel):
    username: str
    password: str

class Token (BaseModel):
    access_token: str
    token_type: str

class UserResponse (BaseModel):
    id: int
    username: str
    email: str
    role: str

class PasswordChange(BaseModel):
    current_password: str
    new_password: str
