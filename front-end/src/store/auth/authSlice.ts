import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { UserResponse } from './authTypes';

export type LoginErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_DISABLED'
  | 'EMAIL_NOT_VERIFIED'
  | 'SERVER_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

export interface AuthState {
  user: UserResponse | null;
  loading: boolean;
  error: string | null;
  /** Lets the page render the right message for wrong-creds vs CORS vs 5xx. */
  errorCode: LoginErrorCode | null;
  isAuthenticated: boolean;
  /**
   * True once the auth state is final. Set by:
   *   - `hydrateUser` (the /me probe resolves either way)
   *   - `loginSuccess` / `loginFailure` (a manual login attempt
   *     resolves either way)
   *
   * Pages that gate on `isAuthenticated` (Home, /admin/users,
   * /customers/trash, /profile) use this to know when the value
   * is final, instead of briefly showing the unauth UI before the
   * probe/login resolves. Without this, post-login the dashboard
   * layout skips the /me probe (the cookie is already known
   * good) and the flag would never flip — the user would see an
   * infinite spinner on /profile.
   */
  authChecked: boolean;
}

const initialState: AuthState = {
  user: null,
  loading: false,
  error: null,
  errorCode: null,
  isAuthenticated: false,
  authChecked: false,
};

const slice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginRequest(state, _action: PayloadAction<{ identifier: string; password: string }>) {
      state.loading = true;
      state.error = null;
      state.errorCode = null;
    },
    loginSuccess(state, action: PayloadAction<{ user: UserResponse }>) {
      state.loading = false;
      state.error = null;
      state.errorCode = null;
      state.user = action.payload.user;
      state.isAuthenticated = true;
      // The login attempt itself resolves the auth state — we
      // don't need to re-probe /me. Without this, pages that gate
      // on authChecked (e.g. /profile) spin forever because the
      // dashboard layout skips the /me probe when a user is
      // already in Redux.
      state.authChecked = true;
    },
    loginFailure(state, action: PayloadAction<{ message: string; code: LoginErrorCode }>) {
      state.loading = false;
      state.error = action.payload.message;
      state.errorCode = action.payload.code;
      state.isAuthenticated = false;
      // Failed login is still a known outcome — the user is
      // definitively NOT authenticated, so any auth-gated page
      // can render its unauth state (typically: redirect to
      // /login) without waiting for a /me probe.
      state.authChecked = true;
    },
    logout(state) {
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
      state.errorCode = null;
      // Reset authChecked so a subsequent /me probe can re-run
      // and confirm there is no lingering session. (If we left
      // it true, an auth-gated page would render the unauth
      // branch immediately without ever verifying that the BE
      // cookie is truly gone.)
      state.authChecked = false;
    },
    /**
     * Restore user from /me (used on app mount to rehydrate from cookie).
     */
    hydrateUser(state, action: PayloadAction<UserResponse | null>) {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
      state.authChecked = true;
    },
    /**
     * Update the currently logged-in user's profile in-place (used by
     * the Profile page after PATCH /auth/me).
     */
    updateProfile(state, action: PayloadAction<Partial<UserResponse>>) {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
  },
});

export const {
  loginRequest,
  loginSuccess,
  loginFailure,
  logout,
  hydrateUser,
  updateProfile,
} = slice.actions;

export default slice.reducer;
