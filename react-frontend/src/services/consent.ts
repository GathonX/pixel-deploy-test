// src/services/consent.ts
import axios from 'axios';

// Utilitaire pour lire un cookie
function getCookie(name: string): string | null {
  const cookies = document.cookie.split('; ');
  const cookie = cookies.find(c => c.startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.split('=')[1]) : null;
}

// Instance Axios AVEC préfixe /api
const consent = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: true,
});

// Intercepteur pour ajouter le jeton CSRF
consent.interceptors.request.use((config) => {
  const xsrfToken = getCookie('XSRF-TOKEN');
  const method = config.method?.toLowerCase() || '';

  if (xsrfToken && ['post', 'put', 'patch', 'delete'].includes(method)) {
    config.headers['X-XSRF-TOKEN'] = decodeURIComponent(xsrfToken);
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

export default consent;