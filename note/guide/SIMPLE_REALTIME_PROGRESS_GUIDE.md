# Simple Real-Time Progress Bar Implementation Guide

**Goal**: Show real-time upload and processing progress without polling

**Date**: 2025-11-14

---

## Simple Solution: Upload Progress + Server-Sent Events (SSE)

We'll use two mechanisms:
1. **Axios onUploadProgress**: For file upload progress (0-30%)
2. **Server-Sent Events (SSE)**: For Celery processing progress (30-100%)

This is simpler than WebSocket and perfect for one-way real-time updates.

---

## Architecture Flow

```
User uploads file
    ↓
Show upload progress (0-30%) via axios onUploadProgress
    ↓
File uploaded, job created → Returns job_id
    ↓
Connect to SSE endpoint: GET /api/jobs/{job_id}/stream
    ↓
Celery sends progress events:
  - QUEUED: 30%
  - PROCESSING: 60%
  - COMPLETED: 100%
    ↓
Show "View Results" button
```

---

## Backend Implementation

### Step 1: Add SSE Endpoint

**File**: `backend/src/jobs/router.py`

```python
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import asyncio
import json

from ..database import get_db
from ..auth.dependencies import CurrentUser
from ..jobs.models import ProcessingJob, JobStatus
from ..logs.models import LogFile
from ..ml.models import AnalysisResult

router = APIRouter(prefix="/api/jobs", tags=["Jobs"])


@router.get("/{job_id}/stream")
async def stream_job_progress(
    job_id: str,
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    """
    Server-Sent Events endpoint for real-time job progress

    Streams progress updates as they happen
    """
    # Verify job belongs to user
    job = db.query(ProcessingJob).filter(
        ProcessingJob.id == job_id,
        ProcessingJob.user_id == current_user["id"]
    ).first()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    async def event_generator():
        """Generate SSE events"""
        previous_status = None

        # Keep streaming until job completes or fails
        while True:
            # Refresh job from database
            db.refresh(job)

            current_status = job.status

            # Only send event if status changed
            if current_status != previous_status:
                progress_map = {
                    JobStatus.PENDING: {"progress": 30, "message": "Initializing..."},
                    JobStatus.QUEUED: {"progress": 35, "message": "Waiting in queue..."},
                    JobStatus.PROCESSING: {"progress": 60, "message": "Analyzing log file..."},
                    JobStatus.COMPLETED: {"progress": 100, "message": "Analysis complete!"},
                    JobStatus.FAILED: {"progress": 0, "message": "Processing failed"},
                    JobStatus.RETRYING: {"progress": 40, "message": "Retrying..."}
                }

                event_data = {
                    "job_id": job.id,
                    "status": current_status.value,
                    **progress_map.get(current_status, {"progress": 0, "message": "Unknown"})
                }

                # Send SSE event
                yield f"data: {json.dumps(event_data)}\n\n"

                previous_status = current_status

                # Stop streaming if job completed or failed
                if current_status in [JobStatus.COMPLETED, JobStatus.FAILED]:
                    break

            # Wait 1 second before checking again
            await asyncio.sleep(1)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Disable nginx buffering
        }
    )


@router.get("/{job_id}/results")
async def get_job_results(
    job_id: str,
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    """Get ML analysis results for completed job"""
    job = db.query(ProcessingJob).filter(
        ProcessingJob.id == job_id,
        ProcessingJob.user_id == current_user["id"]
    ).first()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status != JobStatus.COMPLETED:
        raise HTTPException(
            status_code=400,
            detail=f"Job is not completed. Status: {job.status.value}"
        )

    analysis = db.query(AnalysisResult).filter(
        AnalysisResult.log_file_id == job.file_id
    ).first()

    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis results not found")

    log_file = db.query(LogFile).filter(LogFile.id == job.file_id).first()

    return {
        "job_id": job.id,
        "filename": log_file.filename if log_file else "Unknown",
        "total_logs": analysis.total_logs,
        "anomaly_count": analysis.anomaly_count,
        "normal_count": analysis.normal_count,
        "anomaly_percentage": analysis.anomaly_percentage,
        "predictions": analysis.predictions,
        "created_at": analysis.created_at.isoformat()
    }
```

---

## Frontend Implementation

### Updated LogUpload.tsx

**File**: `frontend/src/components/LogUpload.tsx`

