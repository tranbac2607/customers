# Phase 05 — Frontend Customer List + Search

**Goal:** Build the customer list page with server-side pagination, search, sort, and a clean table view. Full Redux Saga + slice architecture for customer data fetching. No create/edit yet — that's phase 6.

---

## Working dir: `/Users/bac/Desktop/Dev/customers/front-end/`

---

## New / modified files

```
src/
├── features/customers/
│   ├── customersTypes.ts          # Customer, IdentityDocument, query shapes
│   ├── customersSlice.ts          # state + actions
│   ├── customersSaga.ts           # fetch, search debounce
│   ├── customersApi.ts            # axios calls
│   ├── customersSelectors.ts
│   ├── customersThunks.ts         # not used — we use saga patterns only
│   ├── hooks.ts                   # useCustomers, useCustomerFilters
│   └── components/
│       ├── CustomersTable.tsx
│       ├── CustomerFilters.tsx
│       ├── CustomerSearchBar.tsx
│       └── CustomerRowActions.tsx
│
├── components/
│   ├── common/
│   │   ├── DataTable.tsx          # generic table wrapper
│   │   ├── PaginationBar.tsx
│   │   ├── LoadingState.tsx
│   │   └── EmptyState.tsx
│   └── form/
│       └── (placeholder for phase 6)
│
├── app/(dashboard)/customers/
│   └── page.tsx                   # list page
│
├── schemas/
│   └── customer.ts                # zod schemas (shared with BE shape)
│
└── store/
    ├── rootReducer.ts             # add customers reducer
    └── rootSaga.ts                # fork customersSaga
```

---

## Dependencies

None new.

---

## Types

### `features/customers/customersTypes.ts`
```ts
export type Gender = 'male' | 'female' | 'other';
export type IdentityDocumentType = 'CCCD' | 'DRIVER_LICENSE' | 'PASSPORT';

export interface IdentityDocument {
  _id?: string;
  type: IdentityDocumentType;
  number: string;
  issueDate: string; // ISO
  issuePlace: string;
}

export interface Customer {
  id: string;
  fullName: string;
  dateOfBirth: string; // ISO
  address: string;
  phone: string;
  email: string;
  gender: Gender;
  nationality: string;
  occupation: string;
  identityDocuments: IdentityDocument[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface CustomerFilters {
  page: number;
  limit: number;
  search: string;
  sortBy: 'createdAt' | 'fullName' | 'dateOfBirth' | 'email';
  order: 'asc' | 'desc';
}
```

---

## API client

### `features/customers/customersApi.ts`
```ts
import { api } from '@/lib/axios';
import type { ApiSuccess, Paginated } from '@/types/api';
import type { Customer, CustomerFilters } from './customersTypes';

export const customersApi = {
  list: async (q: CustomerFilters): Promise<Paginated<Customer>> => {
    const { data } = await api.get<ApiSuccess<Paginated<Customer>>>('/customers', { params: q });
    return data.data;
  },
  // phase 6 adds: get, create, update, remove
};
```

---

## Slice

### `features/customers/customersSlice.ts`
```ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Customer, CustomerFilters } from './customersTypes';
import type { PageMeta } from '@/types/api';

export interface CustomersState {
  items: Customer[];
  pagination: PageMeta;
  filters: CustomerFilters;
  loading: boolean;
  error: string | null;
  lastFetchedAt: number | null;
}

const initialFilters: CustomerFilters = { page: 1, limit: 10, search: '', sortBy: 'createdAt', order: 'desc' };
const initialPagination: PageMeta = { page: 1, limit: 10, total: 0, totalPages: 0 };

const initialState: CustomersState = {
  items: [], pagination: initialPagination, filters: initialFilters,
  loading: false, error: null, lastFetchedAt: null,
};

const slice = createSlice({
  name: 'customers',
  initialState,
  reducers: {
    setFilters(state, a: PayloadAction<Partial<CustomerFilters>>) {
      state.filters = { ...state.filters, ...a.payload, page: a.payload.page ?? (a.payload.search !== undefined ? 1 : state.filters.page) };
    },
    setPage(state, a: PayloadAction<number>) { state.filters.page = a.payload; },
    resetFilters(state) { state.filters = initialFilters; },
    fetchRequest(state) { state.loading = true; state.error = null; },
    fetchSuccess(state, a: PayloadAction<{ items: Customer[]; pagination: PageMeta }>) {
      state.loading = false;
      state.items = a.payload.items;
      state.pagination = a.payload.pagination;
      state.lastFetchedAt = Date.now();
    },
    fetchFailure(state, a: PayloadAction<string>) {
      state.loading = false; state.error = a.payload;
    },
    clearError(state) { state.error = null; },
  },
});

export const customersActions = slice.actions;
export default slice.reducer;
```

