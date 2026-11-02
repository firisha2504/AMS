import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  const lang = localStorage.getItem('language') || 'om';
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['Accept-Language'] = lang;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  meta?: Record<string, unknown>;
}

export interface User {
  id: string;
  username?: string;
  phone?: string;
  email?: string;
  role: 'ADMIN' | 'AUDITOR' | 'MEMBER';
  preferredLanguage: string;
  mustChangePassword?: boolean;
  profilePicture?: string;
  member?: {
    id: string;
    memberId: string;
    fullName: string;
    status: string;
    profilePicture?: string;
  };
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}
