# AI Log Analysis System - Developer Guide

**Project**: AI-powered log analysis with automated parsing, anomaly detection, and intelligent monitoring
**Author**: Nguyen Hoang Quan
**Stack**: FastAPI + React + PostgreSQL + Redis + Celery + MinIO + Docker

---

## Table of Contents
1. [Quick Start Commands](#1-quick-start-commands)
2. [Architecture Overview](#2-architecture-overview)
3. [Data Flow & Processing Pipeline](#3-data-flow--processing-pipeline)
4. [Critical Code Patterns](#4-critical-code-patterns)
5. [Database Architecture](#5-database-architecture)
6. [Authentication & Authorization](#6-authentication--authorization)
7. [Configuration & Environment](#7-configuration--environment)
8. [Development Workflow](#8-development-workflow)
9. [Important Conventions](#9-important-conventions)

---

## 1. Quick Start Commands

### Starting the Development Environment

```bash
# Navigate to docker utilities
cd docker-utils/

# Start all services (detached mode)
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f backend
docker-compose logs -f celery-worker
docker-compose logs -f frontend
```

### Service Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| Frontend | http://localhost:3002 | - |
| Backend API | http://localhost:8000 | - |
| API Docs | http://localhost:8000/docs | - |
| MinIO Console | http://localhost:9001 | admin / admin123 |
| PgAdmin | http://localhost:8088 | admin@admin.com / admin |
| Flower (Celery) | http://localhost:5555 | - |
| Redis | localhost:6379 | - |
| PostgreSQL | localhost:5432 | postgres / password |

### Running Services Separately

#### Backend (FastAPI)
```bash
cd backend/
pip install -r requirements.txt
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend (React)
```bash
cd frontend/
npm install
npm run dev
# Access at http://localhost:3000
```

#### Celery Worker
```bash
cd backend/
celery -A src.celery.celery worker --loglevel=info
```

#### Flower Monitoring
```bash
cd backend/
celery -A src.celery.celery flower --port=5555
```

### Database Migrations

**Note**: This project uses SQLAlchemy's `Base.metadata.create_all()` for automatic table creation, not Alembic migrations.

```bash
# Tables are created automatically when the app starts
# Check backend/src/main.py lines 30-32:
auth_models.Base.metadata.create_all(engine)
logs_model.Base.metadata.create_all(engine)
jobs_model.Base.metadata.create_all(engine)
```

### Running Tests

```bash
# No test suite currently implemented
# TODO: Add pytest tests
```

### Useful Docker Commands

```bash
# Rebuild specific service
docker-compose build backend
docker-compose build frontend

# Restart services
docker-compose restart celery-worker
docker-compose restart backend

# View real-time logs
docker-compose logs -f celery-worker

# Execute commands inside containers
docker exec -it backend bash
docker exec -it redis redis-cli
docker exec -it postgres_db psql -U postgres -d myproject

# Clean up
docker-compose down              # Stop all services
docker-compose down -v           # Stop and remove volumes
docker system prune -a --volumes # Full cleanup (careful!)
```

---

## 2. Architecture Overview

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│                    React SPA (Port 3002)                         │
│   - User Dashboard  - Admin Dashboard  - File Upload UI         │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP/REST API
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY LAYER                           │
│                   FastAPI Backend (Port 8000)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Auth Router  │  │ Logs Router  │  │ Jobs Router  │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└──────────┬─────────────────────┬─────────────────┬──────────────┘
           │                     │                 │
           │                     │                 │
    ┌──────▼──────┐       ┌─────▼─────┐    ┌─────▼──────┐
    │ PostgreSQL  │       │   MinIO   │    │   Redis    │
    │  Database   │       │  Storage  │    │   Broker   │
    │  Port 5432  │       │ Port 9000 │    │ Port 6379  │
    └─────────────┘       └───────────┘    └─────┬──────┘
                                                  │
                                                  │ Task Queue
                                           ┌──────▼────────┐
                                           │ Celery Worker │
                                           │ + Parser Svc  │
                                           └───────────────┘
```

### Service Responsibilities

#### **Frontend (React + TypeScript)**
- User authentication UI (login/register)
- Protected routes with JWT tokens
- Log file upload interface
- Dashboard for users and admins
- Real-time status updates

#### **Backend (FastAPI)**
- RESTful API endpoints
- JWT authentication & authorization
- Request validation with Pydantic
- File upload orchestration
- Job status tracking

#### **PostgreSQL Database**
- User accounts & roles
- Log file metadata
- Processing job status
- Relationships between entities

#### **MinIO Object Storage**
- **raw-logs bucket**: Original uploaded files
- **processed-logs bucket**: Parsed/analyzed results
- Presigned URLs for secure access
- Lifecycle policies for cleanup

#### **Redis**
- Celery task broker
- Task result backend
- Session storage (future)
- Caching layer (future)

#### **Celery Worker**
- Asynchronous task processing
- Log file parsing (Drain algorithm)
- ML-based anomaly detection (planned)
- Result file generation

---

## 3. Data Flow & Processing Pipeline

### Complete Upload-to-Processing Flow

```
┌──────────────────────────────────────────────────────────────────┐
│ PHASE 1: FILE UPLOAD                                              │
└──────────────────────────────────────────────────────────────────┘

User (Frontend)
   │
   │ 1. Select .log file
   │ 2. POST /api/logs/upload
   ├─────────────────────────────►
                                  │
                           Backend API
                           (logs/router.py)
                                  │
                                  │ 3. Validate file
                                  │    - Check extension
                                  │    - Check size
                                  │
                                  ▼
                           LogService
                           (logs/service.py)
                                  │
                                  │ 4. Generate unique path
                                  │    logs/{user_id}/{timestamp}_{uuid}_{filename}
                                  │
                                  │ 5. Upload to MinIO
                                  ├────────────►  MinIO
                                  │              raw-logs bucket
                                  │
                                  │ 6. Create LogFile record
                                  ├────────────►  PostgreSQL
                                  │              log_files table
                                  │
                                  │ 7. create_processing_job()
                                  ▼
                           JobService
                           (jobs/service.py)
                                  │
                                  │ 8. Generate job_id (UUID)
                                  │ 9. Create ProcessingJob
                                  │    status = QUEUED
                                  │
                                  │ 10. Queue Celery task
                                  ├────────────►  Redis
                                  │              Task queue
                                  │
                                  │ 11. Update celery_task_id
                                  ▼
                           Return Response
                           {
                             "job_id": "uuid",
                             "status": "queued",
                             "message": "Processing queued"
                           }

┌──────────────────────────────────────────────────────────────────┐
│ PHASE 2: ASYNCHRONOUS PROCESSING                                  │
└──────────────────────────────────────────────────────────────────┘

Redis Queue
   │
   │ Task available
   ▼
Celery Worker
(celery/celery.py)
   │
   │ @create_task(job_id)
   │
   │ 1. Query ProcessingJob
   │ 2. Update status → PROCESSING
   ├────────────────────────────►  PostgreSQL
   │
   │ 3. Query LogFile metadata
   │ 4. Download file content
   ├────────────────────────────►  MinIO (raw-logs)
   │
   │ 5. Decode UTF-8
   │ 6. Call parser service
   ▼
ParserService
(parser/parser_service.py)
   │
   │ DrainParserService
   │   - Create temp directory
   │   - Write log to temp file
   │   - Initialize Drain parser
   │   - Parse with HDFS format
   │   - Extract templates
   │   - Structure logs
   │   - Calculate statistics
   │
   │ Returns:
   │   {
   │     "structured_logs": [...],
   │     "templates": [...],
   │     "statistics": {...}
   │   }
   │
   ▼
Back to Celery Worker
   │
   │ 7. Convert to CSV format
   │    - structured_logs → DataFrame → CSV
   │
   │ 8. Upload to MinIO
   │    processed/{user_id}/{filename}_structured.csv
   ├────────────────────────────►  MinIO (processed-logs)
   │
   │ 9. Update ProcessingJob
   │    - status → COMPLETED
   │    - result_file_path = path
   ├────────────────────────────►  PostgreSQL
   │
   │ 10. Commit transaction
   └────────────────────────────►  Job Complete

┌──────────────────────────────────────────────────────────────────┐
│ PHASE 3: RESULT RETRIEVAL (Planned)                               │
└──────────────────────────────────────────────────────────────────┘

User polls GET /api/jobs/{job_id}
   │
   ├─────► Backend checks ProcessingJob.status
   │
   │       status = "completed"
   │       ├─► Return result_file_path
   │       │   User downloads from MinIO
   │       │
   │       status = "processing"
   │       ├─► Return progress percentage
   │       │
   │       status = "failed"
   │       └─► Return error_message
```

### MinIO Bucket Organization

```
MinIO Storage Structure:

raw-logs/                          ← Original uploaded files
├── logs/
│   ├── {user_id}/
│   │   ├── {timestamp}_{uuid}_{filename}.log
│   │   ├── 20251113_120345_a1b2c3d4_system.log
│   │   └── ...
│   └── ...

processed-logs/                    ← Parsed/analyzed results
├── processed/
│   ├── {user_id}/
│   │   ├── {filename}_structured.csv
│   │   ├── {filename}_templates.csv
│   │   └── ...
│   └── ...
```

### Parser Service Architecture

**Location**: `backend/src/parser/parser_service.py`

**Integration**: Third-party Drain algorithm from logparser library

```python
# How it works:

1. DrainParserService wraps the Drain log parser
   - Provides in-memory processing (no file I/O required by caller)
   - Handles temp directory creation/cleanup
   - Supports multiple log formats (HDFS, Apache, Syslog, etc.)

2. Key Parameters:
   - log_format: Template for parsing (e.g., '<Date> <Time> <Level> <Content>')
   - st (similarity threshold): 0.5 (default)
   - depth: Parse tree depth = 4
   - rex: Regex patterns for preprocessing

3. Parsing Process:
   log_content (string)
      ↓
   Write to temp file
      ↓
   Drain parser analyzes patterns
      ↓
   Extracts templates (log patterns)
      ↓
   Maps logs to EventIDs
      ↓
   Returns structured data

4. Output:
   - templates: Discovered log patterns
   - structured_logs: Each log with EventID
   - statistics: Parsing metadata
```

**Example Usage**:
```python
from src.parser.parser_service import parse_log_content

result = parse_log_content(
    log_content=raw_log_string,
    log_format_name="hdfs",
    st=0.5,
    depth=4
)

templates = result['templates']
structured_logs = result['structured_logs']
stats = result['statistics']
```

---

## 4. Critical Code Patterns

### 4.1 Adding a New API Endpoint

**Step 1: Define Pydantic Schema**
```python
# backend/src/{module}/schemas.py

from pydantic import BaseModel
from typing import Optional

class MyRequestSchema(BaseModel):
    field1: str
    field2: int
    field3: Optional[str] = None

class MyResponseSchema(BaseModel):
    id: int
    result: str
    message: str
    
    class Config:
        from_attributes = True  # For SQLAlchemy ORM compatibility
```

**Step 2: Create Service Method**
```python
# backend/src/{module}/service.py

from sqlalchemy.orm import Session
from . import models, schemas

class MyService:
    def __init__(self, db: Session):
        self.db = db
    
    def process_data(self, request: schemas.MyRequestSchema, user_id: int):
        try:
            # Business logic here
            new_record = models.MyModel(
                user_id=user_id,
                field1=request.field1
            )
            self.db.add(new_record)
            self.db.commit()
            self.db.refresh(new_record)
            
            return {
                "error": False,
                "data": new_record,
                "message": "Success"
            }
        except Exception as e:
            self.db.rollback()
            return {
                "error": True,
                "message": str(e)
            }
```

**Step 3: Create Router Endpoint**
```python
# backend/src/{module}/router.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..auth.dependencies import CurrentUser
from . import schemas, service

router = APIRouter(
    prefix="/api/mymodule",
    tags=['mymodule']
)

@router.post("/action", response_model=schemas.MyResponseSchema)
async def perform_action(
    request: schemas.MyRequestSchema,
    current_user: CurrentUser,  # Authenticated user
    db: Session = Depends(get_db)
):
    """
    Endpoint description here.
    
    - Requires authentication
    - Returns MyResponseSchema
    """
    my_service = service.MyService(db)
    result = my_service.process_data(request, current_user["id"])
    
    if result["error"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"]
        )
    
    return result["data"]
```

**Step 4: Register Router in main.py**
```python
# backend/src/main.py

from .mymodule import router as mymodule_router

app.include_router(mymodule_router.router)
```

### 4.2 Creating a New Celery Task

**Pattern**: All tasks inherit from `DatabaseTask` for automatic session management

```python
# backend/src/celery/celery.py or tasks.py

from celery import Task
from src.celery.celery import celery
from src.database import SessionLocal

class DatabaseTask(Task):
    """Base task with database session management"""
    _db = None

    @property
    def db(self):
        if self._db is None:
            self._db = SessionLocal()
        return self._db

    def after_return(self, *args, **kwargs):
        """Cleanup after task completes"""
        if self._db is not None:
            self._db.close()
            self._db = None


@celery.task(name="my_task_name", bind=True, base=DatabaseTask, max_retries=3)
def my_background_task(self, job_id: str, param1: str):
    """
    Background task with database access
    
    Args:
        job_id: UUID of the job
        param1: Additional parameter
    
    Returns:
        dict with task results
    """
    db = self.db  # Access database session
    
    try:
        # 1. Update job status to PROCESSING
        job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
        if not job:
            raise ValueError(f"Job {job_id} not found")
        
        job.status = JobStatus.PROCESSING
        job.celery_task_id = self.request.id
        db.commit()
        
        # 2. Do actual work
        result = perform_work(param1)
        
        # 3. Update job to COMPLETED
        job.status = JobStatus.COMPLETED
        job.result_data = result
        db.commit()
        
        return {
            "job_id": job_id,
            "status": "success",
            "result": result
        }
        
    except Exception as e:
        # Handle error
        if job:
            job.status = JobStatus.FAILED
            job.error_message = str(e)
            db.commit()
        
        # Retry logic
        if self.request.retries < self.max_retries:
            # Exponential backoff: 60s, 120s, 240s
            countdown = 60 * (2 ** self.request.retries)
            raise self.retry(exc=e, countdown=countdown)
        
        raise
```

**Queueing the Task**:
```python
# In your service layer

from src.celery.celery import my_background_task

# Queue task asynchronously
task = my_background_task.delay(job_id, param1)
celery_task_id = task.id  # Save this to track the task
```

### 4.3 Database Model Relationships

**Pattern**: Clean separation between entities

```python
# backend/src/logs/models.py

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from ..auth.models import Base

class LogFile(Base):
    """
    Stores metadata about uploaded log files
    NO processing information here - keep it clean!
    """
    __tablename__ = "log_files"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # File identification
    filename = Column(String, index=True)
    original_filename = Column(String)
    
    # MinIO storage location
    minio_object_name = Column(String, unique=True)
    minio_bucket = Column(String)
    
    # File metadata
    file_size = Column(Integer)
    content_type = Column(String)
    upload_date = Column(DateTime)
    
    # Foreign key
    user_id = Column(Integer, ForeignKey("users.id"))
    
    # Relationships
    owner = relationship("Users", back_populates="log_files")


# backend/src/jobs/models.py

class ProcessingJob(Base):
    """
    Tracks async processing jobs
    Separate from LogFile for clean architecture
    """
    __tablename__ = "processing_jobs"
    
    id = Column(String(36), primary_key=True)  # UUID
    
    # Foreign keys
    user_id = Column(Integer, ForeignKey("users.id"))
    file_id = Column(Integer, ForeignKey("log_files.id"))
    
    # Task tracking
    celery_task_id = Column(String(36), unique=True)
    status = Column(Enum(JobStatus), default=JobStatus.PENDING)
    
    # Results
    result_file_path = Column(String(500), nullable=True)
    
    # Relationships
    user = relationship("Users")
    log_file = relationship("LogFile")
```

**Key Principle**: 
- `LogFile` = file metadata only
- `ProcessingJob` = job tracking only
- Clean separation enables independent scaling

### 4.4 Frontend Protected Routes

**Pattern**: HOC (Higher Order Component) with AuthContext

```typescript
// frontend/src/components/ProtectedRoute.tsx

import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};
```

**Usage in App.tsx**:
```typescript
<Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  }
/>
```

### 4.5 Frontend API Calls with Authentication

**Pattern**: Axios interceptor for JWT tokens

```typescript
// frontend/src/services/api.ts

import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Upload file with progress
export const uploadLog = async (file, onUploadProgress) => {
  const formData = new FormData();
  formData.append('file', file);
  
  return api.post('/api/logs/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
  });
};
```

---

## 5. Database Architecture

### Entity Relationship Diagram

```
┌─────────────────────┐
│       Users         │
│─────────────────────│
│ id (PK)             │
│ username (UNIQUE)   │
│ email (UNIQUE)      │
│ hashed_password     │
│ role (ENUM)         │
│ created_at          │
└──────────┬──────────┘
           │ 1
           │
           │ N
┌──────────▼──────────┐         ┌─────────────────────┐
│      LogFile        │         │   ProcessingJob     │
│─────────────────────│         │─────────────────────│
│ id (PK)             │◄───────┤ id (PK, UUID)       │
│ filename            │  1   N  │ file_id (FK)        │
│ original_filename   │         │ user_id (FK)        │
│ minio_object_name   │         │ celery_task_id      │
│ minio_bucket        │         │ status (ENUM)       │
│ file_size           │         │ result_file_path    │
│ content_type        │         └─────────────────────┘
│ upload_date         │
│ user_id (FK) ───────┘
└─────────────────────┘

Status Flow: PENDING → QUEUED → PROCESSING → COMPLETED/FAILED
```

### Key Tables

#### **users**
- Primary authentication table
- Roles: 'user' (default) or 'admin'
- Bcrypt hashed passwords
- Relationship: One user has many log files

#### **log_files**
- Metadata ONLY (not processing state)
- Stores MinIO object paths
- Indexed on filename for fast lookup
- Foreign key to users

#### **processing_jobs**
- Tracks async Celery tasks
- UUID primary key (not auto-increment)
- Links to both user and log file
- Stores Celery task ID for monitoring
- Status enum: PENDING, QUEUED, PROCESSING, COMPLETED, FAILED, RETRYING

**Important**: This architecture separates concerns:
- File storage metadata (log_files)
- Processing state (processing_jobs)
- This enables independent scaling and querying

---

## 6. Authentication & Authorization

### JWT Token Flow

```
1. User Login
   ├─► POST /auth/token (username, password)
   │   Backend validates credentials
   │   └─► Returns { access_token: "JWT...", token_type: "bearer" }
   │
   ├─► Frontend stores token in localStorage
   │   localStorage.setItem('access_token', token)
   │
2. Authenticated Requests
   ├─► All API calls include header:
   │   Authorization: Bearer <token>
   │
   ├─► Backend dependency: CurrentUser = Depends(get_current_user_dependency)
   │   - Extracts token from header
   │   - Validates JWT signature
   │   - Decodes user_id and role
   │   - Returns user dict
   │
3. Authorization
   ├─► Regular endpoints: CurrentUser dependency
   │   - Verifies token is valid
   │   - Injects user data into endpoint
   │
   └─► Admin endpoints: AdminUser dependency
       - Checks user role == 'admin'
       - Raises 403 if not admin
```

### Backend Auth Implementation

**Dependencies** (`backend/src/auth/dependencies.py`):
```python
from fastapi import Depends, HTTPException, status
from typing import Annotated

def get_current_user_dependency(
    token: Annotated[str, Depends(oauth2_bearer)], 
    db: Session = Depends(get_db)
) -> dict:
    """
    Extracts and validates JWT token
    Returns user dict: { "id": int, "username": str, "role": str }
    """
    user_service = UserService(db)
    return user_service.get_current_user(token)

def require_admin_role(
    current_user: Annotated[dict, Depends(get_current_user_dependency)]
) -> dict:
    """
    Requires admin role
    Raises 403 if not admin
    """
    if current_user.get('role') != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

# Type aliases for easy use
CurrentUser = Annotated[dict, Depends(get_current_user_dependency)]
AdminUser = Annotated[dict, Depends(require_admin_role)]
```

**Usage in Endpoints**:
```python
# Regular authenticated endpoint
@router.get("/profile")
async def get_profile(current_user: CurrentUser):
    return {"username": current_user["username"]}

# Admin-only endpoint
@router.get("/admin/users", response_model=List[UserResponse])
async def get_all_users(current_admin: AdminUser, db: Session = Depends(get_db)):
    # Only admins can reach here
    return UserService(db).get_all_users()
```

### Frontend Auth Implementation

**AuthContext** (`frontend/src/contexts/AuthContext.tsx`):
```typescript
// Provides authentication state to entire app

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string;
  login: (username: string, password: string) => Promise<{success: boolean}>;
  logout: () => void;
  isAuthenticated: boolean;
}

// Usage in components:
const { user, isAuthenticated, login, logout } = useAuth();
```

**Protected Route Pattern**:
```typescript
// Redirects to login if not authenticated
<Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  }
/>
```

### Important Notes

1. **Token Storage**: LocalStorage (consider httpOnly cookies for production)
2. **Token Expiration**: Currently no expiration logic (TODO: Add refresh tokens)
3. **Password Hashing**: Bcrypt with salting
4. **CORS**: Currently allows all origins (`allow_origins=["*"]`) - restrict in production

---

## 7. Configuration & Environment

### Required Environment Variables

**Backend** (`.env` in `backend/` directory):
```bash
# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_NAME=myproject
DB_USER=postgres
DB_PASSWORD=password

# JWT Secret (CHANGE IN PRODUCTION)
SECRET_KEY=025ee95f1b360868c969aa2e8fcb280e

# Redis & Celery
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0
REDIS_URL=redis://redis:6379/0

# MinIO Configuration
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=admin
MINIO_SECRET_KEY=admin123
MINIO_BUCKET_NAME=raw-logs
MINIO_SECURE=false
```

**Frontend** (No `.env` currently, hardcoded API URL):
```typescript
// frontend/src/services/api.ts
const API_BASE_URL = 'http://localhost:8000';

// TODO: Move to environment variable
// const API_BASE_URL = import.meta.env.VITE_API_URL;
```

### Docker Compose Structure

**Location**: `docker-utils/docker-compose.yml`

**Services**:
1. **minio**: Object storage (ports 9000, 9001)
2. **redis**: Task queue broker (port 6379)
3. **postgres**: Database (port 5432)
4. **pgadmin**: DB management UI (port 8088)
5. **backend**: FastAPI application (port 8000)
6. **celery-worker**: Async task processor
7. **flower**: Celery monitoring UI (port 5555)
8. **frontend**: React application (port 3002)

**Network**: All services on `thesis-network` bridge network

**Volumes**:
- `minio_data`: Persistent object storage
- `postgres_data`: Database persistence
- `redis_data`: Redis persistence

### Service Dependencies

```yaml
# Backend waits for DB and Redis to be healthy
backend:
  depends_on:
    postgres:
      condition: service_healthy
    redis:
      condition: service_healthy

# Celery worker waits for Redis, MinIO, and DB
celery-worker:
  depends_on:
    - redis
    - minio
    - postgres
```

### Port Mapping Summary

| Service | Host Port | Container Port | Protocol |
|---------|-----------|----------------|----------|
| Frontend | 3002 | 3000 | HTTP |
| Backend | 8000 | 8000 | HTTP |
| PostgreSQL | 5432 | 5432 | TCP |
| PgAdmin | 8088 | 80 | HTTP |
| Redis | 6379 | 6379 | TCP |
| MinIO API | 9000 | 9000 | HTTP |
| MinIO Console | 9001 | 9001 | HTTP |
| Flower | 5555 | 5555 | HTTP |

---

## 8. Development Workflow

### Adding a New Feature (Example: Download Processed Files)

**1. Backend: Add Service Method**
```python
# backend/src/logs/service.py

def get_processed_file(self, job_id: str, user_id: int):
    """Get presigned URL for processed file"""
    job = self.db.query(ProcessingJob).filter(
        ProcessingJob.id == job_id,
        ProcessingJob.user_id == user_id
    ).first()
    
    if not job or not job.result_file_path:
        return {"error": True, "message": "File not found"}
    
    # Generate presigned URL (expires in 1 hour)
    url = minio_client.get_file_url(
        object_name=job.result_file_path,
        expires=3600
    )
    
    return {"error": False, "download_url": url}
```

**2. Backend: Add Router Endpoint**
```python
# backend/src/logs/router.py

@router.get("/download/{job_id}")
async def download_processed_file(
    job_id: str,
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    log_service = LogService(db)
    result = log_service.get_processed_file(job_id, current_user["id"])
    
    if result["error"]:
        raise HTTPException(status_code=404, detail=result["message"])
    
    return {"download_url": result["download_url"]}
```

**3. Frontend: Add API Call**
```typescript
// frontend/src/services/api.ts

export const getDownloadUrl = async (jobId: string) => {
  return api.get(`/api/logs/download/${jobId}`);
};
```

**4. Frontend: Add UI Component**
```typescript
// frontend/src/components/Dashboard.tsx

const handleDownload = async (jobId: string) => {
  try {
    const response = await getDownloadUrl(jobId);
    window.open(response.data.download_url, '_blank');
  } catch (error) {
    console.error('Download failed:', error);
  }
};

// In render:
<button onClick={() => handleDownload(job.job_id)}>
  Download Results
</button>
```

**5. Test the Feature**
```bash
# Terminal 1: Watch backend logs
docker-compose logs -f backend

# Terminal 2: Watch worker logs
docker-compose logs -f celery-worker

# Browser: Test in UI
# 1. Upload a file
# 2. Wait for processing to complete
# 3. Click download button
# 4. Verify file downloads
```

### Debugging Tips

**1. Check Celery Task Status**
```bash
# Access Redis CLI
docker exec -it redis redis-cli

# Check queue length
LLEN celery

# View queued tasks
LRANGE celery 0 -1

# Check task result
GET celery-task-meta-<task_id>
```

**2. Check MinIO Files**
```bash
# Access MinIO console: http://localhost:9001
# Login: admin / admin123
# Navigate: Buckets → raw-logs / processed-logs
# View uploaded files
```

**3. Check Database**
```bash
# Access PostgreSQL
docker exec -it postgres_db psql -U postgres -d myproject

# Query recent jobs
SELECT id, file_id, status, celery_task_id 
FROM processing_jobs 
ORDER BY id DESC 
LIMIT 5;

# Query recent log files
SELECT id, filename, file_size, upload_date 
FROM log_files 
ORDER BY upload_date DESC 
LIMIT 5;
```

**4. Watch Celery Worker in Real-Time**
```bash
# Flower UI: http://localhost:5555
# View: Tasks → Active / Succeeded / Failed
# Inspect individual task details
```

---

## 9. Important Conventions

### Code Organization Principles

**Backend Structure**:
```
backend/src/
├── auth/           # Authentication & authorization
│   ├── models.py   # User model
│   ├── router.py   # Auth endpoints
│   ├── service.py  # Business logic
│   ├── schemas.py  # Pydantic models
│   └── dependencies.py  # Auth dependencies
│
├── logs/           # Log file management
│   ├── models.py   # LogFile model
│   ├── router.py   # Upload/query endpoints
│   ├── service.py  # LogService class
│   └── schemas.py  # Request/response models
│
├── jobs/           # Processing job tracking
│   ├── models.py   # ProcessingJob model
│   ├── service.py  # Job creation/querying
│   └── router.py   # Job status endpoints
│
├── celery/         # Async task processing
│   └── celery.py   # Celery app + tasks
│
├── parser/         # Log parsing algorithms
│   └── parser_service.py  # Drain parser wrapper
│
├── storage/        # MinIO integration
│   ├── minio_client.py
│   └── config.py
│
├── database.py     # SQLAlchemy setup
└── main.py         # FastAPI app entry point
```

**Frontend Structure**:
```
frontend/src/
├── components/     # React components
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── Dashboard.tsx
│   ├── LogUpload.tsx
│   ├── ProtectedRoute.tsx
│   └── Navbar.tsx
│
├── admin/          # Admin-specific components
│   └── components/
│       └── AdminDashboard.tsx
│
├── contexts/       # React contexts
│   └── AuthContext.tsx  # Global auth state
│
├── services/       # API integration
│   └── api.ts      # Axios instance + API calls
│
├── App.tsx         # Main app with routing
└── main.tsx        # React entry point
```

### Naming Conventions

**Files**:
- Backend: `snake_case.py` (Python convention)
- Frontend: `PascalCase.tsx` for components, `camelCase.ts` for utilities

**Database Tables**:
- Plural nouns: `users`, `log_files`, `processing_jobs`
- Foreign keys: `{table_name}_id` (e.g., `user_id`)

**API Endpoints**:
- Resource-based: `/api/logs/upload`, `/api/jobs/{job_id}`
- Verbs in URL only for non-CRUD actions

**Functions**:
- Python: `snake_case_function_name()`
- TypeScript: `camelCaseFunctionName()`
- Be descriptive: `create_processing_job()` not `create_job()`

**Classes**:
- PascalCase: `LogService`, `MinIOClient`, `DrainParserService`

### Log Processing Pipeline Conventions

**1. File Upload**:
- Always validate file extension BEFORE uploading to MinIO
- Generate unique filenames: `{timestamp}_{uuid}_{original_name}`
- Store in `raw-logs` bucket under `logs/{user_id}/`

**2. Processing Job Creation**:
- Always create `LogFile` record BEFORE `ProcessingJob`
- Use UUID for job IDs (not auto-increment)
- Queue Celery task AFTER job record is committed

**3. Celery Tasks**:
- Inherit from `DatabaseTask` for session management
- Update job status at each phase: QUEUED → PROCESSING → COMPLETED/FAILED
- Always commit database changes BEFORE MinIO operations (for rollback safety)
- Store result files in `processed-logs` bucket under `processed/{user_id}/`

**4. Error Handling**:
- Service methods return `{"error": bool, "message": str, "data": ...}`
- Routers convert errors to HTTPException
- Celery tasks retry transient errors with exponential backoff
- Always log errors with context (job_id, user_id, file_name)

**5. Response Formats**:
```python
# Success
{
  "error": False,
  "message": "Success message",
  "data": { ... }
}

# Error
{
  "error": True,
  "message": "Error description"
}
```

### Important Non-Obvious Patterns

**1. Two-Bucket Strategy**:
- **Why**: Separate raw and processed data for:
  - Clean storage organization
  - Different retention policies
  - Independent scaling
  - Easy rollback (reprocess from raw)

**2. LogFile vs ProcessingJob Split**:
- **Why**: 
  - File metadata is immutable
  - Processing state is mutable
  - Enables multiple processing attempts for same file
  - Cleaner queries (e.g., "show all user files" vs "show all jobs")

**3. DatabaseTask Base Class**:
- **Why**:
  - Celery workers need database access
  - Manual session management is error-prone
  - Automatic cleanup prevents connection leaks
  - Consistent pattern across all tasks

**4. JWT in LocalStorage**:
- **Current**: Token stored in localStorage
- **Issue**: Vulnerable to XSS attacks
- **TODO**: Move to httpOnly cookies in production

**5. Parser Service Temp Files**:
- **Why**: Drain parser requires file I/O
- **Pattern**: 
  - Create temp dir
  - Write content to temp file
  - Parse
  - Clean up temp dir (even on error)
- **Important**: Always use `try/finally` for cleanup

**6. Frontend Protected Routes**:
- **Pattern**: HOC wrapper checks auth before rendering
- **Loading State**: Shows "Loading..." during auth check
- **Redirect**: Automatically redirects to login if not authenticated

---

## Summary: Key Architectural Decisions

1. **Asynchronous Processing**: All file processing happens in background Celery tasks
   - Frontend gets immediate response with job_id
   - User polls for status updates
   - Enables handling large files without blocking

2. **Dual Storage**: MinIO for files, PostgreSQL for metadata
   - MinIO: Cheap, scalable object storage
   - PostgreSQL: Fast queries on metadata
   - Best of both worlds

3. **Clean Separation of Concerns**:
   - File metadata (LogFile)
   - Processing state (ProcessingJob)
   - User data (Users)
   - Each has single responsibility

4. **Parser Integration**:
   - Third-party Drain algorithm
   - Wrapped in service layer for clean API
   - Supports multiple log formats
   - In-memory processing with temp file cleanup

5. **Authentication Flow**:
   - JWT tokens for stateless auth
   - Role-based access control (user vs admin)
   - Dependency injection for clean code
   - Protected routes on frontend

6. **Error Handling**:
   - Service layer returns structured errors
   - Router converts to HTTP exceptions
   - Celery tasks retry with backoff
   - Always rollback database on error

7. **Docker Compose**:
   - All services containerized
   - Proper health checks and dependencies
   - Volume persistence for data
   - Isolated network for security

---

## Next Steps (ML Integration Roadmap)

Based on `/note/ML_INTEGRATION_GUIDE.md`, the planned next phase:

1. **ML Model Integration**:
   - Copy trained decision tree model to `backend/src/ml/models/`
   - Create ML service to run predictions on parsed CSV
   - Add Celery task to chain: parse → ML analysis
   - Store anomaly detection results in database

2. **LLM Integration**:
   - Create LLM service for intelligent suggestions
   - Chain Celery tasks: parse → ML → LLM
   - Generate actionable recommendations
   - Display in frontend dashboard

3. **Enhanced Results Display**:
   - Show anomaly statistics (count, percentage)
   - Visualize anomaly distribution
   - Display LLM suggestions with severity
   - Export results to PDF/CSV

4. **Real-time Updates**:
   - WebSocket connection for live progress
   - Push notifications on job completion
   - Real-time dashboard updates

---

## Troubleshooting Common Issues

**Issue**: Celery worker not picking up tasks
```bash
# Check Redis connection
docker exec redis redis-cli ping
# Expected: PONG

# Check celery worker logs
docker-compose logs celery-worker
# Look for: "celery@worker ready"

# Check queue
docker exec redis redis-cli LLEN celery
# Expected: number of queued tasks

# Restart worker
docker-compose restart celery-worker
```

**Issue**: MinIO upload fails
```bash
# Check MinIO is running
docker-compose ps minio
# Expected: "Up"

# Check bucket exists
# Open http://localhost:9001
# Login: admin / admin123
# Verify "raw-logs" bucket exists

# Check worker can reach MinIO
docker exec celery-worker ping minio
# Expected: successful ping
```

**Issue**: Database connection error
```bash
# Check PostgreSQL is running
docker-compose ps postgres
# Expected: "Up (healthy)"

# Check database exists
docker exec postgres_db psql -U postgres -l
# Expected: "myproject" in list

# Check tables exist
docker exec postgres_db psql -U postgres -d myproject -c "\dt"
# Expected: users, log_files, processing_jobs
```

**Issue**: Frontend can't reach backend
```bash
# Check backend is running
curl http://localhost:8000/docs
# Expected: HTML response (Swagger UI)

# Check CORS configuration
# In browser console, look for CORS errors
# Backend currently allows all origins (*)

# Check network connectivity
docker network inspect thesis-network
# Verify both frontend and backend are on network
```

---

## Contact & Resources

- **Author**: Nguyen Hoang Quan
- **Email**: qaun10052003@gmail.com
- **Repo**: ai-log-analysis-thesis-2025

**Documentation Locations**:
- This file: `/CLAUDE.md`
- Planning notes: `/note/PLANNING.md`
- ML Integration guide: `/note/ML_INTEGRATION_GUIDE.md`
- Basic queue implementation: `/note/basic_queue.md`
- Processing steps: `/note/log_process_steps.md`

**External Dependencies**:
- Drain log parser: `backend/src/third_party/logparser/`
- LogLizer (ML): `backend/src/third_party/loglizer/`

---

**Last Updated**: 2025-11-13
**Version**: 1.0
