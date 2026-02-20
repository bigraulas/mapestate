import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

function getTokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await axios.post('/api/auth/refresh', {}, {
      headers: { Authorization: `Bearer ${localStorage.getItem('mapestate_token')}` },
    });
    const newToken = res.data.accessToken;
    localStorage.setItem('mapestate_token', newToken);
    return newToken;
  } catch {
    return null;
  }
}

// Request interceptor: attach token, refresh if near expiry
api.interceptors.request.use(
  async (config) => {
    let token = localStorage.getItem('mapestate_token');
    if (token) {
      const expiry = getTokenExpiry(token);
      // Refresh if token expires within 30 minutes
      if (expiry && expiry - Date.now() < 30 * 60 * 1000) {
        if (!refreshPromise) {
          refreshPromise = refreshAccessToken().finally(() => { refreshPromise = null; });
        }
        const newToken = await refreshPromise;
        if (newToken) token = newToken;
      }
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor: handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('mapestate_token');
      localStorage.removeItem('mapestate_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;
