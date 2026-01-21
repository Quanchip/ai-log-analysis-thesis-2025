# AI Log Analysis System - Database Schema Documentation

## Overview
The AI Log Analysis system uses a PostgreSQL database with a normalized relational schema designed to support log file management, user authentication, asynchronous job processing, and ML analysis results storage.

## Database Architecture

### Schema Design Principles
- **Separation of Concerns**: Each entity has a single responsibility
- **Referential Integrity**: Foreign key relationships ensure data consistency
- **Performance Optimization**: Strategic indexing for common query patterns
- **Scalability**: UUID-based job tracking for distributed systems
- **Audit Trail**: Timestamp tracking for all major operations

## Complete Database Schema

### 1. Users Table (`users`)
**Purpose**: User authentication and role-based access control

```sql
CREATE TYPE user_role AS ENUM ('user', 'admin');

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,  -- Bcrypt hashed
    role user_role DEFAULT 'user' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at DESC);
```

**Fields Description:**
- `id`: Auto-incrementing primary key
- `username`: Unique identifier for login (max 255 chars)
- `email`: User email address
- `password`: Bcrypt-hashed password with salt
- `role`: Enum constraint ('user', 'admin') for RBAC
- `created_at`: Account creation timestamp with timezone

### 2. Log Files Table (`log_files`)
**Purpose**: Metadata storage for uploaded log files

```sql
CREATE TABLE log_files (
    id SERIAL PRIMARY KEY,
    filename VARCHAR NOT NULL,
    original_filename VARCHAR NOT NULL,
    minio_object_name VARCHAR UNIQUE NOT NULL,
    minio_bucket VARCHAR NOT NULL,
    file_size INTEGER NOT NULL,
    content_type VARCHAR,
    upload_date TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'utc'),
    user_id INTEGER NOT NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_log_files_user_id ON log_files(user_id);
CREATE INDEX idx_log_files_upload_date ON log_files(upload_date DESC);
CREATE INDEX idx_log_files_filename ON log_files(filename);
CREATE INDEX idx_log_files_minio_object ON log_files(minio_object_name);
```

**Fields Description:**
- `id`: Auto-incrementing primary key
- `filename`: Display name for the file
- `original_filename`: Original file name from upload
- `minio_object_name`: Unique MinIO storage path
- `minio_bucket`: MinIO bucket name (raw-logs, processed-logs)
- `file_size`: File size in bytes
- `content_type`: MIME type of uploaded file
- `upload_date`: UTC timestamp of upload
- `user_id`: Foreign key reference to users table

### 3. Processing Jobs Table (`processing_jobs`)
**Purpose**: Asynchronous job tracking and status management

```sql
CREATE TYPE job_status AS ENUM (
    'pending',    -- Job created, not queued yet
    'queued',     -- Pushed to Redis queue
    'processing', -- Worker picked up
    'completed',  -- Successfully processed
    'failed',     -- Processing failed
    'retrying'    -- Retrying after failure
);

CREATE TABLE processing_jobs (
    id VARCHAR(36) PRIMARY KEY,  -- UUID for distributed systems
    user_id INTEGER NOT NULL,
    file_id INTEGER NOT NULL,
    celery_task_id VARCHAR(36) UNIQUE,
    status job_status DEFAULT 'pending' NOT NULL,
    result_file_path VARCHAR(500),
    created_at TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'utc') NOT NULL,
    completed_at TIMESTAMP,
    error_message TEXT,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (file_id) REFERENCES log_files(id) ON DELETE CASCADE
);

-- Indexes for job tracking and performance
CREATE INDEX idx_processing_jobs_user_id ON processing_jobs(user_id);
CREATE INDEX idx_processing_jobs_status ON processing_jobs(status);
CREATE INDEX idx_processing_jobs_user_status ON processing_jobs(user_id, status);
CREATE INDEX idx_processing_jobs_created_at ON processing_jobs(created_at DESC);
CREATE INDEX idx_processing_jobs_celery_task ON processing_jobs(celery_task_id);
```

**Fields Description:**
- `id`: UUID primary key for distributed job tracking
- `user_id`: Foreign key to users table
- `file_id`: Foreign key to log_files table
- `celery_task_id`: Celery task identifier for monitoring
- `status`: Current job status with enum constraint
- `result_file_path`: MinIO path to processed results
- `created_at`: Job creation timestamp
- `completed_at`: Job completion timestamp (NULL if not completed)
- `error_message`: Error details if job failed

