import { combineReducers } from '@reduxjs/toolkit';

import counterReducer from '@/features/counter/counterSlice';
import authReducer from '@/features/auth/authSlice';
import customersReducer from '@/features/customers/customersSlice';

export const rootReducer = {
  counter: counterReducer,
  auth: authReducer,
  customers: customersReducer,
} as const;

export type RootReducerState = ReturnType<typeof combineReducers<typeof rootReducer>>;
