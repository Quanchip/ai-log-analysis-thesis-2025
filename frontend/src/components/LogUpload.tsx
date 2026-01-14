import axios from "axios";
import { ChangeEvent, useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"

type UploadStatus = "idle" | "uploading" | "processing" | "success" | "error"

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
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '50px' }}>
      {/* Two-Column Layout: Instructions on left, Upload on right */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '24px',
        marginBottom: '24px',
        alignItems: 'start'
      }}>
        {/* Left Column: Instructions Panel */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          padding: '24px',
          border: '1px solid #e5e7eb',
          height: '100%'
        }}>
          <h2 style={{
            margin: '0 0 16px 0',
            fontSize: '20px',
            fontWeight: '700',
            color: '#111827',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '24px' }}>ℹ️</span>
            How It Works
          </h2>

          <div style={{
            display: 'grid',
            gap: '12px',
            fontSize: '14px',
            color: '#4b5563'
          }}>
            <div style={{
              display: 'flex',
              gap: '12px',
              padding: '12px',
              backgroundColor: '#f9fafb',
              borderRadius: '8px'
            }}>
              <span style={{
                fontSize: '18px',
                fontWeight: '700',
                color: '#3b82f6',
                minWidth: '24px'
              }}>1</span>
              <div>
                <strong style={{ color: '#111827' }}>Upload Your Log File</strong>
                <p style={{ margin: '4px 0 0 0', lineHeight: '1.5' }}>
                  Select or drag & drop a .log file from your system
                </p>
              </div>
            </div>

            <div style={{
              display: 'flex',
              gap: '12px',
              padding: '12px',
              backgroundColor: '#f9fafb',
              borderRadius: '8px'
            }}>
              <span style={{
                fontSize: '18px',
                fontWeight: '700',
                color: '#3b82f6',
                minWidth: '24px'
              }}>2</span>
              <div>
                <strong style={{ color: '#111827' }}>Automated Analysis</strong>
                <p style={{ margin: '4px 0 0 0', lineHeight: '1.5' }}>
                  System will parse log patterns, detects anomalies, and identifies issues
                </p>
              </div>
            </div>

            <div style={{
              display: 'flex',
              gap: '12px',
              padding: '12px',
              backgroundColor: '#f9fafb',
              borderRadius: '8px'
            }}>
              <span style={{
                fontSize: '18px',
                fontWeight: '700',
                color: '#3b82f6',
                minWidth: '24px'
              }}>3</span>
              <div>
                <strong style={{ color: '#111827' }}>Get Insights</strong>
                <p style={{ margin: '4px 0 0 0', lineHeight: '1.5' }}>
                  View structured logs, anomaly reports, and AI-powered recommendations
                </p>
              </div>
            </div>
          </div>

          <div style={{
            marginTop: '16px',
            padding: '12px',
            backgroundColor: '#eff6ff',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#1e40af',
            display: 'flex',
            gap: '8px',
            alignItems: 'flex-start'
          }}>
            <span style={{ fontSize: '16px', minWidth: '20px' }}>💡</span>
            <span>
              <strong>Tip:</strong> For best results, upload log files with clear timestamps and structured formats (HDFS, Apache, Syslog, etc.)
            </span>
          </div>
        </div>

        {/* Right Column: Upload Section */}
        <div>
          {/* Drag & Drop Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              border: isDragging ? '2px dashed #3b82f6' : '2px dashed #d1d5db',
              borderRadius: '12px',
              padding: '40px 20px',
              textAlign: 'center',
              backgroundColor: isDragging ? '#eff6ff' : '#f9fafb',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
              marginBottom: '20px'
            }}
          >
            <div style={{ fontSize: '80px', marginBottom: '16px' }}>
              📁
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '22px', fontWeight: '600', color: '#111827' }}>
              {isDragging ? 'Drop your file here' : 'Upload Log File'}
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#6b7280' }}>
              Drag and drop your file here or click to browse
            </p>
            <label
              htmlFor="file-input"
              style={{
                display: 'inline-block',
                padding: '10px 24px',
                backgroundColor: '#3b82f6',
                color: '#fff',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
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
            <p style={{ margin: '12px 0 0 0', fontSize: '12px', color: '#9ca3af' }}>
              Supported formats: .log
            </p>
          </div>

          {/* File Info Card */}
          {file && (
            <div style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              padding: '20px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', gap: '12px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingBottom: '20px'
                  }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                      Selected File
                    </h4>
                    {status === "idle" && (
                      <button
                        onClick={removeFile}
                        style={{
                          padding: '8px',
                          border: 'none',
                          backgroundColor: '#fee2e2',
                          color: '#dc2626',
                          borderRadius: '6px',
                          fontSize: '10px',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fecaca'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                      <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>Name:</span>
                      <span style={{ fontSize: '14px', color: '#111827', fontWeight: '600', maxWidth: '60%', textAlign: 'right', wordBreak: 'break-word' }}>{file.name}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                      <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>Size:</span>
                      <span style={{ fontSize: '14px', color: '#111827', fontWeight: '600' }}>{(file.size / 1024).toFixed(2)} KB</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                      <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>Type:</span>
                      <span style={{ fontSize: '14px', color: '#111827', fontWeight: '600' }}>{file.type || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Upload Button */}
              {status === "idle" && (
                <button
                  onClick={handleFileUpload}
                  style={{
                    width: '100%',
                    padding: '12px 24px',
                    backgroundColor: '#10b981',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
                >
                  Upload File
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Real-time Progress Bar */}
      {(status === "uploading" || status === "processing") && (
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <div style={{
            width: '100%',
            backgroundColor: '#e5e7eb',
            borderRadius: '8px',
            overflow: 'hidden',
            height: '30px'
          }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              backgroundColor: progress === 100 ? '#10b981' : '#3b82f6',
              transition: 'width 0.5s ease, background-color 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: '600',
              fontSize: '14px'
            }}>
              {progress}%
            </div>
          </div>
          <p style={{
            marginTop: '12px',
            textAlign: 'center',
            color: '#6b7280',
            fontSize: '14px'
          }}>
            {progressMessage}
          </p>
        </div>
      )}

      {/* View Results Button */}
      {status === "success" && jobId && (
        <div style={{ marginTop: '20px' }}>
          <button
            onClick={handleViewResults}
            style={{
              width: '100%',
              padding: '12px 24px',
              backgroundColor: '#8b5cf6',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7c3aed'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#8b5cf6'}
          >
            View Results →
          </button>
        </div>
      )}

      {/* Success Message */}
      {status === "success" && (
        <div style={{
          padding: '16px 20px',
          backgroundColor: '#d1fae5',
          border: '1px solid #6ee7b7',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginTop: '20px'
        }}>
          <span style={{ fontSize: '20px' }}>✓</span>
          <div>
            <p style={{ margin: '0', fontSize: '14px', fontWeight: '600', color: '#065f46' }}>
              Upload successful!
            </p>
            {errorMessage && (
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#047857' }}>
                {errorMessage}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {status === "error" && (
        <div style={{
          padding: '16px 20px',
          backgroundColor: '#fee2e2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginTop: '20px'
        }}>
          <span style={{ fontSize: '20px' }}>⚠</span>
          <div>
            <p style={{ margin: '0', fontSize: '14px', fontWeight: '600', color: '#991b1b' }}>
              Upload failed
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#b91c1c' }}>
              {errorMessage}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default LogUpload
