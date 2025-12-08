# LLM with Session Context - Implementation Guide

**Purpose**: Improve LLM analysis quality by providing full session context

---

## Why Session Context Matters

### Example: Without Context vs With Context

**Scenario**: Anomaly log showing block replication to same IP

#### ❌ Without Context (Current)
```
LLM only sees:
"Receiving block blk_xxx src: 10.250.19.102 dest: 10.250.19.102"

Analysis: "Unusual to replicate to same node"
Quality: 😐 Generic, missing the story
```

#### ✅ With Context (Improved)
```
LLM sees entire session:
Log 1: "Allocating block blk_xxx for write"
Log 2: "Attempting replication to 10.250.19.103"
Log 3: "10.250.19.103 connection timeout"
Log 4: "Attempting replication to 10.250.19.104"
Log 5: "10.250.19.104 unreachable"
Log 6: "Receiving block blk_xxx src: 10.250.19.102 dest: 10.250.19.102" (ANOMALY)

Analysis: "All remote nodes failed, forced to replicate locally.
Indicates cluster-wide network issues or node failures."
Quality: 🎯 Specific, actionable, explains the full story
```

---

## Implementation

### Step 1: Update LLM Service with Context Support

**File**: `backend/src/llm/service.py`

```python
"""
LLM Service with Session Context Support
"""
import os
import json
from typing import Dict, List, Optional
import httpx
from sqlalchemy.orm import Session
from dotenv import load_dotenv

load_dotenv()


class LLMService:
    """LLM service with session context for better analysis."""

    def __init__(self, db: Session = None):
        self.api_key = os.getenv("GROQ_API_KEY")
        if not self.api_key:
            raise ValueError("GROQ_API_KEY not found in environment")

        self.base_url = "https://api.groq.com/openai/v1/chat/completions"
        self.model = "llama-3.1-70b-versatile"
        self.db = db  # Database session for fetching context

    async def analyze_anomaly_with_context(
        self,
        log_entry: Dict,
        block_id: Optional[str] = None,
        event_id: Optional[str] = None,
        job_id: Optional[str] = None
    ) -> Dict:
        """
        Analyze anomaly with full session context.

        Args:
            log_entry: The anomaly log entry
            block_id: Session identifier
            event_id: Event template ID
            job_id: Job ID to fetch other logs from same session

        Returns:
            {
                "explanation": "...",
                "root_causes": [...],
                "severity": "HIGH|MEDIUM|LOW",
                "recommended_actions": [...],
                "session_size": 10  # How many logs in session
            }
        """

        # Fetch session context if available
        session_context = []
        if block_id and job_id and self.db:
            session_context = await self._fetch_session_context(
                job_id=job_id,
                block_id=block_id
            )

        # Build prompt with context
        prompt = self._build_prompt_with_context(
            log_entry=log_entry,
            block_id=block_id,
            event_id=event_id,
            session_context=session_context
        )

        # Call Groq API
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self.base_url,
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": self.model,
                        "messages": [
                            {
                                "role": "system",
                                "content": "You are an expert in HDFS log analysis and anomaly detection. Analyze logs in context of the full session to provide deep insights."
                            },
                            {
                                "role": "user",
                                "content": prompt
                            }
                        ],
                        "temperature": 0.3,
                        "max_tokens": 1500,  # Increased for context
                        "response_format": {"type": "json_object"}
                    }
                )

                response.raise_for_status()
                result = response.json()

                # Parse response
                llm_output = result["choices"][0]["message"]["content"]
                analysis = json.loads(llm_output)

                # Add session size to response
                analysis["session_size"] = len(session_context)

                return analysis

        except Exception as e:
            print(f"Error in LLM analysis: {e}")
            return self._fallback_response()

    async def _fetch_session_context(
        self,
        job_id: str,
        block_id: str
    ) -> List[Dict]:
        """
        Fetch all logs in the same session (same BlockId).

        Args:
            job_id: The processing job ID
            block_id: The session identifier

        Returns:
            List of log entries in chronological order
        """
        from ..jobs.models import ProcessingJob
        from ..storage.minio_client import minio_client
        import pandas as pd
        import tempfile

        try:
            # Get job and CSV file path
            job = self.db.query(ProcessingJob).filter(
                ProcessingJob.id == job_id
            ).first()

            if not job or not job.result_file_path:
                return []

            # Download CSV from MinIO
            csv_data = minio_client.get_object(
                bucket_name="processed-logs",
                object_name=job.result_file_path
            )

            # Read CSV
            temp_csv = tempfile.NamedTemporaryFile(mode='wb', delete=False, suffix='.csv')
            try:
                for chunk in csv_data.stream(32*1024):
                    temp_csv.write(chunk)
                temp_csv.close()

                df = pd.read_csv(temp_csv.name)

                # Filter for this session
                if 'BlockId' in df.columns:
                    session_logs = df[df['BlockId'] == block_id]

                    # Sort by LineId if available
                    if 'LineId' in session_logs.columns:
                        session_logs = session_logs.sort_values('LineId')

                    # Convert to list of dicts (limit to 20 for context)
                    context = session_logs.head(20).to_dict('records')
                    return context
                else:
                    return []

            finally:
                import os
                if os.path.exists(temp_csv.name):
                    os.unlink(temp_csv.name)

        except Exception as e:
            print(f"Error fetching session context: {e}")
            return []

    def _build_prompt_with_context(
        self,
        log_entry: Dict,
        block_id: Optional[str],
        event_id: Optional[str],
        session_context: List[Dict]
    ) -> str:
        """Build enhanced prompt with session context."""

        prompt = f"""Analyze this HDFS anomaly log entry WITH its session context.

TARGET ANOMALY LOG:
- Timestamp: {log_entry.get('Date', 'N/A')} {log_entry.get('Time', 'N/A')}
- Level: {log_entry.get('Level', 'N/A')}
- Content: {log_entry.get('Content', 'N/A')}
- Event ID: {event_id or 'N/A'}

This specific log was FLAGGED AS ANOMALY by our ML model.
"""

        # Add session context if available
        if session_context and len(session_context) > 0:
            prompt += f"""
SESSION CONTEXT ({len(session_context)} logs in session {block_id}):
Below are OTHER logs in the same session/transaction. Use this to understand the full story:

"""
            for idx, log in enumerate(session_context, 1):
                content = log.get('Content', 'N/A')
                level = log.get('Level', 'INFO')
                # Truncate long content
                if len(content) > 150:
                    content = content[:150] + "..."

                prompt += f"{idx}. [{level}] {content}\n"

            prompt += "\n"

        prompt += """
Provide comprehensive analysis in JSON format:
{
  "explanation": "Explain why this specific log is anomaly, considering the session context if available (3-4 sentences)",
  "root_causes": ["Specific cause 1", "Specific cause 2", "Specific cause 3"],
  "severity": "HIGH or MEDIUM or LOW",
  "recommended_actions": ["Specific action 1", "Specific action 2", "Specific action 3"]
}

Analysis guidelines:
1. If session context is available, explain HOW this log fits into the sequence of events
2. Identify the ROOT CAUSE from the session timeline
3. Provide SPECIFIC actions based on what you see in the logs
4. Consider temporal patterns (what happened before/after)
"""

        return prompt

    def _fallback_response(self) -> Dict:
        """Fallback response if LLM fails."""
        return {
            "explanation": "Unable to analyze this log entry. The LLM service encountered an error.",
            "root_causes": ["Service temporarily unavailable"],
            "severity": "UNKNOWN",
            "recommended_actions": ["Please try again later"],
            "session_size": 0
        }


# Singleton with DB support
def get_llm_service(db: Session) -> LLMService:
    """Get LLM service instance with database access."""
    return LLMService(db=db)
```

