# BASIC QUEUE WORKFLOW - Redis + Celery Implementation

**Objective**: Implement async processing queue for uploaded log files (Step 6 from log_process_steps.md)

**Current Status**:
- ✅ File upload to MinIO working
- ✅ LogFile model exists (file metadata only)
- ✅ ProcessingJob model exists (job tracking)
- 🔄 Need: Async task queue for processing

**Architecture**:
```
Upload API → Create LogFile + ProcessingJob → Push to Redis Queue →
Celery Worker → Download → Count Lines → Write Result → Upload to processed-logs → Update Status
```

**Design Pattern**:
- **LogFile**: File metadata (uploaded files in `raw-logs` bucket)
- **ProcessingJob**: Job tracking (async processing status)
- **Task**: Count lines → Write result file → Upload to `processed-logs` bucket

---

## IMPLEMENTATION STEPS

### PART 1: INFRASTRUCTURE SETUP 🐳

#### Task 1: Add Redis to Docker Compose
**Priority**: 🔥 CRITICAL
**File**: `docker-utils/docker-compose.yml`
**Time**: 15 min

**Add Redis service**:
```yaml
services:
  redis:
    image: redis:7-alpine
    container_name: redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
    networks:
      - app-network

volumes:
  redis_data:
```

**Update backend depends_on**:
```yaml
  backend:
    depends_on:
      db:
        condition: service_healthy
      minio:
        condition: service_healthy
      redis:
        condition: service_healthy
```

**Steps**:
- [ ] Add Redis service configuration
- [ ] Add redis_data volume
- [ ] Update backend dependencies
- [ ] Start Redis: `docker-compose up -d redis`
- [ ] Verify: `docker exec redis redis-cli ping` (should return "PONG")

---

#### Task 2: Add Celery Worker to Docker Compose
**Priority**: 🔥 CRITICAL
**File**: `docker-utils/docker-compose.yml`
**Time**: 20 min

**Add Celery worker service**:
```yaml
  celery-worker:
    build: ../backend
    container_name: celery-worker
    command: celery -A src.celery_app worker --loglevel=info
    volumes:
      - ../backend:/app
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=redis://redis:6379/0
      - MINIO_ENDPOINT=minio:9000
      - MINIO_ACCESS_KEY=admin
      - MINIO_SECRET_KEY=admin123
      - MINIO_BUCKET_NAME=raw-logs
      - MINIO_SECURE=false
    depends_on:
      redis:
        condition: service_healthy
      minio:
        condition: service_healthy
      db:
        condition: service_healthy
    networks:
      - app-network
    restart: unless-stopped
```

**Optional: Add Flower for monitoring**:
```yaml
  flower:
    build: ../backend
    container_name: flower
    command: celery -A src.celery_app flower --port=5555
    ports:
      - "5555:5555"
    environment:
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - redis
      - celery-worker
    networks:
      - app-network
```

**Steps**:
- [ ] Add celery-worker service
- [ ] Optional: Add flower for monitoring UI
- [ ] Don't start yet (need backend code first)

---

### PART 2: BACKEND SETUP ⚙️

#### Task 3: Install Python Dependencies
**Priority**: 🔥 CRITICAL
**File**: `backend/requirements.txt`
**Time**: 5 min

**Add to requirements.txt**:
```txt
# Task Queue
celery>=5.3.0
redis>=5.0.0
flower>=2.0.0  # Optional: for monitoring
```

**Steps**:
- [ ] Add dependencies to requirements.txt
- [ ] Install locally: `pip install -r requirements.txt`
- [ ] Rebuild Docker image: `docker-compose build backend`

---

#### Task 4: Add Environment Configuration
**Priority**: 🔥 CRITICAL
**Files**: `backend/.env`, `backend/src/config.py`
**Time**: 15 min

**Add to `.env`**:
```env
# Redis & Celery
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Task Configuration
CELERY_TASK_TIMEOUT=300
CELERY_MAX_RETRIES=3
```

