from fastapi import FastAPI
from .database import get_db
from .auth import login, models
from .database import engine


app = FastAPI()

app.include_router(login.router)

models.Base.metadata.create_all(engine)
