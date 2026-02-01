# AI Log Analysis System for thesis 2025

An advanced log analysis system leveraging artificial intelligence techniques for automated log parsing, anomaly detection, and intelligent monitoring.

> [!IMPORTANT]
> **Attention Teachers & Reviewers**: Please refer to the **`Thesis Document/`** directory for the official thesis documentation, including the comprehensive **`INSTALLATION_GUIDE.txt`**.

## Overview

This thesis project focuses on developing AI-powered solutions for log analysis, combining automated log parsing with intelligent anomaly detection. The system is designed to handle large-scale log data from various sources and provide actionable insights for system monitoring and troubleshooting.

## Tech Stack

- **Frontend**: React + TypeScript
- **Backend**: FastAPI (Python)
- **Database**: PostgreSQL
- **Storage**: MinIO (S3-compatible object storage)
- **Task Queue**: Celery + Redis
- **Containerization**: Docker & Docker Compose

## Project Structure

```
ai-log-analysis-thesis-2025/
├── backend/           # FastAPI backend application
├── frontend/          # React frontend application
├── docker-utils/      # Docker configuration and utilities
├── diagrams/          # Project documentation diagrams
└── README.md          # This file
```

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Sufficient disk space for log data processing

### Quick Start with Docker

The easiest way to run the entire system is using Docker Compose.

1. Navigate to the docker utilities directory:
   ```bash
   cd docker-utils/
   ```

2. Start all services:
   ```bash
   docker-compose up -d
   ```

3. Access the services:
   
   | Service | URL | Credentials (if applicable) |
   |---------|-----|-----------------------------|
   | **Frontend** | http://localhost:3002 | - |
   | **Backend API** | http://localhost:8000 | - |
   | **API Docs** | http://localhost:8000/docs | - |
   | **MinIO Console** | http://localhost:9001 | admin / admin123 |
   | **PgAdmin** | http://localhost:8088 | admin@admin.com / admin |
   | **Flower** | http://localhost:5555 | - |

### Running Locally (Development)

Detailed development instructions can be found in `CLAUDE.md`.

## Architecture Overview

The system follows a client-server architecture:

- **Client Layer**: A React Single Page Application (SPA) serving as the user dashboard.
- **API Layer**: FastAPI backend handling REST API requests, authentication, and orchestration.
- **Data Layer**: PostgreSQL for structured data (users, metadata), MinIO for object storage (log files), and Redis for caching/queueing.
- **Worker Layer**: Celery workers for asynchronous tasks like heavy log parsing and ML processing.

## Research Focus

This thesis explores:

1. **Automated Log Parsing**: Developing robust algorithms for extracting structured information from unstructured log data.
2. **AI-Driven Anomaly Detection**: Implementing machine learning models to identify abnormal patterns in system logs.
3. **Scalable Architecture**: Designing systems capable of handling large-scale enterprise log volumes.

## Contact

- **Author**: Nguyen Hoang Quan
- **Email**: qaun10052003@gmail.com

---
*This project is part of an academic thesis (2025).*