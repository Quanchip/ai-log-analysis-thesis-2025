import React, { useState, useEffect, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const { login, error, clearError, isAuthenticated, user } = useAuth();

  // Debug logging
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'admin') {
        console.log('🔍 useEffect redirecting to admin...');
        navigate('/admin/dashboard', { replace: true });
      } else {
        console.log('🔍 useEffect redirecting to user...');
        navigate('/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  // Clear error when component mounts
  // useEffect(() => {
  //   clearError();
  // }, [clearError]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    //Clear error when user starts typing
    if (error) {
      clearError();
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Add validation check
    if (!formData.username || !formData.password) {
      return;
    }

    setIsLoading(true);

    try {
      await login(formData.username, formData.password);
      // Navigation will be handled by useEffect after user state updates
    } catch (err) {
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="form-container">
      <h2 className="form-title">Login to AI Log Analysis</h2>

      {error && (
        <div className="error-message" style={{
          backgroundColor: '#fee',
          color: '#c33',
          padding: '10px',
          borderRadius: '4px',
          marginBottom: '15px',
          border: '1px solid #fcc'
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            className="form-control"
            required
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="form-control"
            required
            disabled={isLoading}
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%' }}
          disabled={isLoading}
        // onClick={() => console.log('🔍 Button clicked, form will submit')}
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <div className="form-footer">
        <p>
          Don't have an account?{' '}
          <Link to="/register" className="nav-link ">
            Sign up here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;