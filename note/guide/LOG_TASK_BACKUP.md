# LOG UPLOAD & PROCESSING - Initial Implementation Tasks

**Objective**: Implement log file upload, storage to MinIO, and async processing queue (Steps 1-5 from log_process_steps.md)

---

## PHASE 1: UPLOAD FILE 📤 (Steps 1-5)

### Task 1: Frontend - Upload UI Component
**File**: `frontend/src/components/LogUpload.tsx`

- [ ] Create file upload component with drag-and-drop support
- [ ] Add client-side validation:
  - [ ] File extension check (`.log`, `.txt`, `.csv`)
  - [ ] File size limit (max 100MB)
  - [ ] Display file info before upload
- [ ] Implement upload progress bar
- [ ] Show error messages for invalid files
- [ ] Display success message with job ID after upload
- [ ] Add upload button to user dashboard

**API Integration**:
```typescript
POST /api/logs/upload
Content-Type: multipart/form-data
Headers: Authorization: Bearer <token>
```

**Acceptance Criteria**:
- User can drag & drop or click to select file
- Invalid files are rejected before upload
- Upload progress shows 0-100%
- Job ID is returned on success

---

### Task 2: Backend - Upload Endpoint Setup
**File**: `backend/src/logs/router.py` (new module)

- [ ] Create `logs` module structure:
  - [ ] `backend/src/logs/__init__.py`
  - [ ] `backend/src/logs/router.py`
  - [ ] `backend/src/logs/service.py`
  - [ ] `backend/src/logs/schemas.py`
  - [ ] `backend/src/logs/models.py`
- [ ] Implement `POST /api/logs/upload` endpoint
- [ ] Add authentication middleware (JWT required)
- [ ] Add rate limiting (max 10 uploads per 10 minutes per user)
- [ ] Return job ID immediately (async pattern)

**Endpoint Response**:
```json
{
  "job_id": "uuid-here",
  "status": "queued",
  "message": "File uploaded successfully, processing started",
  "filename": "app.log"
}
```

---

### Task 3: Backend - File Validation Layer
**File**: `backend/src/logs/validators.py` (new file)

**Layer 1 - Fast Checks**:
- [ ] Check file extension (`.log`, `.txt`, `.csv` only)
- [ ] Validate MIME type from headers
- [ ] Check file size (min 1KB, max 100MB)
- [ ] Reject immediately if validation fails

**Layer 2 - Deep Checks**:
- [ ] Sanitize filename:
  - [ ] Remove path traversal characters (`../`, `..\\`)
  - [ ] Remove special characters
  - [ ] Generate unique filename: `{timestamp}_{uuid}_{sanitized_name}`
  - [ ] Limit filename length (max 255 chars)
- [ ] Content validation:
  - [ ] Read first 1KB of file
  - [ ] Verify UTF-8 encoding
  - [ ] Check if file is not empty
  - [ ] Basic log format detection

**Business Logic Validation**:
- [ ] Check minimum line count (at least 1 line)
- [ ] Check for duplicate uploads (optional: hash-based)
- [ ] Validate user quota (optional: max storage per user)

---

### Task 4: Backend - MinIO Integration
**File**: `backend/src/storage/minio_client.py` (new module)

- [ ] Create MinIO client wrapper
- [ ] Implement connection to MinIO server
- [ ] Create buckets if not exist:
  - [ ] `raw-logs` - for uploaded files
  - [ ] `processed-data` - for results (future)
- [ ] Implement upload strategies based on file size:

  **Small files (< 5MB)**:
  - [ ] Direct upload to MinIO

  **Medium files (5MB - 100MB)**:
  - [ ] Stream upload to MinIO

  **Large files (> 100MB)** (future):
  - [ ] Multipart upload support

- [ ] Generate MinIO object path: `raw-logs/{user_id}/{year}/{month}/{timestamp}_{uuid}_{filename}`
- [ ] Calculate and store file checksum (MD5 or SHA256)
- [ ] Set object metadata:
  - [ ] `user_id`
  - [ ] `upload_date`
  - [ ] `original_filename`
  - [ ] `file_size`
  - [ ] `checksum`