---

## Saga

### `features/customers/customersSaga.ts`
```ts
import { call, put, takeLatest, takeLeading, debounce, select, delay } from 'redux-saga/effects';
import { customersActions } from './customersSlice';
import { customersApi } from './customersApi';
import type { CustomerFilters } from './customersTypes';
import type { RootState } from '@/store';

function* fetchCustomers() {
  try {
    const filters: CustomerFilters = yield select((s: RootState) => s.customers.filters);
    const res = yield call(customersApi.list, filters);
    yield put(customersActions.fetchSuccess({ items: res.items, pagination: res.pagination }));
  } catch (e: any) {
    const msg = e?.response?.data?.error?.message ?? 'Failed to load customers';
    yield put(customersActions.fetchFailure(msg));
  }
}

function* onFiltersChanged(action: ReturnType<typeof customersActions.setFilters>) {
  // Trigger refetch unless this action is from the saga itself (it isn't — saga dispatches fetchSuccess only)
  yield put(customersActions.fetchRequest());
  yield call(fetchCustomers);
}

function* onPageChanged(action: ReturnType<typeof customersActions.setPage>) {
  yield put(customersActions.fetchRequest());
  yield call(fetchCustomers);
}

// Debounce search-as-you-type
function* onSearchChanged(action: ReturnType<typeof customersActions.setFilters>) {
  if (action.payload.search === undefined) return;
  yield delay(300);
  yield put(customersActions.fetchRequest());
  yield call(fetchCustomers);
}

export function* customersSaga() {
  yield takeLatest(customersActions.fetchRequest.type, fetchCustomers);
  yield debounce(300, customersActions.setFilters.type, onSearchChanged);
  yield takeLatest(customersActions.setFilters.type, onFiltersChanged);
  yield takeLatest(customersActions.setPage.type, onPageChanged);
}
```

> Note: `setFilters` and `onSearchChanged` both fire — the debounce is for the *typing* experience. The non-search filter changes (sort, etc.) go through `onFiltersChanged` immediately. To avoid double fetch, we can split actions: `searchChange` (debounced) and `filterChange` (immediate). The plan above is acceptable for the demo; final implementation may use distinct action types.

---

## Hooks

### `features/customers/hooks.ts`
```ts
import { useEffect, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { customersActions } from './customersSlice';
import type { RootState } from '@/store';

export const useCustomers = () => {
  const dispatch = useAppDispatch();
  const state = useAppSelector((s: RootState) => s.customers);
  useEffect(() => { dispatch(customersActions.fetchRequest()); }, [dispatch]);
  return state;
};

export const useCustomerFilters = () => {
  const dispatch = useAppDispatch();
  const filters = useAppSelector((s: RootState) => s.customers.filters);
  return useMemo(() => ({
    filters,
    setSearch: (search: string) => dispatch(customersActions.setFilters({ search })),
    setSort: (sortBy: CustomerFilters['sortBy'], order: CustomerFilters['order']) =>
      dispatch(customersActions.setFilters({ sortBy, order })),
    setPage: (page: number) => dispatch(customersActions.setPage(page)),
    reset: () => dispatch(customersActions.resetFilters()),
  }), [filters, dispatch]);
};
```

---

## Components

### `components/common/DataTable.tsx`
- Generic typed wrapper around Antd `Table` with:
  - `loading` prop wired to slice.
  - `pagination` set to false (we use our own `PaginationBar` for full control).
  - `rowKey` derived from data id.
  - Empty + error rendering.

