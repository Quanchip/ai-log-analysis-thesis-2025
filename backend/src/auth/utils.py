from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from .constants import ALGORITHM



bcrypt_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
oauth2_bearer = OAuth2PasswordBearer(tokenUrl='auth/token')

