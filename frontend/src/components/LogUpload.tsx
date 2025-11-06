import axios from "axios";
import { ChangeEvent, useState } from "react"

type UploadStatus = "idle" | "uploading" | "success" | "error"

const LogUpload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle")
  const [errorMessage, setErrorMessage] = useState<string>("")
  const [isDragging, setIsDragging] = useState(false);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      setFile(e.target.files[0])
      setStatus("idle")
      setErrorMessage("")
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
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

    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = localStorage.getItem("access_token");
      const response = await axios.post("http://localhost:8000/api/logs/upload", formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });

      setStatus("success")
      const msg = response.data.message;
      setErrorMessage(msg);

      console.log("Upload response:", response.data)

    } catch (error: any) {
      setStatus("error")
      const message = error.response?.data?.detail || "Upload failed. Please try again."
      setErrorMessage(message)
      console.log(error)
    }
  }

  const removeFile = () => {
    setFile(null);
    setStatus('idle');
    setErrorMessage('');
    // Reset the file input value so the same file can be selected again
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };


  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '50px' }}>
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
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <p style={{ margin: '12px 0 0 0', fontSize: '12px', color: '#9ca3af' }}>
          Supported formats: .log, .csv, .txt, .png
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
          {status !== "uploading" && (
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

          {/* Uploading State */}
          {status === "uploading" && (
            <div style={{
              width: '100%',
              padding: '12px 24px',
              backgroundColor: '#dbeafe',
              color: '#1e40af',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              textAlign: 'center'
            }}>
              Uploading...
            </div>
          )}
        </div>
      )}

      {/* Status Messages */}
      {status === "success" && (
        <div style={{
          padding: '16px 20px',
          backgroundColor: '#d1fae5',
          border: '1px solid #6ee7b7',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
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

      {status === "error" && (
        <div style={{
          padding: '16px 20px',
          backgroundColor: '#fee2e2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
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