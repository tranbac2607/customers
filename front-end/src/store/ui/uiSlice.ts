import { createSlice } from '@reduxjs/toolkit';

export type ThemeMode = 'light' | 'dark';

export interface UIState {
  // The app is locked to the light theme for the recruiter demo. The
  // state field is kept so any persisted redux state from before this
  // change still loads cleanly.
  themeMode: ThemeMode;
}

const initialState: UIState = {
  themeMode: 'light',
};

const slice = createSlice({
  name: 'ui',
  initialState,
  reducers: {},
});

export default slice.reducer;
