import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('smarterp_accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Refresh-on-401 interceptor
let isRefreshing = false;
let pendingQueue: Array<{ resolve: (value: any) => void; reject: (err: any) => void }> = [];

function processQueue(error: any, token: string | null = null) {
  pendingQueue.forEach(({ resolve, reject }) => {
    error ? reject(error) : resolve(token);
  });
  pendingQueue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry && typeof window !== 'undefined') {
      const refreshToken = localStorage.getItem('smarterp_refreshToken');
      if (!refreshToken) {
        return Promise.reject(err);
      }
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }
      original._retry = true;
      isRefreshing = true;
      try {
        const res = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        if (res.data?.success) {
          const { accessToken, refreshToken: newRefresh } = res.data.data.tokens;
          localStorage.setItem('smarterp_accessToken', accessToken);
          localStorage.setItem('smarterp_refreshToken', newRefresh);
          processQueue(null, accessToken);
          original.headers.Authorization = `Bearer ${accessToken}`;
          return api(original);
        }
        throw new Error('Refresh failed');
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        // Force logout
        localStorage.removeItem('smarterp_accessToken');
        localStorage.removeItem('smarterp_refreshToken');
        localStorage.removeItem('smarterp_user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }
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
