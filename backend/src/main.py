from fastapi import FastAPI
from .auth import  models
from .database import engine
from .auth import router as auth_router


app = FastAPI()

app.include_router(auth_router.router)

models.Base.metadata.create_all(engine)