- [ ] Verify upload integrity (checksum match)
- [ ] Return MinIO file path/URL

**Environment Variables** (`.env`):
```env
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_SECURE=false
```

**Dependencies**:
```txt
minio>=7.2.0
```

---

### Task 5: Backend - Database Models for Jobs
**File**: `backend/src/logs/models.py`

- [ ] Create `LogJob` model with fields:
  ```python
  class LogJob(Base):
      __tablename__ = "log_jobs"

      job_id: UUID (primary key)
      user_id: Integer (foreign key to users)
      file_path: String (MinIO path)
      original_filename: String
      file_size: Integer (bytes)
      file_checksum: String
      status: Enum ("queued", "processing", "completed", "failed")
      created_at: DateTime
      updated_at: DateTime (nullable)
      completed_at: DateTime (nullable)
      error_message: String (nullable)
      retry_count: Integer (default 0)

      # Relationships
      user: relationship to User model
  ```

- [ ] Create migration for `log_jobs` table
- [ ] Add indexes:
  - [ ] `user_id` (for querying user's jobs)
  - [ ] `status` (for filtering by status)
  - [ ] `created_at` (for sorting)

**Migration Command**:
```bash
alembic revision --autogenerate -m "Add log_jobs table"
alembic upgrade head
```

---

### Task 6: Backend - Job Creation Service
**File**: `backend/src/logs/service.py`

- [ ] Implement `create_log_job()` function:
  - [ ] Generate unique job ID (UUID)
  - [ ] Save job to database with status "queued"
  - [ ] Link job to uploaded file path
  - [ ] Link job to authenticated user
  - [ ] Set timestamps (created_at)
  - [ ] Return job object

- [ ] Implement `get_job_status()` function:
  - [ ] Query job by job_id
  - [ ] Verify user owns the job (authorization)
  - [ ] Return job details

**Schema** (`backend/src/logs/schemas.py`):
```python
class LogJobCreate(BaseModel):
    filename: str
    file_size: int
    file_path: str
    file_checksum: str

class LogJobResponse(BaseModel):
    job_id: UUID
    status: str
    original_filename: str
    file_size: int
    created_at: datetime
    updated_at: Optional[datetime]
    progress: Optional[int]
    error_message: Optional[str]
```

---

### Task 7: Docker - MinIO Setup
**File**: `docker-utils/docker-compose.yml`

- [ ] Uncomment and configure MinIO service:
  ```yaml
  minio:
    image: minio/minio:latest
    container_name: minio
    ports:
      - "9000:9000"  # API
      - "9001:9001"  # Web Console
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin123
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data
    networks:
      - thesis-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 10s
      retries: 3
  ```

- [ ] Add volume for MinIO data:
  ```yaml
  volumes:
    minio_data:
  ```

- [ ] Update backend service to depend on MinIO:
  ```yaml
  backend:
    depends_on:
      postgres:
        condition: service_healthy
      minio:
        condition: service_healthy
  ```

- [ ] Test MinIO access at `http://localhost:9001`

---

### Task 8: Backend - Update Main App
**File**: `backend/src/main.py`

- [ ] Import and include logs router:
  ```python
  from .logs import router as logs_router

  app.include_router(logs_router.router)
  ```

- [ ] Add CORS origins if needed for file uploads
- [ ] Verify multipart/form-data support

---

### Task 9: Frontend - API Service for Upload
**File**: `frontend/src/services/api.ts`

- [ ] Create `uploadLogFile()` function:
  ```typescript
  export const uploadLogFile = async (file: File): Promise<LogJobResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.post('/api/logs/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${getToken()}`
      },
      onUploadProgress: (progressEvent) => {
        // Handle progress
      }
    });

    return response.data;
  };
  ```

- [ ] Create `getJobStatus()` function:
  ```typescript
  export const getJobStatus = async (jobId: string): Promise<LogJobResponse> => {
    const response = await axios.get(`/api/logs/jobs/${jobId}`);
    return response.data;
  };
  ```

---

### Task 10: Frontend - User Dashboard Integration
**File**: `frontend/src/components/Dashboard.tsx`

- [ ] Add "Upload Log File" section to dashboard
- [ ] Integrate `LogUpload` component
- [ ] Display list of user's recent jobs
- [ ] Show job status for each upload:
  - [ ] Job ID
  - [ ] Filename
  - [ ] Status (queued/processing/completed/failed)
  - [ ] Upload timestamp
  - [ ] File size
- [ ] Add auto-refresh for job status (poll every 5 seconds)

---

### Task 11: Testing - End-to-End Upload Flow
**Manual Testing Checklist**:

- [ ] Start all services: `docker-compose up --build`
- [ ] Verify MinIO is accessible at `http://localhost:9001`
- [ ] Login to MinIO console (minioadmin/minioadmin123)
- [ ] Login to frontend as regular user
- [ ] Upload a small log file (< 1MB):
  - [ ] Verify file validation works
  - [ ] Verify upload progress shows
  - [ ] Verify job ID is returned
