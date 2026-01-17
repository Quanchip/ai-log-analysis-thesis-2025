import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import AnomalyAnalysisModal from './LlmAnomlyAnalysis';
import SessionDetailModal from './SessionDetailModal';

// Icons
const Icons = {
  ArrowLeft: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  ),
  Database: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  ),
  AlertTriangle: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  CheckCircle: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  Percent: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="5" x2="5" y2="19" />
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
  ),
  Server: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
      <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
      <line x1="6" y1="6" x2="6.01" y2="6" />
      <line x1="6" y1="18" x2="6.01" y2="18" />
    </svg>
  ),
  Clock: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Eye: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  Cpu: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
      <rect x="9" y="9" width="6" height="6" />
      <line x1="9" y1="1" x2="9" y2="4" />
      <line x1="15" y1="1" x2="15" y2="4" />
      <line x1="9" y1="20" x2="9" y2="23" />
      <line x1="15" y1="20" x2="15" y2="23" />
      <line x1="20" y1="9" x2="23" y2="9" />
      <line x1="20" y1="14" x2="23" y2="14" />
      <line x1="1" y1="9" x2="4" y2="9" />
      <line x1="1" y1="14" x2="4" y2="14" />
    </svg>
  ),
  Layers: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  ),
  FileText: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
};

interface AnomalySession {
  BlockId: string;
  log_count: number;
  first_timestamp?: string;
  last_timestamp?: string;
  unique_events?: number;
  event_distribution?: { [key: string]: number };
  preview_content?: string;
  preview_level?: string;
}

interface AnalysisResults {
  job_id: string;
  filename: string;
  total_logs: number;
  anomaly_count: number;
  normal_count: number;
  anomaly_percentage: number;
  predictions: number[];
  anomaly_logs: AnomalySession[];
  created_at: string;
}

