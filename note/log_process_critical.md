### Security
- [ ] File validation (type, size, content)
- [ ] Filename sanitization
- [ ] Rate limiting configured


### Performance
- [ ] Streaming upload for large files
- [ ] Async processing with queue
- [ ] Chunk processing for large files



PostgreSQL (lightweight):
├─ sessions table
│  ├─ id, user_id, filename, status
│  ├─ total_logs, error_count, anomaly_count
│  └─ created_at, processed_at
│
└─ anomalies table (chỉ anomalies!)
   ├─ id, session_id, timestamp, severity
   ├─ error_type, message (truncated)
   └─ context (JSON - 5-10 lines xung quanh)

MinIO:
├─ raw-logs/{session_id}.log (original)
└─ processed/{session_id}.csv (full data)

B. MinIO Structure
bucket: user-logs
├─ raw/
│  └─ {user_id}/{session_id}/
│      └─ original.log
│
├─ processed/
│  └─ {user_id}/{session_id}/
│      ├─ full_parsed.csv.gz        # Toàn bộ logs
│      ├─ anomalies_only.csv        # Chỉ anomalies (nhỏ hơn)
│      └─ metadata.json             # Stats, summary
│
└─ chunks/  (optional, cho file rất lớn)
   └─ {session_id}/
       ├─ chunk_0001.parquet
       ├─ chunk_0002.parquet
       └─ ...






User Upload Log
    ↓
MinIO (raw .log files)
    ↓
Processing Pipeline
    ↓
    ├─→ Elasticsearch (parsed logs + anomalies) ← PRIMARY
    ├─→ PostgreSQL (metadata, user info, sessions)
    └─→ MinIO (processed CSV backup)


┌─────────────┐
│   User      │
└──────┬──────┘
       │ Upload log
       ↓
┌─────────────────┐
│   FastAPI       │
└────────┬────────┘
         │
         ├──→ MinIO (raw logs)
         ├──→ PostgreSQL (job metadata)
         └──→ Celery Queue
                  │
                  ↓
         ┌──────────────┐
         │  Worker      │
         └───────┬──────┘
                 │
                 ├──→ Parse & ML
                 ├──→ Elasticsearch (indexed logs) ← PRIMARY
                 ├──→ PostgreSQL (update job status)
                 └──→ MinIO (CSV backup)
                      
         ┌──────────────┐
         │   LLM Chat   │
         └───────┬──────┘
                 │
                 ├──→ Elasticsearch (search logs)
                 ├──→ PostgreSQL (get session info)
                 └──→ OpenAI (generate answer)