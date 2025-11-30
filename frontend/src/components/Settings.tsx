import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PasswordChange from './PasswordChange';

const Settings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="dashboard">
      <div className="container">
        <div className="dashboard-header" style={{ marginBottom: '2rem' }}>
          <h1 className="dashboard-title">Settings</h1>
          <p className="dashboard-subtitle">
            Manage your account settings and preferences
          </p>
        </div>

        <div style={{ display: 'grid', gap: '2rem', maxWidth: '800px' }}>
          {/* Account Information */}
          <div
            style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            <h3 style={{ marginBottom: '1.5rem', color: '#1f2937' }}>Account Information</h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    color: '#6b7280',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                  }}
                >
                  Username
                </label>
                <p style={{ color: '#1f2937', fontSize: '1rem' }}>{user?.username}</p>
              </div>
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    color: '#6b7280',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                  }}
                >
                  Email
                </label>
                <p style={{ color: '#1f2937', fontSize: '1rem' }}>{user?.email}</p>
              </div>
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    color: '#6b7280',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                  }}
                >
                  Role
                </label>
                <p style={{ color: '#1f2937', fontSize: '1rem', textTransform: 'capitalize' }}>
                  {user?.role}
                </p>
              </div>
            </div>
          </div>

          {/* Password Change */}
          <div
            style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            <PasswordChange />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-outline" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
