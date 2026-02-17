import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

// Request interceptor: attach Authorization header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('mapestate_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor: handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('mapestate_token');
      localStorage.removeItem('mapestate_user');
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;
