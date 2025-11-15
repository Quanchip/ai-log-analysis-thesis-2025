# LOG UPLOAD & PROCESSING - Initial Implementation Tasks

**Objective**: Implement log file upload, storage to MinIO, and async processing queue (Steps 1-5 from log_process_steps.md)

**Implementation Order**: Infrastructure → Database → Backend Logic → API → Frontend → Testing

---

## PHASE 1: UPLOAD FILE 📤 (Steps 1-5)

## ⚙️ Part A: Infrastructure Setup (Foundation)

### Task 1: Docker - MinIO Setup
**Priority**: CRITICAL - Must do first  
**File**: `docker-utils/docker-compose.yml`  
**Time**: 30 min

**Steps**:
- [ ] Uncomment MinIO service in docker-compose.yml
- [ ] Configure ports (9000 for API, 9001 for console)
- [ ] Set environment variables (MINIO_ROOT_USER, MINIO_ROOT_PASSWORD)
- [ ] Add healthcheck
- [ ] Add `minio_data` volume
- [ ] Update backend `depends_on` to include MinIO with health condition
- [ ] Start services: `docker-compose up -d`
- [ ] Test access: Open `http://localhost:9001` (login: minioadmin/minioadmin123)

**Why First**: All upload features require MinIO to be running

---

### Task 2: Backend - Environment Configuration  
**Priority**: CRITICAL  
**File**: `backend/.env`  
**Time**: 15 min

**Steps**:
- [ ] Add MinIO connection settings:
  ```env
  MINIO_ENDPOINT=minio:9000
  MINIO_ACCESS_KEY=minioadmin
  MINIO_SECRET_KEY=minioadmin123
  MINIO_SECURE=false
  ```
- [ ] Add upload configuration:
  ```env
  MAX_UPLOAD_SIZE=104857600  # 100MB
  ALLOWED_EXTENSIONS=.log,.txt,.csv
  UPLOAD_RATE_LIMIT=10
  ```

**Why Second**: Code needs these environment variables to configure services

---

### Task 3: Backend - Install Dependencies
**Priority**: CRITICAL  
**File**: `backend/requirements.txt`  
**Time**: 10 min

**Steps**:
- [ ] Add to requirements.txt:
  ```txt
  minio>=7.2.0
  python-magic>=0.4.27
  ```
- [ ] Install: `pip install -r requirements.txt`
- [ ] Verify: `pip list | grep minio`

**Why Third**: Dependencies must be installed before writing code that imports them

---

## 🗄️ Part B: Database Layer

### Task 4: Backend - Create Logs Module Structure
**Priority**: HIGH  
**Time**: 15 min

**Steps**:
- [ ] Create directory structure:
  ```bash
  mkdir -p backend/src/logs backend/src/storage
  touch backend/src/logs/__init__.py
  touch backend/src/logs/models.py
  touch backend/src/logs/schemas.py  
  touch backend/src/logs/service.py
  touch backend/src/logs/router.py
  touch backend/src/logs/validators.py
  touch backend/src/storage/__init__.py
  touch backend/src/storage/minio_client.py
  ```

**Why Fourth**: Organized structure before writing code

---

### Task 5: Backend - Database Model (LogJob)
**Priority**: HIGH  
**File**: `backend/src/logs/models.py`  
**Time**: 45 min

**Steps**:
- [ ] Create `LogJob` model with fields:
  - `job_id` (UUID, primary key)
  - `user_id` (Integer, foreign key)
  - `file_path` (String - MinIO path)
  - `original_filename` (String)
  - `file_size` (Integer)
  - `file_checksum` (String)
  - `status` (Enum: queued/processing/completed/failed)
  - `created_at`, `updated_at`, `completed_at` (DateTime)
  - `error_message` (String, nullable)
  - `retry_count` (Integer)

- [ ] Add relationship to User model:
  ```python
  user = relationship("User", back_populates="log_jobs")
  ```

- [ ] Update `backend/src/auth/models.py` User model:
  ```python
  log_jobs = relationship("LogJob", back_populates="user")
  ```

- [ ] Create migration:
  ```bash
  alembic revision --autogenerate -m "Add log_jobs table"
  alembic upgrade head
  ```

- [ ] Verify: Check database for `log_jobs` table

