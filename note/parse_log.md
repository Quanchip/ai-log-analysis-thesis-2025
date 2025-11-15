# Log Parsing Integration Plan: Drain Parser

## Overview
This document outlines the detailed steps to integrate the Drain log parser from `backend/src/third_party/logparser/logparser/Drain/` into the current file upload workflow. When a user uploads a log file, the backend will parse it using Drain and upload the results to MinIO.

## Current Architecture

### File Upload Flow
1. User uploads log file → `POST /api/logs/upload`
2. Backend saves to MinIO (`raw-logs` bucket)
3. Creates LogFile record in database
4. Creates ProcessingJob and queues Celery task
5. Celery worker processes the job (currently just counts lines)
6. Results uploaded to MinIO (`processed-logs` bucket)

### Key Components
- **Upload Handler**: [backend/src/logs/router.py](backend/src/logs/router.py)
- **Service Layer**: [backend/src/logs/service.py](backend/src/logs/service.py)
- **Job Creator**: [backend/src/jobs/service.py](backend/src/jobs/service.py)
- **Celery Task**: [backend/src/celery/celery.py](backend/src/celery/celery.py) - `create_task()`
- **MinIO Client**: [backend/src/storage/minio_client.py](backend/src/storage/minio_client.py)
- **Drain Parser**: [backend/src/third_party/logparser/logparser/Drain/Drain.py](backend/src/third_party/logparser/logparser/Drain/Drain.py)

## Implementation Steps

### Step 1: Create Drain Parser Service Module

**File**: `backend/src/parsers/drain_service.py`

**Purpose**: Wrap the Drain parser for use in the application

**Requirements**:
- Accept log content as string or file-like object (not file path)
- Parse in-memory without requiring disk I/O
- Return structured results (templates + structured logs)
- Handle various log formats dynamically
- Return results as pandas DataFrames or JSON-serializable dictionaries

**Key Functions**:
```python
def parse_log_content(
    log_content: str,
    log_format: str,
    regex_patterns: List[str] = None,
    st: float = 0.5,
    depth: int = 4
) -> Dict:
    """
    Parse log content using Drain algorithm

    Args:
        log_content: Raw log file content as string
        log_format: Log format pattern (e.g., '<Date> <Time> <Level> <Content>')
        regex_patterns: Optional preprocessing regex patterns
        st: Similarity threshold (0.0-1.0)
        depth: Tree depth for parsing

    Returns:
        Dict containing:
        - templates: List of discovered log templates with occurrences
        - structured_logs: Parsed logs with EventId and EventTemplate
        - statistics: Parsing metadata (total lines, unique templates, etc.)
    """
```

**Implementation Details**:
- Modify Drain's `load_data()` to accept string content instead of file path
- Parse content in-memory using io.StringIO
- Return DataFrames converted to dictionaries for JSON serialization
- Handle errors gracefully with informative error messages

### Step 2: Detect Log Format

**File**: `backend/src/parsers/log_format_detector.py`

**Purpose**: Auto-detect log format from sample lines or use predefined formats

**Common Log Formats**:
```python
LOG_FORMATS = {
    "hdfs": "<Date> <Time> <Pid> <Level> <Component>: <Content>",
    "linux": "<Month> <Date> <Time> <Level> <Component>(\[<PID>\])?: <Content>",
    "apache": "<IP> - - \[<Time>\] \"<Method> <Url> <Version>\" <Status> <Size>",
    "syslog": "<Date> <Time> <Host> <Process>: <Content>",
    "generic": "<Content>",  # Fallback: treat entire line as content
}
```

**Function**:
```python
def detect_log_format(log_content: str, sample_lines: int = 100) -> str:
    """
    Analyze first N lines to detect log format
    Returns format string or 'generic' as fallback
    """
```

### Step 3: Update Celery Task to Use Drain Parser

**File**: `backend/src/celery/celery.py`

**Current Task** (lines 57-87):
- Downloads file from MinIO
- Counts lines
- Uploads simple text result