### 4. Analysis Results Table (`analysis_results`)
**Purpose**: ML anomaly detection results storage

```sql
CREATE TABLE analysis_results (
    id SERIAL PRIMARY KEY,
    log_file_id INTEGER NOT NULL,
    total_logs INTEGER NOT NULL,
    anomaly_count INTEGER NOT NULL,
    normal_count INTEGER NOT NULL,
    anomaly_percentage DECIMAL(5,2) NOT NULL,
    predictions JSONB,
    anomaly_logs JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (log_file_id) REFERENCES log_files(id) ON DELETE CASCADE
);

-- Indexes for analysis queries
CREATE INDEX idx_analysis_results_log_file ON analysis_results(log_file_id);
CREATE INDEX idx_analysis_results_created_at ON analysis_results(created_at DESC);
CREATE INDEX idx_analysis_results_anomaly_percentage ON analysis_results(anomaly_percentage);
```

**Fields Description:**
- `id`: Auto-incrementing primary key
- `log_file_id`: Foreign key to log_files table
- `total_logs`: Total number of log entries analyzed
- `anomaly_count`: Number of anomalous log entries detected
- `normal_count`: Number of normal log entries
- `anomaly_percentage`: Percentage of anomalies (calculated field)
- `predictions`: JSON array of individual log predictions
- `anomaly_logs`: JSON array of actual anomalous log entries
- `created_at`: Analysis completion timestamp

## Entity Relationships

### Relationship Diagram
```
┌─────────────────────┐
│       users         │
│─────────────────────│
│ id (PK)             │
│ username (UNIQUE)   │
│ email               │
│ password            │
│ role (ENUM)         │
│ created_at          │
└──────────┬──────────┘
           │ 1
           │
           │ N
┌──────────▼──────────┐         ┌─────────────────────┐
│     log_files       │         │  processing_jobs    │
│─────────────────────│         │─────────────────────│
│ id (PK)             │◄────────│ id (PK, UUID)       │
│ filename            │  1   N  │ file_id (FK)        │
│ original_filename   │         │ user_id (FK)        │
│ minio_object_name   │         │ celery_task_id      │
│ minio_bucket        │         │ status (ENUM)       │
│ file_size           │         │ result_file_path    │
│ content_type        │         │ created_at          │
│ upload_date         │         │ completed_at        │
│ user_id (FK)        │         │ error_message       │
└─────┬───────────────┘         └─────────────────────┘
      │ 1
      │
      │ N
┌─────▼───────────────┐
│  analysis_results   │
│─────────────────────│
│ id (PK)             │
│ log_file_id (FK)    │
│ total_logs          │
│ anomaly_count       │
│ normal_count        │
│ anomaly_percentage  │
│ predictions (JSON)  │
│ anomaly_logs (JSON) │
│ created_at          │
└─────────────────────┘
```

### Relationship Details

#### 1. Users → Log Files (One-to-Many)
- **Relationship**: One user can upload many log files
- **Foreign Key**: `log_files.user_id → users.id`
- **Cascade**: DELETE CASCADE (when user deleted, their files are deleted)

#### 2. Users → Processing Jobs (One-to-Many)
- **Relationship**: One user can have many processing jobs
- **Foreign Key**: `processing_jobs.user_id → users.id`
- **Cascade**: DELETE CASCADE (when user deleted, their jobs are deleted)

#### 3. Log Files → Processing Jobs (One-to-Many)
- **Relationship**: One log file can have multiple processing attempts
- **Foreign Key**: `processing_jobs.file_id → log_files.id`
- **Cascade**: DELETE CASCADE (when file deleted, processing jobs are deleted)

#### 4. Log Files → Analysis Results (One-to-Many)
- **Relationship**: One log file can have multiple analysis results
- **Foreign Key**: `analysis_results.log_file_id → log_files.id`
- **Cascade**: DELETE CASCADE (when file deleted, analysis results are deleted)

## Database Constraints and Rules

### Primary Key Strategies
- **Auto-incrementing IDs**: Used for users, log_files, analysis_results
- **UUID**: Used for processing_jobs to support distributed processing

### Unique Constraints
```sql
-- Prevent duplicate usernames
ALTER TABLE users ADD CONSTRAINT unique_username UNIQUE (username);

-- Prevent duplicate MinIO object names
ALTER TABLE log_files ADD CONSTRAINT unique_minio_object UNIQUE (minio_object_name);

-- Prevent duplicate Celery task IDs
ALTER TABLE processing_jobs ADD CONSTRAINT unique_celery_task UNIQUE (celery_task_id);
```