**Update `backend/src/config.py`** (if exists, or create new):
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str

    # Redis & Celery
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"

    # Task Config
    CELERY_TASK_TIMEOUT: int = 300
    CELERY_MAX_RETRIES: int = 3

    # MinIO
    MINIO_ENDPOINT: str
    MINIO_ACCESS_KEY: str
    MINIO_SECRET_KEY: str
    MINIO_BUCKET_NAME: str = "raw-logs"
    MINIO_PROCESSED_BUCKET: str = "processed-logs"
    MINIO_SECURE: bool = False

    class Config:
        env_file = ".env"

settings = Settings()
```

**Steps**:
- [ ] Add Redis config to .env
- [ ] Update or create config.py
- [ ] Verify environment variables load correctly

---

#### Task 5: Create Celery App
**Priority**: 🔥 CRITICAL
**File**: `backend/src/celery_app.py` (NEW FILE)
**Time**: 30 min

**Create Celery application**:
```python
from celery import Celery
from src.config import settings

# Create Celery app
celery_app = Celery(
    "log_processing",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["src.jobs.tasks"]  # Import tasks module
)

# Configure Celery
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=settings.CELERY_TASK_TIMEOUT,
    task_soft_time_limit=settings.CELERY_TASK_TIMEOUT - 30,
    worker_max_tasks_per_child=50,  # Restart worker after 50 tasks
    worker_prefetch_multiplier=1,   # One task at a time
)

# Optional: Task routes for different queues
celery_app.conf.task_routes = {
    "src.jobs.tasks.process_log_file": {"queue": "log_processing"},
}
```

**Steps**:
- [ ] Create celery_app.py
- [ ] Configure broker and backend URLs
- [ ] Set task timeouts and worker settings
- [ ] Import tasks module (will create next)

---

#### Task 6: Complete ProcessingJob Model
**Priority**: 🔥 CRITICAL
**File**: `backend/src/jobs/models.py`
**Time**: 20 min

**Complete the ProcessingJob model** (keep LogFile model separate):
```python
from sqlalchemy import Column, Integer, String, Float, ForeignKey, Enum, DateTime, Text
from sqlalchemy.sql import func
from src.database import Base
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

class JobStatus(str, enum.Enum):
    PENDING = "pending"      # Job created, not queued yet
    QUEUED = "queued"        # Pushed to Redis queue
    PROCESSING = "processing" # Worker picked up
    COMPLETED = "completed"   # Successfully processed
    FAILED = "failed"         # Processing failed
    RETRYING = "retrying"     # Retrying after failure

class ProcessingJob(Base):
    __tablename__ = "processing_jobs"

    # Primary Key
    id = Column(String(36), primary_key=True)  # UUID as job_id

    # Foreign Keys
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    file_id = Column(Integer, ForeignKey("log_files.id"), nullable=False)

    # Task tracking
    celery_task_id = Column(String(36), unique=True, nullable=True)
    status = Column(Enum(JobStatus), default=JobStatus.PENDING, nullable=False)

    # Processing metadata
    file_checksum = Column(String(64), nullable=True)  # SHA256
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    processing_started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Processing results
    total_lines = Column(Integer, nullable=True)
    processing_time_seconds = Column(Float, nullable=True)

    # Result file in processed-logs bucket
    result_file_path = Column(String(500), nullable=True)  # MinIO path in processed-logs
    result_file_size = Column(Float, nullable=True)

    # Relationships
    user = relationship("Users")
    log_file = relationship("LogFile")
```

**Note**: LogFile model stays clean (file metadata only), ProcessingJob tracks async processing.

**Steps**:
- [ ] Complete ProcessingJob model in `backend/src/jobs/models.py`
- [ ] Import ProcessingJob in `backend/src/main.py` to create tables
- [ ] Create migration: `alembic revision --autogenerate -m "Complete processing_jobs table"`
- [ ] Review migration file
- [ ] Apply migration: `alembic upgrade head`
- [ ] Verify in database

---

#### Task 7: Create Celery Tasks
**Priority**: 🔥 CRITICAL
**File**: `backend/src/jobs/tasks.py` (NEW FILE)
**Time**: 1.5 hours

**Create processing task that counts lines and uploads result**:
```python
import time
import hashlib
import io
from celery import Task
from src.celery_app import celery_app
from src.database import SessionLocal
from src.jobs.models import ProcessingJob, JobStatus
from src.logs.models import LogFile
from src.storage.minio_client import minio_client
from datetime import datetime

