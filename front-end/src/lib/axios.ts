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
let onUnauthorized: (expired?: boolean) => void = () => {};

export const bindAxiosAuth = (deps: { onUnauthorized: (expired?: boolean) => void }) => {
  onUnauthorized = deps.onUnauthorized;
};

let isRefreshing = false;
let refreshFailureCount = 0;
const MAX_REFRESH_RETRIES = 1; // Allow one retry before forcing logout
let pendingQueue: Array<(token: string | null) => void> = [];

// Debounce logout calls to prevent multiple rapid logouts from race conditions
// when multiple API calls all get 401 simultaneously.
let logoutTimer: ReturnType<typeof setTimeout> | null = null;
const LOGOUT_DEBOUNCE_MS = 100;

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

    // Endpoints that MUST NOT trigger the auto-refresh path AND
    // must NOT be surfaced via the interceptor's generic toast
    // (each of them has its own UI):
    //   - /auth/login     — 401 = wrong creds; refreshing won't help.
    //                       LoginContent toasts specific messages
    //                       based on the saga's LoginErrorCode.
    //   - /auth/refresh   — this IS the refresh endpoint; refreshing
    //                       it would loop forever. A failure here is
    //                       surfaced via providers.tsx's onUnauthorized
    //                       toast ("Your session has expired…").
    //   - /auth/logout    — 401 = token already invalid; we don't need
    //                       to refresh just to log out a dead session.
    //                       handleLogout already toasts "Signed out".
    //   - /auth/register  — 401/409 = email conflict / validation;
    //                       refreshing won't help. Not UI-exposed
    //                       today but kept consistent.
    //
    // /auth/me is intentionally NOT in this list: when the access
    // token expires (15 min) but the refresh token is still valid
    // (7 days), the dashboard layout's mount-once /me probe should
    // be transparently refreshed and retried. If it stayed excluded,
    // the probe would hard-401 and bounce the user to /login even
    // though the refresh token could have rescued the session.
    const isAuthExempt =
      url.includes('/auth/login') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/logout') ||
      url.includes('/auth/register');

    if (status === 401 && !isAuthExempt && original && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push((_token) => {
            // Cookies are sent automatically on retry
            resolve(api(original));
          });
          // The queued request is rejected via the outer catch if refresh fails.
        });
      }
      original._retry = true;
      isRefreshing = true;
      refreshFailureCount = 0;

      try {
        // The browser sends the httpOnly refresh_token cookie automatically.
        // Retry up to MAX_REFRESH_RETRIES times before giving up.
        let lastError: unknown;
        for (let attempt = 0; attempt <= MAX_REFRESH_RETRIES; attempt++) {
          try {
            await axios.post(
              `${env.NEXT_PUBLIC_API_BASE_URL}/auth/refresh`,
              {},
              { withCredentials: true },
            );
            refreshFailureCount = 0;
            flushQueue('ok');
            return api(original);
          } catch (e) {
            lastError = e;
            refreshFailureCount = attempt + 1;
            // If this was not the last attempt, retry immediately
            if (attempt < MAX_REFRESH_RETRIES) {
              await new Promise((r) => setTimeout(r, 500)); // brief pause before retry
            }
          }
        }
        // All retries exhausted
        flushQueue(null);
        // Debounce logout to prevent multiple calls from race-condition 401s
        if (!logoutTimer) {
          logoutTimer = setTimeout(() => {
            logoutTimer = null;
            onUnauthorized(true); // expired=true signals session expiry
          }, LOGOUT_DEBOUNCE_MS);
        }
        return Promise.reject(lastError);
      } catch {
        flushQueue(null);
        if (!logoutTimer) {
          logoutTimer = setTimeout(() => {
            logoutTimer = null;
            onUnauthorized(true);
          }, LOGOUT_DEBOUNCE_MS);
        }
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    // Generic user-facing surface for failures the caller wouldn't
    // otherwise announce: BE is up but broke (5xx, or the Vercel
    // proxy returned 502 BAD_GATEWAY), or the request never reached
    // the BE at all (network / DNS / offline / CORS blocked —
    // `status` is undefined in all of those cases because axios
    // never gets a response back).
    //
    // 401 is intentionally NOT toasted here: the auto-refresh block
    // above already handles it (transparent retry on success,
    // onUnauthorized toast on permanent failure).
    //
    // /auth/* endpoints are skipped because they each have their own
    // UX (see the isAuthExempt comment above for the full rationale).
    if (!isAuthExempt) {
      if (status && status >= 500) {
        toast.error('Server error. Please try again in a moment.');
      } else if (!status) {
        // The two real-world causes here are (a) the BE / proxy is
        // unreachable, and (b) a CORS misconfiguration blocked the
        // request before the response came back. Both look the same
        // to axios (`err.response === undefined`), so we describe
        // both in the toast and let the user know where to look.
        toast.error(
          'Network error. Cannot reach the server. This is often a CORS or connectivity issue — check that the API origin is reachable and CORS is configured.',
        );
      }
    }

    return Promise.reject(err);
  },
);
