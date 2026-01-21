# ML Integration Guide for Beginners

**Target Audience**: Developers new to ML and LLM integration
**Goal**: Add machine learning anomaly detection to your log analysis system
**Difficulty**: Beginner-friendly with step-by-step instructions

---

## Table of Contents

1. [What We're Building](#what-were-building)
2. [Prerequisites](#prerequisites)
3. [Understanding the Flow](#understanding-the-flow)
4. [Step-by-Step Implementation](#step-by-step-implementation)
5. [Testing Your Implementation](#testing-your-implementation)
6. [Troubleshooting](#troubleshooting)
7. [Next Steps](#next-steps)

---

## What We're Building

### Current System
Right now, your system can:
- ✅ Upload log files
- ✅ Parse logs with Drain algorithm (extracts patterns)
- ✅ Save parsed CSV to MinIO

### What We're Adding
We'll add:
- 🆕 **ML Anomaly Detection**: Automatically identify unusual log entries
- 🆕 **Statistics Dashboard**: Show how many logs are normal vs anomalous
- 🆕 **AI Suggestions** (Optional): Get recommendations from LLM

### Visual Flow
```
Before:
User → Upload Log → Parse to CSV → Done ✓

After:
User → Upload Log → Parse to CSV → ML Analysis → Show Results ✓
                                          ↓
                                   (Optional) LLM Suggestions
```

---

## Prerequisites

### Required Knowledge
- ✅ You already know: Python, FastAPI, Celery (you have these working!)
- 🆕 You'll learn: Loading ML models, making predictions

### Required Files
- **ML Model File**: `decision_tree_model_production.pkl` (you have this)
- **Feature Extractor File**: `feature_extractor_production.pkl` (CRITICAL - transforms logs to model features)
- **Location**: Currently at `/home/gqy9hc/Document/log_process/loglizer/data/HDFS/`

**Why Two Files?**
- **Model**: Makes the actual predictions (anomaly or normal)
- **Feature Extractor**: Converts raw log event sequences into numeric features the model understands
- Think of it like: Feature Extractor = Translator, Model = Decision Maker

### Required Python Packages

Add these to `backend/requirements.txt`:

```txt
# Existing packages (already installed)
fastapi==0.116.1
celery==5.3.0
pandas==2.3.3
# ... other existing packages

# NEW: Add these for ML
scikit-learn==1.5.0      # For loading the decision tree model
joblib==1.4.2             # Alternative pickle for models (optional)
```

Install them:
```bash
cd backend
pip install scikit-learn==1.5.0 joblib==1.4.2
```

---

## Understanding the Flow

### How ML Anomaly Detection Works

**Simple Explanation:**
1. Your Drain parser converts raw logs → structured CSV with event sequences
2. Feature extractor converts event sequences → numeric feature vectors
3. ML model looks at feature vectors and predicts: "normal (0) or anomaly (1)?"
4. We count results and show statistics

**Detailed Example:**
```
Step 1: Drain Parser Output (CSV)
BlockId | EventSequence
blk_1   | E1 E5 E22 E11  ← Raw event sequence
blk_2   | E1 E5 E33      ← Different pattern (maybe anomaly?)
blk_3   | E1 E5 E22 E11  ← Same as blk_1 (likely normal)

Step 2: Feature Extractor Transforms Events → Numbers
blk_1: E1 E5 E22 E11 → [1, 0, 1, 1, 0, 1, ...]  ← Feature vector (200 dimensions)
blk_2: E1 E5 E33     → [1, 0, 0, 1, 1, 0, ...]  ← Different pattern detected!
blk_3: E1 E5 E22 E11 → [1, 0, 1, 1, 0, 1, ...]  ← Same vector as blk_1

Step 3: ML Model Makes Predictions
blk_1: [1,0,1,1,0,1,...] → Prediction: 0 (normal)
blk_2: [1,0,0,1,1,0,...] → Prediction: 1 (ANOMALY!)
blk_3: [1,0,1,1,0,1,...] → Prediction: 0 (normal)

Step 4: Calculate Statistics
Total: 3 sessions
Normal: 2 (66.7%)
Anomalies: 1 (33.3%)
```

**Why Two Files?**
- **Feature Extractor**: Learned vocabulary during training (E1, E2, E3... = known events)
- **Model**: Learned normal vs anomaly patterns using those features
- They MUST be used together - trained as a pair!

### Where Does This Fit in Your Code?

**Current Celery Task** ([backend/src/celery/celery.py](../backend/src/celery/celery.py)):
```python
@celery_app.task(name="parse_log_task")
def parse_log_task(job_id: str):
    # 1. Download log from MinIO
    # 2. Parse with Drain
    # 3. Upload CSV to MinIO
    # 4. Update job status to COMPLETED
    pass  # Your existing code
```

**New Celery Task** (we'll create this):
```python
@celery_app.task(name="ml_analysis_task")
def ml_analysis_task(job_id: str, csv_path: str):
    # 5. Download CSV from MinIO
    # 6. Load ML model
    # 7. Predict anomalies
    # 8. Save results to database
    pass  # We'll write this together
```

---

## Step-by-Step Implementation

### Phase 1: Setup Project Structure

#### Step 1.1: Create ML Module Folders

```bash
# Navigate to your backend
cd backend/src

# Create new folders
mkdir -p ml/models
touch ml/__init__.py
touch ml/service.py
touch ml/schemas.py
touch ml/models.py
touch ml/router.py
```

**Result:** You should have:
```
backend/src/
├── ml/
│   ├── __init__.py           # Empty file (makes it a Python package)
│   ├── trained_models/       # Folder for .pkl files (RENAMED from models/)
│   │   ├── __init__.py       # Empty file
│   │   ├── decision_tree_model_production.pkl      # (copy later)
│   │   └── feature_extractor_production.pkl        # (copy later)
│   ├── service.py            # We'll write the ML logic here
│   ├── schemas.py            # Pydantic models for API
│   ├── models.py             # Database models (NOT a directory!)
│   └── router.py             # API endpoints
```

#### Step 1.2: Copy ML Model Files (BOTH Required!)

```bash
# IMPORTANT: Rename the models directory to avoid conflicts
# You have a models/ directory AND models.py file - Python gets confused!
cd backend/src/ml
mv models trained_models  # Rename to avoid conflict

# Now copy BOTH files (model + feature extractor)
cp /home/gqy9hc/Document/log_process/loglizer/data/HDFS/decision_tree_model_production.pkl \
   backend/src/ml/trained_models/

cp /home/gqy9hc/Document/log_process/loglizer/data/HDFS/feature_extractor_production.pkl \
   backend/src/ml/trained_models/

# Verify both files are there
ls -lh backend/src/ml/trained_models/
# Should show:
#   decision_tree_model_production.pkl
#   feature_extractor_production.pkl
```

**Why rename models/ to trained_models/?**
- You have `ml/models.py` (database models)
- AND `ml/models/` (directory for .pkl files)
- Python imports `ml.models` and gets confused which one to use!
- Solution: Rename directory to `trained_models/`

---

### Phase 2: Create Database Table for Results

#### Step 2.1: Create Database Model

Create `backend/src/ml/models.py`:

```python
"""
Database models for ML analysis results.
This stores the predictions from our ML model.
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..auth.models import Base  # Import existing Base


class AnalysisResult(Base):
    """
    Stores results from ML anomaly detection.
    One record per log file analyzed.
    """
    __tablename__ = "analysis_results"

    # Primary key
    id = Column(Integer, primary_key=True, index=True)

    # Foreign key to log_files table
    log_file_id = Column(Integer, ForeignKey("log_files.id"), nullable=False)

    # Statistics
    total_logs = Column(Integer, nullable=False)        # Total number of log entries
    anomaly_count = Column(Integer, nullable=False)     # How many anomalies found
    normal_count = Column(Integer, nullable=False)      # How many normal logs
    anomaly_percentage = Column(Float, nullable=False)  # Percentage of anomalies

    # Store all predictions as JSON array
    # Example: [0, 1, 0, 0, 1, 0, ...] where 0=normal, 1=anomaly
    predictions = Column(JSON, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    log_file = relationship("LogFile", backref="analysis_results")


# OPTIONAL: For LLM suggestions (Phase 3)
class LLMSuggestion(Base):
    """
    Stores AI-generated suggestions based on anomaly analysis.
    Multiple suggestions per analysis result.
    """
    __tablename__ = "llm_suggestions"

    id = Column(Integer, primary_key=True, index=True)
    analysis_result_id = Column(Integer, ForeignKey("analysis_results.id"), nullable=False)

    # Suggestion content
    suggestion = Column(String(1000), nullable=False)
    severity = Column(String(20), nullable=False)  # 'low', 'medium', 'high', 'critical'

    # Timestamp
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    analysis_result = relationship("AnalysisResult", backref="suggestions")
```

**What This Does:**
- Creates a new table `analysis_results` to store ML predictions
- Links to your existing `log_files` table via `log_file_id`
- Stores statistics (total logs, anomaly count, percentage)
- Optionally stores all predictions as a JSON array

#### Step 2.2: Register Model in Main.py

Edit `backend/src/main.py` and add:

```python
# Find the section where you create tables (around line 30-35)
# It should look like this:

from src.auth import models as auth_models
from src.logs import models as logs_model
from src.jobs import models as jobs_model
from src.ml import models as ml_models  # ADD THIS LINE

# Then find where tables are created:
auth_models.Base.metadata.create_all(engine)
logs_model.Base.metadata.create_all(engine)
jobs_model.Base.metadata.create_all(engine)
ml_models.Base.metadata.create_all(engine)  # ADD THIS LINE
```

**What This Does:**
- Tells SQLAlchemy to create the `analysis_results` table when the app starts
- The table will be created automatically next time you start the backend

---

### Phase 3: Create ML Service (The Brain)

#### Step 3.1: Create ML Service

Create `backend/src/ml/service.py`:

```python
"""
ML Service for anomaly detection.
This is the core logic for loading the model and making predictions.

Based on DecisionTree_model_production.py pattern.
"""
import sys
import pickle
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import logging

# Add loglizer to path (adjust based on where you copied it)
# You'll need to copy the loglizer library to your backend
sys.path.append(str(Path(__file__).parent.parent.parent / 'third_party'))
from loglizer import dataloader

logger = logging.getLogger(__name__)


class MLService:
    """
    Service for ML-based anomaly detection on log files.

    Requires TWO files:
    1. Model file (.pkl) - makes predictions
    2. Feature extractor (.pkl) - transforms data to features

    Simple usage:
        ml_service = MLService()
        result = ml_service.predict_from_csv("/path/to/parsed.csv")
        print(result)  # {"total_logs": 100, "anomaly_count": 5, ...}
    """

    def __init__(self):
        """Load the trained ML model and feature extractor."""
        # Path to trained_models directory
        models_dir = Path(__file__).parent / "trained_models"

        model_path = models_dir / "decision_tree_model_production.pkl"
        feature_extractor_path = models_dir / "feature_extractor_production.pkl"

        # Check if both files exist
        if not model_path.exists():
            raise FileNotFoundError(f"ML model not found at {model_path}")
        if not feature_extractor_path.exists():
            raise FileNotFoundError(f"Feature extractor not found at {feature_extractor_path}")

        # Load the model
        logger.info(f"Loading ML model from {model_path}")
        with open(model_path, 'rb') as f:
            self.model = pickle.load(f)

        # Load the feature extractor
        logger.info(f"Loading feature extractor from {feature_extractor_path}")
        with open(feature_extractor_path, 'rb') as f:
            self.feature_extractor = pickle.load(f)

        logger.info(f"ML model loaded successfully")
        logger.info(f"Feature extractor loaded - vocabulary size: {len(self.feature_extractor.events)}")
        logger.info(f"OOV support: {'ENABLED' if self.feature_extractor.oov else 'DISABLED'}")


    def predict_from_csv(self, csv_path: str) -> Dict:
        """
        Main method: Load CSV and predict anomalies.

        Follows DecisionTree_model_production.py pattern exactly.

        Args:
            csv_path: Path to the parsed CSV file from Drain parser
                     (e.g., "filename_structured.csv")

        Returns:
            Dictionary with statistics:
            {
                "total_logs": 100,
                "anomaly_count": 5,
                "normal_count": 95,
                "anomaly_percentage": 5.0,
                "predictions": [0, 1, 0, 0, ...]  # Full list
            }
        """
        try:
            logger.info("="*60)
            logger.info("DETECTING ANOMALIES IN NEW USER LOGS")
            logger.info("="*60)

            # Step 1: Load data using loglizer's dataloader (same as production script)
            logger.info('\n[1] Loading log data...')
            (_, _), (x_data, _), data_df = dataloader.load_HDFS(
                csv_path,
                label_file=None,  # No labels for prediction
                window='session',
                train_ratio=0,    # Use all data for prediction
                split_type='sequential'
            )

            logger.info(f"  ✓ Total sessions: {len(x_data)}")

            # Step 2: Analyze events (check for OOV)
            logger.info('\n[2] Event analysis...')
            new_events = set()
            for session in x_data:
                new_events.update(session)

            known_events = set(self.feature_extractor.events)
            overlap = new_events.intersection(known_events)
            unseen = new_events - known_events

            logger.info(f"  Total unique events in new data: {len(new_events)}")
            logger.info(f"  Known events (in training): {len(overlap)} ({len(overlap)/len(new_events)*100:.1f}%)")
            logger.info(f"  Unknown events (OOV): {len(unseen)} ({len(unseen)/len(new_events)*100:.1f}%)")

            if unseen:
                logger.warning(f"  Unseen EventIds: {sorted(unseen)}")
                if not self.feature_extractor.oov:
                    logger.warning("  ⚠ WARNING: Model was NOT trained with OOV support!")
                    logger.warning("  ⚠ Unknown events will be treated as zero vectors")

            # Step 3: Transform features
            logger.info('\n[3] Transforming features...')
            x_transformed = self.feature_extractor.transform(x_data)
            logger.info(f"  ✓ Transformed shape: {x_transformed.shape}")

            # Check for zero vectors
            zero_rows = (x_transformed.sum(axis=1) == 0).sum()
            if zero_rows > 0:
                logger.warning(f"  ⚠ Warning: {zero_rows} sessions have zero features (likely all unknown events)")

            # Step 4: Predict anomalies
            logger.info('\n[4] Detecting anomalies...')
            predictions = self.model.predict(x_transformed)

            # Step 5: Calculate statistics
            result = self._calculate_statistics(predictions)

            logger.info('='*60)
            logger.info('RESULTS:')
            logger.info(f'  Total sessions: {result["total_logs"]}')
            logger.info(f'  Normal sessions: {result["normal_count"]} ({(result["normal_count"]/result["total_logs"]*100):.2f}%)')
            logger.info(f'  Anomalies detected: {result["anomaly_count"]} ({result["anomaly_percentage"]:.2f}%)')
            logger.info('='*60)

            return result

        except Exception as e:
            logger.error(f"Prediction failed: {str(e)}", exc_info=True)
            raise


    def _calculate_statistics(self, predictions: np.ndarray) -> Dict:
        """
        Calculate statistics from predictions array.

        Args:
            predictions: NumPy array of 0s and 1s (0=normal, 1=anomaly)

        Returns:
            Dictionary with statistics
        """
        total_logs = len(predictions)
        anomaly_count = int(np.sum(predictions == 1))
        normal_count = int(np.sum(predictions == 0))

        # Calculate percentage
        if total_logs > 0:
            anomaly_percentage = (anomaly_count / total_logs) * 100
        else:
            anomaly_percentage = 0.0

        return {
            "total_logs": total_logs,
            "anomaly_count": anomaly_count,
            "normal_count": normal_count,
            "anomaly_percentage": round(anomaly_percentage, 2),
            "predictions": predictions.tolist()  # Convert to list for JSON
        }


    def get_anomaly_indices(self, predictions: List[int], limit: int = 100) -> List[int]:
        """
        Get indices of anomalous entries.

        Useful for showing "which specific logs are anomalies"

        Args:
            predictions: List of predictions (0s and 1s)
            limit: Maximum number to return

        Returns:
            List of indices where prediction == 1
            Example: [5, 17, 23, 45, 67] means rows 5, 17, 23... are anomalies
        """
        anomaly_indices = [i for i, pred in enumerate(predictions) if pred == 1]
        return anomaly_indices[:limit]


# Singleton instance (optional, for efficiency)
_ml_service_instance: Optional[MLService] = None

def get_ml_service() -> MLService:
    """
    Get singleton ML service instance.
    This avoids loading the model multiple times.
    """
    global _ml_service_instance
    if _ml_service_instance is None:
        _ml_service_instance = MLService()
    return _ml_service_instance
```

**What This Does:**
1. **`__init__`**: Loads your ML model file when service starts
2. **`predict_from_csv`**: Main method - takes CSV path, returns statistics
3. **`_load_and_preprocess_csv`**: Loads CSV and cleans data
4. **`_extract_features`**: Prepares data for the model (YOU MAY NEED TO ADJUST THIS!)
5. **`_calculate_statistics`**: Counts anomalies and calculates percentage

**⚠️ IMPORTANT: What You Need to Adjust**

The `_extract_features` method depends on **how your model was trained**. You need to check:

```bash
# Go to where your model was trained
cd /home/gqy9hc/Document/log_process/loglizer/

# Look for training scripts
ls *.py

# Check what features were used
# Look for lines like:
# X_train = df[['feature1', 'feature2', ...]]
# or
# model.fit(X, y)
```

---

### Phase 4: Create Pydantic Schemas

Create `backend/src/ml/schemas.py`:

```python
"""
Pydantic schemas for ML API requests and responses.
These define what data looks like in API calls.
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class AnalysisResultBase(BaseModel):
    """Basic statistics about analysis."""
    total_logs: int = Field(..., description="Total number of log entries")
    anomaly_count: int = Field(..., description="Number of anomalies detected")
    normal_count: int = Field(..., description="Number of normal logs")
    anomaly_percentage: float = Field(..., description="Percentage of anomalies")


class AnalysisResultCreate(AnalysisResultBase):
    """Data needed to create an analysis result record."""
    log_file_id: int
    predictions: List[int]  # Full array of 0s and 1s


class AnalysisResultResponse(AnalysisResultBase):
    """What the API returns when you query an analysis result."""
    id: int
    log_file_id: int
    created_at: datetime

    class Config:
        from_attributes = True  # Allows SQLAlchemy model conversion


class AnomalyDetail(BaseModel):
    """Details about a specific anomalous log entry."""
    index: int = Field(..., description="Row number in CSV (0-indexed)")
    log_entry: dict = Field(..., description="The actual log data")


# OPTIONAL: For LLM suggestions (Phase 3)
class LLMSuggestionResponse(BaseModel):
    """AI-generated suggestion about the anomalies."""
    id: int
    suggestion: str
    severity: str  # 'low', 'medium', 'high', 'critical'
    created_at: datetime

    class Config:
        from_attributes = True
```

**What This Does:**
- Defines data structures for API requests/responses
- FastAPI uses these to validate data and generate API docs
- Think of these as "contracts" for what data looks like

---

### Phase 5: Create Celery Task for ML Analysis

#### Step 5.1: Add Task to Celery File

Edit `backend/src/celery/celery.py` and add this NEW task:

```python
# Add these imports at the top
from src.ml.service import get_ml_service
from src.ml.models import AnalysisResult
import tempfile
import os

# ... your existing imports and celery_app setup ...

# ADD THIS NEW TASK (after your existing parse_log_task)
@celery_app.task(bind=True, base=DatabaseTask, name="ml_analysis_task")
def ml_analysis_task(self, job_id: str):
    """
    Celery task to run ML anomaly detection on parsed CSV.

    This runs AFTER parse_log_task completes.

    Args:
        job_id: The ProcessingJob UUID

    Flow:
        1. Query job and get CSV location
        2. Download CSV from MinIO
        3. Run ML prediction
        4. Save results to database
        5. Update job status
    """
    db = self.db_session
    logger = logging.getLogger(__name__)

    try:
        logger.info(f"Starting ML analysis for job {job_id}")

        # Step 1: Get job info
        job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
        if not job:
            raise ValueError(f"Job {job_id} not found")

        if not job.result_file_path:
            raise ValueError(f"Job {job_id} has no CSV file (parsing may have failed)")

        # Step 2: Download CSV from MinIO
        logger.info(f"Downloading CSV from MinIO: {job.result_file_path}")

        csv_data = minio_client.get_object(
            bucket_name="processed-logs",  # Adjust if you use different bucket
            object_name=job.result_file_path
        )

        # Save to temporary file
        temp_csv = tempfile.NamedTemporaryFile(mode='wb', delete=False, suffix='.csv')
        try:
            for chunk in csv_data.stream(32*1024):
                temp_csv.write(chunk)
            temp_csv.close()

            logger.info(f"CSV downloaded to {temp_csv.name}")

            # Step 3: Run ML prediction
            ml_service = get_ml_service()
            result = ml_service.predict_from_csv(temp_csv.name)

            logger.info(f"ML prediction completed: {result['anomaly_count']} anomalies found")

            # Step 4: Save results to database
            analysis_result = AnalysisResult(
                log_file_id=job.file_id,
                total_logs=result["total_logs"],
                anomaly_count=result["anomaly_count"],
                normal_count=result["normal_count"],
                anomaly_percentage=result["anomaly_percentage"],
                predictions=result["predictions"]
            )

            db.add(analysis_result)
            db.commit()
            db.refresh(analysis_result)

            logger.info(f"Analysis result saved with ID {analysis_result.id}")

            # Step 5: Update job status
            job.status = "ML_COMPLETED"  # Or add a new status field
            db.commit()

            return {
                "job_id": job_id,
                "analysis_id": analysis_result.id,
                "anomaly_count": result["anomaly_count"],
                "status": "success"
            }

        finally:
            # Cleanup: Delete temporary file
            if os.path.exists(temp_csv.name):
                os.unlink(temp_csv.name)
                logger.info(f"Cleaned up temp file {temp_csv.name}")

    except Exception as e:
        logger.error(f"ML analysis failed for job {job_id}: {str(e)}", exc_info=True)

        # Update job with error
        if job:
            job.status = "ML_FAILED"
            db.commit()

        raise
```

#### Step 5.2: Chain Tasks Together

Now, modify your EXISTING `parse_log_task` to trigger ML analysis after parsing:

Find your existing task (should be around line 50-100 in `celery.py`):

```python
@celery_app.task(bind=True, base=DatabaseTask, name="parse_log_task")
def parse_log_task(self, job_id: str):
    # ... your existing code ...

    # At the END of the function, after CSV upload succeeds, ADD:

    # Trigger ML analysis task
    logger.info(f"Queueing ML analysis task for job {job_id}")
    ml_analysis_task.delay(job_id)

    return {
        "job_id": job_id,
        "status": "COMPLETED",
        "result_file_path": result_path
    }
```

**What This Does:**
- After parsing completes, automatically triggers ML analysis
- ML task downloads the CSV, runs prediction, saves results
- Everything happens in background (user doesn't wait)

---

### Phase 6: Create API Endpoints

Create `backend/src/ml/router.py`:

```python
"""
API endpoints for ML analysis results.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..auth.dependencies import CurrentUser
from . import schemas
from .models import AnalysisResult


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
    """
    Get ML analysis results for a specific log file.

    Returns statistics: total logs, anomaly count, percentage, etc.
    """
    # Query the analysis result
    result = db.query(AnalysisResult).filter(
        AnalysisResult.log_file_id == log_file_id
    ).order_by(AnalysisResult.created_at.desc()).first()

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No analysis found for log file {log_file_id}"
        )

    return result


@router.get("/results/{log_file_id}/anomalies", response_model=List[schemas.AnomalyDetail])
async def get_anomaly_details(
    log_file_id: int,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
    limit: int = 100
):
    """
    Get details of specific anomalous log entries.

    Returns up to 'limit' anomalies with their row indices.
    """
    # Get analysis result
    result = db.query(AnalysisResult).filter(
        AnalysisResult.log_file_id == log_file_id
    ).order_by(AnalysisResult.created_at.desc()).first()

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No analysis found for log file {log_file_id}"
        )

    # Extract anomaly indices
    predictions = result.predictions
    if not predictions:
        return []

    anomaly_indices = [i for i, pred in enumerate(predictions) if pred == 1]
    anomaly_indices = anomaly_indices[:limit]

    # Return simple list of indices
    # TODO: Fetch actual log content from CSV to show details
    return [
        {"index": idx, "log_entry": {"row": idx, "prediction": "anomaly"}}
        for idx in anomaly_indices
    ]
```

#### Step 6.1: Register Router in Main

Edit `backend/src/main.py`:

```python
# Find where routers are registered (around line 40-50)
from src.ml import router as ml_router  # ADD THIS

# Then add:
app.include_router(ml_router.router)  # ADD THIS
```

**What This Does:**
- Creates 2 new API endpoints:
  1. `GET /api/ml/results/{log_file_id}` - Get statistics
  2. `GET /api/ml/results/{log_file_id}/anomalies` - Get anomaly details
- Frontend can call these to show results

---

### Phase 7: Simple Frontend Display (Optional but Recommended)

Create `frontend/src/components/AnalysisResults.tsx`:

```typescript
/**
 * Component to display ML analysis results.
 * Shows statistics and anomaly percentage.
 */
import React, { useState, useEffect } from 'react';

interface AnalysisResult {
  id: number;
  total_logs: number;
  anomaly_count: number;
  normal_count: number;
  anomaly_percentage: number;
  created_at: string;
}

interface Props {
  logFileId: number;
}

const AnalysisResults: React.FC<Props> = ({ logFileId }) => {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalysisResults();
  }, [logFileId]);

  const fetchAnalysisResults = async () => {
    try {
      const token = localStorage.getItem('access_token');

      const response = await fetch(
        `http://localhost:8000/api/ml/results/${logFileId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          setError('Analysis not yet completed. Please wait...');
        } else {
          throw new Error('Failed to fetch analysis');
        }
        setLoading(false);
        return;
      }

      const data = await response.json();
      setAnalysis(data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching analysis:', err);
      setError('Failed to load analysis results');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Loading analysis results...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', color: '#ef4444' }}>
        <p>{error}</p>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  // Determine color based on anomaly percentage
  const getAnomalyColor = (percentage: number) => {
    if (percentage < 5) return '#10b981'; // green
    if (percentage < 20) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
      <h2 style={{ marginBottom: '20px', fontSize: '24px', fontWeight: 'bold' }}>
        Analysis Results
      </h2>

      {/* Statistics Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {/* Total Logs Card */}
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>Total Logs</p>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827' }}>
            {analysis.total_logs.toLocaleString()}
          </p>
        </div>

        {/* Anomalies Card */}
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>Anomalies Detected</p>
          <p style={{
            fontSize: '32px',
            fontWeight: 'bold',
            color: getAnomalyColor(analysis.anomaly_percentage)
          }}>
            {analysis.anomaly_count.toLocaleString()}
          </p>
        </div>

        {/* Normal Logs Card */}
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>Normal Logs</p>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>
            {analysis.normal_count.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Anomaly Percentage Bar */}
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontWeight: '600' }}>Anomaly Rate</span>
          <span style={{
            fontWeight: 'bold',
            fontSize: '18px',
            color: getAnomalyColor(analysis.anomaly_percentage)
          }}>
            {analysis.anomaly_percentage}%
          </span>
        </div>

        {/* Progress Bar */}
        <div style={{
          width: '100%',
          height: '24px',
          backgroundColor: '#e5e7eb',
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${analysis.anomaly_percentage}%`,
            height: '100%',
            backgroundColor: getAnomalyColor(analysis.anomaly_percentage),
            transition: 'width 0.5s ease'
          }} />
        </div>

        {/* Interpretation */}
        <p style={{ marginTop: '12px', color: '#6b7280', fontSize: '14px' }}>
          {analysis.anomaly_percentage < 5 && '✓ Low anomaly rate - System appears healthy'}
          {analysis.anomaly_percentage >= 5 && analysis.anomaly_percentage < 20 &&
            '⚠ Moderate anomaly rate - Monitor closely'}
          {analysis.anomaly_percentage >= 20 &&
            '⚠ High anomaly rate - Investigation recommended'}
        </p>
      </div>

      {/* Timestamp */}
      <p style={{ marginTop: '12px', color: '#9ca3af', fontSize: '12px' }}>
        Analysis completed: {new Date(analysis.created_at).toLocaleString()}
      </p>
    </div>
  );
};

export default AnalysisResults;
```

#### Step 7.1: Add to Dashboard

Edit `frontend/src/components/Dashboard.tsx` to show analysis results:

```typescript
// Add import
import AnalysisResults from './AnalysisResults';

// Inside your Dashboard component, after file upload section:
<div>
  <h2>Recent Analysis</h2>
  {/* Replace with your actual log file ID */}
  <AnalysisResults logFileId={lastUploadedFileId} />
</div>
```

---

## Testing Your Implementation

### Test 1: Backend Setup

```bash
# 1. Start your Docker services
cd docker-utils
docker-compose up -d

# 2. Check backend logs
docker-compose logs -f backend

# Should see: "ML model loaded successfully"
```

### Test 2: Database Table Created

```bash
# Connect to PostgreSQL
docker exec -it postgres_db psql -U postgres -d myproject

# Check if table exists
\dt

# Should see: analysis_results in the list

# Exit
\q
```

### Test 3: Upload and Process a Log File

1. **Open frontend**: http://localhost:3002
2. **Login** with your account
3. **Upload a log file** (use your test .log file)
4. **Check Celery logs**:
```bash
docker-compose logs -f celery-worker

# You should see:
# [INFO] Starting ML analysis for job <uuid>
# [INFO] ML prediction completed: X anomalies found
```

5. **Check database**:
```bash
docker exec -it postgres_db psql -U postgres -d myproject

# Query results
SELECT id, log_file_id, total_logs, anomaly_count, anomaly_percentage
FROM analysis_results
ORDER BY created_at DESC
LIMIT 5;

# Should show your analysis results
```

### Test 4: API Endpoint

```bash
# Test the API endpoint (replace log_file_id and token)
curl -X GET "http://localhost:8000/api/ml/results/1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"

# Should return JSON with analysis results
```

---

## Troubleshooting

### Problem 1: "ML model not found"

**Error**: `FileNotFoundError: ML model not found at .../decision_tree_model_all.pkl`

**Solution**:
```bash
# Check if model file exists
ls -lh backend/src/ml/models/decision_tree_model_all.pkl

# If not found, copy it again
cp /home/gqy9hc/Document/log_process/loglizer/data/HDFS/decision_tree_model_all.pkl \
   backend/src/ml/models/
```

---

### Problem 2: "Column not found" or "Feature mismatch"

**Error**: `KeyError: 'EventTemplate'` or similar

**Solution**: Your CSV format doesn't match what the model expects.

**Fix**: Edit `backend/src/ml/service.py`, method `_extract_features()`:

```python
def _extract_features(self, df: pd.DataFrame) -> pd.DataFrame:
    # FIRST: Print what columns you have
    print(f"CSV columns: {df.columns.tolist()}")

    # SECOND: Check what your model needs
    # Go to where you trained the model and find this info

    # THIRD: Select only the columns your model needs
    # Example options:

    # Option A: Use all numeric columns
    X = df.select_dtypes(include=[np.number])

    # Option B: Use specific columns (adjust to match your training)
    # required_cols = ['E1', 'E2', 'E3', ...]  # Event template counts
    # X = df[required_cols]

    return X
```

---

### Problem 3: Analysis results not showing in frontend

**Error**: `404 Not Found` when fetching results

**Possible Causes**:
1. ML task hasn't run yet (check Celery logs)
2. ML task failed (check Celery logs for errors)
3. Wrong log_file_id in frontend

**Solution**:
```bash
# Check if analysis exists in database
docker exec -it postgres_db psql -U postgres -d myproject

SELECT * FROM analysis_results ORDER BY created_at DESC LIMIT 5;

# If empty, ML task didn't run - check Celery worker logs
docker-compose logs celery-worker | grep "ML analysis"
```

---

### Problem 4: Celery task not triggering

**Error**: Parse completes but ML analysis never starts

**Solution**:
1. Check if you added `ml_analysis_task.delay(job_id)` to parse_log_task
2. Restart Celery worker:
```bash
docker-compose restart celery-worker
docker-compose logs -f celery-worker
```

---

## Next Steps

### ✅ You've Completed Basic ML Integration!

Your system now:
- Parses logs → Predicts anomalies → Stores results → Shows statistics

### 🚀 Phase 2: Add LLM Suggestions (Optional)

Want AI-powered recommendations? Follow these steps:

1. **Choose an LLM**:
   - Option A: OpenAI GPT-4 (paid, best quality)
   - Option B: Anthropic Claude (paid, best for analysis)
   - Option C: Local model with Ollama (free, runs on your machine)

2. **Simple OpenAI Integration** (if you choose GPT-4):

Create `backend/src/llm/service.py`:
```python
import openai
from typing import Dict, List

class LLMService:
    def __init__(self, api_key: str):
        self.client = openai.Client(api_key=api_key)

    def generate_suggestions(self, anomaly_percentage: float, anomaly_count: int) -> str:
        """Ask GPT-4 for suggestions based on anomaly rate."""

        prompt = f"""
        You are a system administrator analyzing log files.

        Analysis Results:
        - Anomaly Rate: {anomaly_percentage}%
        - Total Anomalies: {anomaly_count}

        Provide 3 actionable recommendations for investigating these anomalies.
        Keep each recommendation under 50 words.
        """

        response = self.client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}]
        )

        return response.choices[0].message.content
```

3. **Add to Celery Task**:
```python
# In celery.py, after ML analysis succeeds:
from src.llm.service import LLMService

llm_service = LLMService(api_key="your-openai-key")
suggestions = llm_service.generate_suggestions(
    anomaly_percentage=result["anomaly_percentage"],
    anomaly_count=result["anomaly_count"]
)

# Save to database...
```

### 🎯 Phase 3: Enhanced Features

- **Visualization**: Add charts with Chart.js
- **Export Results**: Download analysis as PDF/CSV
- **Historical Comparison**: Compare current vs previous analyses
- **Real-time Updates**: Use WebSockets for live progress
- **Anomaly Details**: Show actual log content for anomalies

---

## Summary

### What You Built

1. ✅ ML model integration (load and predict)
2. ✅ Database table for results
3. ✅ Celery task for async processing
4. ✅ API endpoints to fetch results
5. ✅ Frontend display component

### Key Files You Modified/Created

```
backend/src/
├── ml/
│   ├── trained_models/
│   │   ├── decision_tree_model_production.pkl   ← Copied
│   │   └── feature_extractor_production.pkl     ← Copied
│   ├── service.py                               ← Created
│   ├── models.py                                ← Created
│   ├── schemas.py                               ← Created
│   └── router.py                                ← Created
├── celery/celery.py                             ← Modified (added ml_analysis_task)
└── main.py                                      ← Modified (registered ML router)

frontend/src/
└── components/AnalysisResults.tsx               ← Created
```

### Architecture Flow

```
User uploads log
    ↓
parse_log_task (Drain parser)
    ↓
ml_analysis_task (YOUR NEW CODE!)
    ↓
Save to analysis_results table
    ↓
Frontend fetches and displays
```

---

## Getting Help

### If You're Stuck:

1. **Check logs**:
```bash
# Backend errors
docker-compose logs backend

# Celery task errors
docker-compose logs celery-worker

# Database issues
docker-compose logs postgres
```

2. **Test individual components**:
```python
# Test ML service in Python shell
from src.ml.service import MLService
ml = MLService()
result = ml.predict_from_csv("/path/to/test.csv")
print(result)
```

3. **Common issues**:
   - Feature mismatch → Adjust `_extract_features()` method
   - Model not found → Check file path
   - Task not running → Restart Celery worker
   - Frontend 404 → Check if analysis_results table has data

---

**🎉 Congratulations!** You've integrated machine learning into your log analysis system!

The hardest part is done. Now you can iterate and add more features as needed.

**Questions or issues?** Check the troubleshooting section or examine the logs - they usually tell you exactly what's wrong.
