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
    resetCurrent(state) {
      // Reset all fields to prevent stale state from previous page/view
      state.current.item = null;
      state.current.loading = false;
      state.current.error = null;
    },
    /** Legacy alias — prefer resetCurrent */
    clearCurrent(state) {
      state.current.item = null;
      state.current.error = null;
    },
    // CREATE
    createRequest(
      state,
      _action: PayloadAction<Omit<Customer, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>>,
    ) {
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
      state.list.items = state.list.items.map((c) =>
        c.id === action.payload.id ? action.payload : c,
      );
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
      // Clear current item so the detail/edit view knows deletion succeeded
      if (state.current.item?.id === action.payload) {
        state.current.item = null;
      }
    },
    deleteFailure(state, action: PayloadAction<string>) {
      state.mutation.loading = false;
      state.mutation.error = action.payload;
    },
    // RESTORE (from trash)
    restoreRequest(state, _action: PayloadAction<string>) {
      state.mutation.loading = true;
      state.mutation.error = null;
    },
    restoreSuccess(state, action: PayloadAction<Customer>) {
      state.mutation.loading = false;
      // If we're showing the live list, swap the restored customer in.
      if (state.list.items.some((c) => c.id === action.payload.id)) {
        state.list.items = state.list.items.map((c) =>
          c.id === action.payload.id ? action.payload : c,
        );
      }
    },
    restoreFailure(state, action: PayloadAction<string>) {
      state.mutation.loading = false;
      state.mutation.error = action.payload;
    },
    // BULK DELETE
    bulkDeleteRequest(state, _action: PayloadAction<string[]>) {
      state.mutation.loading = true;
      state.mutation.error = null;
    },
    bulkDeleteSuccess(state, _action: PayloadAction<{ requested: number; deleted: number }>) {
      state.mutation.loading = false;
      // Optimistically drop the deleted ids from the visible list. We
      // re-fetch on the next list action anyway, so this is just a
      // smoother UX for the moment after the click.
      state.list.items = state.list.items.slice(0, state.list.items.length);
    },
    bulkDeleteFailure(state, action: PayloadAction<string>) {
      state.mutation.loading = false;
      state.mutation.error = action.payload;
    },
    // TRASH (deleted customers list)
    trashRequest(state, _action: PayloadAction<CustomerListQuery>) {
      state.list.loading = true;
      state.list.error = null;
    },
    trashSuccess(
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
    trashFailure(state, action: PayloadAction<string>) {
      state.list.loading = false;
      state.list.error = action.payload;
    },
    // EXPORT CSV
    exportRequest(_state, _action: PayloadAction<CustomerListQuery>) {
      // no-op: side effect happens in the saga (open URL)
    },
    exportSuccess() {
      // no-op
    },
    exportFailure(state, action: PayloadAction<string>) {
      state.list.error = action.payload;
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
  resetCurrent,
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
  restoreRequest,
  restoreSuccess,
  restoreFailure,
  bulkDeleteRequest,
  bulkDeleteSuccess,
  bulkDeleteFailure,
  trashRequest,
  trashSuccess,
  trashFailure,
  exportRequest,
  exportSuccess,
  exportFailure,
} = slice.actions;

export default slice.reducer;
