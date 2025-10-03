Chi tiết các bước Upload & Process Log File (No Code)

PHASE 1: UPLOAD FILE 📤
Step 1: Client gửi file lên server
1.1. Client-side validation (Optional nhưng nên có)

Kiểm tra file extension trước khi upload
Kiểm tra file size (VD: max 100MB)
Show progress bar khi upload
Hiển thị error message nếu file không hợp lệ

1.2. HTTP Request

Method: POST multipart/form-data
Include: file binary data + metadata (filename, size)
Optional: user authentication token
Optional: additional metadata (log type, source system)


Step 2: Server nhận request - Security Layer
2.1. Authentication & Authorization

Verify user token/session
Check user permission (có được phép upload không?)
Check user quota (đã vượt giới hạn chưa?)
Log request details (user_id, IP, timestamp)

2.2. Rate Limiting

Check: User đã upload bao nhiêu file trong X phút?
Nếu vượt limit → reject với HTTP 429
Track per user và per IP

2.3. File Validation - Layer 1 (Fast checks)

Check file extension (chỉ accept .log, .txt, .csv)
Check MIME type từ HTTP header
Check file size (ví dụ: min 1KB, max 100MB)
Reject ngay nếu fail → save resources


Step 3: File Validation - Layer 2 (Deep checks)
3.1. Filename Sanitization

Remove path traversal characters (../, ..)
Remove special characters nguy hiểm
Generate unique filename với timestamp + UUID
Prevent filename collision
Limit filename length (max 255 characters)

3.2. Content Validation

Read first few KB của file
Check xem có phải text file không (UTF-8 encoding)
Detect file format (log pattern, CSV structure)
Optional: Virus/malware scan nếu có antivirus service

3.3. Business Logic Validation

Check file có empty không
Check minimum/maximum line count
Validate log format (nếu có định dạng cụ thể)
Check duplicate upload (same file đã upload trước đó chưa?)


Step 4: Save file to MinIO (Object Storage)
4.1. Prepare metadata

Original filename
Sanitized filename
File size, upload timestamp
User ID, content type
Checksum/hash (MD5 hoặc SHA256) để verify integrity

4.2. Choose upload strategy dựa trên file size
Small files (< 5MB):

Direct upload: Read toàn bộ file vào memory → upload
Fast và simple

Medium files (5MB - 100MB):

Stream upload: Read file như một stream → pipe trực tiếp sang MinIO
Không load toàn bộ vào memory
Monitor upload progress

Large files (> 100MB):

Multipart upload: Chia file thành chunks (5MB mỗi chunk)
Upload từng chunk độc lập
Có thể resume nếu bị disconnect
Combine chunks sau khi upload xong

4.3. Upload to MinIO

Bucket structure: raw-logs/{user_id}/{year}/{month}/
Object name: {timestamp}_{uuid}_{sanitized_filename}
Set metadata tags (user_id, upload_date, status)
Set retention policy (auto-delete sau X ngày)
Get back: MinIO object URL/path

4.4. Verify upload

Check file exists trong MinIO
Verify checksum (uploaded file = original file?)
Nếu fail → cleanup và retry


Step 5: Create Processing Job
5.1. Generate Job ID

Unique job ID (UUID)
Link với uploaded file path
Link với user ID

5.2. Save job to database

Job table fields:

job_id (primary key)
user_id
file_path (MinIO path)
original_filename
file_size
status: "queued"
created_at: current timestamp
updated_at: null
completed_at: null
error_message: null
retry_count: 0



5.3. Return response to client IMMEDIATELY

Response: { job_id, status: "queued", message: "Processing started" }
Client có thể poll status bằng job_id
Don't wait for processing to complete!


PHASE 2: ASYNC PROCESSING ⚙️
Step 6: Queue the processing task
6.1. Push job to message queue

Queue system: Celery/RQ + Redis/RabbitMQ
Queue name: "log_processing_queue"
Message payload: { job_id, file_path, user_id, options }
Set task priority nếu cần (VIP users = high priority)
Set task expiration (task cũ quá X giờ = auto-cancel)

6.2. Worker picks up task

Worker pool (multiple workers chạy parallel)
Worker locks task (prevent duplicate processing)
Worker updates job status: "queued" → "processing"
Start timer để track processing time


Step 7: Download file from MinIO
7.1. Fetch file metadata

Get file size, content type
Decide processing strategy dựa trên size

7.2. Download strategy
Small files:

Download toàn bộ vào memory hoặc temp file
Process trực tiếp

Large files:

Stream download: Process từng chunk without fully loading
Reduce memory footprint

7.3. Integrity check

Verify checksum
Nếu corrupted → mark job as failed, notify user


Step 8: Parse Log File
8.1. Detect log format

Common formats: Apache, Nginx, Syslog, custom JSON logs
Auto-detect hoặc user specified format
Fallback: generic text parsing

8.2. Parse line by line
For small files:

