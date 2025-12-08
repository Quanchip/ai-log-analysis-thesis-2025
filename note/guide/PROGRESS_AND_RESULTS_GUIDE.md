# Progress Bar & Results Display Implementation Guide

**Goal**: Add upload/processing progress tracking and display ML analysis results

**Date**: 2025-11-14

---

## Overview

This guide implements:
1. **Progress Tracking**: Real-time status updates during file upload and Celery processing
2. **Results Display**: Show ML analysis results (total logs, anomaly count, percentage)
3. **Anomaly Log Viewer**: Clickable boxes for each anomaly (LLM integration placeholder)

---

## Architecture Flow

```
User uploads file
    ↓
LogUpload.tsx
    ↓
POST /api/logs/upload → Returns job_id
    ↓
Poll GET /api/jobs/{job_id} every 2 seconds
    ↓
Show progress: QUEUED → PROCESSING → COMPLETED
    ↓
When COMPLETED: Show "View Results" button
    ↓
Navigate to /results/{job_id}
    ↓
Results page:
  - GET /api/jobs/{job_id}/results
  - Display statistics
  - Show anomaly logs in clickable boxes
```

---

## Backend Changes

### 1. Add Job Status Endpoint

**File**: `backend/src/jobs/router.py`

```python
@router.get("/{job_id}/status")
async def get_job_status(
    job_id: str,
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    """
    Get current status of a processing job

    Returns:
        {
            "job_id": "uuid",
            "status": "PROCESSING",
            "progress": 50,  # Percentage (0-100)
            "message": "Parsing log file..."
        }
    """
    job = db.query(ProcessingJob).filter(
        ProcessingJob.id == job_id,
        ProcessingJob.user_id == current_user["id"]
    ).first()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Calculate progress based on status
    progress_map = {
        JobStatus.PENDING: 0,
        JobStatus.QUEUED: 10,
        JobStatus.PROCESSING: 50,
        JobStatus.COMPLETED: 100,
        JobStatus.FAILED: 0
    }

    status_messages = {
        JobStatus.PENDING: "Initializing...",
        JobStatus.QUEUED: "Waiting in queue...",
        JobStatus.PROCESSING: "Analyzing log file...",
        JobStatus.COMPLETED: "Analysis complete!",
        JobStatus.FAILED: "Processing failed"
    }

    return {
        "job_id": job.id,
        "status": job.status.value,
        "progress": progress_map.get(job.status, 0),
        "message": status_messages.get(job.status, "Unknown status")
    }
```

### 2. Add Results Endpoint

**File**: `backend/src/jobs/router.py`

```python
from ..ml.models import AnalysisResult

@router.get("/{job_id}/results")
async def get_job_results(
    job_id: str,
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    """
    Get ML analysis results for completed job

    Returns analysis statistics and anomaly logs
    """
    # Verify job belongs to user
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

    # Get analysis results
    analysis = db.query(AnalysisResult).filter(
        AnalysisResult.log_file_id == job.file_id
    ).first()

    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis results not found")

    # Get log file info
    log_file = db.query(LogFile).filter(LogFile.id == job.file_id).first()

    return {
        "job_id": job.id,
        "filename": log_file.filename if log_file else "Unknown",
        "total_logs": analysis.total_logs,
        "anomaly_count": analysis.anomaly_count,
        "normal_count": analysis.normal_count,
        "anomaly_percentage": analysis.anomaly_percentage,
        "predictions": analysis.predictions,  # Array of predictions (0=normal, 1=anomaly)
        "created_at": analysis.created_at.isoformat()
    }
```

### 3. Update AnalysisResult Model (if needed)

**File**: `backend/src/ml/models.py`

Ensure the model has a `created_at` field:

```python
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON
from datetime import datetime

class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(Integer, primary_key=True, index=True)
    log_file_id = Column(Integer, ForeignKey("log_files.id"), nullable=False)

    total_logs = Column(Integer, nullable=False)
    anomaly_count = Column(Integer, nullable=False)
    normal_count = Column(Integer, nullable=False)
    anomaly_percentage = Column(Float, nullable=False)

    predictions = Column(JSON, nullable=False)  # Array of 0s and 1s

    created_at = Column(DateTime, default=datetime.utcnow)
```

---

## Frontend Changes

### 1. Update LogUpload.tsx

**File**: `frontend/src/components/LogUpload.tsx`

Add these features:
- Poll job status after upload
- Show progress bar
- Show "View Results" button when completed

**Key additions**:

```typescript
import { useNavigate } from 'react-router-dom';

const LogUpload = () => {
  const navigate = useNavigate();
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");

  // Poll job status
  useEffect(() => {
    if (!jobId || status !== "uploading") return;

    const pollInterval = setInterval(async () => {
      try {
        const token = localStorage.getItem("access_token");
        const response = await axios.get(
          `http://localhost:8000/api/jobs/${jobId}/status`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const { status: jobStatus, progress: jobProgress, message } = response.data;

        setProgress(jobProgress);
        setProgressMessage(message);

        if (jobStatus === "COMPLETED") {
          clearInterval(pollInterval);
          setStatus("success");
        } else if (jobStatus === "FAILED") {
          clearInterval(pollInterval);
          setStatus("error");
          setErrorMessage("Processing failed");
        }
      } catch (error) {
        console.error("Error polling job status:", error);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [jobId, status]);

  async function handleFileUpload() {
    // ... existing upload code ...

    try {
      const response = await axios.post(
        "http://localhost:8000/api/logs/upload",
        formData,
        { headers: { ... } }
      );

      const { job_id } = response.data;
      setJobId(job_id);
      setStatus("uploading"); // Keep in uploading state while processing

    } catch (error) {
      // ... error handling ...
    }
  }

  const handleViewResults = () => {
    navigate(`/results/${jobId}`);
  };

  return (
    <div>
      {/* ... existing upload UI ... */}

      {/* Progress Bar */}
      {status === "uploading" && jobId && (
        <div style={{ marginTop: '20px' }}>
          <div style={{
            width: '100%',
            backgroundColor: '#e5e7eb',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${progress}%`,
              height: '30px',
              backgroundColor: '#3b82f6',
              transition: 'width 0.5s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: '600'
            }}>
              {progress}%
            </div>
          </div>
          <p style={{ marginTop: '8px', textAlign: 'center', color: '#6b7280' }}>
            {progressMessage}
          </p>
        </div>
      )}

      {/* View Results Button */}
      {status === "success" && jobId && (
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
            marginTop: '20px'
          }}
        >
          View Results
        </button>
      )}
    </div>
  );
};
```

### 2. Create Results Page

**File**: `frontend/src/components/Results.tsx`

```typescript
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

interface AnalysisResults {
  job_id: string;
  filename: string;
  total_logs: number;
  anomaly_count: number;
  normal_count: number;
  anomaly_percentage: number;
  predictions: number[];
  created_at: string;
}

const Results = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [results, setResults] = useState<AnalysisResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const token = localStorage.getItem("access_token");
        const response = await axios.get(
          `http://localhost:8000/api/jobs/${jobId}/results`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setResults(response.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || "Failed to load results");
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [jobId]);

  if (loading) {
    return (
      <div style={{ padding: '50px', textAlign: 'center' }}>
        <h2>Loading results...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '50px', textAlign: 'center' }}>
        <h2 style={{ color: '#dc2626' }}>Error: {error}</h2>
        <button onClick={() => navigate('/dashboard')} style={{ marginTop: '20px' }}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (!results) return null;

  // Get indices of anomaly logs
  const anomalyIndices = results.predictions
    .map((pred, idx) => (pred === 1 ? idx : -1))
    .filter(idx => idx !== -1);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '50px' }}>
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            marginBottom: '20px'
          }}
        >
          ← Back to Dashboard
        </button>
        <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#111827' }}>
          Analysis Results
        </h1>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>
          File: {results.filename} | Analyzed: {new Date(results.created_at).toLocaleString()}
        </p>
      </div>

      {/* Statistics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '40px'
      }}>
        <div style={{
          backgroundColor: '#fff',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '2px solid #e5e7eb'
        }}>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Total Logs</p>
          <p style={{ fontSize: '36px', fontWeight: '700', color: '#111827' }}>
            {results.total_logs.toLocaleString()}
          </p>
        </div>

        <div style={{
          backgroundColor: '#fef3c7',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '2px solid #fbbf24'
        }}>
          <p style={{ fontSize: '14px', color: '#92400e', marginBottom: '8px' }}>Anomalies Detected</p>
          <p style={{ fontSize: '36px', fontWeight: '700', color: '#b45309' }}>
            {results.anomaly_count.toLocaleString()}
          </p>
        </div>

        <div style={{
          backgroundColor: '#d1fae5',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '2px solid #10b981'
        }}>
          <p style={{ fontSize: '14px', color: '#065f46', marginBottom: '8px' }}>Normal Logs</p>
          <p style={{ fontSize: '36px', fontWeight: '700', color: '#047857' }}>
            {results.normal_count.toLocaleString()}
          </p>
        </div>

        <div style={{
          backgroundColor: '#fee2e2',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '2px solid #ef4444'
        }}>
          <p style={{ fontSize: '14px', color: '#991b1b', marginBottom: '8px' }}>Anomaly Rate</p>
          <p style={{ fontSize: '36px', fontWeight: '700', color: '#dc2626' }}>
            {results.anomaly_percentage.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Anomaly Logs Section */}
      <div style={{
        backgroundColor: '#fff',
        padding: '24px',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>
          Anomaly Logs ({results.anomaly_count})
        </h2>

        {anomalyIndices.length === 0 ? (
          <p style={{ color: '#6b7280', textAlign: 'center', padding: '40px' }}>
            No anomalies detected in this log file.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: '12px', maxHeight: '600px', overflowY: 'auto' }}>
            {anomalyIndices.map((logIndex) => (
              <div
                key={logIndex}
                onClick={() => alert(`LLM suggestion for log #${logIndex + 1} - Coming soon!`)}
                style={{
                  padding: '16px',
                  backgroundColor: '#fef3c7',
                  border: '1px solid #fbbf24',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#fde68a';
                  e.currentTarget.style.transform = 'translateX(4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#fef3c7';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '600', color: '#92400e' }}>
                    Log #{logIndex + 1}
                  </span>
                  <span style={{ fontSize: '12px', color: '#b45309' }}>
                    Click for LLM suggestion →
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: '#78350f', marginTop: '8px' }}>
                  Index: {logIndex} | Status: Anomaly
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Results;
```

### 3. Add Routing

**File**: `frontend/src/App.tsx`

```typescript
import Results from './components/Results';

// Inside Routes:
<Route
  path="/results/:jobId"
  element={
    <ProtectedRoute>
      <Results />
    </ProtectedRoute>
  }
/>
```

---

## Implementation Steps

### Step 1: Backend Setup

```bash
# 1. Add status endpoint to jobs router
# Edit: backend/src/jobs/router.py
# Add the get_job_status endpoint

# 2. Add results endpoint to jobs router
# Edit: backend/src/jobs/router.py
# Add the get_job_results endpoint

# 3. Update AnalysisResult model if needed
# Edit: backend/src/ml/models.py
# Ensure created_at field exists

# 4. Restart backend
cd docker-utils
docker-compose restart backend
```

### Step 2: Frontend Setup

```bash
# 1. Update LogUpload.tsx
# Edit: frontend/src/components/LogUpload.tsx
# Add progress tracking and View Results button

# 2. Create Results component
# Create: frontend/src/components/Results.tsx

# 3. Add routing
# Edit: frontend/src/App.tsx
# Add /results/:jobId route

# 4. Restart frontend
docker-compose restart frontend
```

### Step 3: Testing

```bash
# 1. Open frontend: http://localhost:3002
# 2. Login with your account
# 3. Upload a log file
# 4. Observe:
#    - Progress bar appears
#    - Status updates: "Waiting in queue..." → "Analyzing log file..."
#    - Progress: 10% → 50% → 100%
#    - "View Results" button appears
# 5. Click "View Results"
# 6. Verify:
#    - Statistics display correctly
#    - Anomaly logs are listed
#    - Clicking anomaly shows "Coming soon" alert
```

---

## Key Points

### Progress Tracking
- Uses **polling** (not WebSockets) for simplicity
- Polls every 2 seconds
- Cleans up interval on unmount
- Updates progress bar smoothly with CSS transitions

### Status Mapping
- `PENDING`: 0% - "Initializing..."
- `QUEUED`: 10% - "Waiting in queue..."
- `PROCESSING`: 50% - "Analyzing log file..."
- `COMPLETED`: 100% - "Analysis complete!"

### Error Handling
- Shows error message if job fails
- Handles 404 if job not found
- Clears polling interval on error
- User can retry by uploading again

### Future Enhancements (LLM Integration)
- Replace alert with modal/drawer
- Fetch LLM suggestion from new endpoint: `POST /api/ml/suggest`
- Pass log content and anomaly context
- Display actionable recommendations
- Cache suggestions to avoid re-requesting

---

## File Structure Summary

```
backend/src/
├── jobs/
│   └── router.py          # + get_job_status, get_job_results
├── ml/
│   └── models.py          # Ensure created_at field

frontend/src/
├── components/
│   ├── LogUpload.tsx      # + Progress bar, polling, View Results
│   └── Results.tsx        # NEW: Results display page
└── App.tsx                # + /results/:jobId route
```

---

## Troubleshooting

### Progress bar stuck at 10%
- Check Celery worker logs: `docker-compose logs celery-worker`
- Verify task is processing: http://localhost:5555 (Flower)
- Check job status in database

### "Analysis results not found" error
- Verify AnalysisResult was created in Celery task
- Check database: `SELECT * FROM analysis_results;`
- Ensure ML prediction completed successfully

### Anomaly logs not displaying
- Verify `predictions` array exists in response
- Check browser console for errors
- Ensure predictions is JSON array: `[0, 1, 0, 1, ...]`

---

## Next Steps

1. **Implement LLM Suggestion**:
   - Create `/api/ml/suggest` endpoint
   - Integrate OpenAI/Claude API
   - Generate actionable recommendations

2. **Add WebSocket for Real-time Updates**:
   - Replace polling with WebSocket connection
   - Push status updates instantly
   - More efficient than polling

3. **Export Results**:
   - Download results as PDF
   - Export anomaly logs as CSV
   - Generate detailed report

4. **Enhanced Visualization**:
   - Chart for anomaly distribution over time
   - Timeline view of anomalies
   - Severity levels for anomalies

---

**Last Updated**: 2025-11-14
**Status**: Implementation Ready