- [ ] Check database:
  - [ ] Job record created with status "queued"
  - [ ] File path is correct
- [ ] Check MinIO:
  - [ ] File uploaded to `raw-logs` bucket
  - [ ] File path matches database
  - [ ] Metadata is set correctly
- [ ] Test error cases:
  - [ ] Upload file > 100MB (should fail)
  - [ ] Upload non-log file (should fail)
  - [ ] Upload without authentication (should fail 401)

---

### Task 12: Documentation
**File**: `backend/README.md` and `frontend/README.md`

- [ ] Document upload API endpoint
- [ ] Document file size limits
- [ ] Document supported file formats
- [ ] Document MinIO configuration
- [ ] Add environment variable documentation
- [ ] Add example curl commands for testing

---

## Dependencies to Add

### Backend (`backend/requirements.txt`)
```txt
minio>=7.2.0
python-magic>=0.4.27  # For MIME type detection
```

### Frontend (`frontend/package.json`)
```json
{
  "dependencies": {
    "react-dropzone": "^14.2.3"  // For drag-and-drop upload
  }
}
```

---

## Environment Variables Summary

### Backend (`.env`)
```env
# Existing
DB_HOST=postgres
DB_PORT=5432
DB_NAME=myproject
DB_USER=postgres
DB_PASSWORD=password
SECRET_KEY=025ee95f1b360868c969aa2e8fcb280e

# New - MinIO
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_SECURE=false

# New - Upload Settings
MAX_UPLOAD_SIZE=104857600  # 100MB in bytes
ALLOWED_EXTENSIONS=.log,.txt,.csv
UPLOAD_RATE_LIMIT=10  # uploads per 10 minutes
```

---

## Success Criteria

**Phase 1 Complete When**:
✅ User can upload log file from frontend
✅ File is validated (size, type, format)
✅ File is stored in MinIO with proper structure
✅ Job record is created in database with "queued" status
✅ Job ID is returned to user immediately
✅ User can view their upload history
✅ All services run in Docker Compose
✅ Basic error handling works (file too large, wrong format, etc.)

---

## Next Phase Preview

**Phase 2** (Steps 6-11) will include:
- Redis message queue setup
- Celery worker implementation
- Async job processing
- LogParser integration
- Results storage

**Estimated Time**:
- Phase 1: 2-3 days
- Each task: 30min - 2 hours depending on complexity

---

## Notes

- Start with small files (< 1MB) for initial testing
- Add comprehensive logging at each step
- Use transactions for database operations
- Handle all errors gracefully
- Return meaningful error messages to users
- Consider rate limiting to prevent abuse
- MinIO bucket structure is critical for organization
- Keep file validation strict for security

---

**Last Updated**: 2025-10-04
**Status**: Ready to implement
**Priority**: High - Foundation for entire log processing system