class DatabaseTask(Task):
    """Base task with database session management"""
    _db = None

    @property
    def db(self):
        if self._db is None:
            self._db = SessionLocal()
        return self._db

    def after_return(self, *args, **kwargs):
        if self._db is not None:
            self._db.close()
            self._db = None


@celery_app.task(bind=True, base=DatabaseTask, max_retries=3)
def process_log_file(self, job_id: str):
    """
    Process log file: count lines, write result, upload to processed-logs bucket

    Args:
        job_id: The UUID of the ProcessingJob record

    Steps:
        1. Get job and file info from database
        2. Update status to PROCESSING
        3. Download file from MinIO (raw-logs)
        4. Calculate checksum
        5. Count lines
        6. Write result to new file
        7. Upload result to MinIO (processed-logs bucket)
        8. Update job status to COMPLETED
    """
    db = self.db
    start_time = time.time()

    try:
        # 1. Get job from database
        job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
        if not job:
            raise ValueError(f"ProcessingJob with id {job_id} not found")

        # Get associated log file
        log_file = db.query(LogFile).filter(LogFile.id == job.file_id).first()
        if not log_file:
            raise ValueError(f"LogFile with id {job.file_id} not found")

        # 2. Update status to PROCESSING
        job.status = JobStatus.PROCESSING
        job.celery_task_id = self.request.id
        job.processing_started_at = datetime.utcnow()
        db.commit()

        print(f"[Task {self.request.id}] Processing job {job_id}")
        print(f"[Task {self.request.id}] File: {log_file.filename}")
        print(f"[Task {self.request.id}] MinIO path: {log_file.minio_object_name}")

        # 3. Download file from MinIO (raw-logs bucket)
        print(f"[Task {self.request.id}] Downloading from MinIO...")
        file_data = minio_client.get_file_raw(log_file.minio_object_name)

        if not file_data:
            raise ValueError("Downloaded file is empty")

        # 4. Calculate checksum
        print(f"[Task {self.request.id}] Calculating checksum...")
        checksum = hashlib.sha256(file_data).hexdigest()
        job.file_checksum = checksum

        # 5. Count lines
        print(f"[Task {self.request.id}] Counting lines...")
        content = file_data.decode('utf-8', errors='ignore')
        lines = content.strip().split('\n')
        total_lines = len(lines)
        job.total_lines = total_lines

        print(f"[Task {self.request.id}] Total lines: {total_lines}")

        # 6. Create result file content
        result_content = f"""Log Processing Result
========================
Original File: {log_file.filename}
File Size: {log_file.file_size} bytes
Checksum (SHA256): {checksum}

Processing Results:
- Total Lines: {total_lines}
- Processing Date: {datetime.utcnow().isoformat()}

Line Details:
"""
        # Add first 10 lines as sample
        for i, line in enumerate(lines[:10], 1):
            result_content += f"{i}. {line}\n"

        if total_lines > 10:
            result_content += f"\n... ({total_lines - 10} more lines)\n"

        # 7. Upload result to processed-logs bucket
        print(f"[Task {self.request.id}] Uploading result to processed-logs...")

        # Generate result file path
        result_filename = f"result_{log_file.filename}.txt"
        result_object_name = f"processed/{job.user_id}/{datetime.now().strftime('%Y%m%d')}/{job_id}_{result_filename}"

        result_data = result_content.encode('utf-8')
        result_size = len(result_data)

        # Upload to processed-logs bucket
        minio_client.upload_file(
            file_data=result_data,
            object_name=result_object_name,
            content_type="text/plain",
            bucket_name="processed-logs"  # Different bucket
        )

        # 8. Update job with results
        job.result_file_path = result_object_name
        job.result_file_size = result_size / 1024  # KB
        job.status = JobStatus.COMPLETED
        job.completed_at = datetime.utcnow()
        job.processing_time_seconds = time.time() - start_time

        db.commit()

        print(f"[Task {self.request.id}] ✅ Completed successfully")
        print(f"[Task {self.request.id}] Result uploaded to: {result_object_name}")
        print(f"[Task {self.request.id}] Processing time: {job.processing_time_seconds:.2f}s")

        return {
            "job_id": job_id,
            "status": "completed",
            "total_lines": total_lines,
            "result_file": result_object_name,
            "processing_time": job.processing_time_seconds
        }

    except Exception as e:
        # Handle errors
        print(f"[Task {self.request.id}] ❌ Error: {str(e)}")

        job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
        if job:
            job.status = JobStatus.FAILED
            job.error_message = str(e)
            job.retry_count += 1
            job.completed_at = datetime.utcnow()
            db.commit()

        # Retry logic
        if self.request.retries < self.max_retries:
            # Update status to RETRYING
            job.status = JobStatus.RETRYING
            db.commit()

            # Retry with exponential backoff
            raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))

        raise
