import { useState, useEffect } from 'react';
import axios from 'axios';

interface AnalysisResult {
    explanation: string;
    root_causes: string[];
    severity: string;
    recommended_actions: string[];
    session_size?: number;  // Optional: number of logs in session context
}

interface Props {
    log: any;
    jobId?: string;  // Optional: For fetching session context
    onClose: () => void;
}

const AnomalyAnalysisModal = ({ log, jobId, onClose }: Props) => {
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const analyzeLogs = async () => {
        setLoading(true);
        setError("");

        try {
            const token = localStorage.getItem("access_token");
            const response = await axios.post(
                "http://localhost:8000/api/llm/analyze-anomaly",
                {
                    log_entry: log,
                    block_id: log.BlockId,
                    event_id: log.EventId,
                    job_id: jobId  // Include job_id for session context
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setAnalysis(response.data);
        } catch (err: any) {
            setError(err.response?.data?.detail || "Analysis failed");
        } finally {
            setLoading(false);
        }
    };

    // Auto-analyze on mount
    useEffect(() => {
        analyzeLogs();
    }, []);

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case "HIGH": return "#dc2626";
            case "MEDIUM": return "#f59e0b";
            case "LOW": return "#10b981";
            default: return "#6b7280";
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '32px',
                maxWidth: '800px',
                width: '90%',
                maxHeight: '80vh',
                overflowY: 'auto',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: '700', margin: 0 }}>
                        🤖 AI Analysis
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '24px',
                            cursor: 'pointer',
                            color: '#6b7280'
                        }}
                    >
                        ×
                    </button>
                </div>

                {/* Loading State */}
                {loading && (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        <style>{`
                            @keyframes spin {
                                0% { transform: rotate(0deg); }
                                100% { transform: rotate(360deg); }
                            }
                            @keyframes pulse {
                                0%, 100% { opacity: 1; }
                                50% { opacity: 0.5; }
                            }
                        `}</style>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            border: '4px solid #e5e7eb',
                            borderTop: '4px solid #3b82f6',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                            margin: '0 auto'
                        }}></div>
                        <p style={{
                            color: '#6b7280',
                            marginTop: '16px',
                            animation: 'pulse 1.5s ease-in-out infinite'
                        }}>
                            Analyzing with AI...
                        </p>
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div style={{
                        backgroundColor: '#fee2e2',
                        border: '1px solid #ef4444',
                        borderRadius: '8px',
                        padding: '16px',
                        color: '#dc2626'
                    }}>
                        ❌ {error}
                    </div>
                )}

                {/* Analysis Result */}
                {analysis && !loading && (
                    <div>
                        {/* Severity Badge */}
                        <div style={{
                            display: 'inline-block',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            backgroundColor: `${getSeverityColor(analysis.severity)}20`,
                            color: getSeverityColor(analysis.severity),
                            fontWeight: '600',
                            fontSize: '14px',
                            marginBottom: '20px'
                        }}>
                            {analysis.severity} SEVERITY
                        </div>

                        {/* Session Context Info */}
                        {analysis.session_size !== undefined && analysis.session_size > 0 && (
                            <div style={{
                                fontSize: '12px',
                                color: '#6b7280',
                                marginBottom: '16px',
                                padding: '8px 12px',
                                backgroundColor: '#f3f4f6',
                                borderRadius: '6px',
                                display: 'inline-block',
                                marginLeft: '8px'
                            }}>
                                ℹ️ Analyzed with {analysis.session_size} log{analysis.session_size > 1 ? 's' : ''} in session context
                            </div>
                        )}

                        {/* Explanation */}
                        <div style={{ marginBottom: '24px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
                                📝 Explanation
                            </h3>
                            <p style={{ color: '#374151', lineHeight: '1.6', margin: 0 }}>
                                {analysis.explanation}
                            </p>
                        </div>

                        {/* Root Causes */}
                        <div style={{ marginBottom: '24px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
                                🔍 Possible Root Causes
                            </h3>
                            <ul style={{ margin: 0, paddingLeft: '20px' }}>
                                {analysis.root_causes.map((cause, idx) => (
                                    <li key={idx} style={{ color: '#374151', marginBottom: '8px', lineHeight: '1.6' }}>
                                        {cause}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Recommended Actions */}
                        <div>
                            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
                                ✅ Recommended Actions
                            </h3>
                            <ul style={{ margin: 0, paddingLeft: '20px' }}>
                                {analysis.recommended_actions.map((action, idx) => (
                                    <li key={idx} style={{ color: '#374151', marginBottom: '8px', lineHeight: '1.6' }}>
                                        {action}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Retry Button */}
                        <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                            <button
                                onClick={analyzeLogs}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#3b82f6',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '14px'
                                }}
                            >
                                🔄 Re-analyze
                            </button>
                            <button
                                onClick={onClose}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#6b7280',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '14px'
                                }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AnomalyAnalysisModal;
