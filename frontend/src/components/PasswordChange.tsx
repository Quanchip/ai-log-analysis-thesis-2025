import { useState } from 'react';
import { changePassword } from '../services/api';

interface PasswordChangeProps {
  onSuccess?: () => void;
}

const PasswordChange = ({ onSuccess }: PasswordChangeProps) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (currentPassword === newPassword) {
      setError('New password must be different from current password');
      return;
    }

    try {
      setLoading(true);
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });

      setSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      if (onSuccess) {
        setTimeout(onSuccess, 1500);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px' }}>
      <h3 style={{ marginBottom: '1.5rem', color: '#1f2937' }}>Change Password</h3>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label
            htmlFor="current-password"
            style={{ display: 'block', marginBottom: '0.5rem', color: '#374151', fontWeight: '500' }}
          >
            Current Password
          </label>
          <input
            id="current-password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="input"
            placeholder="Enter current password"
            disabled={loading}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label
            htmlFor="new-password"
            style={{ display: 'block', marginBottom: '0.5rem', color: '#374151', fontWeight: '500' }}
          >
            New Password
          </label>
          <input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="input"
            placeholder="Enter new password (min 6 characters)"
            disabled={loading}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label
            htmlFor="confirm-password"
            style={{ display: 'block', marginBottom: '0.5rem', color: '#374151', fontWeight: '500' }}
          >
            Confirm New Password
          </label>
          <input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input"
            placeholder="Confirm new password"
            disabled={loading}
          />
        </div>

        {error && (
          <div
            style={{
              padding: '0.75rem',
              marginBottom: '1rem',
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              borderRadius: '6px',
              fontSize: '0.9rem',
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            style={{
              padding: '0.75rem',
              marginBottom: '1rem',
              backgroundColor: '#d1fae5',
              color: '#065f46',
              borderRadius: '6px',
              fontSize: '0.9rem',
            }}
          >
            {success}
          </div>
        )}

        <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Changing Password...' : 'Change Password'}
        </button>
      </form>
    </div>
  );
};

export default PasswordChange;