**Why Fifth**: Database schema must exist before services can write data

---

### Task 6: Backend - Pydantic Schemas
**Priority**: HIGH  
**File**: `backend/src/logs/schemas.py`  
**Time**: 30 min

**Steps**:
- [ ] Create `LogJobCreate` schema (internal use)
- [ ] Create `LogJobResponse` schema (API response)
- [ ] Create `LogJobUploadResponse` schema (upload endpoint response)
- [ ] Add proper types (UUID, datetime, Optional fields)

**Why Sixth**: Schemas define API contract before implementing routes

---

## 💾 Part C: Backend - Storage & Validation

### Task 7: Backend - MinIO Client Wrapper
**Priority**: HIGH  
**File**: `backend/src/storage/minio_client.py`  
**Time**: 2 hours

**Steps**:
- [ ] Create `MinIOClient` class
- [ ] Implement `__init__()` to connect using env vars
- [ ] Implement `create_buckets()` to ensure `raw-logs` and `processed-data` exist
- [ ] Implement file upload strategies:
  - **Small files (< 5MB)**: `upload_small_file()` - direct upload
  - **Medium files (5MB-100MB)**: `upload_stream()` - streaming upload
- [ ] Implement `generate_object_path()`:
  - Pattern: `raw-logs/{user_id}/{year}/{month}/{timestamp}_{uuid}_{filename}`
- [ ] Implement `calculate_checksum()` (SHA256)
- [ ] Implement `set_metadata()` (user_id, upload_date, original_filename, etc.)
- [ ] Implement `verify_upload()` to check integrity
- [ ] Add error handling for connection failures

**Why Seventh**: Storage client needed before validators can upload files

---

### Task 8: Backend - File Validators
**Priority**: HIGH  
**File**: `backend/src/logs/validators.py`  
**Time**: 1.5 hours

**Steps**:
- [ ] Implement `validate_fast()` - Layer 1:
  - Check file extension
  - Validate MIME type
  - Check file size (min 1KB, max 100MB)
  - Raise exception immediately if invalid

- [ ] Implement `sanitize_filename()`:
  - Remove path traversal (`../`)
  - Remove special characters
  - Generate unique name: `{timestamp}_{uuid}_{clean_name}`
  - Limit length to 255 chars

- [ ] Implement `validate_content()` - Layer 2:
  - Read first 1KB
  - Check UTF-8 encoding
  - Verify not empty
  - Basic log format detection

- [ ] Implement `validate_business_logic()`:
  - Check minimum line count (≥1)
  - Optional: duplicate detection (hash-based)
  - Optional: user quota check

**Why Eighth**: Validators used by service layer to ensure data quality

---

## 🔧 Part D: Backend - Business Logic & API

### Task 9: Backend - Job Service Layer
**Priority**: HIGH  
**File**: `backend/src/logs/service.py`  
**Time**: 1 hour

**Steps**:
- [ ] Implement `create_log_job(db, user_id, file_path, filename, size, checksum)`:
  - Generate UUID
  - Create LogJob record with status="queued"
  - Save to database
  - Return job object

- [ ] Implement `get_job_by_id(db, job_id, user_id)`:
  - Query job
  - Verify ownership (user_id matches)
  - Return job or raise 404/403

- [ ] Implement `get_user_jobs(db, user_id, limit=10, offset=0)`:
  - Query all user jobs
  - Order by created_at DESC
  - Support pagination
  - Return list of jobs

**Why Ninth**: Service layer orchestrates database operations

---

### Task 10: Backend - Upload Router (API Endpoints)
**Priority**: HIGH  
**File**: `backend/src/logs/router.py`  
**Time**: 2 hours

**Steps**:
- [ ] Create FastAPI router with prefix `/api/logs`

- [ ] Implement `POST /upload`:
  - Accept `UploadFile` from multipart/form-data
  - Require JWT authentication (dependency)
  - Add rate limiting (10 uploads per 10 min)
  - Flow:
    1. Run fast validators
    2. Sanitize filename
    3. Run content validators
    4. Upload to MinIO via storage client
    5. Create job record via service
    6. Return `LogJobUploadResponse` with job_id

- [ ] Implement `GET /jobs/{job_id}`:
  - Require authentication
  - Get job via service layer (with ownership check)
  - Return `LogJobResponse`

