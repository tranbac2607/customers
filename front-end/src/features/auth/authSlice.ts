import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { UserResponse, TokenPair } from './authTypes';

export interface AuthState {
  user: UserResponse | null;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  loading: false,
  error: null,
  isAuthenticated: false,
};

const slice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginRequest(
      state,
      _action: PayloadAction<{ email: string; password: string }>,
    ) {
      state.loading = true;
      state.error = null;
    },
    loginSuccess(state, action: PayloadAction<TokenPair & { user: UserResponse }>) {
      state.loading = false;
      state.error = null;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
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
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.error = null;
    },
    hydrateTokens(state, action: PayloadAction<{ accessToken: string; refreshToken: string | null; user: UserResponse | null }>) {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.user = action.payload.user;
      state.isAuthenticated = !!action.payload.accessToken;
    },
    refreshRequest(state) {
      state.loading = true;
    },
    refreshSuccess(state, action: PayloadAction<{ accessToken: string; refreshToken: string }>) {
      state.loading = false;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
    },
    refreshFailure(state) {
      state.loading = false;
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
    },
  },
});

export const {
  loginRequest,
  loginSuccess,
  loginFailure,
  logout,
  hydrateTokens,
  refreshRequest,
  refreshSuccess,
  refreshFailure,
} = slice.actions;

export default slice.reducer;