### `components/common/PaginationBar.tsx`
- Renders Antd `Pagination` with current/total/pageSize/onChange/onShowSizeChange.
- Hidden when `total === 0`.

### `components/common/LoadingState.tsx`
- Centered `Spin` with optional tip.

### `components/common/EmptyState.tsx`
- Antd `Empty` with optional action button.

### `features/customers/components/CustomerSearchBar.tsx`
- Antd `Input.Search` with debounced onChange → `setSearch`.
- Right side: `Select` for sort column + `Select` for order.

### `features/customers/components/CustomerFilters.tsx`
- Combines `CustomerSearchBar` + (future: date range, gender multi-select).
- For phase 5: just search + sort.

### `features/customers/components/CustomersTable.tsx`
- Columns:
  - `fullName` (sortable, with avatar circle showing initials)
  - `email` (clickable mailto)
  - `phone` (clickable tel)
  - `gender` (Antd `Tag` color-coded)
  - `nationality`
  - `identityDocuments.length` (badge: "2 docs")
  - `createdAt` (formatted via `dayjs().format('MMM D, YYYY')`)
  - Actions: `Button.Group` with "View" / "Edit" (disabled or with toast in phase 5, real in phase 6)
- Row hover highlight; row click → `/customers/${id}`.
- Empty + loading states.

### `features/customers/components/CustomerRowActions.tsx`
- `Button` "View" → `router.push(\`/customers/${id}\`)`
- `Button` "Edit" → `router.push(\`/customers/${id}/edit\`)`
- Phase 5: rendered but the destination page is a "Coming soon" stub.

---

## Page

### `app/(dashboard)/customers/page.tsx`
- `'use client'`.
- Calls `useCustomers()` (triggers initial fetch via useEffect).
- Layout:
  - `<PageHeader title="Customers" subtitle="Manage customer records and identity documents" action={ <Button type="primary" icon={<PlusOutlined />}>New Customer</Button> } />`
  - `<CustomerFilters />`
  - `<CustomersTable />` (wraps `DataTable`)
  - `<PaginationBar />`
- Loading: `Skeleton` rows in table.
- Error: alert banner with retry button.
- Empty: `<EmptyState />` with "Create your first customer" CTA → `/customers/new` (stub in phase 5).

---

## Wire to store

### `store/rootReducer.ts`
```ts
import counterReducer from '@/features/counter/counterSlice';
import authReducer from '@/features/auth/authSlice';
import customersReducer from '@/features/customers/customersSlice';
export const rootReducer = { counter: counterReducer, auth: authReducer, customers: customersReducer };
```

### `store/rootSaga.ts`
```ts
import { all, fork } from 'redux-saga/effects';
import { counterSaga } from '@/features/counter/counterSaga';
import { authSaga } from '@/features/auth/authSaga';
import { customersSaga } from '@/features/customers/customersSaga';
export function* rootSaga() { yield all([fork(counterSaga), fork(authSaga), fork(customersSaga)]); }
```

---

## Validation

- [ ] `/customers` loads with the seeded data.
- [ ] Pagination: page 2, page 3, change page size 10/20/50 all work.
- [ ] Search debounces (300ms) and filters server-side.
- [ ] Sort by `fullName` ascending/descending works (server-side).
- [ ] Empty state renders when no data.
- [ ] Loading state renders during fetch.
- [ ] Error state renders when API is down (test by stopping backend) with retry.
- [ ] No flicker when navigating away and back (data is in Redux, no re-fetch if recent).
- [ ] `npm run typecheck` & `npm run lint` pass; `npm run build` succeeds.

---

## Notes

- The list is **server-paginated** — Redux only holds the current page. For a demo with < 100 customers this is fine; for scale, consider normalizing into `createEntityAdapter`.
- We expose dayjs via `lib/dayjs.ts` with custom formats and `relativeTime` plugin, imported in components needing it.
- Antd `Table` already provides column sorting UI, but we explicitly sort server-side for consistency with backend — disable Antd's local sort by leaving `sorter` undefined and using our own `Select` controls in the toolbar.
- Clicking a row navigates to detail; clicking action buttons uses `e.stopPropagation()` to prevent double navigation.
