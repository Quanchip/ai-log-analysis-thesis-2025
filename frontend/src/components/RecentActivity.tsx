import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jobsAPI } from '../services/api';

const RecentActivity = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, completed, processing, failed

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const data = await jobsAPI.getRecentJobs(50); // Get last 50 jobs
      setJobs(data);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Format time as relative
  const formatRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  // Format date as readable string
  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  // Format duration in a human-readable way
  const formatDuration = (startTime: string, endTime: string | null) => {
    if (!endTime) return null;

    try {
      const start = new Date(startTime).getTime();
      const end = new Date(endTime).getTime();

      if (isNaN(start) || isNaN(end) || end < start) return null;

      const durationMs = end - start;
      const seconds = Math.floor(durationMs / 1000);

      if (seconds < 60) return `${seconds}s`;

      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;

      if (minutes < 60) {
        return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
      }

      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}m`;
    } catch (e) {
      return null;
    }
  };

  // Get status badge style
  const getStatusStyle = (status: string) => {
    const styles = {
      completed: { bg: '#d1fae5', color: '#065f46'},
      processing: { bg: '#dbeafe', color: '#1e40af',},
      queued: { bg: '#e7f5b3ff', color: '#4a4916ff'},
      failed: { bg: '#fee2e2', color: '#991b1b'},
      pending: { bg: '#f3f4f6', color: '#374151'}
    };
    return styles[status] || styles.pending;
  };

  // Filter jobs based on selected filter
  const filteredJobs = jobs.filter(job => {
    if (filter === 'all') return true;
    return job.status === filter;
  });

  // Handle job click
  const handleJobClick = (jobId: string, status: string) => {
    if (status === 'completed') {
      navigate(`/results/${jobId}`);
    }
  };

  return (
    <div className="container" style={{ padding: '2rem 0' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.5rem' }}>
          Recent Activity
        </h1>
        <p style={{ color: '#6b7280' }}>
          View all your log analysis jobs and their status
        </p>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '2rem',
        flexWrap: 'wrap'
      }}>
        {['all', 'completed', 'processing', 'failed'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: filter === status ? '2px solid #3b82f6' : '1px solid #e5e7eb',
              backgroundColor: filter === status ? '#eff6ff' : 'white',
              color: filter === status ? '#3b82f6' : '#6b7280',
              fontWeight: filter === status ? '600' : '400',
              cursor: 'pointer',
              textTransform: 'capitalize',
              transition: 'all 0.2s'
            }}
          >
            {status} {status !== 'all' && `(${jobs.filter(j => j.status === status).length})`}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
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
          <p style={{ color: '#6b7280', marginTop: '16px' }}>Loading jobs...</p>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '4rem',
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <p style={{ fontSize: '1.125rem', color: '#374151', marginBottom: '8px' }}>
            {filter === 'all' ? 'No jobs yet' : `No ${filter} jobs`}
          </p>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
            {filter === 'all' ? 'Upload a log file to get started' : `Try selecting a different filter`}
          </p>
          {filter === 'all' && (
            <button
              className="btn btn-primary"
              onClick={() => navigate('/upload')}
            >
              Upload Log File
            </button>
          )}
        </div>
      ) : (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          overflow: 'hidden'
        }}>
          {/* Table Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1fr',
            gap: '16px',
            padding: '16px 24px',
            backgroundColor: '#f9fafb',
            borderBottom: '1px solid #e5e7eb',
            fontWeight: '600',
            fontSize: '0.875rem',
            color: '#374151'
          }}>
            <div>FILE NAME</div>
            <div>STATUS</div>
            <div>CREATED</div>
            <div>DURATION</div>
          </div>

          {/* Job Rows */}
          {filteredJobs.map((job) => {
            const statusStyle = getStatusStyle(job.status);
            const duration = formatDuration(job.created_at, job.completed_at);

            return (
              <div
                key={job.job_id}
                onClick={() => handleJobClick(job.job_id, job.status)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 1fr',
                  gap: '16px',
                  padding: '16px 24px',
                  borderBottom: '1px solid #e5e7eb',
                  cursor: job.status === 'completed' ? 'pointer' : 'default',
                  transition: 'background-color 0.2s',
                  alignItems: 'center'
                }}
                onMouseEnter={(e) => {
                  if (job.status === 'completed') {
                    e.currentTarget.style.backgroundColor = '#9d9d9dff';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {/* Filename */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.25rem' }}>📄</span>
                  <div>
                    <div style={{ fontWeight: '500', color: '#1f2937', marginBottom: '2px' }}>
                      {job.filename}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      {formatRelativeTime(job.created_at)}
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <span style={{
                    fontSize: '0.75rem',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    backgroundColor: statusStyle.bg,
                    color: statusStyle.color,
                    fontWeight: '600',
                    display: 'inline-block'
                  }}>
                    {statusStyle.icon} {job.status.toUpperCase()}
                  </span>
                </div>

                {/* Created Date */}
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  {formatDate(job.created_at)}
                </div>

                {/* Duration */}
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  {duration || (job.status === 'completed' ? 'N/A' : '-')}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Back Button */}
      <div style={{ marginTop: '2rem' }}>
        <button
          onClick={() => navigate('/dashboard')}
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
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default RecentActivity;
