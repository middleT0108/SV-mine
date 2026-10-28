import axios from 'axios';

// Default backend API URL. Users can customize this in settings if self-hosting
const DEFAULT_BACKEND_URL = 'http://localhost:3001';

export function getBackendUrl(): string {
  return localStorage.getItem('svmine_backend_url') || DEFAULT_BACKEND_URL;
}

export function setBackendUrl(url: string): void {
  const sanitized = url.replace(/\/+$/, '');
  localStorage.setItem('svmine_backend_url', sanitized);
}

export function getWebSocketUrl(path: string): string {
  const backend = getBackendUrl();
  const wsProto = backend.startsWith('https') ? 'wss' : 'ws';
  const host = backend.replace(/^https?:\/\//, '');
  return `${wsProto}://${host}${path}`;
}

export const api = axios.create({
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  config.baseURL = `${getBackendUrl()}/api`;
  const token = localStorage.getItem('svmine_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('svmine_token');
      localStorage.removeItem('svmine_user');
      if (window.location.hash !== '#/login' && !window.location.pathname.endsWith('/login')) {
        window.location.href = '#/login';
      }
    }
    return Promise.reject(error);
  }
);
