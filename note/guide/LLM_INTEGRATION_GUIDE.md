# LLM Integration Guide for Log Analysis
**Author**: Claude AI Assistant
**Date**: 2024-11-18
**For**: AI Log Analysis Thesis Project

---

## Table of Contents
1. [What is LLM and Why Use It?](#1-what-is-llm-and-why-use-it)
2. [Free LLM API Options](#2-free-llm-api-options)
3. [Recommended Choice: Groq](#3-recommended-choice-groq)
4. [Implementation Architecture](#4-implementation-architecture)
5. [Step-by-Step Implementation](#5-step-by-step-implementation)
6. [Testing the Integration](#6-testing-the-integration)
7. [Cost Optimization Tips](#7-cost-optimization-tips)

---

## 1. What is LLM and Why Use It?

### What is LLM?
**LLM (Large Language Model)** là mô hình AI được train trên lượng lớn text data, có khả năng:
- **Hiểu context**: Đọc và hiểu nội dung phức tạp
- **Phân tích**: Tìm patterns, nguyên nhân, và mối liên hệ
- **Giải thích**: Tạo ra explanations dễ hiểu cho con người
- **Đề xuất**: Suggest actions dựa trên kiến thức

### Why Use LLM for Log Analysis?

**Problem**: ML model chỉ cho biết log nào là anomaly (1 or 0), nhưng không giải thích tại sao.

**Solution with LLM**:
```
User sees: "Log #123 is anomaly"
❌ Without LLM: User doesn't know why or what to do

User sees: "Log #123 is anomaly" → Clicks → LLM Analysis
✅ With LLM:
   - Why: "Block replication failed due to timeout"
   - Root Cause: "Network connectivity issue between nodes"
   - Action: "Check network status and retry replication"
```

### Example for Your Log

**Input Log**:
```
Time: 81109 203518
Level: INFO
Content: Receiving block blk_-1608999687919862906 src: /10.250.19.102:54106 dest: /10.250.19.102:50010
Event ID: 09a53393
```

**LLM Analysis Output** (example):
```json
{
  "explanation": "This log shows a block replication operation in HDFS. It was flagged as anomaly because the source and destination IPs are the same (10.250.19.102), which is unusual - blocks are typically replicated to different nodes for redundancy.",

  "root_causes": [
    "Insufficient DataNode availability",
    "Network isolation of other nodes",
    "Configuration issue with replication factor"
  ],

  "severity": "MEDIUM",

  "recommended_actions": [
    "Check if other DataNodes are online and healthy",
    "Verify network connectivity between nodes",
    "Review HDFS replication configuration (dfs.replication)"
  ]
}
```

---

## 2. Free LLM API Options

### Comparison Table

| Provider | Free Tier | Speed | Quality | Setup Difficulty | Best For |
|----------|-----------|-------|---------|------------------|----------|
| **Groq** | 14,400 requests/day | ⚡⚡⚡ Very Fast | ⭐⭐⭐ Good | ✅ Easy | **Recommended** |
| Google Gemini | 60 requests/min | ⚡⚡ Medium | ⭐⭐⭐⭐ Excellent | ✅ Easy | High quality |
| Hugging Face | 1000 requests/day | ⚡ Slow | ⭐⭐ Fair | 🟨 Medium | Testing |
| Ollama (Local) | Unlimited | ⚡ Depends on GPU | ⭐⭐⭐ Good | 🔴 Hard | Privacy |

### Why Groq? (Recommended)

**Groq** is the best choice for beginners:

✅ **Pros**:
- **Super fast**: Responses in ~300ms
- **Free tier**: 14,400 requests per day (enough for development)
- **Easy API**: Similar to OpenAI, simple to use
- **No credit card**: Just sign up with email

❌ **Cons**:
- Slightly lower quality than GPT-4 (but still very good)
- Rate limits on free tier

---

## 3. Recommended Choice: Groq

### Get Free API Key

1. Go to: https://console.groq.com/
2. Sign up with email (no credit card needed)
3. Navigate to "API Keys"
4. Click "Create API Key"
5. Copy your key: `gsk_xxxxxxxxxxxxxxxxxxxxxxxxxx`

### Available Models

Groq provides several models:

| Model Name | Speed | Quality | Best Use Case |
|------------|-------|---------|---------------|
| `llama-3.1-70b-versatile` | Fast | High | **Recommended for log analysis** |
| `llama-3.1-8b-instant` | Very Fast | Medium | Quick responses |
| `mixtral-8x7b-32768` | Fast | High | Long context |

**Recommendation**: Use `llama-3.1-70b-versatile` for best balance.

---

## 4. Implementation Architecture

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ User clicks anomaly log
                              ▼
                    ┌─────────────────────┐
                    │  POST /api/llm/     │
                    │  analyze-anomaly    │
                    │                     │
                    │  Body: {            │
                    │    log_entry: {...},│
                    │    block_id: "xxx", │
                    │    event_id: "yyy"  │
                    │  }                  │
                    └──────────┬──────────┘
                              │
┌─────────────────────────────▼─────────────────────────────────┐
│                      BACKEND API                               │
│  backend/src/llm/router.py                                     │
└───────────────────────────┬────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │   LLM Service                         │
        │   backend/src/llm/service.py          │
        │                                        │
        │   1. Build context prompt             │
        │   2. Call Groq API                    │
        │   3. Parse response                   │
        │   4. Return structured analysis       │
        └───────────────────┬───────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │   Groq API    │
                    │  (LLM Model)  │
                    └───────┬───────┘
                            │
                            ▼ JSON Response
        ┌───────────────────────────────────────┐
        │  {                                     │
        │    "explanation": "...",               │
        │    "root_causes": [...],               │
        │    "severity": "HIGH/MEDIUM/LOW",      │
        │    "recommended_actions": [...]        │
        │  }                                     │
        └───────────────────┬───────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│   Display in modal/panel with nice formatting                   │
└─────────────────────────────────────────────────────────────────┘
```

### File Structure

```
backend/src/llm/
├── __init__.py
├── service.py          # Core LLM logic
├── router.py           # API endpoints
├── schemas.py          # Pydantic models
└── prompts.py          # Prompt templates

frontend/src/components/
└── AnomalyAnalysisModal.tsx  # Display LLM results
```

---

## 5. Step-by-Step Implementation

### Step 1: Backend - Create LLM Service

**File**: `backend/src/llm/service.py`

```python
"""
LLM Service for analyzing anomaly logs.
Uses Groq API (free tier) for fast inference.
"""
import os
import json
from typing import Dict, Optional
import httpx
from dotenv import load_dotenv

load_dotenv()


class LLMService:
    """
    Service to analyze anomaly logs using LLM.

    Simple usage:
        llm = LLMService()
        result = await llm.analyze_anomaly(log_entry)
        print(result["explanation"])
    """

    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY")
        if not self.api_key:
            raise ValueError("GROQ_API_KEY not found in environment")

        self.base_url = "https://api.groq.com/openai/v1/chat/completions"
        self.model = "llama-3.1-70b-versatile"

    async def analyze_anomaly(
        self,
        log_entry: Dict,
        block_id: Optional[str] = None,
        event_id: Optional[str] = None
    ) -> Dict:
        """
        Analyze a single anomaly log entry.

        Args:
            log_entry: Dict with fields like Date, Time, Level, Content
            block_id: Optional session/block identifier
            event_id: Optional event template ID

        Returns:
            {
                "explanation": "Why this is anomaly",
                "root_causes": ["cause 1", "cause 2"],
                "severity": "HIGH|MEDIUM|LOW",
                "recommended_actions": ["action 1", "action 2"]
            }
        """

        # Build prompt
        prompt = self._build_prompt(log_entry, block_id, event_id)

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
                                "content": "You are an expert in HDFS log analysis and anomaly detection. Provide clear, actionable insights."
                            },
                            {
                                "role": "user",
                                "content": prompt
                            }
                        ],
                        "temperature": 0.3,  # Low temperature for consistent analysis
                        "max_tokens": 1000,
                        "response_format": {"type": "json_object"}  # Force JSON output
                    }
                )

                response.raise_for_status()
                result = response.json()

                # Parse LLM response
                llm_output = result["choices"][0]["message"]["content"]
                analysis = json.loads(llm_output)

                return analysis

        except httpx.HTTPError as e:
            print(f"HTTP error calling Groq API: {e}")
            return self._fallback_response()
        except Exception as e:
            print(f"Error in LLM analysis: {e}")
            return self._fallback_response()

    def _build_prompt(
        self,
        log_entry: Dict,
        block_id: Optional[str],
        event_id: Optional[str]
    ) -> str:
        """Build the prompt for LLM."""

        prompt = f"""Analyze this HDFS anomaly log entry and provide structured insights.

LOG ENTRY:
- Timestamp: {log_entry.get('Date', 'N/A')} {log_entry.get('Time', 'N/A')}
- Level: {log_entry.get('Level', 'N/A')}
- Content: {log_entry.get('Content', 'N/A')}
- Block ID: {block_id or 'N/A'}
- Event ID: {event_id or 'N/A'}

This log was flagged as ANOMALY by our ML model (trained on normal HDFS patterns).

Provide analysis in JSON format:
{{
  "explanation": "Brief explanation why this is anomaly (2-3 sentences)",
  "root_causes": ["Possible cause 1", "Possible cause 2", "Possible cause 3"],
  "severity": "HIGH or MEDIUM or LOW",
  "recommended_actions": ["Action 1", "Action 2", "Action 3"]
}}

Focus on:
1. Why this log pattern is unusual
2. What system issues might cause this
3. What the administrator should do next
"""
        return prompt

    def _fallback_response(self) -> Dict:
        """Fallback response if LLM fails."""
        return {
            "explanation": "Unable to analyze this log entry at the moment. The LLM service encountered an error.",
            "root_causes": ["Service temporarily unavailable"],
            "severity": "UNKNOWN",
            "recommended_actions": ["Please try again later or contact support"]
        }


# Singleton instance
_llm_service: Optional[LLMService] = None

def get_llm_service() -> LLMService:
    """Get singleton LLM service instance."""
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service
```

---

### Step 2: Backend - Create API Endpoint

**File**: `backend/src/llm/router.py`

```python
"""
API endpoints for LLM analysis.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Dict, Optional

from ..auth.dependencies import CurrentUser
from .service import get_llm_service


router = APIRouter(prefix="/api/llm", tags=["LLM Analysis"])


class AnalyzeAnomalyRequest(BaseModel):
    """Request to analyze an anomaly log."""
    log_entry: Dict  # The log entry data
    block_id: Optional[str] = None
    event_id: Optional[str] = None


class AnalysisResponse(BaseModel):
    """LLM analysis response."""
    explanation: str
    root_causes: List[str]
    severity: str
    recommended_actions: List[str]


@router.post("/analyze-anomaly", response_model=AnalysisResponse)
async def analyze_anomaly(
    request: AnalyzeAnomalyRequest,
    current_user: CurrentUser
):
    """
    Analyze an anomaly log using LLM.

    This endpoint:
    1. Takes a log entry flagged as anomaly
    2. Sends it to LLM for analysis
    3. Returns structured insights

    Example request:
    {
      "log_entry": {
        "Date": "81109",
        "Time": "203518",
        "Level": "INFO",
        "Content": "Receiving block blk_xxx..."
      },
      "block_id": "blk_-1608999687919862906",
      "event_id": "09a53393"
    }
    """
    try:
        llm_service = get_llm_service()

        analysis = await llm_service.analyze_anomaly(
            log_entry=request.log_entry,
            block_id=request.block_id,
            event_id=request.event_id
        )

        return analysis

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"LLM analysis failed: {str(e)}"
        )
```

---

### Step 3: Backend - Register Router

**File**: `backend/src/main.py`

Add this import and router registration:

```python
# Add to imports section
from .llm import router as llm_router

# Add after other router registrations
app.include_router(llm_router.router)
```

---

### Step 4: Backend - Add Environment Variable

**File**: `backend/.env`

Add your Groq API key:

```bash
# LLM Configuration
GROQ_API_KEY=gsk_your_actual_key_here
```

---

### Step 5: Frontend - Create Analysis Modal

**File**: `frontend/src/components/AnomalyAnalysisModal.tsx`

```typescript
import { useState } from 'react';
import axios from 'axios';

interface AnalysisResult {
  explanation: string;
  root_causes: string[];
  severity: string;
  recommended_actions: string[];
}

interface Props {
  log: any;
  onClose: () => void;
}

const AnomalyAnalysisModal = ({ log, onClose }: Props) => {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const analyzeLogs = async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("access_token");
      const response = await axios.post(
        "http://localhost:8000/api/llm/analyze-anomaly",
        {
          log_entry: log,
          block_id: log.BlockId,
          event_id: log.EventId
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

  // Auto-analyze on mount
  useState(() => {
    analyzeLogs();
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "HIGH": return "#dc2626";
      case "MEDIUM": return "#f59e0b";
      case "LOW": return "#10b981";
      default: return "#6b7280";
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '32px',
        maxWidth: '800px',
        width: '90%',
        maxHeight: '80vh',
        overflowY: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '700', margin: 0 }}>
            🤖 AI Analysis
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6b7280'
            }}
          >
            ×
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '48px' }}>⏳</div>
            <p style={{ color: '#6b7280', marginTop: '16px' }}>Analyzing with AI...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div style={{
            backgroundColor: '#fee2e2',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            padding: '16px',
            color: '#dc2626'
          }}>
            ❌ {error}
          </div>
        )}

        {/* Analysis Result */}
        {analysis && !loading && (
          <div>
            {/* Severity Badge */}
            <div style={{
              display: 'inline-block',
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: `${getSeverityColor(analysis.severity)}20`,
              color: getSeverityColor(analysis.severity),
              fontWeight: '600',
              fontSize: '14px',
              marginBottom: '20px'
            }}>
              {analysis.severity} SEVERITY
            </div>

            {/* Explanation */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
                📝 Explanation
              </h3>
              <p style={{ color: '#374151', lineHeight: '1.6', margin: 0 }}>
                {analysis.explanation}
              </p>
            </div>

            {/* Root Causes */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
                🔍 Possible Root Causes
              </h3>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {analysis.root_causes.map((cause, idx) => (
                  <li key={idx} style={{ color: '#374151', marginBottom: '8px', lineHeight: '1.6' }}>
                    {cause}
                  </li>
                ))}
              </ul>
            </div>

            {/* Recommended Actions */}
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
                ✅ Recommended Actions
              </h3>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {analysis.recommended_actions.map((action, idx) => (
                  <li key={idx} style={{ color: '#374151', marginBottom: '8px', lineHeight: '1.6' }}>
                    {action}
                  </li>
                ))}
              </ul>
            </div>

            {/* Retry Button */}
            <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
              <button
                onClick={analyzeLogs}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                🔄 Re-analyze
              </button>
              <button
                onClick={onClose}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnomalyAnalysisModal;
```

---

### Step 6: Frontend - Update Results.tsx

**File**: `frontend/src/components/Results.tsx`

Add modal integration:

```typescript
// Add imports at top
import AnomalyAnalysisModal from './AnomalyAnalysisModal';

// Add state for modal
const [selectedLog, setSelectedLog] = useState<AnomalyLog | null>(null);

// Change onClick handler
onClick={() => setSelectedLog(log)}  // Instead of alert()

// Add modal at end of component (before closing </div>)
{selectedLog && (
  <AnomalyAnalysisModal
    log={selectedLog}
    onClose={() => setSelectedLog(null)}
  />
)}
```

---

## 6. Testing the Integration

### Step 1: Start Services

```bash
# Terminal 1: Start backend with LLM support
cd docker-utils
docker-compose restart backend celery-worker

# Check logs
docker-compose logs -f backend
```

### Step 2: Test Flow

1. **Upload a log file** through frontend
2. **Wait for processing** to complete
3. **View results page** - you'll see anomaly logs
4. **Click on an anomaly log**
5. **Modal should appear** with "Analyzing with AI..."
6. **After ~2-3 seconds**, see the AI analysis

### Expected Output Example

```
🤖 AI Analysis

HIGH SEVERITY

📝 Explanation
This log entry shows block replication where source and destination IPs
are identical (10.250.19.102). In a healthy HDFS cluster, blocks should
be replicated across different nodes for fault tolerance. This pattern
suggests either node isolation or insufficient DataNode availability.

🔍 Possible Root Causes
• Network partition isolating other DataNodes
• DataNode failure reducing available replication targets
• Misconfiguration of replication factor exceeding available nodes

✅ Recommended Actions
• Verify all DataNodes are online: `hdfs dfsadmin -report`
• Check network connectivity between nodes
• Review replication factor configuration in hdfs-site.xml
• Investigate recent node failures or network changes
```

---

## 7. Cost Optimization Tips

### Free Tier Limits

**Groq Free Tier**:
- 14,400 requests per day
- ~10 requests per minute
- ~600 requests per hour

### Optimization Strategies

#### 1. Cache Results

Don't analyze the same log twice:

```python
# In LLM service
cache = {}  # In production, use Redis

async def analyze_anomaly(self, log_entry, ...):
    # Create cache key
    cache_key = f"{log_entry.get('EventId')}_{log_entry.get('BlockId')}"

    # Check cache
    if cache_key in cache:
        return cache[cache_key]

    # Analyze and cache
    result = await self._call_llm(...)
    cache[cache_key] = result
    return result
```

#### 2. Batch Analysis (Future Enhancement)

Instead of analyzing one log at a time:

```python
# Analyze top 10 anomalies in one request
async def batch_analyze(self, logs: List[Dict]) -> List[Dict]:
    prompt = f"Analyze these {len(logs)} anomaly logs..."
    # More efficient than 10 separate calls
```

#### 3. Rate Limiting

Prevent abuse:

```python
from fastapi_limiter import FastAPILimiter

@router.post("/analyze-anomaly")
@limiter.limit("5/minute")  # Max 5 analyses per minute per user
async def analyze_anomaly(...):
    ...
```

---

## Summary

### What We Built

1. ✅ **LLM Service**: Uses Groq API (free) for fast analysis
2. ✅ **Backend Endpoint**: `/api/llm/analyze-anomaly`
3. ✅ **Frontend Modal**: Beautiful UI to display results
4. ✅ **Integration**: Seamlessly works with existing anomaly detection

### Next Steps

1. **Test thoroughly** with different log types
2. **Improve prompts** based on results quality
3. **Add caching** to reduce API calls
4. **Consider upgrading** to paid tier if needed (still cheap)

### Files Created/Modified

**Backend**:
- `backend/src/llm/__init__.py` (new)
- `backend/src/llm/service.py` (new)
- `backend/src/llm/router.py` (new)
- `backend/src/main.py` (modified - add router)
- `backend/.env` (modified - add GROQ_API_KEY)

**Frontend**:
- `frontend/src/components/AnomalyAnalysisModal.tsx` (new)
- `frontend/src/components/Results.tsx` (modified - add modal)

---

## Troubleshooting

### Error: "GROQ_API_KEY not found"

**Solution**: Make sure you added the key to `backend/.env`:
```bash
GROQ_API_KEY=gsk_your_actual_key_here
```

### Error: "Rate limit exceeded"

**Solution**: You hit the free tier limit. Either:
- Wait for rate limit to reset (1 minute)
- Implement caching to reduce calls
- Upgrade to paid tier ($0.10 per 1M tokens - very cheap)

### Error: "Invalid JSON response"

**Solution**: LLM didn't return valid JSON. This is rare but can happen:
- Check prompt is clear
- Increase temperature to 0.1 for more consistency
- Add retry logic with fallback

---

## Advanced: Alternative LLM Providers

If you want to try others:

### Option 1: Google Gemini (Free)

```python
# In service.py
self.base_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent"
# API key from: https://makersuite.google.com/app/apikey
```

### Option 2: Local Ollama (Unlimited but needs GPU)

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Download model
ollama pull llama3.1

# Use in code
self.base_url = "http://localhost:11434/api/chat"
```

---

**End of Guide**
