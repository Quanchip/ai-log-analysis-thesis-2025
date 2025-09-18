from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .auth import models
from .database import engine
from .auth import router as auth_router


app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)

models.Base.metadata.create_all(engine)