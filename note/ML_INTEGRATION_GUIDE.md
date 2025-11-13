# ML Model Integration Guide

## Overview
This guide walks you through integrating the trained ML model (decision_tree_model_all.pkl) into your log analysis pipeline. The flow will be:

```
Log Upload → Parse to CSV → Save to MinIO → ML Analysis → Results to Frontend → LLM Suggestions
```

---

## Architecture Overview

### Current Flow
1. User uploads log file via frontend
2. Backend receives file and saves to MinIO
3. Celery task parses log to CSV format
4. CSV saved to MinIO

### New Flow (To Implement)
5. **Celery task triggers ML analysis on CSV**
6. **ML model predicts anomalies**
7. **Results stored in database**
8. **Frontend fetches and displays results**
9. **LLM generates suggestions based on anomalies**

---

## Step 1: Project Structure Setup

### Create New Modules

```
backend/src/
├── ml/
│   ├── __init__.py
│   ├── models/
│   │   ├── __init__.py
│   │   └── decision_tree_model_all.pkl  # Copy from external location
│   ├── service.py          # ML prediction service
│   ├── schemas.py          # Pydantic models for ML results
│   └── router.py           # API endpoints for results
├── llm/
│   ├── __init__.py
│   ├── service.py          # LLM integration service
│   └── prompts.py          # LLM prompt templates
```

### Database Schema

Add new tables to track analysis results:

```python
# backend/src/ml/models.py
from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, ForeignKey
from sqlalchemy.sql import func

class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(Integer, primary_key=True, index=True)
    log_file_id = Column(Integer, ForeignKey("log_files.id"))
    total_logs = Column(Integer)cl
    anomaly_count = Column(Integer)
    normal_count = Column(Integer)
    anomaly_percentage = Column(Float)
    predictions = Column(JSON)  # Store array of predictions
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class LLMSuggestion(Base):
    __tablename__ = "llm_suggestions"

    id = Column(Integer, primary_key=True, index=True)
    analysis_result_id = Column(Integer, ForeignKey("analysis_results.id"))
    suggestion = Column(String)
    severity = Column(String)  # 'low', 'medium', 'high', 'critical'
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

---

## Step 2: ML Service Implementation

### 2.1 Copy Model File

```bash
# Copy the trained model to your project
cp /home/gqy9hc/Document/log_process/loglizer/data/HDFS/decision_tree_model_all.pkl \
   /home/gqy9hc/Document/thesis/ai-log-analysis-thesis-2025/backend/src/ml/models/
```

### 2.2 Create ML Service (`backend/src/ml/service.py`)

```python
import pickle
import pandas as pd
from pathlib import Path
from typing import Dict, List
import numpy as np

class MLService:
    def __init__(self):
        model_path = Path(__file__).parent / "models" / "decision_tree_model_all.pkl"
        with open(model_path, 'rb') as f:
            self.model = pickle.load(f)

    def preprocess_csv(self, csv_path: str) -> pd.DataFrame:
        """
        Load and preprocess CSV for model prediction.
        Adjust based on your model's expected input format.
        """
        df = pd.read_csv(csv_path)
        # Add preprocessing steps based on your training pipeline
        return df

    def predict(self, csv_path: str) -> Dict:
        """
        Run prediction on CSV file.
        Returns dict with predictions and statistics.
        """
        # Load preprocessed data
        df = self.preprocess_csv(csv_path)

        # Get features (adjust based on your model)
        X = df.drop(['Label'], axis=1, errors='ignore')

        # Predict
        predictions = self.model.predict(X)

        # Calculate statistics
        total_logs = len(predictions)
        anomaly_count = int(np.sum(predictions == 1))
        normal_count = int(np.sum(predictions == 0))
        anomaly_percentage = (anomaly_count / total_logs) * 100 if total_logs > 0 else 0

        return {
            "total_logs": total_logs,
            "anomaly_count": anomaly_count,
            "normal_count": normal_count,
            "anomaly_percentage": round(anomaly_percentage, 2),
            "predictions": predictions.tolist()
        }

    def get_anomaly_details(self, csv_path: str, predictions: List[int]) -> List[Dict]:
        """
        Extract details of anomalous log entries.
        """
        df = pd.read_csv(csv_path)
        anomaly_indices = [i for i, pred in enumerate(predictions) if pred == 1]

        anomalies = []
        for idx in anomaly_indices[:100]:  # Limit to first 100 anomalies
            row = df.iloc[idx]
            anomalies.append({
                "index": idx,
                "log_entry": row.to_dict()
            })

        return anomalies
