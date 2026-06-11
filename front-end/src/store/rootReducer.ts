import { combineReducers } from '@reduxjs/toolkit';

import counterReducer from '@/features/counter/counterSlice';
import authReducer from '@/features/auth/authSlice';

export const rootReducer = {
  counter: counterReducer,
  auth: authReducer,
} as const;

export type RootReducerState = ReturnType<typeof combineReducers<typeof rootReducer>>;
