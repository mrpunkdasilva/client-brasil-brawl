import axios from 'axios';
import { getSecureData, setAuthSession, clearAuthSession } from '../utils/storage.js';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

api.interceptors.request.use((config) => {
  // Try to get token from secure storage first
  const authSession = getSecureData('auth:session');
  if (authSession && authSession.accessToken) {
    config.headers.Authorization = `Bearer ${authSession.accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED') {
      // Token expired, clear local storage and redirect to login
      clearAuthSession();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
};

export const characterApi = {
  list: () => api.get('/characters'),
  create: (formData) => api.post('/characters', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

export const matchApi = {
  create: (data) => api.post('/matches', data),
  join: (data) => api.post('/matches/join', data),
};

export const userApi = {
  getProfile: () => api.get('/users/me'),
  getRanking: () => api.get('/users/ranking'),
  updateProfile: (formData) => api.patch('/users/me', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

export default api;