---

### Step 2: Update Router to Pass Job ID

**File**: `backend/src/llm/router.py`

```python
"""
LLM Router with Session Context Support
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Dict, Optional

from ..auth.dependencies import CurrentUser
from ..database import get_db
from .service import get_llm_service


router = APIRouter(prefix="/api/llm", tags=["LLM Analysis"])


class AnalyzeAnomalyRequest(BaseModel):
    """Request to analyze an anomaly with context."""
    log_entry: Dict
    block_id: Optional[str] = None
    event_id: Optional[str] = None
    job_id: Optional[str] = None  # NEW: To fetch session context


class AnalysisResponse(BaseModel):
    """Enhanced response with session info."""
    explanation: str
    root_causes: List[str]
    severity: str
    recommended_actions: List[str]
    session_size: int  # NEW: Number of logs in session


@router.post("/analyze-anomaly", response_model=AnalysisResponse)
async def analyze_anomaly_with_context(
    request: AnalyzeAnomalyRequest,
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    """
    Analyze anomaly log with full session context.

    Now includes:
    - The target anomaly log
    - All other logs in the same session (same BlockId)
    - Enhanced context for better LLM analysis

    Example request:
    {
      "log_entry": {...},
      "block_id": "blk_-1608999687919862906",
      "event_id": "09a53393",
      "job_id": "2f9317a8-269e-4d1f-9686-0ddf443dbdc0"
    }
    """
    try:
        llm_service = get_llm_service(db)

        analysis = await llm_service.analyze_anomaly_with_context(
            log_entry=request.log_entry,
            block_id=request.block_id,
            event_id=request.event_id,
            job_id=request.job_id
        )

        return analysis

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"LLM analysis failed: {str(e)}"
        )
```

