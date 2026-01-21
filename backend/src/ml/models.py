"""
Database models for ML analysis results.
This stores the predictions from our ML model.
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from src.database import Base


class AnalysisResult(Base):
    """
    Stores results from ML anomaly detection.
    One record per log file analyzed.
    """
    __tablename__ = "analysis_results"

    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    log_file_id = Column(Integer, ForeignKey("log_files.id"), nullable=False)
    total_logs = Column(Integer, nullable=False)
    anomaly_count = Column(Integer, nullable=False)     # How many anomalies found
    normal_count = Column(Integer, nullable=False)      # How many normal logs
    anomaly_percentage = Column(Float, nullable=False)  # Percentage of anomalies

    predictions = Column(JSON, nullable=True)
    anomaly_logs = Column(JSON, nullable=True)  # Stores actual anomaly log entries
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    log_file = relationship("LogFile", backref="analysis_results")

