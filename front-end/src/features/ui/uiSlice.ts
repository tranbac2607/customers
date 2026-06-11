import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { ThemeMode } from '@/lib/theme';

export interface UIState {
  themeMode: ThemeMode;
  sidebarCollapsed: boolean;
}

const initialState: UIState = {
  themeMode: 'light',
  sidebarCollapsed: false,
};

const slice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setThemeMode(state, action: PayloadAction<ThemeMode>) {
      state.themeMode = action.payload;
    },
    toggleThemeMode(state) {
      state.themeMode = state.themeMode === 'light' ? 'dark' : 'light';
    },
    setSidebarCollapsed(state, action: PayloadAction<boolean>) {
      state.sidebarCollapsed = action.payload;
    },
    toggleSidebarCollapsed(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
  },
});

export const { setThemeMode, toggleThemeMode, setSidebarCollapsed, toggleSidebarCollapsed } =
  slice.actions;

export default slice.reducer;
