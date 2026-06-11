import { put } from 'redux-saga/effects';
import { loginFailure, loginRequest, loginSuccess } from './authSlice';
import { handleLogin } from './authSaga';
import type { ApiResponse, LoginResponse } from '@/types/api';

describe('handleLogin saga', () => {
  const action = loginRequest({ email: 'admin@example.com', password: 'Admin@123' });

  it('dispatches loginSuccess on 2xx success', () => {
    const gen = handleLogin(action);
    const next = gen.next();
    expect(next.value).toEqual(
      expect.objectContaining({ type: 'CALL' }),
    );

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
    expect(step.value).toEqual(
      put(
        loginSuccess({
          accessToken: 'A',
          refreshToken: 'R',
          expiresIn: 900,
          user: successBody.data.user,
        }),
      ),
    );
    expect(gen.next().done).toBe(true);
  });

  it('dispatches loginFailure on API error body', () => {
    const gen = handleLogin(action);
    gen.next(); // call
    const failBody: ApiResponse<never> = {
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' },
    };
    const step = gen.next({ data: failBody } as never);
    expect(step.value).toEqual(put(loginFailure('Invalid credentials')));
    expect(gen.next().done).toBe(true);
  });

  it('dispatches loginFailure on thrown exception', () => {
    const gen = handleLogin(action);
    gen.next(); // call
    const err = {
      response: { data: { error: { code: 'BOOM', message: 'Server error' } } },
      message: 'fail',
    };
    const step = gen.throw(err);
    expect(step.value).toEqual(put(loginFailure('Server error')));
    expect(gen.next().done).toBe(true);
  });
});
