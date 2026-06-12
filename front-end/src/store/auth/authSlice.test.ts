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
    isAuthenticated: false,
  };

  it('returns initial state', () => {
    expect(reducer(undefined, { type: '@@INIT' })).toEqual(initial);
  });

  it('loginRequest sets loading + clears error', () => {
    expect(
      reducer({ ...initial, error: 'old' }, loginRequest({ email: 'a', password: 'b' })),
    ).toEqual({
      ...initial,
      error: null,
      loading: true,
    });
  });

  it('loginSuccess sets user + isAuthenticated', () => {
    const state = reducer(initial, loginSuccess({ user }));
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

  it('logout clears user and isAuthenticated', () => {
    const logged: AuthState = {
      user,
      loading: false,
      error: null,
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
