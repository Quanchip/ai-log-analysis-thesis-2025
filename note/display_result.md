# Display Result & Progress Bar Implementation

## Overview
Implement real-time progress tracking for Celery tasks and display results when processing completes.

---

## Backend Tasks

### 1. Create Jobs Router (`backend/src/jobs/router.py`)
Create API endpoints for job management:
- **POST `/api/jobs/create`** - Create and trigger a processing job
- **GET `/api/jobs/{job_id}/status`** - Get job status and progress
- **GET `/api/jobs/{job_id}/result`** - Get job result file
- **GET `/api/jobs/list`** - List all user's jobs

### 2. Update Celery Task with Progress Tracking (`backend/src/celery/celery.py`)
Modify `create_task` to report progress:
- Add `self.update_state()` calls to report progress percentage
- Track progress at different stages:
  - 10% - Job started
  - 30% - File downloaded from MinIO
  - 50% - File content parsed
  - 70% - Processing logic completed
  - 90% - Result uploaded to MinIO
  - 100% - Job completed
- Add error handling and error state reporting

### 3. Create Job Schemas (`backend/src/jobs/schemas.py`)
Define Pydantic models for API requests/responses:
- `CreateJobRequest` - Job creation input
- `JobStatusResponse` - Job status with progress info
- `JobResultResponse` - Job result data
- `JobListItem` - Job summary for list endpoint

### 4. Update Job Service (`backend/src/jobs/service.py`)
Add new service functions:
- `get_job_status(job_id, user_id, db)` - Get job status and progress
- `get_job_result(job_id, user_id, db)` - Get result file from MinIO
- `list_user_jobs(user_id, db)` - List all jobs for a user
- Add user authorization checks

### 5. Register Jobs Router (`backend/src/main.py`)
- Import and include the jobs router
- Ensure CORS allows requests from frontend

---

## Frontend Tasks

### 6. Create API Service Functions (`frontend/src/services/api.js` or new `jobsApi.ts`)
Add API client functions:
- `createJob(fileId)` - Trigger job processing
- `getJobStatus(jobId)` - Poll job status
- `getJobResult(jobId)` - Download result
- `listJobs()` - Get user's jobs list

### 7. Create Progress Display Component (`frontend/src/components/JobProgress.tsx`)
Build progress bar component:
- Accept `jobId` as prop
- Poll job status every 2 seconds using `setInterval`
- Display progress bar (0-100%)
- Show status text (Queued, Processing, Completed, Failed)
- Display "View Result" button when completed
- Handle errors gracefully
- Stop polling when job completes or fails

### 8. Update LogUpload Component (`frontend/src/components/LogUpload.tsx`)
Modify upload flow:
- After successful file upload, automatically trigger job creation
- Store `jobId` in state
- Display `JobProgress` component with the `jobId`
- Show result button when job completes

### 9. Create Result Display Page (`frontend/src/components/ResultPage.tsx`)
Build result viewing page:
- Accept `jobId` from URL params (`/result/:jobId`)
- Fetch and display job result
- Show job metadata (filename, processing time, status)
- Display processed result content
- Option to download result file
- Back button to return to upload page

### 10. Create Jobs List Page (`frontend/src/components/JobsList.tsx`) [Optional]
Build job history page:
- Display table/list of all user's jobs
- Show: filename, status, created date, progress
- Click row to navigate to result page
- Refresh button to update status

### 11. Update App Routing (`frontend/src/App.tsx`)
Add new routes:
- `/result/:jobId` - Result display page
- `/jobs` - Jobs list page (optional)

### 12. Add UI Styling
Style components with Tailwind CSS:
- Progress bar with smooth animations
- Status badges (color-coded by status)
- Responsive design for mobile
- Loading spinners
- Success/error toast notifications

---

## Database Migrations

### 13. Add Progress Field to ProcessingJob Model
Update `backend/src/jobs/models.py`:
- Add `progress` field (Integer, default=0, range 0-100)
- Add `error_message` field (String, nullable, for error details)
- Add timestamps: `created_at`, `started_at`, `completed_at`

### 14. Run Database Migration
- Create Alembic migration or manually update schema
- Test with sample data

---

## Testing Tasks

### 15. Backend Testing
- Test all API endpoints with Postman/curl
- Test progress updates during task execution
- Test error handling (invalid job_id, unauthorized access)
- Test result file retrieval

### 16. Frontend Testing
- Test progress bar updates in real-time
- Test navigation to result page
- Test error states (network errors, job failures)
- Test polling stops after completion
- Test result display for different file types

### 17. Integration Testing
- Upload file → Create job → Watch progress → View result (end-to-end)
- Test concurrent job processing
- Test browser refresh during job processing
- Test authorization across all endpoints

---

## Additional Enhancements (Optional)

### 18. WebSocket Support
- Replace polling with WebSocket for real-time updates
- Implement Socket.IO on backend and frontend
- Push progress updates to client immediately

### 19. Notifications
- Show browser notifications when job completes
- Add toast notifications for status changes
- Email notification for long-running jobs

### 20. Result Visualization
- For log analysis results, add charts/graphs
- Syntax highlighting for log files
- Export results to different formats (JSON, CSV, PDF)

---

## Implementation Order

**Phase 1: Core Backend**
1. Task 13 - Database model updates
2. Task 2 - Update Celery task with progress
3. Task 3 - Create job schemas
4. Task 4 - Update job service
5. Task 1 - Create jobs router
6. Task 5 - Register router in main app

**Phase 2: Core Frontend**
7. Task 6 - Create API service functions
8. Task 7 - Create JobProgress component
9. Task 8 - Update LogUpload component
10. Task 11 - Update App routing
11. Task 9 - Create ResultPage component

**Phase 3: Testing & Polish**
12. Task 15 - Backend testing
13. Task 16 - Frontend testing
14. Task 17 - Integration testing
15. Task 12 - UI styling improvements

**Phase 4: Optional Enhancements**
16. Task 10 - Jobs list page
17. Task 18-20 - Advanced features

---

## Technical Notes

### Progress Tracking in Celery
```python
self.update_state(
    state='PROGRESS',
    meta={
        'current': 50,
        'total': 100,
        'status': 'Processing file...'
    }
)
```

### Polling Strategy
- Poll every 2 seconds while status is QUEUED or PROCESSING
- Stop polling when status is COMPLETED or FAILED
- Use exponential backoff for failed requests
- Cleanup interval on component unmount

### Security Considerations
- Verify job belongs to authenticated user
- Sanitize file paths to prevent directory traversal
- Limit result file size for download
- Rate limit status polling endpoint

---

## Expected Outcome

After implementation:
1. User uploads file → File stored in MinIO
2. System creates processing job → Job queued in Celery
3. Progress bar shows real-time progress (0% → 100%)
4. When complete, "View Result" button appears
5. Click button → Navigate to result page
6. Result page displays processed data with metadata
7. User can download result or return to upload new file
