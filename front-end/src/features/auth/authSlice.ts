import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { UserResponse } from './authTypes';

export interface AuthState {
  user: UserResponse | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  loading: false,
  error: null,
  isAuthenticated: false,
};

const slice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginRequest(state, _action: PayloadAction<{ email: string; password: string }>) {
      state.loading = true;
      state.error = null;
    },
    loginSuccess(state, action: PayloadAction<{ user: UserResponse }>) {
      state.loading = false;
      state.error = null;
      state.user = action.payload.user;
      state.isAuthenticated = true;
    },
    loginFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
      state.isAuthenticated = false;
    },
    logout(state) {
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
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
