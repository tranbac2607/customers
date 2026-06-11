import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { toast } from 'react-toastify';
import { env } from './env';
import type { ApiFailure } from '@/types/api';

export const api = axios.create({
  baseURL: env.NEXT_PUBLIC_API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Set via Providers on mount to avoid circular imports.
let getAccessToken: () => string | null = () => null;
let onUnauthorized: () => void = () => {};
let onTokenRefreshed: (newAccess: string, newRefresh: string) => void = () => {};

export const bindAxiosAuth = (deps: {
  getAccessToken: () => string | null;
  onUnauthorized: () => void;
  onTokenRefreshed: (newAccess: string, newRefresh: string) => void;
}) => {
  getAccessToken = deps.getAccessToken;
  onUnauthorized = deps.onUnauthorized;
  onTokenRefreshed = deps.onTokenRefreshed;
};

api.interceptors.request.use((cfg: InternalAxiosRequestConfig) => {
  const t = getAccessToken();
  if (t) cfg.headers.set('Authorization', `Bearer ${t}`);
  return cfg;
});

let isRefreshing = false;
let pendingQueue: Array<(token: string | null) => void> = [];

const flushQueue = (token: string | null) => {
  pendingQueue.forEach((cb) => cb(token));
  pendingQueue = [];
};

api.interceptors.response.use(
  (r) => r,
  async (err: AxiosError<ApiFailure>) => {
    const status = err.response?.status;
    const original = err.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const url = original?.url ?? '';

    // Auto-refresh on 401 (except for /auth/* and refresh itself)
    if (
      status === 401 &&
      !url.includes('/auth/') &&
      original &&
      !original._retry
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push((token) => {
            if (!token) return reject(err);
            original.headers.set('Authorization', `Bearer ${token}`);
            resolve(api(original));
          });
        });
      }
      original._retry = true;
      isRefreshing = true;

      try {
        // Read refresh token from store (dynamic import to avoid circular)
        const { store } = await import('@/store');
        const state = store.getState();
        const refreshToken = state.auth.refreshToken;
        if (!refreshToken) throw new Error('No refresh token');

        const res = await axios.post(
          `${env.NEXT_PUBLIC_API_BASE_URL}/auth/refresh`,
          { refreshToken },
        );
        const body = res.data;
        if (!body.success) throw new Error(body.error?.message ?? 'Refresh failed');

        onTokenRefreshed(body.data.accessToken, body.data.refreshToken);
        flushQueue(body.data.accessToken);
        original.headers.set('Authorization', `Bearer ${body.data.accessToken}`);
        return api(original);
      } catch {
        flushQueue(null);
        onUnauthorized();
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    // 4xx / 5xx toast
    const msg = err.response?.data?.error?.message ?? err.message ?? 'Request failed';
    if (status === 401) {
      onUnauthorized();
    } else if (status && status >= 500) {
      toast.error('Server error. Please try again.');
    } else if (msg) {
      toast.warning(msg);
    }
    return Promise.reject(err);
  },
);
