from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .auth import models as auth_models
# import model from /logs

from .database import engine
from .auth import router as auth_router
from .logs import router as logs_router


app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(logs_router.router)

auth_models.Base.metadata.create_all(engine)