**New Task Flow**:
1. Download log file from MinIO
2. Decode content to UTF-8 string
3. Detect or use specified log format
4. Parse using Drain service
5. Generate multiple output files:
   - `{job_id}_templates.csv` - Log templates with occurrences
   - `{job_id}_structured.csv` - Structured logs with EventId
   - `{job_id}_summary.json` - Parsing statistics
6. Upload all results to MinIO `processed-logs` bucket
7. Update job with result paths

**Implementation**:
```python
@celery.task(name="create_task", bind=True, base=DatabaseTask)
def create_task(self, job_id: str):
    db = self.db

    try:
        # Get job and log file
        job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
        log_file = db.query(LogFile).filter(LogFile.id == job.file_id).first()

        # Update status
        job.status = JobStatus.PROCESSING
        db.commit()

        # Download from MinIO
        file_data = minio_client.get_file_raw(log_file.minio_object_name)
        content = file_data.decode('utf-8', errors='ignore')

        # Detect format
        from ..parsers.log_format_detector import detect_log_format
        log_format = detect_log_format(content)

        # Parse with Drain
        from ..parsers.drain_service import parse_log_content
        parse_result = parse_log_content(
            log_content=content,
            log_format=log_format,
            st=0.5,
            depth=4
        )

        # Upload results to MinIO
        timestamp = datetime.datetime.now().strftime('%Y%m%d')
        base_path = f"processed/{job.user_id}/{timestamp}/{job_id}"

        # Upload templates CSV
        templates_csv = convert_to_csv(parse_result['templates'])
        minio_client.upload_process_file(
            file_data=templates_csv.encode('utf-8'),
            object_name=f"{base_path}_templates.csv",
            content_type="text/csv",
            bucket_name="processed-logs"
        )

        # Upload structured logs CSV
        structured_csv = convert_to_csv(parse_result['structured_logs'])
        minio_client.upload_process_file(
            file_data=structured_csv.encode('utf-8'),
            object_name=f"{base_path}_structured.csv",
            content_type="text/csv",
            bucket_name="processed-logs"
        )

        # Upload summary JSON
        summary_json = json.dumps(parse_result['statistics'], indent=2)
        minio_client.upload_process_file(
            file_data=summary_json.encode('utf-8'),
            object_name=f"{base_path}_summary.json",
            content_type="application/json",
            bucket_name="processed-logs"
        )

        # Update job
        job.result_file_path = base_path
        job.status = JobStatus.COMPLETED
        db.commit()

    except Exception as e:
        job.status = JobStatus.FAILED
        db.commit()
        raise
```

### Step 4: Add Required Dependencies

**File**: `backend/requirements.txt`

Add if not present:
```
pandas>=1.5.0
regex>=2023.0.0
```

### Step 5: Ensure "processed-logs" Bucket Exists

**File**: `backend/src/storage/minio_client.py`

Update `_ensure_bucket_exists()` to create both buckets:
```python
def _ensure_bucket_exists(self):
    """Create buckets if they don't exist"""
    buckets = [settings.MINIO_BUCKET_NAME, "processed-logs"]
    for bucket in buckets:
        try:
            if not self.client.bucket_exists(bucket):
                self.client.make_bucket(bucket)
                print(f"Bucket '{bucket}' created")
        except S3Error as e:
            print(f"Error creating bucket {bucket}: {e}")
```

### Step 6: Update Database Models (Optional)

**File**: `backend/src/jobs/models.py`

Consider adding fields to `ProcessingJob`:
```python
class ProcessingJob(Base):
    # ... existing fields ...

    # New fields for parser results
    templates_file_path = Column(String, nullable=True)
    structured_file_path = Column(String, nullable=True)
    summary_file_path = Column(String, nullable=True)
    total_log_lines = Column(Integer, nullable=True)
    unique_templates = Column(Integer, nullable=True)
    parser_version = Column(String, default="drain-v1")
```

### Step 7: API Response Enhancement

**File**: `backend/src/jobs/schemas.py` (if exists)