Read all lines
Parse toàn bộ vào memory
Convert to structured format (list of dicts/dataframe)

For large files:

Read and parse in chunks (VD: 10,000 lines per chunk)
Process chunk → save results → clear memory
Repeat until end of file

8.3. Data extraction

Extract timestamp, log level, message, source, etc.
Handle parse errors gracefully:

Log unparseable lines
Skip hoặc mark as "unknown format"
Continue processing (don't fail entire job vì 1 line)



8.4. Data cleaning

Remove duplicates
Handle missing fields
Normalize timestamps
Filter out noise (nếu có)

8.5. Update progress

Every X lines processed → update job progress %
User có thể see realtime progress qua API


Step 9: Run ML Anomaly Detection
9.1. Feature engineering

Convert log entries to numerical features
Examples: timestamp gaps, error frequency, message length
Extract patterns, keywords

9.2. Load ML model

Pre-trained model (Isolation Forest, Autoencoder, etc.)
Load from disk hoặc model registry
Warm up model nếu cần

9.3. Run inference
For small datasets:

Run model trên toàn bộ data một lúc
Get anomaly scores

For large datasets:

Batch inference: chia data thành batches
Run model trên từng batch
Aggregate results

9.4. Post-processing

Threshold anomaly scores → label normal/anomaly
Rank anomalies by severity
Group similar anomalies
Generate summary statistics

9.5. Error handling

If model fails → fallback to rule-based detection
If out of memory → reduce batch size và retry
Log all errors for debugging


Step 10: Save processed results
10.1. Prepare output files
File 1: parsed.csv

All parsed log entries với structured format
Columns: timestamp, level, source, message, etc.

File 2: anomalies.csv

Only anomalous entries
Additional columns: anomaly_score, severity, category

File 3: summary.json

Metadata về processing job
Statistics: total lines, error count, anomaly count
Processing time, file sizes

10.2. Compress files

Gzip compression để save storage
Especially quan trọng cho large files
Trade-off: CPU time vs storage cost

10.3. Upload to MinIO

Bucket structure: processed-data/{user_id}/{job_id}/
Objects:

parsed.csv.gz
anomalies.csv.gz
summary.json
metadata.json


Set object metadata tags
Set access permissions (private, only accessible by owner)

10.4. Save to database
Option A: Save metadata only

Job results table:

job_id
parsed_file_path (MinIO URL)
anomalies_file_path
summary_data (JSON)
record_count
anomaly_count
processing_time_seconds



Option B: Save structured data to DB

Parsed logs table: Lưu tất cả parsed records
Anomalies table: Lưu only anomalies
Better for querying, but higher DB cost

Recommendation:

Use Option B cho better LLM integration
Database enables fast queries: "show me all ERROR logs from last hour"
MinIO files = backup và full data archive


Step 11: Update job status
11.1. Update job record

Status: "processing" → "completed"
completed_at: current timestamp
processing_time: end_time - start_time
result_summary: brief stats

11.2. Cleanup

Delete temporary files
Release locks
Free memory

11.3. Notification (Optional)

Send webhook to client nếu có callback URL
Send email/push notification cho user
Publish event to event bus (for other services to react)


PHASE 3: ERROR HANDLING 🔄
Step 12: Handle failures at every step
12.1. Upload failures

Network timeout → retry upload với exponential backoff
MinIO unavailable → queue upload for later
Invalid file → return error immediately, don't queue

12.2. Processing failures
Transient errors (có thể retry):

Network errors (MinIO connection lost)
Resource exhaustion (out of memory)
External service timeout (ML model API)

Action:

Retry task với backoff: 30s → 1min → 5min
Max 3 retries
Nếu vẫn fail → move to failed queue

Permanent errors (không nên retry):

Invalid file format
Corrupted data
Business logic errors

Action:

Mark job as "failed" immediately
Log detailed error
Notify user với actionable message

12.3. Partial failures

Parse thành công 90%, 10% fail → Still save 90%
ML model chỉ detect được 80% → Save partial results
Mark job as "completed_with_warnings"

12.4. Dead letter queue

Tasks fail quá nhiều lần → move to DLQ
Manual review/debugging
Alert operations team


PHASE 4: MONITORING & OBSERVABILITY 📊
Step 13: Real-time monitoring
13.1. Metrics to track

Upload rate: files per minute
Queue depth: pending jobs
Processing time: percentiles (p50, p95, p99)
Success rate: % successful vs failed
Resource usage: CPU, memory, disk per worker
MinIO throughput: read/write bandwidth

13.2. Logging

Structured logs with correlation IDs
Log levels: DEBUG, INFO, WARNING, ERROR, CRITICAL
Log aggregation (ELK, Grafana Loki)
Searchable by job_id, user_id, error type

13.3. Alerting

Queue backed up > 1000 jobs
Processing failure rate > 5%
Worker unhealthy/crashed
MinIO storage > 80% full
Processing time anomaly (suddenly 10x slower)

13.4. Dashboards

Real-time job status (queued, processing, completed, failed)
User activity heatmap
System health overview
Cost metrics (storage, compute)


PHASE 5: CLIENT POLLING & RETRIEVAL 📥
Step 14: Client polls for status
14.1. Client periodically calls GET /jobs/{job_id}

Polling interval: start 1s, exponential backoff to 10s
Server returns current status

14.2. Server response
{
  job_id: "...",
  status: "processing" | "completed" | "failed",
  progress: 75,  // percentage
  created_at: "...",
  updated_at: "...",
  estimated_completion: "...",  // if available
  error_message: null | "..."
}
14.3. When status = "completed"

Response includes download URLs:

parsed_data_url
anomalies_url
summary_url


URLs có thể là pre-signed MinIO URLs (expire sau X giờ)


Step 15: Client retrieves results
15.1. Download processed files

Client calls GET on provided URLs
Download parsed.csv.gz, anomalies.csv.gz
Decompress locally nếu cần

15.2. Access via API

Alternative: Client queries data qua API thay vì download files
GET /jobs/{job_id}/anomalies?limit=100
Get paginated results
Better for large datasets

15.3. LLM Chat Integration

User starts chat: "Why are there so many timeouts?"
Backend queries database for relevant anomalies
Backend retrieves context từ MinIO nếu cần
Send to LLM với context
Return analysis + recommendations


PHASE 6: OPTIMIZATION & SCALING 🚀
Step 16: Performance optimizations
16.1. Caching

Cache frequent queries (top anomalies, summary stats)
Cache ML model predictions for similar patterns
Redis/Memcached

16.2. Parallel processing

Split large file thành multiple chunks
Process chunks in parallel workers
Combine results at the end
5-10x faster for large files

16.3. Resource allocation

Small files → lightweight workers (512MB RAM)
Large files → heavyweight workers (4GB RAM)
Dynamic worker scaling based on queue depth

16.4. Database optimization

Index frequently queried fields (user_id, timestamp, log_level)
Partition tables by date
Archive old data to cold storage


Step 17: Scaling strategies
17.1. Horizontal scaling

Add more worker instances khi queue backed up
Auto-scaling based on queue depth metrics
Kubernetes/ECS auto-scaling groups

17.2. Load balancing

Distribute uploads across multiple API servers
Distribute tasks across worker pool
Geographic distribution nếu cần (multi-region)

17.3. Storage scaling

MinIO distributed mode (multi-node cluster)
Tiered storage: hot (SSD) → cold (HDD/S3 Glacier)
Lifecycle policies: auto-archive old logs


PHASE 7: MAINTENANCE & CLEANUP 🧹
Step 18: Regular maintenance
18.1. Data retention

Raw logs: keep 30 days, then delete
Processed data: keep 90 days, then archive
Database records: keep 180 days, then soft delete
Implement cron jobs cho auto-cleanup

18.2. Failed jobs cleanup

Review failed jobs weekly
Retry fixable jobs
Delete permanently failed jobs
Update code to prevent similar failures

18.3. Storage optimization

Compress old files further
Deduplicate similar logs
Move to cheaper storage tiers

18.4. Audit & compliance

Log all access to sensitive data
Encrypt data at rest và in transit
Regular security audits
Compliance với GDPR, CCPA nếu applicable


SUMMARY: End-to-End Flow
1. User uploads file
   ↓
2. API validates (security, size, format)
   ↓
3. Stream to MinIO (raw-logs bucket)
   ↓
4. Create job record (status: queued)
   ↓
5. Return job_id immediately to client
   ↓
6. Queue processing task (Celery/RQ)
   ↓
7. Worker picks up task (status: processing)
   ↓
8. Download file from MinIO (stream)
   ↓
9. Parse log file (in chunks)
   ↓
10. Run ML anomaly detection (batch)
   ↓
11. Save results to MinIO (processed-data bucket)
   ↓
12. Save metadata to database
   ↓
13. Update job status (completed/failed)
   ↓
14. Client polls status
   ↓
15. Client retrieves results
   ↓
16. LLM integration (chat about logs)

Critical Decision Points
Decision 1: Synchronous vs Asynchronous?

Always async for files > 1MB hoặc processing > 5s
Benefits: Better UX, scalability, fault tolerance

Decision 2: Where to store processed data?

MinIO for files (cheap, scalable)
Database for metadata + searchable records (fast queries)
Hybrid approach = best practice

Decision 3: How to handle large files?

Stream processing + chunking + parallel workers
Never load entire file vào memory

Decision 4: Retry strategy?

Transient errors: Retry với exponential backoff (max 3 times)
Permanent errors: Fail immediately
Idempotency: Task phải chạy nhiều lần mà không tạo duplicates

Decision 5: When to use ML vs rules?

ML: When có training data và patterns phức tạp
Rules: When patterns đơn giản và well-defined
Hybrid: ML với rule-based fallback