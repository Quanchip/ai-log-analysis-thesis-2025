import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="dashboard">
      <div className="container">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Welcome to AI Log Analysis</h1>
          <p className="dashboard-subtitle">
            Hello, {user?.username}! This is your dashboard.
          </p>
        </div>

        <div className="dashboard-content" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginBottom: '1rem', color: '#1f2937' }}>Log Analysis Tools</h3>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
              Access advanced log analysis features and AI-powered insights.
            </p>
            <button className="btn btn-primary">
              Start Analysis
            </button>
          </div>

          <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginBottom: '1rem', color: '#1f2937' }}>Recent Activity</h3>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
              View your recent log analysis sessions and results.
            </p>
            <button className="btn btn-outline">
              View Activity
            </button>
          </div>

          <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginBottom: '1rem', color: '#1f2937' }}>Settings</h3>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
              Configure your analysis preferences and account settings.
            </p>
            <button className="btn btn-outline">
              Open Settings
            </button>
          </div>
        </div>

        <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginTop: '2rem' }}>
          <h3 style={{ marginBottom: '1rem', color: '#1f2937' }}>Getting Started</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            <div style={{ padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
              <h4 style={{ marginBottom: '0.5rem', color: '#374151' }}>1. Upload Logs</h4>
              <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                Upload your log files or connect to real-time log streams.
              </p>
            </div>
            <div style={{ padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
              <h4 style={{ marginBottom: '0.5rem', color: '#374151' }}>2. Configure Analysis</h4>
              <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                Set up your analysis parameters and choose AI models.
              </p>
            </div>
            <div style={{ padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
              <h4 style={{ marginBottom: '0.5rem', color: '#374151' }}>3. View Results</h4>
              <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                Explore insights, patterns, and anomalies in your logs.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;