```

### 2.3 Create Schemas (`backend/src/ml/schemas.py`)

```python
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class AnalysisResultBase(BaseModel):
    total_logs: int
    anomaly_count: int
    normal_count: int
    anomaly_percentage: float

class AnalysisResultCreate(AnalysisResultBase):
    log_file_id: int
    predictions: List[int]

class AnalysisResultResponse(AnalysisResultBase):
    id: int
    log_file_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class AnomalyDetail(BaseModel):
    index: int
    log_entry: dict

class LLMSuggestionResponse(BaseModel):
    id: int
    suggestion: str
    severity: str
    created_at: datetime

    class Config:
        from_attributes = True
```

---

## Step 3: Celery Task Integration

### Update Celery Tasks (`backend/src/celery/tasks.py`)

```python
from celery import chain
from src.ml.service import MLService
from src.database import SessionLocal
# ... existing imports

@celery_app.task(name="analyze_with_ml")
def analyze_with_ml(log_file_id: int, csv_bucket: str, csv_object: str):
    """
    Task to run ML analysis on parsed CSV file.
    """
    db = SessionLocal()
    ml_service = MLService()

    try:
        # Download CSV from MinIO
        csv_data = minio_client.get_object(csv_bucket, csv_object)
        temp_csv_path = f"/tmp/{csv_object}"

        with open(temp_csv_path, 'wb') as f:
            for data in csv_data.stream(32*1024):
                f.write(data)

        # Run prediction
        result = ml_service.predict(temp_csv_path)

        # Save results to database
        analysis_result = AnalysisResult(
            log_file_id=log_file_id,
            total_logs=result["total_logs"],
            anomaly_count=result["anomaly_count"],
            normal_count=result["normal_count"],
            anomaly_percentage=result["anomaly_percentage"],
            predictions=result["predictions"]
        )

        db.add(analysis_result)
        db.commit()
        db.refresh(analysis_result)

        # Cleanup
        os.remove(temp_csv_path)

        return {
            "analysis_id": analysis_result.id,
            "log_file_id": log_file_id,
            "status": "completed"
        }

    except Exception as e:
        logger.error(f"ML analysis failed: {str(e)}")
        raise
    finally:
        db.close()

# Chain tasks together
@celery_app.task(name="process_log_file_complete")
def process_log_file_complete(log_file_id: int):
    """
    Complete pipeline: parse → ML analysis → LLM suggestions
    """
    # This should be called after parse_log_file task completes
    chain(
        parse_log_file.s(log_file_id),
        analyze_with_ml.s(),
        generate_llm_suggestions.s()
    ).apply_async()
```

---

## Step 4: API Endpoints

### Create ML Router (`backend/src/ml/router.py`)

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..auth.dependencies import CurrentUser
from . import schemas
from .models import AnalysisResult, LLMSuggestion

router = APIRouter(
    prefix="/api/ml",
    tags=['ml']
)

@router.get("/results/{log_file_id}", response_model=schemas.AnalysisResultResponse)
async def get_analysis_result(
    log_file_id: int,
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    """Get ML analysis results for a log file."""
    result = db.query(AnalysisResult).filter(
        AnalysisResult.log_file_id == log_file_id
    ).first()

    if not result:
        raise HTTPException(status_code=404, detail="Analysis not found")

    return result

@router.get("/suggestions/{analysis_id}", response_model=List[schemas.LLMSuggestionResponse])
async def get_llm_suggestions(
    analysis_id: int,
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    """Get LLM suggestions for an analysis."""
    suggestions = db.query(LLMSuggestion).filter(
        LLMSuggestion.analysis_result_id == analysis_id
    ).all()

    return suggestions
```

