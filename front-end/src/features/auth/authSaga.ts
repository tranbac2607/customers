'use client';

import { call, put, takeLatest } from 'redux-saga/effects';
import { AxiosError } from 'axios';
import { api } from '@/lib/axios';
import { store } from '@/store';
import type { ApiFailure, ApiResponse, LoginResponse } from '@/types/api';
import {
  loginFailure,
  loginRequest,
  loginSuccess,
  refreshFailure,
  refreshRequest,
  refreshSuccess,
} from './authSlice';

function* handleLogin(
  action: ReturnType<typeof loginRequest>,
): Generator {
  try {
    const res = yield call(() => api.post<ApiResponse<LoginResponse>>('/auth/login', action.payload));
    const body = res.data;
    if (!body.success) {
      yield put(loginFailure(body.error.message));
      return;
    }
    yield put(
      loginSuccess({
        accessToken: body.data.accessToken,
        refreshToken: body.data.refreshToken,
        expiresIn: body.data.expiresIn,
        user: body.data.user,
      }),
    );
  } catch (err) {
    const e = err as AxiosError<ApiFailure>;
    const msg = e.response?.data?.error?.message ?? e.message ?? 'Login failed';
    yield put(loginFailure(msg));
  }
}

function* handleRefresh(): Generator {
  try {
    const state = store.getState();
    const refreshToken = state.auth.refreshToken;
    if (!refreshToken) {
      yield put(refreshFailure());
      return;
    }
    const res = yield call(() =>
      api.post<ApiResponse<{ accessToken: string; refreshToken: string; expiresIn: number }>>(
        '/auth/refresh',
        { refreshToken },
      ),
    );
    const body = res.data;
    if (!body.success) {
      yield put(refreshFailure());
      return;
    }
    yield put(refreshSuccess({ accessToken: body.data.accessToken, refreshToken: body.data.refreshToken }));
  } catch {
    yield put(refreshFailure());
  }
}

export function* authSaga(): Generator {
  yield takeLatest(loginRequest.type, handleLogin);
  yield takeLatest(refreshRequest.type, handleRefresh);
}