- [ ] Implement `GET /jobs`:
  - Require authentication
  - Get user jobs via service layer
  - Support query params: `?page=1&limit=10`
  - Return list of `LogJobResponse`

- [ ] Add proper error handling:
  - 400: Validation errors
  - 401: Unauthorized
  - 403: Forbidden (not owner)
  - 404: Job not found
  - 413: File too large
  - 429: Rate limit exceeded

**Why Tenth**: Router exposes all functionality via REST API

---

### Task 11: Backend - Register Router
**Priority**: HIGH  
**File**: `backend/src/main.py`  
**Time**: 5 min

**Steps**:
- [ ] Import: `from .logs import router as logs_router`
- [ ] Include: `app.include_router(logs_router.router, tags=["logs"])`
- [ ] Restart backend
- [ ] Test: `curl http://localhost:8000/docs` - verify endpoints appear

**Why Eleventh**: Router must be registered to be accessible

---

## 🎨 Part E: Frontend Implementation

### Task 12: Frontend - Install Dependencies
**Priority**: MEDIUM  
**File**: `frontend/package.json`  
**Time**: 10 min

**Steps**:
- [ ] Install react-dropzone: `npm install react-dropzone`
- [ ] Verify in package.json

**Why Twelfth**: Dependencies needed before building UI

---

### Task 13: Frontend - API Service Functions
**Priority**: MEDIUM  
**File**: `frontend/src/services/api.ts`  
**Time**: 45 min

**Steps**:
- [ ] Add TypeScript interfaces:
  ```typescript
  interface LogJobResponse {
    job_id: string;
    status: string;
    message: string;
    filename: string;
  }

  interface JobDetails {
    job_id: string;
    status: string;
    original_filename: string;
    file_size: number;
    created_at: string;
    updated_at?: string;
    error_message?: string;
  }
  ```

- [ ] Implement `uploadLogFile(file, onProgress)`:
  - Create FormData
  - POST to `/api/logs/upload`
  - Handle progress events
  - Return job response

- [ ] Implement `getJobStatus(jobId)`:
  - GET `/api/logs/jobs/{jobId}`
  - Return job details

- [ ] Implement `getUserJobs()`:
  - GET `/api/logs/jobs`
  - Return array of jobs

**Why Thirteenth**: API layer needed before UI components

---

### Task 14: Frontend - LogUpload Component
**Priority**: MEDIUM  
**File**: `frontend/src/components/LogUpload.tsx`  
**Time**: 2 hours

**Steps**:
- [ ] Use `react-dropzone` for drag-and-drop
- [ ] Add client-side validation:
  - File extension check
  - File size check (max 100MB)
  - Display file info preview
- [ ] Implement upload with progress bar
- [ ] Show success message with job ID
- [ ] Show error messages
- [ ] Add reset/clear functionality
- [ ] Style with CSS

**Why Fourteenth**: Main upload interface for users

---

### Task 15: Frontend - JobList Component
**Priority**: MEDIUM  
**File**: `frontend/src/components/JobList.tsx`  
**Time**: 1.5 hours

**Steps**:
- [ ] Fetch jobs on component mount
- [ ] Display table with columns:
  - Job ID (truncated, clickable)
  - Filename
  - Status (color-coded badges)
  - File size (formatted: KB/MB)
  - Upload time (relative: "2 min ago")
- [ ] Auto-refresh every 5 seconds for active jobs (status=queued/processing)
- [ ] Stop polling when all jobs completed/failed
- [ ] Add pagination if >10 jobs
- [ ] Style table

**Why Fifteenth**: Shows upload history and status tracking

---

### Task 16: Frontend - Dashboard Integration
**Priority**: MEDIUM  
**File**: `frontend/src/components/Dashboard.tsx`  
**Time**: 30 min

**Steps**:
- [ ] Add section: "Upload Log File"
- [ ] Integrate `<LogUpload />` component
- [ ] Add section: "Recent Jobs"
- [ ] Integrate `<JobList />` component
- [ ] Add section styling/layout

**Why Sixteenth**: Makes features accessible in user dashboard

---

## ✅ Part F: Testing & Validation

### Task 17: Backend API Testing
**Priority**: HIGH  
**Time**: 1 hour