### Check Constraints
```sql
-- Ensure file sizes are positive
ALTER TABLE log_files ADD CONSTRAINT positive_file_size CHECK (file_size > 0);

-- Ensure anomaly counts are valid
ALTER TABLE analysis_results ADD CONSTRAINT valid_anomaly_count 
    CHECK (anomaly_count >= 0 AND anomaly_count <= total_logs);

-- Ensure completion date is after creation date
ALTER TABLE processing_jobs ADD CONSTRAINT valid_completion_time 
    CHECK (completed_at IS NULL OR completed_at >= created_at);
```

## Performance Optimization

### Index Strategy
The schema includes strategic indexes for common query patterns:

#### User-based Queries
```sql
-- Fast user lookup
CREATE INDEX idx_users_username ON users(username);

-- User activity tracking
CREATE INDEX idx_log_files_user_id ON log_files(user_id);
CREATE INDEX idx_processing_jobs_user_id ON processing_jobs(user_id);
```

#### Time-based Queries
```sql
-- Recent uploads
CREATE INDEX idx_log_files_upload_date ON log_files(upload_date DESC);

-- Job status monitoring
CREATE INDEX idx_processing_jobs_created_at ON processing_jobs(created_at DESC);
```

#### Status-based Queries
```sql
-- Job queue management
CREATE INDEX idx_processing_jobs_status ON processing_jobs(status);

-- Combined user-status queries
CREATE INDEX idx_processing_jobs_user_status ON processing_jobs(user_id, status);
```

### Query Optimization Examples

#### Common Query Patterns
```sql
-- Get user's recent files
SELECT * FROM log_files 
WHERE user_id = ? 
ORDER BY upload_date DESC 
LIMIT 10;

-- Get active jobs for monitoring
SELECT * FROM processing_jobs 
WHERE status IN ('pending', 'queued', 'processing') 
ORDER BY created_at ASC;

-- Get user's job history with file info
SELECT 
    pj.id as job_id,
    pj.status,
    pj.created_at,
    lf.filename,
    lf.file_size
FROM processing_jobs pj
JOIN log_files lf ON pj.file_id = lf.id
WHERE pj.user_id = ?
ORDER BY pj.created_at DESC;
```

## Data Types and Storage Considerations

### JSON Fields Usage
- **analysis_results.predictions**: Array of prediction objects
- **analysis_results.anomaly_logs**: Array of anomalous log entries
- **Benefit**: Flexible schema for varying ML model outputs
- **Performance**: JSONB type supports indexing and efficient queries

### Timestamp Handling
- **All timestamps**: Stored in UTC to avoid timezone issues
- **created_at fields**: Use server default for consistency
- **completed_at**: Nullable to indicate incomplete jobs

### String Field Sizing
- **Usernames**: 255 chars (reasonable for usernames)
- **File paths**: 500 chars (accommodates deep directory structures)
- **Error messages**: TEXT type for unlimited length

## Database Initialization

### SQLAlchemy Model Registration
The application uses SQLAlchemy's automatic table creation:

```python
# backend/src/main.py
from src.database import Base, engine

# Import all models to register them
from .auth import models as auth_models
from .logs import models as logs_model
from .jobs import models as jobs_model
from .ml import models as ml_model

# Create all tables
Base.metadata.create_all(engine)
```

### Environment Configuration
```bash
# Database connection parameters
DB_HOST=postgres
DB_PORT=5432
DB_NAME=myproject
DB_USER=postgres
DB_PASSWORD=password
```

## Security Considerations

### Password Security
- **Hashing**: Bcrypt with salt rounds
- **Storage**: Never store plaintext passwords
- **Validation**: Strong password requirements enforced

### Data Isolation
- **User Isolation**: Foreign key constraints ensure users can only access their data
- **Admin Access**: Role-based queries for administrative functions
- **Cascade Deletes**: Proper cleanup when users are removed

### Audit Trail
- **Creation Timestamps**: All entities track when they were created
- **Job Tracking**: Complete history of processing attempts
- **Error Logging**: Failed operations recorded with error messages

This database schema provides a robust foundation for the AI log analysis system, supporting user management, file processing workflows, asynchronous job tracking, and ML analysis result storage while maintaining data integrity and performance optimization.