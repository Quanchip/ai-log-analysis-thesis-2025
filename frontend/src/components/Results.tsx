import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import AnomalyAnalysisModal from './LlmAnomlyAnalysis';
import SessionDetailModal from './SessionDetailModal';

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
  anomaly_logs: AnomalySession[];  // Session summaries
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
      <div style={{ padding: '50px', textAlign: 'center' }}>
        <h2 style={{ color: '#6b7280' }}>Loading results...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '50px', textAlign: 'center' }}>
        <h2 style={{ color: '#dc2626' }}>Error: {error}</h2>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (!results) return null;

  // Use anomaly_logs from backend (already filtered and limited to 1000)
  const anomalyLogs = results.anomaly_logs || [];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '50px' }}>
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            marginBottom: '20px',
            fontSize: '14px',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4b5563'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#6b7280'}
        >
          ← Back to Dashboard
        </button>
        <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#111827', margin: '0 0 8px 0' }}>
          Analysis Results
        </h1>
        <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
          File: {results.filename} | Analyzed: {new Date(results.created_at).toLocaleString()}
        </p>
      </div>

      {/* Statistics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '40px'
      }}>
        <div style={{
          backgroundColor: '#fff',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '2px solid #e5e7eb'
        }}>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px', margin: 0 }}>Total Sessions</p>
          <p style={{ fontSize: '36px', fontWeight: '700', color: '#111827', margin: '8px 0 0 0' }}>
            {results.total_logs.toLocaleString()}
          </p>
        </div>

        <div style={{
          backgroundColor: '#fef3c7',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '2px solid #fbbf24'
        }}>
          <p style={{ fontSize: '14px', color: '#92400e', marginBottom: '8px', margin: 0 }}>Anomalies Detected</p>
          <p style={{ fontSize: '36px', fontWeight: '700', color: '#b45309', margin: '8px 0 0 0' }}>
            {results.anomaly_count.toLocaleString()}
          </p>
        </div>

        <div style={{
          backgroundColor: '#d1fae5',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '2px solid #10b981'
        }}>
          <p style={{ fontSize: '14px', color: '#065f46', marginBottom: '8px', margin: 0 }}>Normal Sessions</p>
          <p style={{ fontSize: '36px', fontWeight: '700', color: '#047857', margin: '8px 0 0 0' }}>
            {results.normal_count.toLocaleString()}
          </p>
        </div>

        <div style={{
          backgroundColor: '#fee2e2',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '2px solid #ef4444'
        }}>
          <p style={{ fontSize: '14px', color: '#991b1b', marginBottom: '8px', margin: 0 }}>Anomaly Rate</p>
          <p style={{ fontSize: '36px', fontWeight: '700', color: '#dc2626', margin: '8px 0 0 0' }}>
            {results.anomaly_percentage.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Anomaly Sessions Section */}
      <div style={{
        backgroundColor: '#fff',
        padding: '24px',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '16px', color: '#111827', margin: '0 0 16px 0' }}>
          Anomaly Sessions ({anomalyLogs.length > 0 ? `${anomalyLogs.length} shown` : results.anomaly_count})
        </h2>

        {anomalyLogs.length === 0 ? (
          <p style={{ color: '#6b7280', textAlign: 'center', padding: '40px', margin: 0 }}>
            No anomalies detected in this log file.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: '12px', maxHeight: '600px', overflowY: 'auto' }}>
            {anomalyLogs.map((session, idx) => (
              <div
                key={idx}
                style={{
                  padding: '16px',
                  backgroundColor: '#fef3c7',
                  border: '1px solid #fbbf24',
                  borderRadius: '8px',
                  transition: 'all 0.2s',
                }}
              >
                {/* Session Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <span style={{ fontWeight: '700', color: '#92400e', fontSize: '16px' }}>
                      Session: {session.BlockId}
                    </span>
                    <div style={{ fontSize: '13px', color: '#b45309', marginTop: '4px' }}>
                      {session.log_count} log{session.log_count > 1 ? 's' : ''} in this session
                    </div>
                  </div>
                </div>

                {/* Session Statistics */}
                <div style={{
                  backgroundColor: '#fffbeb',
                  padding: '12px',
                  borderRadius: '6px',
                  marginBottom: '12px',
                  fontSize: '13px',
                  color: '#78350f',
                  border: '1px solid #fde68a',
                  display: 'grid',
                  gap: '6px'
                }}>
                  {session.first_timestamp && (
                    <div>
                      <strong>First Log:</strong> {session.first_timestamp}
                    </div>
                  )}
                  {session.last_timestamp && session.log_count > 1 && (
                    <div>
                      <strong>Last Log:</strong> {session.last_timestamp}
                    </div>
                  )}
                  {session.unique_events !== undefined && session.unique_events > 0 && (
                    <div>
                      <strong>Unique Event Types:</strong> {session.unique_events}
                    </div>
                  )}
                  {session.preview_level && (
                    <div>
                      <strong>Level:</strong> {session.preview_level}
                    </div>
                  )}
                  {session.preview_content && (
                    <div style={{ marginTop: '6px' }}>
                      <strong>Preview:</strong> <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{session.preview_content.substring(0, 150)}{session.preview_content.length > 150 ? '...' : ''}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => {
                      console.log("Opening session modal for:", session);
                      console.log("BlockId:", session.BlockId);
                      console.log("JobId:", jobId);

                      if (!session.BlockId) {
                        console.error("Session BlockId is missing!");
                        alert("Error: Session BlockId is missing. Cannot view session details.");
                        return;
                      }

                      if (!jobId) {
                        console.error("JobId is missing!");
                        alert("Error: Job ID is missing. Cannot view session details.");
                        return;
                      }

                      setSelectedSession(session);
                      setShowSessionModal(true);
                    }}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
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
                    View Full Session ({session.log_count} logs)
                  </button>
                  <button
                    onClick={() => setSelectedSession(session)}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      backgroundColor: '#8b5cf6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7c3aed'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#8b5cf6'}
                  >
                    Get LLM Analysis
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
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
