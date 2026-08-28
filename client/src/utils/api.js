import axios from 'axios';

const API_BASE =
  process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('arete_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// A 401 from anywhere means the session is gone — drop local state and bounce
// to login. The /auth/me probe on mount opts out, since it does its own
// cleanup and a redirect there would fight AuthProvider's boot sequence.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.skipAuthRedirect) {
      localStorage.removeItem('arete_token');
      localStorage.removeItem('arete_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
