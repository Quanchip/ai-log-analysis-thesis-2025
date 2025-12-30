# Project Context

This is a Bachelor's thesis project for Vietnam National University - International University, focusing on anomaly detection in HDFS (Hadoop Distributed File System) logs using machine learning combined with LLM-based analysis.

## Project Overview

**Title:** Anomaly Detection in HDFS Logs using Machine Learning Integrated with LLM-Based Mitigation

**Core Components:**
1. Log parsing using Drain algorithm
2. Feature extraction from structured logs
3. Anomaly detection using Decision Tree and other ML models
4. LLM integration for root cause analysis and mitigation recommendations

## System Architecture

**Backend:** FastAPI application with:
- PostgreSQL database (SQLAlchemy ORM)
- Celery for asynchronous processing
- MinIO for file storage
- RESTful API endpoints

**Frontend:** React application

**ML Pipeline:**
1. Raw logs → Drain parser → Structured log sequences
2. Feature extraction → Event count vectors
3. ML model (Decision Tree/Isolation Forest) → Anomaly detection
4. LLM analysis → Explanations and recommendations

## Academic Writing Standards

When generating thesis-related text:

**Tone & Style:**
- Formal academic writing
- Third-person perspective preferred
- Present tense for general statements, past tense for methodology/results
- Clear, concise technical language

**Structure:**
- Follow standard thesis format: Introduction, Literature Review, Methodology, Implementation, Results, Conclusion
- Use IEEE citation style for references
- Include clear section headings and subsections

**Technical Content:**
- Explain HDFS context and distributed systems concepts
- Reference established algorithms (Drain, Decision Trees, Isolation Forest)
- Compare supervised vs. unsupervised learning approaches
- Discuss PCA, SVM, k-means clustering where relevant

## Key Terminology

- **Log parsing:** Converting unstructured logs to structured templates
- **Event templates:** Patterns extracted from log messages
- **Anomaly detection:** Identifying abnormal system behavior
- **Feature extraction:** Converting log sequences to numerical representations
- **LLM integration:** Using large language models for interpretability

## Code Conventions

**Python:**
- Follow PEP 8 style guide
- Type hints for function signatures
- Docstrings for classes and functions
- Async/await for I/O operations

**Project Structure:**
- `src/` - Backend source code
- `models/` - ML models and training scripts
- `parsers/` - Drain parser implementation
- `services/` - Business logic (LLM service, file handling)
- `api/` - FastAPI routers and endpoints

## What NOT to Do

- Don't use bullet points excessively in thesis chapters (use prose)
- Don't generate production code without error handling
- Don't skip input validation in API endpoints
- Don't hardcode credentials or API keys
- Don't make claims about model performance without data to support it

## Useful Context

**Dataset:** HDFS logs from public datasets, labeled for anomaly detection
**Target System:** Production-ready web application with REST API
**Evaluation Metrics:** Precision, recall, F1-score for anomaly detection
**Advisor:** Dr. Le Hai Duong

## When to Search the Web

- For latest FastAPI or React best practices
- For recent papers on log anomaly detection
- For current LLM API documentation (e.g., Anthropic, OpenAI)
- For troubleshooting specific library errors