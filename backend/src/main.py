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
from .jobs import router as jobs_router
from .llm import router as llm_router
from src.database import Base

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
app.include_router(jobs_router.router)
app.include_router(llm_router.router)



# Import models to register them with Base before create_all
# Just importing the modules triggers class registration
# _ = auth_models.Users  # noqa
# _ = logs_model.LogFile  # noqa
# _ = jobs_model.ProcessingJob  # noqa
# _ = ml_model.AnalysisResult  # noqa

# Now create all tables (all models are registered)
Base.metadata.create_all(engine)
