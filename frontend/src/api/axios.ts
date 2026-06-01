/**
 * Axios instance with JWT interceptors for auto-token management
 *
 * - Development: uses Vite proxy → /api → http://localhost:8000
 * - Production (Netlify): VITE_API_URL = https://your-app.onrender.com
 *   so requests go to https://your-app.onrender.com/api
 */
import axios from 'axios';

// In production set VITE_API_URL=https://your-backend.onrender.com in Netlify env vars
const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor - attach JWT token (skip for login/refresh endpoints)
api.interceptors.request.use(
  (config) => {
    const isAuthEndpoint =
      config.url?.includes('/auth/login/') ||
      config.url?.includes('/auth/refresh/');
    if (!isAuthEndpoint) {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);


// Response interceptor - handle 401 and auto-refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE}/auth/refresh/`, {
            refresh: refreshToken,
          });
          const { access } = res.data;
          localStorage.setItem('access_token', access);
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return api(originalRequest);
        } catch {
          // Refresh failed, clear tokens and redirect to login
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      } else {
        localStorage.removeItem('access_token');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
