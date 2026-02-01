import axios from "axios";
import { ChangeEvent, useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"

type UploadStatus = "idle" | "uploading" | "processing" | "success" | "error"

// Icons
const Icons = {
  Upload: () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
  File: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  X: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Check: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  AlertCircle: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  ArrowRight: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  ),
  Info: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
};

const LogUpload = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle")
  const [errorMessage, setErrorMessage] = useState<string>("")
  const [isDragging, setIsDragging] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");

  // Fast polling for real-time progress updates
  useEffect(() => {
    console.log("useEffect triggered", { jobId, status });
    if (!jobId || status !== "processing") return;

    const pollInterval = setInterval(async () => {
      try {
        const token = localStorage.getItem("access_token");
        const response = await axios.get(
          `http://localhost:8000/api/jobs/${jobId}/status`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const { status: jobStatus, progress: jobProgress, message } = response.data;

        console.log(response.data)

        setProgress(jobProgress);
        setProgressMessage(message);

        if (jobStatus === "completed") {
          clearInterval(pollInterval);
          setStatus("success");
          setErrorMessage("Analysis completed successfully!");
        } else if (jobStatus === "failed") {
          clearInterval(pollInterval);
          setStatus("error");
          setErrorMessage("Processing failed");
        }
      } catch (error) {
        console.error("Error checking job status:", error);
      }
    }, 1000); // Poll every 1 second for smooth updates

    return () => clearInterval(pollInterval);
  }, [jobId, status]);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      setFile(e.target.files[0])
      setStatus("idle")
      setErrorMessage("")
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
      setStatus('idle');
      setErrorMessage('');
    }
  };

  async function handleFileUpload() {
    if (!file) return;

    setStatus("uploading")
    setErrorMessage("")
    setProgress(0)
    setProgressMessage("Uploading file...")

    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = localStorage.getItem("access_token");
      const response = await axios.post(
        "http://localhost:8000/api/logs/upload",
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`,
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              // File upload takes 0-30% of total progress
              const percentCompleted = Math.round(
                (progressEvent.loaded * 30) / progressEvent.total
              );
              setProgress(percentCompleted);
              setProgressMessage(`Uploading file... ${percentCompleted}%`);
            }
          },
        }
      );

      // Upload complete, now processing
      console.log("✅ Upload response:", response.data);
      const { job_id } = response.data;
      console.log("📌 Job ID:", job_id);
      setJobId(job_id);
      setStatus("processing");
      setProgress(30);
      setProgressMessage("Processing started...");

    } catch (error: any) {
      setStatus("error")
      const message = error.response?.data?.detail || "Upload failed. Please try again."
      setErrorMessage(message)
      console.log("❌ Upload error:", error)
    }
  }

  const removeFile = () => {
    setFile(null);
    setStatus('idle');
    setErrorMessage('');
    setJobId(null);
    setProgress(0);
    setProgressMessage('');
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleViewResults = () => {
    if (jobId) {
      navigate(`/results/${jobId}`);
    }
  };

  return (
    <div style={{
      minHeight: 'calc(100vh - 56px)',
      backgroundColor: '#f9fafb',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 20px' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '22px',
            fontWeight: 700,
            color: '#111827',
            marginBottom: '6px',
          }}>
            Upload Log File
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>
            Upload your log files for AI-powered analysis and anomaly detection
          </p>
        </div>

        {/* Two-Column Layout */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.2fr',
          gap: '20px',
          alignItems: 'start',
        }}>
          {/* Left Column: Instructions */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            padding: '20px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '16px',
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Icons.Info />
              </div>
              <h2 style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '15px',
                fontWeight: 600,
                color: '#111827',
              }}>
                How It Works
              </h2>
            </div>

            <div style={{ display: 'grid', gap: '12px' }}>
              {[
                { step: '1', title: 'Upload', desc: 'Select or drag & drop a .log file' },
                { step: '2', title: 'Analyze', desc: 'AI parses patterns and detects anomalies' },
                { step: '3', title: 'Results', desc: 'View structured logs and insights' },
              ].map((item) => (
                <div key={item.step} style={{
                  display: 'flex',
                  gap: '12px',
                  padding: '12px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: '#2563eb',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 600,
                    flexShrink: 0,
                  }}>
                    {item.step}
                  </div>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 500, color: '#111827', marginBottom: '2px' }}>
                      {item.title}
                    </p>
                    <p style={{ fontSize: '12px', color: '#6b7280', lineHeight: 1.4 }}>
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: '#eff6ff',
              borderRadius: '8px',
              border: '1px solid #dbeafe',
            }}>
              <p style={{ fontSize: '12px', color: '#1e40af', lineHeight: 1.5 }}>
                <strong>Tip:</strong> Upload log files with clear timestamps (Only HDFS logs are supported for now)
              </p>
            </div>
          </div>

          {/* Right Column: Upload Area */}
          <div>
            {/* Drag & Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                backgroundColor: isDragging ? '#eff6ff' : 'white',
                borderRadius: '12px',
                border: isDragging ? '2px dashed #2563eb' : '2px dashed #d1d5db',
                padding: '32px 20px',
                textAlign: 'center',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                marginBottom: file ? '16px' : '0',
              }}
            >
              <div style={{ color: isDragging ? '#2563eb' : '#9ca3af', marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
                <Icons.Upload />
              </div>
              <h3 style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '16px',
                fontWeight: 600,
                color: '#111827',
                marginBottom: '6px',
              }}>
                {isDragging ? 'Drop your file here' : 'Drag & drop your log file'}
              </h3>
              <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
                or click to browse from your computer
              </p>
              <label
                htmlFor="file-input"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 16px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: 500,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
              >
                Choose File
              </label>
              <input
                id="file-input"
                type="file"
                accept=".log"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <p style={{ marginTop: '12px', fontSize: '11px', color: '#9ca3af' }}>
                Supported format: .log
              </p>
            </div>

            {/* File Info Card */}
            {file && (
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                padding: '16px',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      backgroundColor: '#f0fdf4',
                      color: '#16a34a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Icons.File />
                    </div>
                    <div>
                      <p style={{
                        fontSize: '13px',
                        fontWeight: 500,
                        color: '#111827',
                        maxWidth: '200px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {file.name}
                      </p>
                      <p style={{ fontSize: '12px', color: '#6b7280' }}>
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                  {status === "idle" && (
                    <button
                      onClick={removeFile}
                      style={{
                        width: '28px',
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#fef2f2',
                        color: '#dc2626',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
                    >
                      <Icons.X />
                    </button>
                  )}
                </div>

                {/* Upload Button */}
                {status === "idle" && (
                  <button
                    onClick={handleFileUpload}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '10px 16px',
                      backgroundColor: '#16a34a',
                      color: 'white',
                      fontSize: '13px',
                      fontWeight: 500,
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#15803d'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#16a34a'}
                  >
                    Start Upload & Analysis
                    <Icons.ArrowRight />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {(status === "uploading" || status === "processing") && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            padding: '20px',
            marginTop: '20px',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px',
            }}>
              <p style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>
                {status === "uploading" ? "Uploading..." : "Processing..."}
              </p>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#2563eb' }}>
                {progress}%
              </p>
            </div>
            <div style={{
              width: '100%',
              backgroundColor: '#e5e7eb',
              borderRadius: '9999px',
              overflow: 'hidden',
              height: '8px',
            }}>
              <div style={{
                width: `${progress}%`,
                height: '100%',
                backgroundColor: progress === 100 ? '#16a34a' : '#2563eb',
                transition: 'width 0.3s ease, background-color 0.3s ease',
                borderRadius: '9999px',
              }} />
            </div>
            <p style={{
              marginTop: '10px',
              fontSize: '12px',
              color: '#6b7280',
              textAlign: 'center',
            }}>
              {progressMessage}
            </p>
          </div>
        )}

        {/* Success Message */}
        {status === "success" && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            padding: '20px',
            marginTop: '20px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: '#f0fdf4',
              borderRadius: '8px',
              border: '1px solid #bbf7d0',
            }}>
              <div style={{ color: '#16a34a' }}>
                <Icons.Check />
              </div>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 500, color: '#166534' }}>
                  Analysis completed successfully!
                </p>
                <p style={{ fontSize: '12px', color: '#15803d' }}>
                  Your log file has been processed and is ready for review.
                </p>
              </div>
            </div>
            {jobId && (
              <button
                onClick={handleViewResults}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: 500,
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
              >
                View Results
                <Icons.ArrowRight />
              </button>
            )}
          </div>
        )}

        {/* Error Message */}
        {status === "error" && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px',
            backgroundColor: '#fef2f2',
            borderRadius: '8px',
            border: '1px solid #fecaca',
            marginTop: '20px',
          }}>
            <div style={{ color: '#dc2626' }}>
              <Icons.AlertCircle />
            </div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 500, color: '#991b1b' }}>
                Upload failed
              </p>
              <p style={{ fontSize: '12px', color: '#b91c1c' }}>
                {errorMessage}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default LogUpload