### Register Router in `main.py`

```python
from src.ml import router as ml_router

app.include_router(ml_router.router)
```

---

## Step 5: LLM Integration

### 5.1 Create LLM Service (`backend/src/llm/service.py`)

```python
from typing import List, Dict
import openai  # or your preferred LLM library
from .prompts import ANOMALY_ANALYSIS_PROMPT

class LLMService:
    def __init__(self):
        # Initialize your LLM client
        # self.client = openai.Client(api_key=...)
        pass

    def generate_suggestions(self, analysis_data: Dict) -> List[Dict]:
        """
        Generate suggestions based on anomaly analysis.
        """
        prompt = ANOMALY_ANALYSIS_PROMPT.format(
            total_logs=analysis_data["total_logs"],
            anomaly_count=analysis_data["anomaly_count"],
            anomaly_percentage=analysis_data["anomaly_percentage"]
        )

        # Call LLM API (example with OpenAI)
        # response = self.client.chat.completions.create(
        #     model="gpt-4",
        #     messages=[{"role": "user", "content": prompt}]
        # )

        # Parse response and categorize by severity
        suggestions = [
            {
                "suggestion": "Example: High anomaly rate detected. Check system health.",
                "severity": "high"
            }
        ]

        return suggestions
```

### 5.2 Create Prompts (`backend/src/llm/prompts.py`)

```python
ANOMALY_ANALYSIS_PROMPT = """
You are a system administrator analyzing log file anomalies.

Analysis Results:
- Total Logs: {total_logs}
- Anomalies Detected: {anomaly_count}
- Anomaly Rate: {anomaly_percentage}%

Please provide:
1. Severity assessment (low/medium/high/critical)
2. Potential causes
3. Recommended actions
4. Prevention strategies

Format your response as actionable suggestions.
"""
```

### 5.3 Create Celery Task for LLM

```python
@celery_app.task(name="generate_llm_suggestions")
def generate_llm_suggestions(analysis_id: int):
    """
    Generate LLM suggestions based on ML analysis.
    """
    db = SessionLocal()
    llm_service = LLMService()

    try:
        # Get analysis result
        analysis = db.query(AnalysisResult).get(analysis_id)
        if not analysis:
            raise ValueError(f"Analysis {analysis_id} not found")

        # Generate suggestions
        analysis_data = {
            "total_logs": analysis.total_logs,
            "anomaly_count": analysis.anomaly_count,
            "anomaly_percentage": analysis.anomaly_percentage
        }

        suggestions = llm_service.generate_suggestions(analysis_data)

        # Save suggestions
        for sugg in suggestions:
            llm_suggestion = LLMSuggestion(
                analysis_result_id=analysis_id,
                suggestion=sugg["suggestion"],
                severity=sugg["severity"]
            )
            db.add(llm_suggestion)

        db.commit()

        return {"status": "completed", "suggestions_count": len(suggestions)}

    except Exception as e:
        logger.error(f"LLM generation failed: {str(e)}")
        raise
    finally:
        db.close()
```

---

## Step 6: Frontend Integration

### 6.1 Create Analysis Results Component

