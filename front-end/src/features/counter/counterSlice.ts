import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface CounterState {
  value: number;
  loading: boolean;
  error: string | null;
}

const initialState: CounterState = { value: 0, loading: false, error: null };

const slice = createSlice({
  name: 'counter',
  initialState,
  reducers: {
    increment(state) {
      state.value += 1;
    },
    decrement(state) {
      state.value -= 1;
    },
    reset(state) {
      state.value = 0;
    },
    fetchRequest(state) {
      state.loading = true;
      state.error = null;
    },
    fetchSuccess(state, action: PayloadAction<number>) {
      state.loading = false;
      state.value = action.payload;
    },
    fetchFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

export const { increment, decrement, reset, fetchRequest, fetchSuccess, fetchFailure } =
  slice.actions;

export default slice.reducer;