Update response schemas to include parsing results:
```python
class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    templates_url: Optional[str]
    structured_url: Optional[str]
    summary_url: Optional[str]
    statistics: Optional[Dict]
```

## Testing Plan

### Unit Tests
1. Test `drain_service.parse_log_content()` with sample log formats
2. Test `log_format_detector.detect_log_format()` with various log types
3. Test MinIO upload/download with CSV and JSON files

### Integration Tests
1. Upload HDFS sample log → verify templates generated
2. Upload Apache log → verify correct format detection
3. Upload malformed log → verify graceful error handling
4. Check MinIO buckets → verify all output files present

### Manual Testing
1. Upload log via frontend
2. Monitor Celery worker logs
3. Check Flower dashboard for task completion
4. Verify MinIO console shows processed files
5. Download and inspect CSV/JSON outputs

## Rollout Strategy

### Phase 1: Development
- Implement drain_service module
- Update Celery task
- Local testing with sample logs

### Phase 2: Staging
- Deploy to Docker containers
- Test with various log formats
- Performance benchmarking (large files)

### Phase 3: Production
- Deploy with feature flag
- Monitor error rates
- Gradual rollout to all users

## Configuration

### Environment Variables

Add to `docker-compose.yml` for celery-worker:
```yaml
environment:
  - DRAIN_ST=0.5           # Similarity threshold
  - DRAIN_DEPTH=4          # Tree depth
  - DRAIN_MAX_CHILD=100    # Max children per node
  - LOG_FORMAT=auto        # 'auto' or specific format
```

## Performance Considerations

### Memory Management
- For large log files (>100MB), consider streaming processing
- Drain loads entire log into memory - may need chunking for huge files

### Processing Time
- HDFS 2k lines: ~1 second
- HDFS 100k lines: ~30-60 seconds
- Consider timeout adjustments in Celery config

### Optimization Options
1. Cache detected log formats per user
2. Parallel processing for multiple files
3. Incremental parsing for appended logs

## Monitoring & Logging

### Key Metrics
- Parse success rate
- Average parsing time by file size
- Template count distribution
- Error types and frequencies

### Logging Points
```python
logger.info(f"Starting Drain parsing for job {job_id}")
logger.info(f"Detected log format: {log_format}")
logger.info(f"Parsed {total_lines} lines into {num_templates} templates")
logger.error(f"Parsing failed: {error_message}")
```

## Error Handling

### Common Errors
1. **Invalid log format**: Use generic fallback
2. **Encoding issues**: Try multiple encodings (utf-8, latin-1, cp1252)
3. **Empty file**: Return early with appropriate message
4. **Regex compilation error**: Validate regex patterns
5. **MinIO upload failure**: Retry with exponential backoff

## Future Enhancements

1. **Multiple Parser Support**: Add IPLoM, Spell, LogSig parsers
2. **Custom Regex Patterns**: Allow users to define preprocessing regex
3. **Format Templates**: User-saved format templates
4. **Parsing Comparison**: Compare results from different parsers
5. **Real-time Progress**: WebSocket updates during parsing
6. **Template Visualization**: Graph of template evolution over time

## References

- Drain Paper: "Drain: An Online Log Parsing Approach with Fixed Depth Tree"
- LogParser GitHub: https://github.com/logpai/logparser
- MinIO Python SDK: https://min.io/docs/minio/linux/developers/python/minio-py.html
- Celery Best Practices: https://docs.celeryproject.org/en/stable/userguide/tasks.html

## Checklist

- [ ] Create `backend/src/parsers/__init__.py`
- [ ] Implement `backend/src/parsers/drain_service.py`
- [ ] Implement `backend/src/parsers/log_format_detector.py`
- [ ] Update `backend/src/celery/celery.py` task
- [ ] Update `backend/src/storage/minio_client.py` bucket creation
- [ ] Add dependencies to `requirements.txt`
- [ ] Update database models (optional)
- [ ] Write unit tests
- [ ] Test with sample logs
- [ ] Update docker-compose.yml environment variables
- [ ] Document API changes
- [ ] Deploy and monitor
