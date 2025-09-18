a. Everything that need to query, update, ... -> database
    else -> storages.

b. Work flow:
    - Login 
    - Upload log files -> MinIO -> Process (Parse)


  1. Client-Side Validation Errors
     ├── File too large (>100MB)
     │   └── "File size exceeds 100MB limit"
     ├── Invalid file type
     │   └── "Only .log, .txt, .csv files are supported"
     ├── Network timeout
     │   └── "Upload timeout. Please try again."
     └── No file selected
         └── "Please select a file to upload"

  2. Server-Side Upload Errors
     ├── Disk space full
     │   └── HTTP 507: "Server storage full. Try again later."
     ├── File corruption
     │   └── HTTP 400: "File appears corrupted. Please re-upload."
     ├── Database connection error
     │   └── HTTP 500: "Database error. File uploaded but not recorded."
     └── Permission errors
         └── HTTP 403: "Cannot save file. Contact administrator."

  3. Processing Errors
     ├── Log parsing fails
     │   ├── Update files.status = 'failed'
     │   ├── Log error details
     │   └── Notify user: "Log format not recognized"
     ├── Anomaly detection fails
     │   ├── Continue with partial results
     │   └── Notify: "Analysis completed with warnings"
     └── Background worker crashes
         ├── Job retry mechanism (3 attempts)
         └── Final failure: "Analysis failed. Please contact support."

  4. User Feedback Messages
     ├── Success States
     │   ├── "File uploaded successfully! ✓"
     │   ├── "Analysis started. This may take 2-5 minutes..."
     │   ├── "Processing... (Step 1/3: Parsing logs)"
     │   ├── "Processing... (Step 2/3: Detecting anomalies)"
     │   └── "Analysis complete! Found 12 anomalies in 5,000 logs."
     │
     ├── Progress Indicators
     │   ├── Upload progress bar (0-100%)
     │   ├── Analysis progress bar with steps
     │   ├── Estimated time remaining
     │   └── Current processing status text
     │
     └── Error Recovery
         ├── "Retry upload" button for failed uploads
         ├── "Restart analysis" for processing failures
         ├── Clear error messages after user action
         └── Auto-hide success messages after 5 seconds

  Complete Workflow Summary

  User Flow Timeline:
  ├── 0s    : User drops file on upload zone
  ├── 0.1s  : Client validation passes, upload starts
  ├── 2-10s : File uploads with progress bar
  ├── 10s   : Upload complete, file appears in list
  ├── 12s   : User clicks "Start Analysis"
  ├── 13s   : Analysis job queued, progress begins
  ├── 15s   : Log parsing starts (25% progress)
  ├── 45s   : Anomaly detection starts (50% progress)
  ├── 120s  : Results compilation (75% progress)
  ├── 130s  : Analysis complete (100% progress)
  └── 132s  : User redirected to results dashboard

  