```

**Steps**:
- [ ] Create `backend/src/jobs/tasks.py`
- [ ] Implement DatabaseTask base class
- [ ] Implement process_log_file task with line counting and result upload
- [ ] Add error handling and retry logic
- [ ] Update Celery app to include `src.jobs.tasks`

---

#### Task 8: Create Job Service
**Priority**: 🔥 CRITICAL
**File**: `backend/src/jobs/service.py` (NEW FILE)
**Time**: 45 min

**Create service to manage ProcessingJobs**:
```python
import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from src.jobs.models import ProcessingJob, JobStatus
from src.logs.models import LogFile
from src.jobs.tasks import process_log_file


def create_processing_job(file_id: int, user_id: int, db: Session):
    """
    Create a processing job and queue it

    Args:
        file_id: LogFile ID
        user_id: User ID
        db: Database session

    Returns:
        dict: Job information
    """
    # 1. Generate job ID
    job_id = str(uuid.uuid4())

    # 2. Create ProcessingJob record
    job = ProcessingJob(
        id=job_id,
        user_id=user_id,
        file_id=file_id,
        status=JobStatus.QUEUED,
        created_at=datetime.utcnow()
    )

    db.add(job)
    db.commit()
    db.refresh(job)

    # 3. Queue processing task (async)
    task = process_log_file.delay(job_id)

    # 4. Update with Celery task ID
    job.celery_task_id = task.id
    db.commit()

    # 5. Get file info for response
    log_file = db.query(LogFile).filter(LogFile.id == file_id).first()

    return {
        "job_id": job_id,
        "celery_task_id": task.id,
        "filename": log_file.filename if log_file else "unknown",
        "status": JobStatus.QUEUED.value,
        "message": "Processing job queued successfully"
    }


def get_job_status(job_id: str, user_id: int, db: Session):
    """
    Get status of a processing job

    Args:
        job_id: The job UUID
        user_id: User ID (for ownership verification)
        db: Database session

    Returns:
        dict: Job status information or None
    """
    job = db.query(ProcessingJob).filter(
        ProcessingJob.id == job_id,
        ProcessingJob.user_id == user_id
    ).first()

    if not job:
        return None

    # Get associated log file
    log_file = db.query(LogFile).filter(LogFile.id == job.file_id).first()

    return {
        "job_id": job.id,
        "filename": log_file.filename if log_file else "unknown",
        "status": job.status.value,
        "file_size": log_file.file_size if log_file else 0,
        "created_at": job.created_at.isoformat(),
        "processing_started_at": job.processing_started_at.isoformat() if job.processing_started_at else None,
        "completed_at": job.completed_at.isoformat() if job.completed_at else None,
        "total_lines": job.total_lines,
        "result_file_path": job.result_file_path,
        "result_file_size": job.result_file_size,
        "error_message": job.error_message,
        "retry_count": job.retry_count,
        "processing_time_seconds": job.processing_time_seconds
    }


