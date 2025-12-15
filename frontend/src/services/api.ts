import axios from 'axios';

const API_BASE = import.meta.env.REACT_APP_API_BASE || 'http://localhost:3001'; 

export const api = axios.create({
    baseURL: API_BASE,
    headers: {
        'Content-Type': 'application/json'
    }
});

api.interceptors.request.use(
  (config) => {
    // Prefer admin token if present, otherwise use user token
    const adminToken = localStorage.getItem('admin_token');
    const token = adminToken || localStorage.getItem('token');
    if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // If admin token existed, remove it and redirect to admin login
      const hadAdmin = !!localStorage.getItem('admin_token');
      localStorage.removeItem('token');
      localStorage.removeItem('admin_token');
      if (hadAdmin) {
        window.location.href = '/admin/login';
      } else {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);