import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

/**
 * App theme is light-only now (toggle UI removed). Kept the
 * slice + actions so the code shape stays stable for any future
 * theme re-introduction; in practice every setter becomes a no-op
 * for the user-facing switcher.
 */
export type ThemeMode = 'light';

export interface UIState {
  themeMode: ThemeMode;
  /**
   * Resolved theme after applying system preference. Kept for
   * code-shape compatibility; the active theme is always 'light'
   * now so this is constant.
   */
  resolvedTheme: ThemeMode;
}

const initialState: UIState = {
  themeMode: 'light',
  resolvedTheme: 'light',
};

const slice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setThemeMode(state, action: PayloadAction<ThemeMode>) {
      // No-op: light only.
      state.themeMode = action.payload;
    },
    setResolvedTheme(state, action: PayloadAction<ThemeMode>) {
      state.resolvedTheme = action.payload;
    },
  },
});

export const { setThemeMode, setResolvedTheme } = slice.actions;
export default slice.reducer;

/** Read the persisted theme mode at app boot. Always returns 'light'. */
export const loadInitialThemeMode = (): ThemeMode => 'light';