def get_user_jobs(user_id: int, db: Session, limit: int = 10, offset: int = 0):
    """Get all jobs for a user with pagination"""
    jobs = db.query(ProcessingJob).filter(
        ProcessingJob.user_id == user_id
    ).order_by(
        ProcessingJob.created_at.desc()
    ).limit(limit).offset(offset).all()

    result = []
    for job in jobs:
        log_file = db.query(LogFile).filter(LogFile.id == job.file_id).first()
        result.append({
            "job_id": job.id,
            "filename": log_file.filename if log_file else "unknown",
            "status": job.status.value,
            "created_at": job.created_at.isoformat(),
            "total_lines": job.total_lines,
        })

    return result
```

**Update `backend/src/logs/service.py`**:
```python
import os
import uuid
from datetime import datetime
from fastapi import UploadFile
from sqlalchemy.orm import Session
from src.storage.minio_client import minio_client
from src.logs.models import LogFile
from src.jobs.service import create_processing_job

UPLOAD_DIR = "uploaded_file"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def save_log_file(file: UploadFile, user_id: int, db: Session):
    """
    Save uploaded file to MinIO and create processing job

    Returns:
        dict: Job information including job_id and status
    """
    # 1. Generate unique identifiers
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_id = str(uuid.uuid4())[:8]

    # 2. Prepare MinIO path (raw-logs bucket)
    object_name = f"logs/{user_id}/{timestamp}_{unique_id}_{file.filename}"

    # 3. Read file content
    file_content = file.file.read()
    file_size = len(file_content)

    # 4. Upload to MinIO (raw-logs bucket)
    minio_result = minio_client.upload_file(
        file_data=file_content,
        object_name=object_name,
        content_type=file.content_type or "text/plain"
    )

    # 5. Create LogFile record (file metadata only)
    log_file = LogFile(
        user_id=user_id,
        filename=file.filename,
        original_filename=file.filename,
        minio_object_name=object_name,
        minio_bucket="raw-logs",
        file_size=file_size,
        content_type=file.content_type or "text/plain",
        upload_date=datetime.utcnow()
    )

    db.add(log_file)
    db.commit()
    db.refresh(log_file)

    # 6. Create processing job (separate table)
    job_info = create_processing_job(log_file.id, user_id, db)

    # 7. Return combined information
    return {
        **job_info,
        "file_id": log_file.id,
        "bucket": minio_result["bucket"],
        "object_name": object_name,
        "message": "File uploaded successfully, processing queued"
    }
```

**Steps**:
- [ ] Create `backend/src/jobs/service.py`
- [ ] Implement create_processing_job, get_job_status, get_user_jobs
- [ ] Update `backend/src/logs/service.py` to use job service
- [ ] Import process_log_file task in job service

---

#### Task 9: Create Job Router and Update Upload Router
**Priority**: 🔥 HIGH
**Files**: `backend/src/jobs/router.py` (NEW), `backend/src/logs/router.py`
**Time**: 45 min

**Create `backend/src/jobs/router.py`**:
```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from . import service
from ..auth.dependencies import CurrentUser

router = APIRouter(
    prefix="/api/jobs",
    tags=['jobs']
)

@router.get("/{job_id}")
async def get_job_status(
    job_id: str,
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    """Get status of a specific processing job"""
    job_status = service.get_job_status(job_id, current_user["id"], db)

    if not job_status:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found or access denied"
        )

    return job_status


@router.get("")
async def get_user_jobs(
    current_user: CurrentUser,
    db: Session = Depends(get_db),
    limit: int = 10,
    offset: int = 0
):
    """Get all processing jobs for the current user"""
    jobs = service.get_user_jobs(current_user["id"], db, limit, offset)
    return {"jobs": jobs, "count": len(jobs)}
```

**Update `backend/src/logs/router.py` (upload endpoint only)**:
```python
import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from ..database import get_db
from . import service
from ..auth.dependencies import CurrentUser

router = APIRouter(
    prefix="/api/logs",
    tags=['logs']
)

