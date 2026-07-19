import axios from 'axios';

// In dev, Vite proxies /api to localhost:5000 (see vite.config.js).
// In production (e.g. frontend on Vercel), set VITE_API_URL to the
// deployed backend's base URL, e.g. https://your-backend.onrender.com/api
const API_BASE = import.meta.env.VITE_API_URL || '/api';
const API_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

const api = axios.create({ baseURL: API_BASE });

// Uploaded screenshots come back from the API as relative paths like
// "/uploads/abc.jpg". When the frontend and backend are on different
// domains (Vercel + Render), those need the backend's origin prefixed.
export function fileUrl(relativePath) {
  if (!relativePath) return relativePath;
  if (/^https?:\/\//i.test(relativePath)) return relativePath;
  return `${API_ORIGIN}${relativePath}`;
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('td_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) {
      localStorage.removeItem('td_token');
      localStorage.removeItem('td_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
