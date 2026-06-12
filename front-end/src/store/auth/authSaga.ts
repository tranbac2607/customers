import { call, put, takeLatest } from 'redux-saga/effects';
import { AxiosError } from 'axios';
import { api } from '@/lib/axios';
import type { ApiFailure, ApiResponse, LoginResponse } from '@/types/api';
import { loginFailure, loginRequest, loginSuccess } from './authSlice';

export function* handleLogin(action: ReturnType<typeof loginRequest>): Generator {
  try {
    const res = yield call(() =>
      api.post<ApiResponse<LoginResponse>>('/auth/login', action.payload),
    );
    const body = res.data;
    if (!body.success) {
      yield put(loginFailure(body.error.message));
      return;
    }
    // Cookies are set by the backend as httpOnly Set-Cookie headers.
    // We only need the user info for UI.
    yield put(loginSuccess({ user: body.data.user }));
  } catch (err) {
    const e = err as AxiosError<ApiFailure>;
    const msg = e.response?.data?.error?.message ?? e.message ?? 'Login failed';
    yield put(loginFailure(msg));
  }
}

export function* authSaga(): Generator {
  yield takeLatest(loginRequest.type, handleLogin);
}
