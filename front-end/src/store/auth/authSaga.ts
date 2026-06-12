import { call, put, takeLatest } from 'redux-saga/effects';
import { AxiosError } from 'axios';
import { api } from '@/lib/axios';
import type { ApiFailure, ApiResponse, LoginResponse } from '@/types/api';
import { loginFailure, loginRequest, loginSuccess, type LoginErrorCode } from './authSlice';

// Whitelist of BE error codes we map to a specific user-facing
// experience. Anything else falls back to UNKNOWN.
const KNOWN_LOGIN_ERROR_CODES: ReadonlySet<LoginErrorCode> = new Set<LoginErrorCode>([
  'INVALID_CREDENTIALS',
  'SERVER_ERROR',
  'NETWORK_ERROR',
  'UNKNOWN',
]);

function toLoginErrorCode(raw: string | undefined, fallback: LoginErrorCode): LoginErrorCode {
  if (raw && (KNOWN_LOGIN_ERROR_CODES as Set<string>).has(raw)) {
    return raw as LoginErrorCode;
  }
  return fallback;
}

export function* handleLogin(action: ReturnType<typeof loginRequest>): Generator {
  try {
    const res = yield call(() =>
      api.post<ApiResponse<LoginResponse>>('/auth/login', action.payload),
    );
    const body = res.data;
    if (!body.success) {
      yield put(
        loginFailure({
          message: body.error.message,
          code: toLoginErrorCode(body.error.code, 'UNKNOWN'),
        }),
      );
      return;
    }
    // Cookies are set by the backend as httpOnly Set-Cookie headers.
    // We only need the user info for UI.
    yield put(loginSuccess({ user: body.data.user }));
  } catch (err) {
    const e = err as AxiosError<ApiFailure>;
    const status = e.response?.status;
    const code =
      status === 401
        ? 'INVALID_CREDENTIALS'
        : status && status >= 500
          ? 'SERVER_ERROR'
          : 'NETWORK_ERROR';
    const msg = e.response?.data?.error?.message ?? e.message ?? 'Login failed';
    yield put(loginFailure({ message: msg, code }));
  }
}

export function* authSaga(): Generator {
  yield takeLatest(loginRequest.type, handleLogin);
}
