import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Check if user is logged in on app load
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      getCurrentUser();
    } else {
      setLoading(false);
    }
  }, []);

  const getCurrentUser = async () => {
    try {
      const userData = await authAPI.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Failed to get current user:', error);
      localStorage.removeItem('access_token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      setError('');
      setLoading(true);

      const tokenData = await authAPI.login(username, password);
      localStorage.setItem('access_token', tokenData.access_token);

      // Get user info after successful login
      await getCurrentUser();

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      let errorMessage = 'Login failed';

      if (error.response) {
        // Handle different error response formats
        if (error.response.data?.detail) {
          errorMessage = error.response.data.detail;
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        } else if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.status === 401) {
          errorMessage = 'Invalid username or password';
        } else if (error.response.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        }
      } else if (error.request) {
        errorMessage = 'Unable to connect to server. Please check your connection.';
      }

      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setError('');
      setLoading(true);

      await authAPI.register(userData);

      // Auto-login after successful registration
      const loginResult = await login(userData.username, userData.password);
      return loginResult;
    } catch (error) {
      console.error('Registration error:', error);
      let errorMessage = 'Registration failed';

      if (error.response) {
        // Handle different error response formats
        if (error.response.data?.detail) {
          errorMessage = error.response.data.detail;
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        } else if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.status === 400) {
          errorMessage = 'Invalid registration data. Please check your inputs.';
        } else if (error.response.status === 409) {
          errorMessage = 'Username or email already exists. Please choose different ones.';
        } else if (error.response.status === 500) {
          errorMessage = 'Username or email already exists. Please try different ones.';
        }
      } else if (error.request) {
        errorMessage = 'Unable to connect to server. Please check your connection.';
      }

      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    setUser(null);
  };

  const clearError = () => {
    setError('');
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    clearError,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};