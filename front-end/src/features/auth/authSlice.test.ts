import reducer, {
  loginRequest,
  loginSuccess,
  loginFailure,
  logout,
  refreshSuccess,
  refreshFailure,
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
    accessToken: null,
    refreshToken: null,
    loading: false,
    error: null,
    isAuthenticated: false,
  };

  it('returns initial state', () => {
    expect(reducer(undefined, { type: '@@INIT' })).toEqual(initial);
  });

  it('loginRequest sets loading + clears error', () => {
    expect(reducer({ ...initial, error: 'old' }, loginRequest({ email: 'a', password: 'b' }))).toEqual({
      ...initial,
      error: null,
      loading: true,
    });
  });

  it('loginSuccess sets tokens + user + isAuthenticated', () => {
    const state = reducer(
      initial,
      loginSuccess({
        accessToken: 'A',
        refreshToken: 'R',
        expiresIn: 900,
        user,
      }),
    );
    expect(state.accessToken).toBe('A');
    expect(state.refreshToken).toBe('R');
    expect(state.user).toEqual(user);
    expect(state.isAuthenticated).toBe(true);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('loginFailure sets error, isAuthenticated=false', () => {
    const state = reducer(initial, loginFailure('bad creds'));
    expect(state.error).toBe('bad creds');
    expect(state.isAuthenticated).toBe(false);
  });

  it('logout clears everything', () => {
    const logged: AuthState = {
      user,
      accessToken: 'A',
      refreshToken: 'R',
      loading: false,
      error: null,
      isAuthenticated: true,
    };
    expect(reducer(logged, logout())).toEqual(initial);
  });

  it('refreshSuccess updates tokens', () => {
    const state = reducer(
      { ...initial, accessToken: 'old', refreshToken: 'old' },
      refreshSuccess({ accessToken: 'new', refreshToken: 'new' }),
    );
    expect(state.accessToken).toBe('new');
    expect(state.refreshToken).toBe('new');
  });

  it('refreshFailure clears tokens and user', () => {
    const state = reducer(
      { ...initial, accessToken: 'A', refreshToken: 'R', user, isAuthenticated: true },
      refreshFailure(),
    );
    expect(state.accessToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });
});
