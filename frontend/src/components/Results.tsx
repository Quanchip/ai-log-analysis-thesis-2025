import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import AnomalyAnalysisModal from './LlmAnomlyAnalysis';

interface AnomalyLog {
  BlockId?: string;
  Date?: string;
  Time?: string;
  Level?: string;
  Content?: string;
  EventId?: string;
  LineId?: number;
  [key: string]: any;  // For additional fields
}

interface AnalysisResults {
  job_id: string;
  filename: string;
  total_logs: number;
  anomaly_count: number;
  normal_count: number;
  anomaly_percentage: number;
  predictions: number[];
  anomaly_logs: AnomalyLog[];  // Actual anomaly log entries
  created_at: string;
}

const Results = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [results, setResults] = useState<AnalysisResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedLog, setSelectedLog] = useState<AnomalyLog | null>(null);

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

      {/* Anomaly Logs Section */}
      <div style={{
        backgroundColor: '#fff',
        padding: '24px',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '16px', color: '#111827', margin: '0 0 16px 0' }}>
          Anomaly Logs ({anomalyLogs.length > 0 ? `${anomalyLogs.length} shown` : results.anomaly_count})
        </h2>

        {anomalyLogs.length === 0 ? (
          <p style={{ color: '#6b7280', textAlign: 'center', padding: '40px', margin: 0 }}>
            No anomalies detected in this log file.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: '12px', maxHeight: '600px', overflowY: 'auto' }}>
            {anomalyLogs.map((log, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedLog(log)}
                style={{
                  padding: '16px',
                  backgroundColor: '#fef3c7',
                  border: '1px solid #fbbf24',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#fde68a';
                  e.currentTarget.style.transform = 'translateX(4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#fef3c7';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: '600', color: '#92400e' }}>
                    {log.BlockId ? `Session: ${log.BlockId}` : `Log #${idx + 1}`}
                  </span>
                  <span style={{ fontSize: '12px', color: '#b45309' }}>
                    Click for LLM suggestion →
                  </span>
                </div>

                {/* Log Content */}
                <div style={{
                  backgroundColor: '#fffbeb',
                  padding: '12px',
                  borderRadius: '6px',
                  marginTop: '8px',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  color: '#78350f',
                  border: '1px solid #fde68a'
                }}>
                  {log.Date && log.Time && (
                    <div style={{ marginBottom: '4px', color: '#92400e' }}>
                      <strong>Time:</strong> {log.Date} {log.Time}
                    </div>
                  )}
                  {log.Level && (
                    <div style={{ marginBottom: '4px', color: '#92400e' }}>
                      <strong>Level:</strong> {log.Level}
                    </div>
                  )}
                  {log.Content && (
                    <div style={{ marginTop: '8px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      <strong>Content:</strong> {log.Content}
                    </div>
                  )}
                  {log.EventId && (
                    <div style={{ marginTop: '8px', fontSize: '11px', color: '#a16207' }}>
                      Event ID: {log.EventId} {log.LineId && `| Line: ${log.LineId}`}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* LLM Analysis Modal */}
      {selectedLog && (
        <AnomalyAnalysisModal
          log={selectedLog}
          jobId={jobId}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  );
};

export default Results;