---

### Step 3: Update Frontend to Pass Job ID

**File**: `frontend/src/components/AnomalyAnalysisModal.tsx`

Update the API call to include job_id:

```typescript
// Add jobId prop
interface Props {
  log: any;
  jobId: string;  // NEW: Pass job ID
  onClose: () => void;
}

const AnomalyAnalysisModal = ({ log, jobId, onClose }: Props) => {
  // ... existing state ...

  const analyzeLog = async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("access_token");
      const response = await axios.post(
        "http://localhost:8000/api/llm/analyze-anomaly",
        {
          log_entry: log,
          block_id: log.BlockId,
          event_id: log.EventId,
          job_id: jobId  // NEW: Include job ID for context
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setAnalysis(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  // ... rest of component ...

  // Show session size in UI
  {analysis && (
    <div style={{
      fontSize: '12px',
      color: '#6b7280',
      marginBottom: '16px'
    }}>
      ℹ️ Analyzed with {analysis.session_size} logs in session context
    </div>
  )}
```

**File**: `frontend/src/components/Results.tsx`

Update modal call to pass jobId:

```typescript
{selectedLog && (
  <AnomalyAnalysisModal
    log={selectedLog}
    jobId={jobId}  // NEW: Pass job ID from params
    onClose={() => setSelectedLog(null)}
  />
)}
```

---

## Comparison: Before vs After

### Before (No Context)

**Prompt sent to LLM**:
```
Analyze this HDFS anomaly log entry:

LOG ENTRY:
- Timestamp: 81109 203518
- Level: INFO
- Content: Receiving block blk_xxx src: 10.250.19.102 dest: 10.250.19.102
```

**LLM Response** (generic):
```json
{
  "explanation": "This log shows block replication to the same IP address, which is unusual.",
  "root_causes": [
    "Configuration error",
    "Network issue",
    "Insufficient nodes"
  ],
  "recommended_actions": [
    "Check configuration",
    "Verify network",
    "Add more nodes"
  ]
}
```

### After (With Context)

