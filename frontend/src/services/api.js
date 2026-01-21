import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const skipRedirect = error.config?.skipAuthRedirect;

    if (error.response?.status === 401 && !skipRedirect) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  // Login user
  login: async (username, password) => {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    const response = await api.post('/auth/token', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      skipAuthRedirect: true
    });
    return {
      status: response.status,
      tokenData: response.data
    }
  },

  // Register new user
  register: async (userData) => {
    const response = await api.post('/auth/users', userData);
    return response.data;
  },

  // Get current user info
  getCurrentUser: async () => {
    const response = await api.get('/auth/user');
    return response.data;
  },

  // Get all users (if needed)
  getAllUsers: async () => {
    const response = await api.get('/auth/users');
    return response.data;
  },

  // Change password
  changePassword: async (passwordData) => {
    const response = await api.put('/auth/change-password', passwordData);
    return response.data;
  },
};

// Jobs API calls
export const jobsAPI = {
  // Get recent jobs for current user
  getRecentJobs: async (limit = 10) => {
    const response = await api.get(`/api/jobs/recent?limit=${limit}`);
    return response.data;
  },

  // Get job status
  getJobStatus: async (jobId) => {
    const response = await api.get(`/api/jobs/${jobId}/status`);
    return response.data;
  },

  // Get job results
  getJobResults: async (jobId) => {
    const response = await api.get(`/api/jobs/${jobId}/results`);
    return response.data;
  },
};

// Named exports for convenience
export const { changePassword } = authAPI;

export default api;