```typescript
// frontend/src/components/AnalysisResults.tsx

interface AnalysisResult {
  id: number;
  total_logs: number;
  anomaly_count: number;
  normal_count: number;
  anomaly_percentage: number;
  created_at: string;
}

interface LLMSuggestion {
  id: number;
  suggestion: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
}

const AnalysisResults: React.FC<{ logFileId: number }> = ({ logFileId }) => {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [suggestions, setSuggestions] = useState<LLMSuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalysisResults();
  }, [logFileId]);

  const fetchAnalysisResults = async () => {
    try {
      const token = localStorage.getItem("access_token");

      // Fetch ML analysis
      const analysisRes = await fetch(
        `http://localhost:8000/api/ml/results/${logFileId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const analysisData = await analysisRes.json();
      setAnalysis(analysisData);

      // Fetch LLM suggestions
      const suggestionsRes = await fetch(
        `http://localhost:8000/api/ml/suggestions/${analysisData.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const suggestionsData = await suggestionsRes.json();
      setSuggestions(suggestionsData);

      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  if (loading) return <div>Loading analysis...</div>;

  return (
    <div style={{ padding: '20px' }}>
      {/* Statistics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <StatCard title="Total Logs" value={analysis?.total_logs || 0} />
        <StatCard title="Anomalies" value={analysis?.anomaly_count || 0} color="red" />
        <StatCard title="Normal" value={analysis?.normal_count || 0} color="green" />
      </div>

      {/* Anomaly Percentage */}
      <div style={{ marginBottom: '24px' }}>
        <h3>Anomaly Rate: {analysis?.anomaly_percentage}%</h3>
        <div style={{ width: '100%', height: '20px', backgroundColor: '#e5e7eb', borderRadius: '10px' }}>
          <div
            style={{
              width: `${analysis?.anomaly_percentage}%`,
              height: '100%',
              backgroundColor: analysis?.anomaly_percentage > 50 ? '#ef4444' : '#f59e0b',
              borderRadius: '10px'
            }}
          />
        </div>
      </div>

      {/* LLM Suggestions */}
      <div>
        <h3>AI Suggestions</h3>
        {suggestions.map((sugg) => (
          <SuggestionCard key={sugg.id} suggestion={sugg} />
        ))}
      </div>
    </div>
  );
};
```

---

## Step 7: Testing Plan

### 7.1 Unit Tests

```python
# tests/test_ml_service.py
def test_ml_prediction():
    ml_service = MLService()
    result = ml_service.predict("test_data.csv")
    assert "total_logs" in result
    assert "anomaly_count" in result
```

### 7.2 Integration Tests

```python
# tests/test_ml_integration.py
def test_complete_pipeline(test_log_file):
    # Upload → Parse → ML → LLM
    # Test each step
    pass
```

---

## Step 8: Deployment Checklist

- [ ] Copy ML model to backend/src/ml/models/
- [ ] Create database migrations for new tables
- [ ] Add required Python packages (scikit-learn, pandas, etc.)
- [ ] Configure LLM API keys
- [ ] Test Celery task chain
- [ ] Update frontend to show analysis results
- [ ] Add error handling and logging
- [ ] Set up monitoring for ML predictions

---

## Next Steps (Simple First Implementation)

### Phase 1: Basic ML Integration
1. Copy model file
2. Create ML service with basic prediction
3. Add Celery task for ML analysis
4. Store results in database
5. Create API endpoint to fetch results

### Phase 2: Frontend Display
1. Create simple results display component
2. Show statistics (total, anomalies, normal)
3. Add percentage visualization

### Phase 3: LLM Integration
1. Set up LLM service (OpenAI/local model)
2. Create prompt templates
3. Generate and store suggestions
4. Display suggestions in frontend

### Phase 4: Enhancements
1. Add detailed anomaly views
2. Export results to PDF/CSV
3. Historical analysis comparison
4. Real-time updates via WebSockets

---

## Common Issues & Solutions

### Issue: Model File Too Large
**Solution:** Use model compression or store in external storage

### Issue: CSV Format Mismatch
**Solution:** Add robust preprocessing in `preprocess_csv()` method

### Issue: Slow Predictions
**Solution:**
- Use batch prediction
- Cache results
- Consider model optimization

### Issue: LLM API Rate Limits
**Solution:**
- Implement retry logic
- Use local LLM models
- Queue LLM requests

---

## Resources

- ML Model Training: `/home/gqy9hc/Document/log_process/loglizer/`
- Backend Source: `/home/gqy9hc/Document/thesis/ai-log-analysis-thesis-2025/backend/`
- Current Notes: `/home/gqy9hc/Document/thesis/ai-log-analysis-thesis-2025/note/`

---

## Summary

This guide provides a comprehensive roadmap for integrating ML-based log analysis with LLM-powered suggestions. Start with Phase 1 (basic ML integration) and gradually add features. Keep it simple first, then enhance based on requirements.
