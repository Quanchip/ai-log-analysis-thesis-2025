"""
ML Service for anomaly detection.
This is the core logic for loading the model and making predictions.
"""
import sys
import pickle
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, List, Optional
import logging

# Add loglizer to Python path so pickle can find it when unpickling the model
# The model was trained with loglizer, so it needs to be importable
loglizer_path = str(Path(__file__).parent.parent / "third_party" / "loglizer")
if loglizer_path not in sys.path:
    sys.path.insert(0, loglizer_path)

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

        logger.info(f"Loading ML model from {model_path}")
        with open(model_path, 'rb') as f:
            self.model = pickle.load(f)

        logger.info(f"Loading feature extractor from {feature_extractor_path}")
        with open(feature_extractor_path, 'rb') as f:
            self.feature_extractor = pickle.load(f)

        logger.info(f"ML model loaded successfully")
        logger.info(f"Feature extractor loaded - vocabulary size: {len(self.feature_extractor.events)}")
        logger.info(f"OOV support: {'ENABLED' if self.feature_extractor.oov else 'DISABLED'}")        

    def predict_from_csv(self, csv_path: str) -> Dict:
        """
        Main method: Load CSV and predict anomalies.

        Args:
            csv_path: Path to the parsed CSV file (from Drain parser)

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