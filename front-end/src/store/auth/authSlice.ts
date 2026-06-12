import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { UserResponse } from './authTypes';

export type LoginErrorCode = 'INVALID_CREDENTIALS' | 'SERVER_ERROR' | 'NETWORK_ERROR' | 'UNKNOWN';

export interface AuthState {
  user: UserResponse | null;
  loading: boolean;
  error: string | null;
  /** Lets the page render the right message for wrong-creds vs CORS vs 5xx. */
  errorCode: LoginErrorCode | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  loading: false,
  error: null,
  errorCode: null,
  isAuthenticated: false,
};

const slice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginRequest(state, _action: PayloadAction<{ email: string; password: string }>) {
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
    },
    loginFailure(state, action: PayloadAction<{ message: string; code: LoginErrorCode }>) {
      state.loading = false;
      state.error = action.payload.message;
      state.errorCode = action.payload.code;
      state.isAuthenticated = false;
    },
    logout(state) {
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
      state.errorCode = null;
    },
    /**
     * Restore user from /me (used on app mount to rehydrate from cookie).
     */
    hydrateUser(state, action: PayloadAction<UserResponse | null>) {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
    },
  },
});

export const { loginRequest, loginSuccess, loginFailure, logout, hydrateUser } = slice.actions;

export default slice.reducer;
