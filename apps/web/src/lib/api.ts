import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
});

// Attach access token from localStorage on every request
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// 401 interceptor — Day 2 will wire refresh-token rotation
api.interceptors.response.use(
  (res) => res,
  (err) => {
    // placeholder
    return Promise.reject(err);
  },
);

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: { page?: number; pageSize?: number; total?: number; totalPages?: number };
}
export interface ApiError {
  success: false;
  error: { code: string; message: string; errors?: Record<string, string[]> };
}