@router.post("/upload")
async def upload_log_file(
    current_user: CurrentUser,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload log file and queue for processing"""
    allowed_extensions = [".log", ".csv", ".txt"]
    file_extension = os.path.splitext(file.filename)[1].lower()

    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed: {', '.join(allowed_extensions)}"
        )

    try:
        result = service.save_log_file(file, current_user["id"], db)
        return result

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading file: {str(e)}"
        )
```

**Register job router in `backend/src/main.py`**:
```python
from .jobs import router as jobs_router

app.include_router(jobs_router.router)
```

**Steps**:
- [ ] Create `backend/src/jobs/router.py` with job status endpoints
- [ ] Update `backend/src/logs/router.py` (keep only upload endpoint)
- [ ] Register jobs router in main.py
- [ ] Test endpoints: `/api/logs/upload`, `/api/jobs/{job_id}`, `/api/jobs`

---

### PART 3: START & TEST 🚀

#### Task 10: Start All Services
**Priority**: 🔥 CRITICAL
**Time**: 15 min

**Start containers**:
```bash
# Stop existing containers
docker-compose down

# Rebuild images
docker-compose build

# Start all services
docker-compose up -d

# Check services
docker-compose ps

# Check logs
docker-compose logs -f celery-worker
```

**Verify services running**:
- [ ] Redis: `docker exec redis redis-cli ping`
- [ ] Celery worker: `docker-compose logs celery-worker` (should show "ready")
- [ ] Backend API: `curl http://localhost:8000/docs`
- [ ] Optional: Flower UI: `http://localhost:5555`

---

#### Task 11: Test End-to-End Workflow
**Priority**: 🔥 CRITICAL
**Time**: 30 min

**Test steps**:

**1. Upload a test file**:
```bash
# Create test log file
echo -e "2025-01-01 INFO Test log line 1\n2025-01-01 INFO Test log line 2\n2025-01-01 ERROR Test error" > test.log

# Upload via curl (replace TOKEN with your JWT)
curl -X POST http://localhost:8000/api/logs/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test.log"

# Expected response:
{
  "job_id": "uuid-here",
  "celery_task_id": "celery-task-id",
  "filename": "test.log",
  "status": "queued",
  "message": "File uploaded successfully, processing queued"
}
```

**2. Check job status**:
```bash
# Immediately after upload (should be "queued" or "processing")
curl http://localhost:8000/api/jobs/{JOB_ID} \
  -H "Authorization: Bearer YOUR_TOKEN"

# Wait 5 seconds, check again (should be "completed")
curl http://localhost:8000/api/jobs/{JOB_ID} \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected completed response:
{
  "job_id": "uuid",
  "filename": "test.log",
  "status": "completed",
  "total_lines": 3,
  "processing_time_seconds": 2.5,
  ...
}
```

**3. Check worker logs**:
```bash
docker-compose logs -f celery-worker

# Should see:
# [Task xyz] Processing job abc...
# [Task xyz] Downloading from MinIO...
# [Task xyz] Calculating checksum...
# [Task xyz] Processing file content...
# [Task xyz] ✅ Completed successfully
# [Task xyz] Total lines: 3
```

**4. Get all user jobs**:
```bash
curl http://localhost:8000/api/jobs \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**5. Verify in database**:
```sql
-- Check processing jobs
SELECT id, file_id, status, total_lines, processing_time_seconds, result_file_path
FROM processing_jobs
ORDER BY created_at DESC
LIMIT 5;

-- Check log files
SELECT id, filename, minio_object_name, file_size
FROM log_files
ORDER BY upload_date DESC
LIMIT 5;
```

**6. Verify in MinIO**:
- Open http://localhost:9001
- Login with credentials
- Check `raw-logs` bucket → Original file at `logs/{user_id}/{timestamp}_{uuid}_{filename}`
- Check `processed-logs` bucket → Result file at `processed/{user_id}/{date}/{job_id}_result_{filename}.txt`
- Download result file to see line count and processing details

---

### PART 4: MONITORING & DEBUGGING 🔍

#### Task 12: Monitor Queue with Redis CLI
**Time**: 10 min

**Check queue status**:
```bash
# Enter Redis CLI
docker exec -it redis redis-cli

# Check queue length
LLEN celery

# Check queued tasks
LRANGE celery 0 -1

# Check task results (keys)
KEYS celery-task-meta-*

# Get specific task result
GET celery-task-meta-{TASK_ID}

# Monitor commands in real-time
MONITOR
```

---

#### Task 13: Monitor with Flower (Optional)
**Time**: 5 min

**Access Flower UI**:
- Open http://localhost:5555
- View:
  - Active tasks
  - Completed tasks
  - Failed tasks
  - Worker status
  - Task execution time graphs

---

#### Task 14: Common Debugging Commands
**Time**: Reference

**View worker logs**:
```bash
# Follow worker logs
docker-compose logs -f celery-worker

# Last 100 lines
docker-compose logs --tail=100 celery-worker

# Errors only
docker-compose logs celery-worker | grep ERROR
```

**Restart worker**:
```bash
docker-compose restart celery-worker
```

**Execute task manually (for testing)**:
```python
# In Python shell
from src.logs.tasks import process_log_file
result = process_log_file.delay("job_id_here")
print(result.id)

# Check result
print(result.status)
print(result.result)
```

**Purge all queued tasks**:
```bash
docker exec celery-worker celery -A src.celery_app purge
```

---

## TESTING CHECKLIST ✅

### Functional Tests
- [ ] Upload file → job_id returned
- [ ] Job status = "queued" immediately after upload
- [ ] Job status = "processing" within 5 seconds
- [ ] Job status = "completed" after processing
- [ ] Completed job shows total_lines count
- [ ] Completed job shows processing_time_seconds
- [ ] Completed job shows result_file_path
- [ ] GET /api/jobs returns list of user's jobs
- [ ] Original file uploaded to MinIO raw-logs bucket
- [ ] Result file uploaded to MinIO processed-logs bucket
- [ ] Database: LogFile and ProcessingJob records created
- [ ] Celery worker logs show task execution

### Error Handling Tests
- [ ] Upload invalid file type → 400 error
- [ ] Upload without authentication → 401 error
- [ ] Get job status for non-existent job → 404 error
- [ ] Get job status for another user's job → 404 error
- [ ] Worker failure → job status = "failed"
- [ ] Worker retry → job status = "retrying"
- [ ] After 3 retries → job status = "failed" permanently

### Performance Tests
- [ ] Upload 10 files simultaneously → all queued
- [ ] All 10 files processed successfully
- [ ] Check worker can handle concurrent tasks
- [ ] Verify no memory leaks (worker memory stable)

---

## NEXT STEPS 🚀

After basic queue is working:

1. **Enhance MinIO Client**:
   - Update `upload_file` to support bucket_name parameter
   - Ensure `processed-logs` bucket is created on init
   - Add method to download result files

2. **Add Real Processing Logic**:
   - Replace simple line counting with actual log parsing
   - Extract timestamps, log levels, messages
   - Implement ML anomaly detection
   - Generate richer result files (CSV, JSON)

3. **Add Progress Tracking**:
   - Update progress percentage during processing
   - Client can poll for progress

4. **Add Webhooks/Notifications**:
   - Notify user when processing completes
   - Send email/push notification

4. **Optimize Worker Configuration**:
   - Add multiple workers for parallel processing
   - Configure worker pools (prefork, gevent, eventlet)
   - Implement task priorities

5. **Add Task Monitoring**:
   - Set up alerts for failed tasks
   - Track task execution metrics
   - Implement dead letter queue

6. **Frontend Integration**:
   - Update LogUpload component to show job_id
   - Create JobList component to show status
   - Add auto-refresh for job status
   - Show processing progress bar

---

## ARCHITECTURE DIAGRAM

```
┌─────────────┐
│  Frontend   │
│  (React)    │
└──────┬──────┘
       │ HTTP POST /upload
       │ HTTP GET /jobs/{id}
       ▼
┌─────────────────────────────────┐
│  FastAPI Backend                │
│  ┌───────────────────────────┐  │
│  │ POST /api/logs/upload     │  │
│  │  1. Validate file         │  │
│  │  2. Upload to MinIO       │  │
│  │     (raw-logs bucket)     │  │
│  │  3. Create LogFile        │  │
│  │  4. Create ProcessingJob  │  │
│  │  5. Queue Celery task  ───┼──┼─────┐
│  │  6. Return job_id         │  │     │
│  └───────────────────────────┘  │     │
│                                  │     │
│  ┌───────────────────────────┐  │     │
│  │ GET /api/jobs/{id}        │  │     │
│  │  - Query ProcessingJob    │  │     │
│  │  - Return status          │  │     │
│  └───────────────────────────┘  │     │
└──────────────┬──────────────────┘     │
               │                         │
               ▼                         ▼
        ┌────────────┐          ┌──────────────┐
        │ PostgreSQL │          │    Redis     │
        │  - log_files          │   (Queue)    │
        │  - processing_jobs    └──────┬───────┘
        └────────────┘                 │
                                       │ Task
                                       ▼
                              ┌────────────────┐
                              │ Celery Worker  │
                              │ ┌────────────┐ │
                              │ │ 1. Get job │ │
                              │ │ 2. Download│─┼───┐
                              │ │    from    │ │   │
                              │ │  raw-logs  │ │   │
                              │ │ 3. Count   │ │   │
                              │ │    lines   │ │   │
                              │ │ 4. Write   │ │   │
                              │ │    result  │ │   │
                              │ │ 5. Upload  │─┼───┼──┐
                              │ │    to      │ │   │  │
                              │ │ processed- │ │   │  │
                              │ │    logs    │ │   │  │
                              │ │ 6. Update  │─┼─┐ │  │
                              │ │    status  │ │ │ │  │
                              │ └────────────┘ │ │ │  │
                              └────────────────┘ │ │  │
                                                 │ │  │
                                                 ▼ ▼  ▼
                                           ┌──────────────┐
                                           │    MinIO     │
                                           │              │
                                           │  raw-logs    │
                                           │  (input)     │
                                           │              │
                                           │ processed-   │
                                           │  logs        │
                                           │  (output)    │
                                           └──────────────┘
```

---

## TROUBLESHOOTING

### Issue: Worker not picking up tasks
**Solutions**:
- Check Redis connection: `docker exec redis redis-cli ping`
- Check worker logs: `docker-compose logs celery-worker`
- Verify CELERY_BROKER_URL is correct
- Restart worker: `docker-compose restart celery-worker`

### Issue: Task stuck in "queued" status
**Solutions**:
- Check worker is running: `docker-compose ps celery-worker`
- Check worker can import tasks: `docker exec celery-worker python -c "from src.logs.tasks import process_log_file"`
- Check Redis queue: `docker exec redis redis-cli LLEN celery`

### Issue: Database connection error in worker
**Solutions**:
- Verify DATABASE_URL in worker environment
- Check database is accessible from worker container
- Test: `docker exec celery-worker python -c "from src.database import engine; print(engine)"`

### Issue: MinIO connection error in worker
**Solutions**:
- Verify MINIO_ENDPOINT in worker environment
- Check MinIO is accessible: `docker exec celery-worker ping minio`
- Verify credentials are correct

### Issue: Task timeout
**Solutions**:
- Increase CELERY_TASK_TIMEOUT in config
- Check file is not too large
- Optimize processing logic

---

## SUCCESS CRITERIA ✅

You've successfully implemented the basic queue when:

1. ✅ Redis and Celery worker containers running
2. ✅ Upload API returns job_id
3. ✅ Task is queued in Redis
4. ✅ Worker picks up and processes task
5. ✅ Job status updates: queued → processing → completed
6. ✅ Database record updated with results
7. ✅ Worker logs show successful processing
8. ✅ GET /jobs/{id} returns correct status
9. ✅ Can upload multiple files and all are processed
10. ✅ Failed tasks are retried automatically

**You now have a working async processing pipeline! 🎉**
