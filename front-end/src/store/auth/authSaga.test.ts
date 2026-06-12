import { put } from 'redux-saga/effects';
import { loginFailure, loginRequest, loginSuccess } from './authSlice';
import { handleLogin } from './authSaga';
import type { ApiResponse, LoginResponse } from '@/types/api';

describe('handleLogin saga', () => {
  const action = loginRequest({ email: 'admin@example.com', password: 'Admin@123' });

  it('dispatches loginSuccess with user on 2xx success', () => {
    const gen = handleLogin(action);
    expect(gen.next().value).toEqual(expect.objectContaining({ type: 'CALL' }));

    const successBody: ApiResponse<LoginResponse> = {
      success: true,
      data: {
        accessToken: 'A',
        refreshToken: 'R',
        expiresIn: 900,
        user: {
          id: 'u1',
          email: 'admin@example.com',
          name: 'Admin',
          role: 'admin',
          createdAt: '2025-01-01T00:00:00Z',
        },
      },
    };

    const step = gen.next({ data: successBody } as never);
    expect(step.value).toEqual(put(loginSuccess({ user: successBody.data.user })));
    expect(gen.next().done).toBe(true);
  });

  it('dispatches loginFailure with code on API error body', () => {
    const gen = handleLogin(action);
    gen.next();
    const failBody: ApiResponse<never> = {
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' },
    };
    const step = gen.next({ data: failBody } as never);
    // BE's 'UNAUTHORIZED' is not in the known-LoginErrorCode whitelist,
    // so the saga maps it to UNKNOWN.
    expect(step.value).toEqual(
      put(loginFailure({ message: 'Invalid credentials', code: 'UNKNOWN' })),
    );
    expect(gen.next().done).toBe(true);
  });

  it('dispatches loginFailure with INVALID_CREDENTIALS on 401', () => {
    const gen = handleLogin(action);
    gen.next();
    const err = {
      response: {
        status: 401,
        data: { error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } },
      },
      message: 'Request failed with status code 401',
    };
    const step = gen.throw(err);
    expect(step.value).toEqual(
      put(loginFailure({ message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' })),
    );
    expect(gen.next().done).toBe(true);
  });

  it('dispatches loginFailure with SERVER_ERROR on 5xx', () => {
    const gen = handleLogin(action);
    gen.next();
    const err = {
      response: { status: 503, data: { error: { code: 'SVC_DOWN', message: 'Bad gateway' } } },
      message: 'Request failed with status code 503',
    };
    const step = gen.throw(err);
    expect(step.value).toEqual(put(loginFailure({ message: 'Bad gateway', code: 'SERVER_ERROR' })));
    expect(gen.next().done).toBe(true);
  });

  it('dispatches loginFailure with NETWORK_ERROR on CORS / no response', () => {
    const gen = handleLogin(action);
    gen.next();
    const err = {
      // No response property — simulates CORS or offline.
      message: 'Network Error',
    };
    const step = gen.throw(err);
    expect(step.value).toEqual(
      put(loginFailure({ message: 'Network Error', code: 'NETWORK_ERROR' })),
    );
    expect(gen.next().done).toBe(true);
  });
});