const Results = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [results, setResults] = useState<AnalysisResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSession, setSelectedSession] = useState<AnomalySession | null>(null);
  const [showSessionModal, setShowSessionModal] = useState(false);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const token = localStorage.getItem("access_token");
        const response = await axios.get(
          `http://localhost:8000/api/jobs/${jobId}/results`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setResults(response.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || "Failed to load results");
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [jobId]);

  if (loading) {
    return (
      <div style={{
        minHeight: 'calc(100vh - 56px)',
        backgroundColor: '#f9fafb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #e5e7eb',
            borderTopColor: '#2563eb',
            borderRadius: '50%',
            margin: '0 auto 16px',
            animation: 'spin 1s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>Loading analysis results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: 'calc(100vh - 56px)',
        backgroundColor: '#f9fafb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          padding: '32px',
          textAlign: 'center',
          maxWidth: '400px',
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <Icons.AlertTriangle />
          </div>
          <h2 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '18px',
            fontWeight: 600,
            color: '#111827',
            marginBottom: '8px',
          }}>
            Failed to Load Results
          </h2>
          <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '20px' }}>{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 18px',
              backgroundColor: '#2563eb',
              color: 'white',
              fontSize: '13px',
              fontWeight: 500,
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            <Icons.ArrowLeft />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!results) return null;

  const anomalyLogs = results.anomaly_logs || [];

  return (
    <div style={{
      minHeight: 'calc(100vh - 56px)',
      backgroundColor: '#f9fafb',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 20px' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: 'white',
              color: '#374151',
              fontSize: '13px',
              fontWeight: 500,
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              marginBottom: '16px',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#f9fafb';
              e.currentTarget.style.borderColor = '#9ca3af';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
              e.currentTarget.style.borderColor = '#d1d5db';
            }}
          >
            <Icons.ArrowLeft />
            Back to Dashboard
          </button>

          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            padding: '20px 24px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Icons.Database />
              </div>
              <div>
                <h1 style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: '20px',
                  fontWeight: 700,
                  color: '#111827',
                  margin: 0,
                }}>
                  HDFS Log Analysis Results
                </h1>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0 0' }}>
                  Anomaly detection completed for your log file
                </p>
              </div>
            </div>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '16px',
              marginTop: '12px',
              paddingTop: '12px',
              borderTop: '1px solid #f3f4f6',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#6b7280' }}>
                <Icons.FileText />
                <span style={{ fontWeight: 500 }}>{results.filename}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#6b7280' }}>
                <Icons.Clock />
                <span>{new Date(results.created_at).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}>
          {/* Total Sessions */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            padding: '20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
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
                <Icons.Database />
              </div>
              <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: 500 }}>Total Sessions</span>
            </div>
            <p style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '28px',
              fontWeight: 700,
              color: '#111827',
              margin: 0,
            }}>
              {results.total_logs.toLocaleString()}
            </p>
          </div>

          {/* Anomalies Detected */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            border: '1px solid #fbbf24',
            padding: '20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#fef3c7',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Icons.AlertTriangle />
              </div>
              <span style={{ fontSize: '13px', color: '#92400e', fontWeight: 500 }}>Anomalies Detected</span>
            </div>
            <p style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '28px',
              fontWeight: 700,
              color: '#b45309',
              margin: 0,
            }}>
              {results.anomaly_count.toLocaleString()}
            </p>
          </div>

          {/* Normal Sessions */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            border: '1px solid #10b981',
            padding: '20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#d1fae5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Icons.CheckCircle />
              </div>
              <span style={{ fontSize: '13px', color: '#065f46', fontWeight: 500 }}>Normal Sessions</span>
            </div>
            <p style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '28px',
              fontWeight: 700,
              color: '#047857',
              margin: 0,
            }}>
              {results.normal_count.toLocaleString()}
            </p>
          </div>

          {/* Anomaly Rate */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            border: '1px solid #ef4444',
            padding: '20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Icons.Percent />
              </div>
              <span style={{ fontSize: '13px', color: '#991b1b', fontWeight: 500 }}>Anomaly Rate</span>
            </div>
            <p style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '28px',
              fontWeight: 700,
              color: '#dc2626',
              margin: 0,
            }}>
              {results.anomaly_percentage.toFixed(2)}%
            </p>
          </div>
        </div>

        {/* Anomaly Sessions Section */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          overflow: 'hidden',
        }}>
          {/* Section Header */}
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#fef3c7',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Icons.AlertTriangle />
              </div>
              <div>
                <h2 style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#111827',
                  margin: 0,
                }}>
                  Anomaly Sessions
                </h2>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0 0' }}>
                  {anomalyLogs.length > 0 ? `Showing ${anomalyLogs.length} anomalous HDFS block sessions` : 'No anomalies detected'}
                </p>
              </div>
            </div>
            {anomalyLogs.length > 0 && (
              <span style={{
                padding: '4px 10px',
                backgroundColor: '#fef3c7',
                color: '#92400e',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '9999px',
              }}>
                {anomalyLogs.length} session{anomalyLogs.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Sessions List */}
          <div style={{ padding: '16px 24px' }}>
            {anomalyLogs.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: '#d1fae5',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                }}>
                  <Icons.CheckCircle />
                </div>
                <p style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: '15px',
                  fontWeight: 600,
                  color: '#111827',
                  marginBottom: '4px',
                }}>
                  No Anomalies Detected
                </p>
                <p style={{ fontSize: '13px', color: '#6b7280' }}>
                  All HDFS block sessions appear to be operating normally.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '500px', overflowY: 'auto' }}>
                {anomalyLogs.map((session, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '16px',
                      backgroundColor: '#fffbeb',
                      border: '1px solid #fde68a',
                      borderRadius: '10px',
                      transition: 'all 0.2s',
                    }}
                  >
                    {/* Session Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <Icons.Server />
                          <span style={{
                            fontFamily: "'Space Grotesk', sans-serif",
                            fontWeight: 600,
                            color: '#92400e',
                            fontSize: '14px',
                          }}>
                            Block: {session.BlockId}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#b45309' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Icons.Layers />
                            {session.log_count} log{session.log_count > 1 ? 's' : ''}
                          </span>
                          {session.unique_events !== undefined && session.unique_events > 0 && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Icons.FileText />
                              {session.unique_events} event type{session.unique_events > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                      {session.preview_level && (
                        <span style={{
                          padding: '3px 8px',
                          backgroundColor: session.preview_level === 'ERROR' ? '#fee2e2' :
                                          session.preview_level === 'WARN' ? '#fef3c7' : '#f3f4f6',
                          color: session.preview_level === 'ERROR' ? '#dc2626' :
                                session.preview_level === 'WARN' ? '#d97706' : '#6b7280',
                          fontSize: '11px',
                          fontWeight: 600,
                          borderRadius: '4px',
                          textTransform: 'uppercase',
                        }}>
                          {session.preview_level}
                        </span>
                      )}
                    </div>

                    {/* Session Details */}
                    <div style={{
                      backgroundColor: 'white',
                      padding: '12px',
                      borderRadius: '6px',
                      marginBottom: '12px',
                      fontSize: '12px',
                      color: '#78350f',
                      border: '1px solid #fef3c7',
                    }}>
                      {session.first_timestamp && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                          <Icons.Clock />
                          <span><strong>Start:</strong> {session.first_timestamp}</span>
                        </div>
                      )}
                      {session.last_timestamp && session.log_count > 1 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                          <Icons.Clock />
                          <span><strong>End:</strong> {session.last_timestamp}</span>
                        </div>
                      )}
                      {session.preview_content && (
                        <div style={{
                          marginTop: '8px',
                          paddingTop: '8px',
                          borderTop: '1px dashed #fde68a',
                        }}>
                          <div style={{ fontWeight: 600, marginBottom: '4px', color: '#92400e' }}>Log Preview:</div>
                          <code style={{
                            display: 'block',
                            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                            fontSize: '11px',
                            color: '#374151',
                            backgroundColor: '#f9fafb',
                            padding: '8px',
                            borderRadius: '4px',
                            wordBreak: 'break-all',
                            lineHeight: 1.5,
                          }}>
                            {session.preview_content.substring(0, 200)}{session.preview_content.length > 200 ? '...' : ''}
                          </code>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => {
                          if (!session.BlockId) {
                            alert("Error: Session BlockId is missing.");
                            return;
                          }
                          if (!jobId) {
                            alert("Error: Job ID is missing.");
                            return;
                          }
                          setSelectedSession(session);
                          setShowSessionModal(true);
                        }}
                        style={{
                          flex: 1,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '9px 14px',
                          backgroundColor: '#2563eb',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'background-color 0.2s',
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                      >
                        <Icons.Eye />
                        View Session ({session.log_count})
                      </button>
                      <button
                        onClick={() => setSelectedSession(session)}
                        style={{
                          flex: 1,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '9px 14px',
                          backgroundColor: '#7c3aed',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'background-color 0.2s',
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#6d28d9'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#7c3aed'}
                      >
                        <Icons.Cpu />
                        AI Analysis
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Session Detail Modal */}
      {showSessionModal && selectedSession && (
        <SessionDetailModal
          jobId={jobId}
          blockId={selectedSession.BlockId}
          onClose={() => {
            setShowSessionModal(false);
            setSelectedSession(null);
          }}
        />
      )}

      {/* LLM Analysis Modal */}
      {selectedSession && !showSessionModal && (
        <AnomalyAnalysisModal
          log={{ BlockId: selectedSession.BlockId, Content: selectedSession.preview_content || '' }}
          jobId={jobId}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </div>
  );
};

export default Results;