**Manual Tests**:
- [ ] Start services: `docker-compose up --build`
- [ ] Verify MinIO console accessible: `http://localhost:9001`
- [ ] Test upload without auth → expect 401
- [ ] Test upload with valid file → expect job_id
- [ ] Test upload file >100MB → expect 413
- [ ] Test upload .pdf file → expect 400
- [ ] Test empty file → expect 400
- [ ] Test GET /jobs/{job_id} → expect job details
- [ ] Test GET /jobs → expect job list
- [ ] Verify database: Job record created with correct data
- [ ] Verify MinIO: File uploaded to correct path
- [ ] Verify MinIO metadata: All fields set correctly

**Why Seventeenth**: Backend must work before testing frontend

---

### Task 18: Frontend UI Testing
**Priority**: MEDIUM  
**Time**: 45 min

**Manual Tests**:
- [ ] Login as regular user
- [ ] Navigate to Dashboard
- [ ] Test drag-and-drop upload
- [ ] Test click-to-upload
- [ ] Verify progress bar shows
- [ ] Verify success message appears
- [ ] Test validation errors (wrong file type, too large)
- [ ] Verify job appears in JobList
- [ ] Verify status auto-updates
- [ ] Test multiple uploads

**Why Eighteenth**: Validates end-user experience

---

### Task 19: End-to-End Integration Testing
**Priority**: HIGH  
**Time**: 1 hour

**Complete Flow**:
- [ ] Fresh start: `docker-compose down -v && docker-compose up --build`
- [ ] Register new user
- [ ] Login
- [ ] Upload sample log file
- [ ] Verify success response
- [ ] Check job in JobList (status: queued)
- [ ] Query database: Verify job record
- [ ] Check MinIO console: Verify file uploaded
- [ ] Download file from MinIO: Verify integrity (checksum)
- [ ] Test rate limiting: Upload 11 files quickly → expect 429 on 11th
- [ ] Test concurrent uploads from 2 users
- [ ] Test error handling: Kill MinIO → upload should fail gracefully

**Why Nineteenth**: Ensures all components work together correctly

---

## 📚 Part G: Documentation

### Task 20: API Documentation
**Priority**: LOW  
**File**: `backend/README.md`  
**Time**: 30 min

**Steps**:
- [ ] Document API endpoints:
  - POST /api/logs/upload
  - GET /api/logs/jobs/{job_id}
  - GET /api/logs/jobs
- [ ] Document request/response formats
- [ ] Document error codes
- [ ] Add curl examples
- [ ] Document environment variables
- [ ] Document file constraints (size, format)

**Why Twentieth**: Helps future development and API consumers

---

## Summary

### Dependencies

**Backend** (`backend/requirements.txt`):
```txt
minio>=7.2.0
python-magic>=0.4.27
```

**Frontend** (`frontend/package.json`):
```json
"react-dropzone": "^14.2.3"
```

### Environment Variables

**Backend** (`.env`):
```env
# MinIO
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_SECURE=false

# Upload
MAX_UPLOAD_SIZE=104857600
ALLOWED_EXTENSIONS=.log,.txt,.csv
UPLOAD_RATE_LIMIT=10
```

### Time Estimate

| Part | Tasks | Time |
|------|-------|------|
| Infrastructure | 1-3 | 1 hour |
| Database | 4-6 | 1.5 hours |
| Storage & Validation | 7-8 | 3.5 hours |
| Business Logic & API | 9-11 | 3 hours |
| Frontend | 12-16 | 5 hours |
| Testing | 17-19 | 3 hours |
| Documentation | 20 | 30 min |
| **Total** | **20 tasks** | **17-18 hours (2-3 days)** |

### Success Criteria

✅ Phase 1 complete when:
- MinIO running and accessible
- Backend uploads files to MinIO with correct structure
- Database stores job records
- User can upload files from frontend
- Files validated (size, type, content)
- Job ID returned immediately
- Job history visible in dashboard
- Status updates automatically
- All services in Docker Compose
- Error handling works
- Tests pass

### Next Steps (Phase 2)

- Redis message queue
- Celery workers
- Async job processing
- LogParser integration
- LogLizer ML models
- Results storage

---

**Last Updated**: 2025-10-05  
**Status**: Ready to implement  
**Priority**: HIGH - Foundation for log processing system
