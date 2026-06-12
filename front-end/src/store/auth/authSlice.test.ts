import reducer, {
  loginRequest,
  loginSuccess,
  loginFailure,
  logout,
  hydrateUser,
  type AuthState,
} from './authSlice';

const user = {
  id: 'u1',
  email: 'admin@example.com',
  name: 'Admin',
  role: 'admin' as const,
  createdAt: '2025-01-01T00:00:00Z',
};

describe('authSlice', () => {
  const initial: AuthState = {
    user: null,
    loading: false,
    error: null,
    errorCode: null,
    isAuthenticated: false,
  };

  it('returns initial state', () => {
    expect(reducer(undefined, { type: '@@INIT' })).toEqual(initial);
  });

  it('loginRequest sets loading + clears error and errorCode', () => {
    const state = reducer(
      { ...initial, error: 'old', errorCode: 'INVALID_CREDENTIALS' },
      loginRequest({ email: 'a', password: 'b' }),
    );
    expect(state).toEqual({
      ...initial,
      error: null,
      errorCode: null,
      loading: true,
    });
  });

  it('loginSuccess sets user + isAuthenticated + clears errors', () => {
    const state = reducer(initial, loginSuccess({ user }));
    expect(state.user).toEqual(user);
    expect(state.isAuthenticated).toBe(true);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.errorCode).toBeNull();
  });

  it('loginFailure sets error + errorCode, isAuthenticated=false', () => {
    const state = reducer(
      initial,
      loginFailure({ message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' }),
    );
    expect(state.error).toBe('Invalid credentials');
    expect(state.errorCode).toBe('INVALID_CREDENTIALS');
    expect(state.isAuthenticated).toBe(false);
  });

  it('loginFailure for network error sets NETWORK_ERROR code', () => {
    const state = reducer(initial, loginFailure({ message: 'fail', code: 'NETWORK_ERROR' }));
    expect(state.errorCode).toBe('NETWORK_ERROR');
  });

  it('logout clears user, isAuthenticated, error and errorCode', () => {
    const logged: AuthState = {
      user,
      loading: false,
      error: 'oops',
      errorCode: 'INVALID_CREDENTIALS',
      isAuthenticated: true,
    };
    expect(reducer(logged, logout())).toEqual(initial);
  });

  it('hydrateUser sets user from /me', () => {
    const state = reducer(initial, hydrateUser(user));
    expect(state.user).toEqual(user);
    expect(state.isAuthenticated).toBe(true);
  });

  it('hydrateUser with null clears', () => {
    const state = reducer({ ...initial, user, isAuthenticated: true }, hydrateUser(null));
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });
});
