import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { toast } from 'react-toastify';
import { env } from './env';
import { loadingStore } from './loadingStore';
import type { ApiFailure } from '@/types/api';

// All auth happens via httpOnly cookies set by the backend.
// `withCredentials: true` makes the browser send the cookies on every request.
export const api = axios.create({
  baseURL: env.NEXT_PUBLIC_API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Set via Providers on mount to wire up auto-refresh side-effects.
let onUnauthorized: () => void = () => {};

export const bindAxiosAuth = (deps: { onUnauthorized: () => void }) => {
  onUnauthorized = deps.onUnauthorized;
};

let isRefreshing = false;
let pendingQueue: Array<(token: string | null) => void> = [];

const flushQueue = (token: string | null) => {
  pendingQueue.forEach((cb) => cb(token));
  pendingQueue = [];
};

// Mark each request we want to track for the global loading overlay.
const TRACKED_FLAG = '__loadingTracked';
type TrackedConfig = InternalAxiosRequestConfig & { [TRACKED_FLAG]?: boolean };

api.interceptors.request.use((cfg: TrackedConfig) => {
  loadingStore.start();
  cfg[TRACKED_FLAG] = true;
  return cfg;
});

api.interceptors.response.use(
  (r) => {
    if ((r.config as TrackedConfig | undefined)?.[TRACKED_FLAG]) {
      loadingStore.end();
    }
    return r;
  },
  async (err: AxiosError<ApiFailure>) => {
    const cfg = err.config as TrackedConfig | undefined;
    if (cfg?.[TRACKED_FLAG]) {
      loadingStore.end();
    }

    const status = err.response?.status;
    const original = err.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const url = original?.url ?? '';

    // Auto-refresh on 401 (except for /auth/* and refresh itself)
    if (status === 401 && !url.includes('/auth/') && original && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          pendingQueue.push((_token) => {
            // Cookies are sent automatically on retry
            resolve(api(original));
          });
          // The queued request is rejected via the outer catch if refresh fails.
        });
      }
      original._retry = true;
      isRefreshing = true;

      try {
        // The browser sends the httpOnly refresh_token cookie automatically.
        await axios.post(
          `${env.NEXT_PUBLIC_API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true },
        );
        flushQueue('ok');
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
