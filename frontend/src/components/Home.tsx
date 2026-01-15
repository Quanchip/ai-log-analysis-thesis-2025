import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import resultsImage from '../assets/results.png';

// Compact SVG icons
const Icons = {
  Search: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  ),
  Bolt: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
    </svg>
  ),
  ChartBar: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  ),
  Shield: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
    </svg>
  ),
  ArrowRight: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
    </svg>
  ),
  Check: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  ),
};

const Home = () => {
  const { isAuthenticated } = useAuth();

  const features = [
    {
      icon: <Icons.Search />,
      title: 'Pattern Detection',
      description: 'Automatically identify recurring patterns and templates in your log data using the Drain algorithm.',
    },
    {
      icon: <Icons.Shield />,
      title: 'Anomaly Detection',
      description: 'Machine learning models trained to detect unusual behavior and potential security issues.',
    },
    {
      icon: <Icons.ChartBar />,
      title: 'Visual Analytics',
      description: 'Clear visualizations and statistics to help you understand your log data at a glance.',
    },
    {
      icon: <Icons.Bolt />,
      title: 'Fast Processing',
      description: 'Efficient parsing engine handles large log files quickly with minimal resource usage.',
    },
  ];

  const benefits = [
    'Parse logs from HDFS, Apache, Syslog formats',
    'Export structured data to CSV',
    'Session-based anomaly grouping',
    'No vendor lock-in - self-hosted solution',
  ];

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", minHeight: 'calc(100vh - 60px)', backgroundColor: '#f9fafb' }}>
      {/* Hero Section */}
      <section style={{ padding: '40px 20px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px', alignItems: 'center' }}>
            {/* Left - Content */}
            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 12px',
                borderRadius: '9999px',
                backgroundColor: '#eff6ff',
                color: '#1d4ed8',
                fontSize: '12px',
                fontWeight: 500,
                marginBottom: '16px'
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#3b82f6' }}></span>
                Open Source Log Analysis Tool
              </div>

              <h1 style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '28px',
                fontWeight: 700,
                color: '#111827',
                marginBottom: '12px',
                lineHeight: 1.2
              }}>
                Understand your logs,
                <br />
                <span style={{ color: '#2563eb' }}>detect anomalies faster</span>
              </h1>

              <p style={{ fontSize: '14px', color: '#4b5563', marginBottom: '20px', lineHeight: 1.6, maxWidth: '420px' }}>
                Upload log files, parse them into structured data, and identify anomalies
                using machine learning. Built for developers and DevOps teams.
              </p>

              {/* Benefits list */}
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px 0' }}>
                {benefits.map((benefit, index) => (
                  <li key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#4b5563', marginBottom: '6px' }}>
                    <span style={{ color: '#22c55e', display: 'flex' }}><Icons.Check /></span>
                    {benefit}
                  </li>
                ))}
              </ul>

              {/* CTA Buttons */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {isAuthenticated ? (
                  <Link
                    to="/dashboard"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '10px 18px',
                      backgroundColor: '#2563eb',
                      color: 'white',
                      fontSize: '13px',
                      fontWeight: 500,
                      borderRadius: '6px',
                      textDecoration: 'none'
                    }}
                  >
                    Go to Dashboard
                    <Icons.ArrowRight />
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/register"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '10px 18px',
                        backgroundColor: '#2563eb',
                        color: 'white',
                        fontSize: '13px',
                        fontWeight: 500,
                        borderRadius: '6px',
                        textDecoration: 'none'
                      }}
                    >
                      Get Started
                      <Icons.ArrowRight />
                    </Link>
                    <Link
                      to="/login"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '10px 18px',
                        backgroundColor: 'white',
                        color: '#374151',
                        fontSize: '13px',
                        fontWeight: 500,
                        borderRadius: '6px',
                        border: '1px solid #d1d5db',
                        textDecoration: 'none'
                      }}
                    >
                      Sign In
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Right - Image */}
            <div style={{ position: 'relative', minWidth: '550px' }}>
              <div style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #f3f4f6 100%)', borderRadius: '12px', padding: '10px' }}>
                <img
                  src={resultsImage}
                  alt="Log Analysis Results Dashboard"
                  style={{ width: '100%', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section style={{ padding: '40px 20px', backgroundColor: 'white', borderTop: '1px solid #f3f4f6' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '20px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
              How it works
            </h2>
            <p style={{ fontSize: '13px', color: '#6b7280', maxWidth: '480px', margin: '0 auto' }}>
              A straightforward pipeline to transform raw logs into actionable insights
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            {features.map((feature, index) => (
              <div key={index} style={{
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
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
                  marginBottom: '12px'
                }}>
                  {feature.icon}
                </div>
                <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>
                  {feature.title}
                </h3>
                <p style={{ fontSize: '12px', color: '#6b7280', lineHeight: 1.5 }}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Processing Pipeline Section */}
      <section style={{ padding: '40px 20px', backgroundColor: '#f9fafb' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '24px' }}>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '18px', fontWeight: 700, color: '#111827', marginBottom: '20px' }}>
              Processing Pipeline
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
              {/* Step 1 */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{
                  flexShrink: 0,
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 600
                }}>
                  1
                </div>
                <div>
                  <h3 style={{ fontWeight: 500, color: '#111827', marginBottom: '4px', fontSize: '14px' }}>Upload</h3>
                  <p style={{ fontSize: '12px', color: '#6b7280', lineHeight: 1.5 }}>
                    Upload your log files (.log, .txt). Supports HDFS, Apache, and custom formats.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{
                  flexShrink: 0,
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 600
                }}>
                  2
                </div>
                <div>
                  <h3 style={{ fontWeight: 500, color: '#111827', marginBottom: '4px', fontSize: '14px' }}>Parse & Analyze</h3>
                  <p style={{ fontSize: '12px', color: '#6b7280', lineHeight: 1.5 }}>
                    Drain algorithm extracts templates. ML model classifies each log entry.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{
                  flexShrink: 0,
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 600
                }}>
                  3
                </div>
                <div>
                  <h3 style={{ fontWeight: 500, color: '#111827', marginBottom: '4px', fontSize: '14px' }}>Review Results</h3>
                  <p style={{ fontSize: '12px', color: '#6b7280', lineHeight: 1.5 }}>
                    View anomaly sessions, download structured CSV, and get actionable insights.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ padding: '40px 20px', backgroundColor: 'white', borderTop: '1px solid #f3f4f6' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '18px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
            Ready to analyze your logs?
          </h2>
          <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>
            Start with a free account. No credit card required.
          </p>
          {!isAuthenticated && (
            <Link
              to="/register"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '12px 24px',
                backgroundColor: '#2563eb',
                color: 'white',
                fontSize: '13px',
                fontWeight: 500,
                borderRadius: '6px',
                textDecoration: 'none'
              }}
            >
              Create Free Account
              <Icons.ArrowRight />
            </Link>
          )}
        </div>
      </section>
    </div>
  );
};

export default Home;
