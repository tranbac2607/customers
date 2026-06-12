import { combineReducers } from '@reduxjs/toolkit';

import authReducer from '@/store/auth/authSlice';
import customersReducer from '@/store/customers/customersSlice';
import uiReducer from '@/store/ui/uiSlice';

export const rootReducer = {
  auth: authReducer,
  customers: customersReducer,
  ui: uiReducer,
} as const;

export type RootReducerState = ReturnType<typeof combineReducers<typeof rootReducer>>;
