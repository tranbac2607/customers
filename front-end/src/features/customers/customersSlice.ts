'use client';

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Customer, CustomerListQuery } from './customerTypes';

export interface CustomersState {
  list: {
    items: Customer[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext?: boolean;
      hasPrev?: boolean;
    };
    loading: boolean;
    error: string | null;
    lastQuery: CustomerListQuery;
  };
  current: {
    item: Customer | null;
    loading: boolean;
    error: string | null;
  };
  mutation: {
    loading: boolean;
    error: string | null;
    lastDeletedId: string | null;
  };
}

const initialState: CustomersState = {
  list: {
    items: [],
    pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    loading: false,
    error: null,
    lastQuery: { page: 1, limit: 10, sortBy: 'createdAt', order: 'desc' },
  },
  current: { item: null, loading: false, error: null },
  mutation: { loading: false, error: null, lastDeletedId: null },
};

const slice = createSlice({
  name: 'customers',
  initialState,
  reducers: {
    // LIST
    listRequest(state, _action: PayloadAction<CustomerListQuery>) {
      state.list.loading = true;
      state.list.error = null;
    },
    listSuccess(
      state,
      action: PayloadAction<{
        items: Customer[];
        pagination: CustomersState['list']['pagination'];
        query: CustomerListQuery;
      }>,
    ) {
      state.list.loading = false;
      state.list.items = action.payload.items;
      state.list.pagination = action.payload.pagination;
      state.list.lastQuery = action.payload.query;
      state.list.error = null;
    },
    listFailure(state, action: PayloadAction<string>) {
      state.list.loading = false;
      state.list.error = action.payload;
    },
    // GET ONE
    getRequest(state, _action: PayloadAction<string>) {
      state.current.loading = true;
      state.current.error = null;
    },
    getSuccess(state, action: PayloadAction<Customer>) {
      state.current.loading = false;
      state.current.item = action.payload;
      state.current.error = null;
    },
    getFailure(state, action: PayloadAction<string>) {
      state.current.loading = false;
      state.current.error = action.payload;
    },
    clearCurrent(state) {
      state.current.item = null;
      state.current.error = null;
    },
    // CREATE
    createRequest(state, _action: PayloadAction<Omit<Customer, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>>) {
      state.mutation.loading = true;
      state.mutation.error = null;
    },
    createSuccess(state, action: PayloadAction<Customer>) {
      state.mutation.loading = false;
      // Prepend to list if on page 1 with no search
      state.list.items = [action.payload, ...state.list.items];
      state.list.pagination.total += 1;
    },
    createFailure(state, action: PayloadAction<string>) {
      state.mutation.loading = false;
      state.mutation.error = action.payload;
    },
    // UPDATE
    updateRequest(state, _action: PayloadAction<{ id: string; data: Partial<Customer> }>) {
      state.mutation.loading = true;
      state.mutation.error = null;
    },
    updateSuccess(state, action: PayloadAction<Customer>) {
      state.mutation.loading = false;
      state.list.items = state.list.items.map((c) => (c.id === action.payload.id ? action.payload : c));
      if (state.current.item?.id === action.payload.id) {
        state.current.item = action.payload;
      }
    },
    updateFailure(state, action: PayloadAction<string>) {
      state.mutation.loading = false;
      state.mutation.error = action.payload;
    },
    // DELETE
    deleteRequest(state, _action: PayloadAction<string>) {
      state.mutation.loading = true;
      state.mutation.error = null;
    },
    deleteSuccess(state, action: PayloadAction<string>) {
      state.mutation.loading = false;
      state.list.items = state.list.items.filter((c) => c.id !== action.payload);
      state.list.pagination.total = Math.max(0, state.list.pagination.total - 1);
      state.mutation.lastDeletedId = action.payload;
    },
    deleteFailure(state, action: PayloadAction<string>) {
      state.mutation.loading = false;
      state.mutation.error = action.payload;
    },
  },
});

export const {
  listRequest,
  listSuccess,
  listFailure,
  getRequest,
  getSuccess,
  getFailure,
  clearCurrent,
  createRequest,
  createSuccess,
  createFailure,
  updateRequest,
  updateSuccess,
  updateFailure,
  deleteRequest,
  deleteSuccess,
  deleteFailure,
} = slice.actions;

export default slice.reducer;
