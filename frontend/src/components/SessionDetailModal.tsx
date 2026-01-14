import { useEffect, useState } from 'react';
import axios from 'axios';

interface SessionLog {
  Date?: string;
  Time?: string;
  Level?: string;
  Content?: string;
  EventId?: string;
  LineId?: number;
  [key: string]: any;
}

interface SessionDetailModalProps {
  jobId: string | undefined;
  blockId: string;
  onClose: () => void;
}

const SessionDetailModal = ({ jobId, blockId, onClose }: SessionDetailModalProps) => {
  const [logs, setLogs] = useState<SessionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSessionLogs = async () => {
      try {
        console.log("SessionDetailModal - jobId:", jobId);
        console.log("SessionDetailModal - blockId:", blockId);

        if (!jobId || !blockId) {
          const errorMsg = `Missing ${!jobId ? 'job ID' : ''} ${!blockId ? 'block ID' : ''}`;
          console.error(errorMsg);
          setError(errorMsg);
          setLoading(false);
          return;
        }

        const token = localStorage.getItem("access_token");
        // URL encode the blockId to handle special characters
        const encodedBlockId = encodeURIComponent(blockId);
        const response = await axios.get(
          `http://localhost:8000/api/jobs/${jobId}/session/${encodedBlockId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setLogs(response.data.logs);
      } catch (err: any) {
        console.error("Failed to fetch session logs:", err);
        setError(err.response?.data?.detail || "Failed to load session logs");
      } finally {
        setLoading(false);
      }
    };

    fetchSessionLogs();
  }, [jobId, blockId]);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          maxWidth: '900px',
          width: '100%',
          maxHeight: '80vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{ margin: '0 0 4px 0', fontSize: '24px', fontWeight: '700', color: '#111827' }}>
              Session Details
            </h2>
            <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
              BlockId: <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>{blockId}</span>
              {!loading && !error && ` • ${logs.length} logs`}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f3f4f6',
              border: 'none',
              borderRadius: '6px',
              fontSize: '24px',
              cursor: 'pointer',
              lineHeight: 1,
              color: '#6b7280',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px'
        }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              Loading session logs...
            </div>
          )}

          {error && (
            <div style={{
              padding: '16px',
              backgroundColor: '#fee2e2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#991b1b'
            }}>
              <strong>Error:</strong> {error}
            </div>
          )}

          {!loading && !error && (
            <div style={{ display: 'grid', gap: '12px' }}>
              {logs.map((log, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '16px',
                    backgroundColor: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                >
                  {/* Log Header */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                    paddingBottom: '8px',
                    borderBottom: '1px solid #e5e7eb'
                  }}>
                    <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: '600' }}>
                      Log #{idx + 1}
                      {log.LineId && ` • Line ${log.LineId}`}
                    </span>
                    {log.EventId && (
                      <span style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        backgroundColor: '#dbeafe',
                        color: '#1e40af',
                        borderRadius: '4px',
                        fontFamily: 'monospace'
                      }}>
                        Event: {log.EventId}
                      </span>
                    )}
                  </div>

                  {/* Log Details */}
                  <div style={{
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    color: '#374151',
                    display: 'grid',
                    gap: '6px'
                  }}>
                    {log.Date && log.Time && (
                      <div>
                        <strong style={{ color: '#6b7280' }}>Time:</strong> {log.Date} {log.Time}
                      </div>
                    )}
                    {log.Level && (
                      <div>
                        <strong style={{ color: '#6b7280' }}>Level:</strong>{' '}
                        <span style={{
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: log.Level === 'ERROR' ? '#fee2e2' : log.Level === 'WARN' ? '#fef3c7' : '#e0e7ff',
                          color: log.Level === 'ERROR' ? '#991b1b' : log.Level === 'WARN' ? '#92400e' : '#3730a3'
                        }}>
                          {log.Level}
                        </span>
                      </div>
                    )}
                    {log.Content && (
                      <div style={{ marginTop: '8px' }}>
                        <strong style={{ color: '#6b7280', display: 'block', marginBottom: '4px' }}>Content:</strong>
                        <div style={{
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          backgroundColor: '#fff',
                          padding: '12px',
                          borderRadius: '6px',
                          border: '1px solid #e5e7eb',
                          lineHeight: '1.6'
                        }}>
                          {log.Content}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionDetailModal;
