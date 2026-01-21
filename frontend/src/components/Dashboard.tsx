import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Icons
const Icons = {
  Upload: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
  Activity: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  Settings: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  ArrowRight: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
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
  BarChart: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  ),
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const actionCards = [
    {
      icon: <Icons.Upload />,
      title: 'Start Analysis',
      description: 'Upload log files and run AI-powered analysis to detect patterns and anomalies.',
      buttonText: 'Upload Logs',
      buttonVariant: 'primary' as const,
      onClick: () => navigate('/upload'),
    },
    {
      icon: <Icons.Activity />,
      title: 'Recent Activity',
      description: 'View your recent log analysis sessions, results, and processing history.',
      buttonText: 'View Activity',
      buttonVariant: 'secondary' as const,
      onClick: () => navigate('/activity'),
    },
    {
      icon: <Icons.Settings />,
      title: 'Settings',
      description: 'Configure analysis preferences, notification settings, and account options.',
      buttonText: 'Open Settings',
      buttonVariant: 'secondary' as const,
      onClick: () => navigate('/settings'),
    },
  ];

  const steps = [
    {
      icon: <Icons.FileText />,
      title: 'Upload Logs',
      description: 'Upload your log files (.log, .txt) or connect to real-time streams.',
    },
    {
      icon: <Icons.Cpu />,
      title: 'Configure Analysis',
      description: 'Select log format and set up analysis parameters.',
    },
    {
      icon: <Icons.BarChart />,
      title: 'View Results',
      description: 'Explore insights, patterns, and anomalies in your logs.',
    },
  ];

  const buttonStyles = {
    primary: {
      backgroundColor: '#2563eb',
      color: 'white',
      border: 'none',
    },
    secondary: {
      backgroundColor: 'white',
      color: '#374151',
      border: '1px solid #d1d5db',
    },
  };

  return (
    <div style={{
      minHeight: 'calc(100vh - 56px)',
      backgroundColor: '#f9fafb',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 20px' }}>
        {/* Header */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          padding: '24px',
          marginBottom: '24px',
        }}>
          <h1 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '20px',
            fontWeight: 700,
            color: '#111827',
            marginBottom: '6px',
          }}>
            Welcome back, {user?.username}
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>
            Manage your log analysis tasks and view recent activity.
          </p>
        </div>

        {/* Action Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}>
          {actionCards.map((card, index) => (
            <div
              key={index}
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: index === 0 ? '#eff6ff' : '#f9fafb',
                color: index === 0 ? '#2563eb' : '#6b7280',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '14px',
              }}>
                {card.icon}
              </div>
              <h3 style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '15px',
                fontWeight: 600,
                color: '#111827',
                marginBottom: '6px',
              }}>
                {card.title}
              </h3>
              <p style={{
                fontSize: '13px',
                color: '#6b7280',
                lineHeight: 1.5,
                marginBottom: '16px',
                flex: 1,
              }}>
                {card.description}
              </p>
              <button
                onClick={card.onClick}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '9px 14px',
                  fontSize: '13px',
                  fontWeight: 500,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  ...buttonStyles[card.buttonVariant],
                }}
                onMouseOver={(e) => {
                  if (card.buttonVariant === 'primary') {
                    e.currentTarget.style.backgroundColor = '#1d4ed8';
                  } else {
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                    e.currentTarget.style.borderColor = '#9ca3af';
                  }
                }}
                onMouseOut={(e) => {
                  if (card.buttonVariant === 'primary') {
                    e.currentTarget.style.backgroundColor = '#2563eb';
                  } else {
                    e.currentTarget.style.backgroundColor = 'white';
                    e.currentTarget.style.borderColor = '#d1d5db';
                  }
                }}
              >
                {card.buttonText}
                <Icons.ArrowRight />
              </button>
            </div>
          ))}
        </div>

        {/* Getting Started */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          padding: '24px',
        }}>
          <h2 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '16px',
            fontWeight: 600,
            color: '#111827',
            marginBottom: '20px',
          }}>
            Getting Started
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
          }}>
            {steps.map((step, index) => (
              <div
                key={index}
                style={{
                  padding: '16px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '10px',
                }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: '#2563eb',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}>
                    {index + 1}
                  </div>
                  <h4 style={{
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#111827',
                  }}>
                    {step.title}
                  </h4>
                </div>
                <p style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  lineHeight: 1.5,
                  paddingLeft: '38px',
                }}>
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
