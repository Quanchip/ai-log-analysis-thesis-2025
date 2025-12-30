# AI Log Analysis System - Database Schema (DBML Format)

```dbml
Table users {
  id integer [primary key]
  username varchar(255) [unique, not null]
  email varchar(255) [not null]
  password varchar(255) [not null, note: 'Bcrypt hashed password']
  role varchar [not null, default: 'user', note: 'user or admin']
  created_at timestamp [not null, default: `now()`]
}

Table log_files {
  id integer [primary key]
  filename varchar [not null, note: 'Display name for the file']
  original_filename varchar [not null, note: 'Original file name from upload']
  minio_object_name varchar [unique, not null, note: 'Unique MinIO storage path']
  minio_bucket varchar [not null, note: 'MinIO bucket name (raw-logs, processed-logs)']
  file_size integer [not null, note: 'File size in bytes']
  content_type varchar [note: 'MIME type of uploaded file']
  upload_date timestamp [default: `now()`, note: 'UTC timestamp of upload']
  user_id integer [not null]
}

Table processing_jobs {
  id varchar(36) [primary key, note: 'UUID for distributed systems']
  user_id integer [not null]
  file_id integer [not null]
  celery_task_id varchar(36) [unique, note: 'Celery task identifier for monitoring']
  status varchar [not null, default: 'pending', note: 'pending, queued, processing, completed, failed, retrying']
  result_file_path varchar(500) [note: 'MinIO path to processed results']
  created_at timestamp [not null, default: `now()`, note: 'Job creation timestamp']
  completed_at timestamp [note: 'Job completion timestamp (NULL if not completed)']
  error_message text [note: 'Error details if job failed']
}

Table analysis_results {
  id integer [primary key]
  log_file_id integer [not null]
  total_logs integer [not null, note: 'Total number of log entries analyzed']
  anomaly_count integer [not null, note: 'Number of anomalous log entries detected']
  normal_count integer [not null, note: 'Number of normal log entries']
  anomaly_percentage decimal(5,2) [not null, note: 'Percentage of anomalies (calculated field)']
  predictions jsonb [note: 'JSON array of individual log predictions']
  anomaly_logs jsonb [note: 'JSON array of actual anomalous log entries']
  created_at timestamp [default: `now()`, note: 'Analysis completion timestamp']
}

// User to Log Files Relationship (One-to-Many)
Ref user_log_files: log_files.user_id > users.id

// User to Processing Jobs Relationship (One-to-Many) 
Ref user_processing_jobs: processing_jobs.user_id > users.id

// Log Files to Processing Jobs Relationship (One-to-Many)
Ref log_file_processing_jobs: processing_jobs.file_id > log_files.id

// Log Files to Analysis Results Relationship (One-to-Many)
Ref log_file_analysis_results: analysis_results.log_file_id > log_files.id
```

## Indexes for Performance Optimization

```dbml
Table users {
  indexes {
    username [unique]
    email
    role
    created_at
  }
}

Table log_files {
  indexes {
    user_id
    upload_date
    filename
    minio_object_name [unique]
  }
}

Table processing_jobs {
  indexes {
    user_id
    status
    (user_id, status) [name: 'idx_user_status']
    created_at
    celery_task_id [unique]
  }
}

Table analysis_results {
  indexes {
    log_file_id
    created_at
    anomaly_percentage
  }
}
```

## Entity Relationship Summary

### Primary Relationships:
- **users** (1) → **log_files** (N): One user can upload multiple log files
- **users** (1) → **processing_jobs** (N): One user can have multiple processing jobs  
- **log_files** (1) → **processing_jobs** (N): One log file can have multiple processing attempts
- **log_files** (1) → **analysis_results** (N): One log file can have multiple analysis results

### Key Design Features:
- **UUID Primary Keys**: `processing_jobs.id` uses UUID for distributed job tracking
- **Enum Constraints**: Role field (user/admin), Status field (pending/queued/processing/completed/failed/retrying)
- **JSON Storage**: Flexible storage for ML predictions and anomaly logs
- **Cascade Deletes**: Foreign key relationships with CASCADE delete for data consistency
- **Performance Indexes**: Strategic indexing for common query patterns
- **Audit Trail**: Comprehensive timestamp tracking across all entities