**Prompt sent to LLM**:
```
Analyze this HDFS anomaly log entry WITH its session context.

TARGET ANOMALY LOG:
- Timestamp: 81109 203518
- Level: INFO
- Content: Receiving block blk_xxx src: 10.250.19.102 dest: 10.250.19.102

SESSION CONTEXT (15 logs in session blk_-1608999687919862906):

1. [INFO] Allocated new block blk_-1608999687919862906 for /user/data.txt
2. [INFO] writeBlock blk_-1608999687919862906 received from client
3. [INFO] Attempting replication to 10.250.19.103:50010
4. [WARN] Connection timeout to 10.250.19.103 after 60000ms
5. [INFO] Attempting replication to 10.250.19.104:50010
6. [ERROR] java.net.ConnectException: Connection refused 10.250.19.104:50010
7. [INFO] Attempting replication to 10.250.19.105:50010
8. [WARN] Connection timeout to 10.250.19.105 after 60000ms
9. [WARN] All remote replication targets failed
10. [INFO] Falling back to local replication
11. [INFO] Receiving block blk_xxx src: 10.250.19.102 dest: 10.250.19.102 (ANOMALY)
12. [INFO] Block blk_-1608999687919862906 of size 134217728 stored locally
13. [WARN] Block under-replicated: desired 3, actual 1
14. [INFO] Added block blk_-1608999687919862906 to replication queue
15. [INFO] writeBlock succeeded for block blk_-1608999687919862906
```

**LLM Response** (specific & actionable):
```json
{
  "explanation": "This anomaly shows a critical replication failure cascade. The system attempted to replicate block blk_-1608999687919862906 to three different DataNodes (103, 104, 105) but all failed due to timeouts or connection refusal. As a last resort, the NameNode accepted local replication (same IP), resulting in only 1 replica instead of the desired 3. This creates data durability risk.",

  "root_causes": [
    "Cluster-wide network partition isolating DataNodes 103, 104, 105 from 102",
    "Simultaneous failure or maintenance of multiple DataNodes",
    "Firewall or security group blocking port 50010 on remote nodes"
  ],

  "severity": "HIGH",

  "recommended_actions": [
    "URGENT: Verify DataNodes 10.250.19.103/104/105 are online: hdfs dfsadmin -report",
    "Check network connectivity from 102 to 103/104/105: telnet <IP> 50010",
    "Review firewall rules blocking port 50010 between nodes",
    "Monitor replication queue: the system queued this block for re-replication when nodes recover",
    "If this pattern persists, add more DataNodes or investigate network infrastructure"
  ],

  "session_size": 15
}
```

---

## Key Improvements

✅ **Context-Aware**: LLM sees the full story, not just one log
✅ **Specific Root Causes**: Identifies actual nodes that failed (103, 104, 105)
✅ **Actionable Steps**: Provides exact commands and IPs to check
✅ **Severity Assessment**: HIGH because 1/3 replication is data loss risk
✅ **Temporal Understanding**: Knows this was a last resort after multiple failures

---

## Performance Considerations

### Token Usage

- **Without context**: ~200 tokens per request
- **With context (15 logs)**: ~600 tokens per request
- **Cost impact**: 3x tokens, but MUCH better quality

### Optimization Strategies

1. **Limit context size**: Only include first 20 logs in session
2. **Truncate long content**: Cut log messages to 150 chars
3. **Cache by session**: If multiple anomalies in same session, reuse analysis

---

## Testing

### Test Case 1: Single Log Session

**Scenario**: Anomaly log has no other logs in session

**Expected**: LLM still works, but uses only single log (no context)

### Test Case 2: Rich Session

**Scenario**: Anomaly is part of 15-log session with clear failure cascade

**Expected**: LLM provides detailed timeline-based analysis

### Test Case 3: Very Large Session

**Scenario**: Session has 1000+ logs

**Expected**: System limits to first 20 logs, still provides context

---

## Summary

**What Changed**:
1. ✅ LLM service now fetches session context from database/MinIO
2. ✅ Prompt includes chronological session logs
3. ✅ Frontend passes job_id to enable context fetching
4. ✅ Response includes session_size to show context depth

**Benefits**:
- 🎯 **Better Quality**: LLM understands the full story
- 📊 **Specific Insights**: Can reference exact failed nodes/IPs
- ⚡ **Actionable**: Knows what happened before/after
- 🔍 **Root Cause**: Can trace causality through session timeline

**Trade-offs**:
- 💰 **Cost**: 3x more tokens (still very cheap with Groq)
- ⏱️ **Latency**: +0.5s to fetch context from MinIO
- 🗄️ **Complexity**: More code, more points of failure

**Recommendation**: **Enable by default** - the quality improvement is worth it!

---

**End of Context Implementation Guide**