```typescript
import axios from "axios";
import { ChangeEvent, useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"

type UploadStatus = "idle" | "uploading" | "processing" | "success" | "error"

const LogUpload = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle")
  const [errorMessage, setErrorMessage] = useState<string>("")
  const [isDragging, setIsDragging] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");

  // Server-Sent Events for real-time progress
  useEffect(() => {
    if (!jobId || status !== "processing") return;

    const token = localStorage.getItem("access_token");
    const eventSource = new EventSource(
      `http://localhost:8000/api/jobs/${jobId}/stream?token=${token}`
    );

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      setProgress(data.progress);
      setProgressMessage(data.message);

      if (data.status === "COMPLETED") {
        setStatus("success");
        setErrorMessage("Analysis completed successfully!");
        eventSource.close();
      } else if (data.status === "FAILED") {
        setStatus("error");
        setErrorMessage("Processing failed");
        eventSource.close();
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE Error:", error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [jobId, status]);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      setFile(e.target.files[0])
      setStatus("idle")
      setErrorMessage("")
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
      setStatus('idle');
      setErrorMessage('');
    }
  };

  async function handleFileUpload() {
    if (!file) return;

    setStatus("uploading")
    setErrorMessage("")
    setProgress(0)
    setProgressMessage("Uploading file...")

    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = localStorage.getItem("access_token");
      const response = await axios.post(
        "http://localhost:8000/api/logs/upload",
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`,
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              // File upload takes 0-30% of progress
              const percentCompleted = Math.round(
                (progressEvent.loaded * 30) / progressEvent.total
              );
              setProgress(percentCompleted);
              setProgressMessage(`Uploading file... ${percentCompleted}%`);
            }
          },
        }
      );

      // Upload complete, now processing
      const { job_id } = response.data;
      setJobId(job_id);
      setStatus("processing");
      setProgress(30);
      setProgressMessage("Processing started...");

    } catch (error: any) {
      setStatus("error")
      const message = error.response?.data?.detail || "Upload failed. Please try again."
      setErrorMessage(message)
      console.log(error)
    }
  }

  const removeFile = () => {
    setFile(null);
    setStatus('idle');
    setErrorMessage('');
    setJobId(null);
    setProgress(0);
    setProgressMessage('');
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleViewResults = () => {
    if (jobId) {
      navigate(`/results/${jobId}`);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '50px' }}>
      {/* Drag & Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          border: isDragging ? '2px dashed #3b82f6' : '2px dashed #d1d5db',
          borderRadius: '12px',
          padding: '40px 20px',
          textAlign: 'center',
          backgroundColor: isDragging ? '#eff6ff' : '#f9fafb',
          transition: 'all 0.2s ease',
          cursor: 'pointer',
          marginBottom: '20px'
        }}
      >
        <div style={{ fontSize: '80px', marginBottom: '16px' }}>
          📁
        </div>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '22px', fontWeight: '600', color: '#111827' }}>
          {isDragging ? 'Drop your file here' : 'Upload Log File'}
        </h3>
        <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#6b7280' }}>
          Drag and drop your file here or click to browse
        </p>
        <label
          htmlFor="file-input"
          style={{
            display: 'inline-block',
            padding: '10px 24px',
            backgroundColor: '#3b82f6',
            color: '#fff',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
        >
          Choose File
        </label>
        <input
          id="file-input"
          type="file"
          accept=".log"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <p style={{ margin: '12px 0 0 0', fontSize: '12px', color: '#9ca3af' }}>
          Supported formats: .log
        </p>
      </div>

      {/* File Info Card */}
      {file && (
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', gap: '12px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: '20px'
              }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                  Selected File
                </h4>
                <button
                  onClick={removeFile}
                  style={{
                    padding: '8px',
                    border: 'none',
                    backgroundColor: '#fee2e2',
                    color: '#dc2626',
                    borderRadius: '6px',
                    fontSize: '10px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fecaca'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
                >
                  ✕
                </button>
              </div>
              <div style={{ display: 'grid', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                  <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>Name:</span>
                  <span style={{ fontSize: '14px', color: '#111827', fontWeight: '600', maxWidth: '60%', textAlign: 'right', wordBreak: 'break-word' }}>{file.name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                  <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>Size:</span>
                  <span style={{ fontSize: '14px', color: '#111827', fontWeight: '600' }}>{(file.size / 1024).toFixed(2)} KB</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                  <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>Type:</span>
                  <span style={{ fontSize: '14px', color: '#111827', fontWeight: '600' }}>{file.type || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Upload Button */}
          {status === "idle" && (
            <button
              onClick={handleFileUpload}
              style={{
                width: '100%',
                padding: '12px 24px',
                backgroundColor: '#10b981',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
            >
              Upload File
            </button>
          )}
        </div>
      )}

      {/* Real-time Progress Bar */}
      {(status === "uploading" || status === "processing") && (
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <div style={{
            width: '100%',
            backgroundColor: '#e5e7eb',
            borderRadius: '8px',
            overflow: 'hidden',
            height: '30px'
          }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              backgroundColor: progress === 100 ? '#10b981' : '#3b82f6',
              transition: 'width 0.5s ease, background-color 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: '600',
              fontSize: '14px'
            }}>
              {progress}%
            </div>
          </div>
          <p style={{
            marginTop: '12px',
            textAlign: 'center',
            color: '#6b7280',
            fontSize: '14px'
          }}>
            {progressMessage}
          </p>
        </div>
      )}

      {/* View Results Button */}
      {status === "success" && jobId && (
        <div style={{ marginTop: '20px' }}>
          <button
            onClick={handleViewResults}
            style={{
              width: '100%',
              padding: '12px 24px',
              backgroundColor: '#8b5cf6',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7c3aed'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#8b5cf6'}
          >
            View Results →
          </button>
        </div>
      )}

      {/* Success Message */}
      {status === "success" && (
        <div style={{
          padding: '16px 20px',
          backgroundColor: '#d1fae5',
          border: '1px solid #6ee7b7',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginTop: '20px'
        }}>
          <span style={{ fontSize: '20px' }}>✓</span>
          <div>
            <p style={{ margin: '0', fontSize: '14px', fontWeight: '600', color: '#065f46' }}>
              Upload successful!
            </p>
            {errorMessage && (
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#047857' }}>
                {errorMessage}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {status === "error" && (
        <div style={{
          padding: '16px 20px',
          backgroundColor: '#fee2e2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginTop: '20px'
        }}>
          <span style={{ fontSize: '20px' }}>⚠</span>
          <div>
            <p style={{ margin: '0', fontSize: '14px', fontWeight: '600', color: '#991b1b' }}>
              Upload failed
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#b91c1c' }}>
              {errorMessage}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default LogUpload
```

---

## Key Features

### 1. Upload Progress (0-30%)
- Uses axios `onUploadProgress`
- Shows real-time file upload progress
- Native browser feature, no server changes needed

### 2. Processing Progress (30-100%)
- Uses Server-Sent Events (SSE)
- Real-time updates from Celery
- Simpler than WebSocket (one-way only)

### 3. Progress Mapping
- Upload: 0-30%
- Queue: 30-35%
- Processing: 35-60%
- ML Analysis: 60-100%
- Completed: 100%

---

## Implementation Steps

### Backend

```bash
# 1. Update jobs router with SSE endpoint
# File: backend/src/jobs/router.py

# 2. Restart backend
cd docker-utils
docker-compose restart backend
```

### Frontend

```bash
# 1. Update LogUpload.tsx
# Replace entire file with new version above

# 2. Restart frontend
docker-compose restart frontend
```

---

## Testing

1. Open http://localhost:3002
2. Login
3. Upload a log file
4. Observe:
   - File upload progress (0-30%)
   - Processing message appears instantly
   - Progress updates in real-time
   - "View Results" button appears at 100%

---

## Troubleshooting

### SSE connection fails
- Check CORS settings in backend
- Ensure token is passed correctly
- Check browser console for errors

### Progress stuck
- Check Celery worker logs
- Verify job status in database
- Check Flower UI: http://localhost:5555

---

## Alternative: Simple Polling

If SSE causes issues, use this simpler polling approach:

```typescript
useEffect(() => {
  if (!jobId || status !== "processing") return;

  const interval = setInterval(async () => {
    const response = await axios.get(`/api/jobs/${jobId}/status`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    setProgress(response.data.progress);
    setProgressMessage(response.data.message);

    if (response.data.status === "COMPLETED") {
      clearInterval(interval);
      setStatus("success");
    }
  }, 1000);  // Poll every 1 second

  return () => clearInterval(interval);
}, [jobId, status]);
```

---

**Last Updated**: 2025-11-14
**Status**: Implementation Ready
