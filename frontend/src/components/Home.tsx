import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Home = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div style={{ padding: '4rem 0', textAlign: 'center' }}>
      <div className="container">
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem', color: '#1f2937' }}>
          AI-Powered Log Analysis
        </h1>
        <p style={{ fontSize: '1.2rem', color: '#6b7280', marginBottom: '3rem', maxWidth: '600px', margin: '0 auto 3rem' }}>
          Transform your log data into actionable insights with advanced AI algorithms.
          Detect anomalies, patterns, and issues faster than ever before.
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '4rem' }}>
          {isAuthenticated ? (
            <Link to="/dashboard" className="btn btn-primary" style={{ fontSize: '1.1rem', padding: '1rem 2rem' }}>
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link to="/register" className="btn btn-primary" style={{ fontSize: '1.1rem', padding: '1rem 2rem' }}>
                Get Started
              </Link>
              <Link to="/login" className="btn btn-outline" style={{ fontSize: '1.1rem', padding: '1rem 2rem' }}>
                Login
              </Link>
            </>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginTop: '4rem' }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginBottom: '1rem', color: '#2563eb' }}>🔍 Smart Detection</h3>
            <p style={{ color: '#6b7280' }}>
              AI-powered anomaly detection identifies unusual patterns and potential issues in your logs automatically.
            </p>
          </div>

          <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginBottom: '1rem', color: '#2563eb' }}>📊 Real-time Analysis</h3>
            <p style={{ color: '#6b7280' }}>
              Process and analyze log streams in real-time to catch problems as they happen.
            </p>
          </div>

          <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginBottom: '1rem', color: '#2563eb' }}>⚡ Fast Processing</h3>
            <p style={{ color: '#6b7280' }}>
              High-performance algorithms process large volumes of log data quickly and efficiently.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;