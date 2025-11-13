from fastapi import Body, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .auth import models as auth_models
# import model from /logs
from .logs import models as logs_model
from .jobs import models as jobs_model
from .ml import models as ml_model
from .database import engine
from .auth import router as auth_router
from .logs import router as logs_router
# from .ml import router as ml_r

from .celery.celery import create_task


app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(logs_router.router)


auth_models.Base.metadata.create_all(engine)
logs_model.Base.metadata.create_all(engine)
jobs_model.Base.metadata.create_all(engine)
ml_model.Base.metadata.create_all(engine)
