import { useState, useEffect } from 'react';
import axios from 'axios';

// Icons
const Icons = {
    X: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    ),
    Cpu: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    AlertTriangle: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    ),
    FileText: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
    ),
    Search: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
    ),
    CheckCircle: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    ),
    RefreshCw: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </svg>
    ),
    Info: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
    ),
};

interface AnalysisResult {
    explanation: string;
    root_causes: string[];
    severity: string;
    recommended_actions: string[];
    session_size?: number;
}

interface Props {
    log: any;
    jobId?: string;
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
                    job_id: jobId
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

    useEffect(() => {
        analyzeLogs();
    }, []);

    const getSeverityConfig = (severity: string) => {
        switch (severity) {
            case "HIGH": return { color: "#dc2626", bg: "#fee2e2", border: "#fecaca" };
            case "MEDIUM": return { color: "#d97706", bg: "#fef3c7", border: "#fde68a" };
            case "LOW": return { color: "#059669", bg: "#d1fae5", border: "#a7f3d0" };
            default: return { color: "#6b7280", bg: "#f3f4f6", border: "#e5e7eb" };
        }
    };

    const severityConfig = analysis ? getSeverityConfig(analysis.severity) : null;

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '20px',
                fontFamily: "'DM Sans', sans-serif",
            }}
            onClick={onClose}
        >
            <div
                style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    maxWidth: '700px',
                    width: '100%',
                    maxHeight: '85vh',
                    overflow: 'hidden',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '20px 24px',
                    borderBottom: '1px solid #e5e7eb',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                            <Icons.Cpu />
                        </div>
                        <div>
                            <h2 style={{
                                fontFamily: "'Space Grotesk', sans-serif",
                                fontSize: '16px',
                                fontWeight: 600,
                                color: '#111827',
                                margin: 0,
                            }}>
                                AI Anomaly Analysis
                            </h2>
                            <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0 0' }}>
                                Powered by LLM intelligence
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#9ca3af',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '6px',
                            transition: 'color 0.2s',
                        }}
                        onMouseOver={(e) => e.currentTarget.style.color = '#374151'}
                        onMouseOut={(e) => e.currentTarget.style.color = '#9ca3af'}
                    >
                        <Icons.X />
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '24px', maxHeight: 'calc(85vh - 80px)', overflowY: 'auto' }}>
                    {/* Loading State */}
                    {loading && (
                        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                            <style>{`
                                @keyframes spin { to { transform: rotate(360deg); } }
                                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
                            `}</style>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                border: '3px solid #e5e7eb',
                                borderTopColor: '#2563eb',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite',
                                margin: '0 auto 16px',
                            }} />
                            <p style={{
                                fontFamily: "'Space Grotesk', sans-serif",
                                fontSize: '15px',
                                fontWeight: 500,
                                color: '#111827',
                                marginBottom: '4px',
                            }}>
                                Analyzing anomaly...
                            </p>
                            <p style={{
                                fontSize: '13px',
                                color: '#6b7280',
                                animation: 'pulse 1.5s ease-in-out infinite',
                            }}>
                                AI is processing your log data
                            </p>
                        </div>
                    )}

                    {/* Error State */}
                    {error && !loading && (
                        <div style={{
                            backgroundColor: '#fee2e2',
                            border: '1px solid #fecaca',
                            borderRadius: '8px',
                            padding: '16px',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                <Icons.AlertTriangle />
                                <span style={{
                                    fontFamily: "'Space Grotesk', sans-serif",
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    color: '#dc2626',
                                }}>
                                    Analysis Failed
                                </span>
                            </div>
                            <p style={{ fontSize: '13px', color: '#991b1b', margin: 0 }}>{error}</p>
                            <button
                                onClick={analyzeLogs}
                                style={{
                                    marginTop: '12px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '8px 14px',
                                    backgroundColor: '#dc2626',
                                    color: 'white',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                }}
                            >
                                <Icons.RefreshCw />
                                Try Again
                            </button>
                        </div>
                    )}

                    {/* Analysis Result */}
                    {analysis && !loading && severityConfig && (
                        <div>
                            {/* Severity Badge & Session Info */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                                <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    backgroundColor: severityConfig.bg,
                                    border: `1px solid ${severityConfig.border}`,
                                    color: severityConfig.color,
                                    fontWeight: 600,
                                    fontSize: '12px',
                                    textTransform: 'uppercase',
                                }}>
                                    <Icons.AlertTriangle />
                                    {analysis.severity} Severity
                                </span>
                                {analysis.session_size !== undefined && analysis.session_size > 0 && (
                                    <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '6px 12px',
                                        fontSize: '12px',
                                        color: '#6b7280',
                                        backgroundColor: '#f3f4f6',
                                        borderRadius: '6px',
                                    }}>
                                        <Icons.Info />
                                        {analysis.session_size} log{analysis.session_size > 1 ? 's' : ''} analyzed
                                    </span>
                                )}
                            </div>

                            {/* Explanation */}
                            <div style={{
                                backgroundColor: '#f9fafb',
                                borderRadius: '8px',
                                border: '1px solid #e5e7eb',
                                padding: '16px',
                                marginBottom: '16px',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                    <Icons.FileText />
                                    <h3 style={{
                                        fontFamily: "'Space Grotesk', sans-serif",
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        color: '#111827',
                                        margin: 0,
                                    }}>
                                        Explanation
                                    </h3>
                                </div>
                                <p style={{
                                    fontSize: '13px',
                                    color: '#374151',
                                    lineHeight: 1.6,
                                    margin: 0,
                                }}>
                                    {analysis.explanation}
                                </p>
                            </div>

                            {/* Root Causes */}
                            <div style={{
                                backgroundColor: '#fffbeb',
                                borderRadius: '8px',
                                border: '1px solid #fde68a',
                                padding: '16px',
                                marginBottom: '16px',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                    <Icons.Search />
                                    <h3 style={{
                                        fontFamily: "'Space Grotesk', sans-serif",
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        color: '#92400e',
                                        margin: 0,
                                    }}>
                                        Possible Root Causes
                                    </h3>
                                </div>
                                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                                    {analysis.root_causes.map((cause, idx) => (
                                        <li key={idx} style={{
                                            fontSize: '13px',
                                            color: '#78350f',
                                            marginBottom: '6px',
                                            lineHeight: 1.5,
                                        }}>
                                            {cause}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Recommended Actions */}
                            <div style={{
                                backgroundColor: '#f0fdf4',
                                borderRadius: '8px',
                                border: '1px solid #bbf7d0',
                                padding: '16px',
                                marginBottom: '20px',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                    <Icons.CheckCircle />
                                    <h3 style={{
                                        fontFamily: "'Space Grotesk', sans-serif",
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        color: '#166534',
                                        margin: 0,
                                    }}>
                                        Recommended Actions
                                    </h3>
                                </div>
                                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                                    {analysis.recommended_actions.map((action, idx) => (
                                        <li key={idx} style={{
                                            fontSize: '13px',
                                            color: '#15803d',
                                            marginBottom: '6px',
                                            lineHeight: 1.5,
                                        }}>
                                            {action}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    onClick={analyzeLogs}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
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
                                    <Icons.RefreshCw />
                                    Re-analyze
                                </button>
                                <button
                                    onClick={onClose}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '10px 16px',
                                        backgroundColor: 'white',
                                        color: '#374151',
                                        fontSize: '13px',
                                        fontWeight: 500,
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
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
                                    Close
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AnomalyAnalysisModal;
