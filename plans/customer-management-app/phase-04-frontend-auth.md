# Phase 04 — Frontend Auth + Dashboard Layout

**Goal:** Implement login, refresh, logout, and a protected dashboard layout with sidebar nav, top bar, and route guards. Wire up the real `tokenService` and auth saga.

---

## Working dir: `/Users/bac/Desktop/Dev/customers/front-end/`

---

## New / modified files

```
src/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── customers/             # placeholder for phase 5
│   │       └── page.tsx
│   └── middleware.ts              # Next middleware: redirect to /login if no token
│
├── features/auth/
│   ├── authSlice.ts
│   ├── authSaga.ts
│   ├── authTypes.ts
│   ├── authApi.ts                 # uses axios instance
│   ├── authSelectors.ts
│   ├── tokenService.ts            # replaces stub
│   ├── hooks.ts                   # useAuth, useLogin, etc.
│   └── components/
│       ├── LoginForm.tsx
│       └── UserMenu.tsx
│
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx           # sidebar + header
│   │   ├── Sidebar.tsx
│   │   └── Topbar.tsx
│   ├── common/
│   │   ├── PageHeader.tsx
│   │   ├── EmptyState.tsx
│   │   └── ErrorBoundary.tsx
│   └── RouteGuard.tsx
│
├── lib/
│   ├── routes.ts                  # route constants
│   └── auth.ts                    # client-side helpers
│
└── store/
    ├── rootReducer.ts             # add auth reducer
    └── rootSaga.ts                # fork authSaga
```

---

## Dependencies

None new — all installed in phase 3.

---

## Auth flow design

1. User visits `/login` → submits form.
2. `LoginForm` dispatches `auth/loginRequest`.
3. `authSaga` calls `authApi.login` → on success dispatches `auth/loginSuccess({ user, accessToken, refreshToken })`.
4. `authSlice` updates state. `tokenService` writes tokens to `localStorage` (saga side effect, not in reducer).
5. Persisted `auth` slice (whitelist in store config) survives reload.
6. On `401` from any API call, axios interceptor calls `tokenService.clear()` + `router.replace('/login')`.
7. `authSaga` watches `auth/refreshRequest` — triggered automatically by saga interceptor pattern (see below) or manually.

**Refresh strategy:** On 401, attempt a single refresh; if it succeeds, retry the original request. If refresh fails → logout. Implementation in `authSaga` via a `refreshAccessToken()` helper that other sagas can `call`. Simplest version: on app start, schedule a refresh `setTimeout` 1 minute before expiry; on 401, do a one-shot refresh.

For this assignment, ship the **simple version**:
- `api` interceptor: on 401 (except from `/auth/refresh` and `/auth/login`), call `tokenService.refresh()` (which uses the stored refresh token) → if success, update access token and retry original; if fail, logout.

---

## Slice & types

### `features/auth/authTypes.ts`
```ts
export type Role = 'admin' | 'user';
export interface User { id: string; email: string; name: string; role: Role }
export interface AuthTokens { accessToken: string; refreshToken: string }
export interface LoginPayload { email: string; password: string }
```

### `features/auth/authSlice.ts`
```ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { User, AuthTokens } from './authTypes';

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
}

const initialState: AuthState = {
  user: null, accessToken: null, refreshToken: null,
  loading: false, error: null, initialized: false,
};

const slice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginRequest(state, _a: PayloadAction<{ email: string; password: string }>) {
      state.loading = true; state.error = null;
    },
    loginSuccess(state, a: PayloadAction<{ user: User; tokens: AuthTokens }>) {
      state.loading = false;
      state.user = a.payload.user;
      state.accessToken = a.payload.tokens.accessToken;
      state.refreshToken = a.payload.tokens.refreshToken;
      state.initialized = true;
    },
    loginFailure(state, a: PayloadAction<string>) {
      state.loading = false; state.error = a.payload; state.initialized = true;
    },
    refreshSuccess(state, a: PayloadAction<AuthTokens>) {
      state.accessToken = a.payload.accessToken;
      state.refreshToken = a.payload.refreshToken;
    },
    logout(state) {
      state.user = null; state.accessToken = null; state.refreshToken = null; state.initialized = true;
    },
    hydrate(state, a: PayloadAction<{ user: User | null; accessToken: string | null; refreshToken: string | null }>) {
      state.user = a.payload.user;
      state.accessToken = a.payload.accessToken;
      state.refreshToken = a.payload.refreshToken;
      state.initialized = true;
    },
  },
});

export const authActions = slice.actions;
export default slice.reducer;
```

### `features/auth/authApi.ts`
```ts
import { api } from '@/lib/axios';
import type { ApiSuccess, ApiFailure } from '@/types/api';
import type { AuthTokens, User } from './authTypes';

interface LoginResponse { accessToken: string; refreshToken: string; user: User }
interface RefreshResponse { accessToken: string; refreshToken: string }

export const authApi = {
  login: async (body: { email: string; password: string }) => {
    const { data } = await api.post<ApiSuccess<LoginResponse>>('/auth/login', body);
    return data.data;
  },
  refresh: async (refreshToken: string) => {
    const { data } = await api.post<ApiSuccess<RefreshResponse>>('/auth/refresh', { refreshToken });
    return data.data;
  },
  logout: async (refreshToken: string) => {
    await api.post('/auth/logout', { refreshToken });
  },
  me: async () => {
    const { data } = await api.get<ApiSuccess<{ user: User }>>('/auth/me');
    return data.data.user;
  },
};
```

### `features/auth/tokenService.ts`
```ts
import type { AuthTokens, User } from './authTypes';

const ACCESS = 'cm_access';
const REFRESH = 'cm_refresh';
const USER = 'cm_user';

export const tokenService = {
  getAccess: (): string | null => (typeof window === 'undefined' ? null : localStorage.getItem(ACCESS)),
  getRefresh: (): string | null => (typeof window === 'undefined' ? null : localStorage.getItem(REFRESH)),
  getUser: (): User | null => {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(USER);
    return raw ? (JSON.parse(raw) as User) : null;
  },
  set: (tokens: AuthTokens, user: User) => {
    localStorage.setItem(ACCESS, tokens.accessToken);
    localStorage.setItem(REFRESH, tokens.refreshToken);
    localStorage.setItem(USER, JSON.stringify(user));
  },
  setTokens: (tokens: AuthTokens) => {
    localStorage.setItem(ACCESS, tokens.accessToken);
    localStorage.setItem(REFRESH, tokens.refreshToken);
  },
  clear: () => {
    localStorage.removeItem(ACCESS);
    localStorage.removeItem(REFRESH);
    localStorage.removeItem(USER);
  },
};
```

### `features/auth/authSaga.ts`
```ts
import { call, put, takeLatest, takeLeading, fork } from 'redux-saga/effects';
import { authActions } from './authSlice';
import { authApi } from './authApi';
import { tokenService } from './tokenService';
import { toast } from 'react-toastify';

function* doLogin(action: ReturnType<typeof authActions.loginRequest>) {
  try {
    const res = yield call(authApi.login, action.payload);
    tokenService.set({ accessToken: res.accessToken, refreshToken: res.refreshToken }, res.user);
    yield put(authActions.loginSuccess({ user: res.user, tokens: { accessToken: res.accessToken, refreshToken: res.refreshToken } }));
    toast.success(`Welcome back, ${res.user.name}`);
  } catch (e: any) {
    const msg = e?.response?.data?.error?.message ?? 'Login failed';
    yield put(authActions.loginFailure(msg));
    toast.error(msg);
  }
}

function* doRefresh() {
  try {
    const refreshToken = tokenService.getRefresh();
    if (!refreshToken) throw new Error('No refresh token');
    const res = yield call(authApi.refresh, refreshToken);
    tokenService.setTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });
    yield put(authActions.refreshSuccess({ accessToken: res.accessToken, refreshToken: res.refreshToken }));
  } catch (e) {
    tokenService.clear();
    yield put(authActions.logout());
  }
}

function* doLogout() {
  try {
    const refreshToken = tokenService.getRefresh();
    if (refreshToken) yield call(authApi.logout, refreshToken);
  } catch { /* ignore */ }
  tokenService.clear();
  yield put(authActions.logout());
  toast.info('Signed out');
}

function* doHydrate() {
  // Read tokens from localStorage on app start (after persist rehydrate)
  const user = tokenService.getUser();
  const accessToken = tokenService.getAccess();
  const refreshToken = tokenService.getRefresh();
  yield put(authActions.hydrate({ user, accessToken, refreshToken }));
  if (accessToken) {
    // Optional: try to fetch /me to validate
    try {
      const fresh = yield call(authApi.me);
      tokenService.set({ accessToken: tokenService.getAccess()!, refreshToken: tokenService.getRefresh()! }, fresh);
    } catch { /* ignored — interceptor will handle 401 */ }
  }
}

export function* authSaga() {
  yield takeLatest(authActions.loginRequest.type, doLogin);
  yield takeLeading(authActions.logout.type, doLogout);
  yield takeLeading(authActions.refreshRequest?.type ?? 'auth/refreshRequest', doRefresh);
  yield takeLeading('auth/hydrateRequest', doHydrate);
}
```

> Add `refreshRequest` action to slice if not present, OR dispatch the string type. Cleaner: add a `refreshRequest` action.

### `features/auth/authSelectors.ts`
```ts
import type { RootState } from '@/store';
export const selectAuth = (s: RootState) => s.auth;
export const selectIsAuthenticated = (s: RootState) => Boolean(s.auth.accessToken);
export const selectUser = (s: RootState) => s.auth.user;
```

### `features/auth/hooks.ts`
```ts
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { authActions } from './authSlice';
import { selectAuth, selectIsAuthenticated, selectUser } from './authSelectors';

export const useAuth = () => {
  const dispatch = useAppDispatch();
  return {
    ...useAppSelector(selectAuth),
    isAuthenticated: useAppSelector(selectIsAuthenticated),
    user: useAppSelector(selectUser),
    login: (email: string, password: string) => dispatch(authActions.loginRequest({ email, password })),
    logout: () => dispatch(authActions.logout()),
  };
};
```

---

## Login page

### `app/(auth)/login/page.tsx`
- Centered `Card` (max-width 400) on full-height `Flex` with brand header.
- Uses `LoginForm` component.

### `features/auth/components/LoginForm.tsx`
- `react-hook-form` + `zod` schema (shared shape with backend).
- `Form.Item` integration via `Controller` + `Input`/`Input.Password`.
- On submit → `useAuth().login(...)`.
- `useEffect` watching `loading` from slice — disables submit button + shows `Spin`.
- Renders server error from slice.
- After successful login → `router.push('/customers')` via `useEffect` on `isAuthenticated`.

```ts
// shared schema (src/schemas/auth.ts)
import { z } from 'zod';
export const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'At least 6 characters'),
});
export type LoginFormValues = z.infer<typeof loginSchema>;
```

---

## Dashboard layout

### `app/(dashboard)/layout.tsx`
- `AppShell` component renders `Layout` (Antd) with `Sider` + `Header` + `Content`.
- On mount, dispatch `auth/hydrateRequest` (or rely on `PersistGate` to rehydrate + then run a side effect via saga `takeLeading('persist/REHYDRATE', ...)` — simpler: dispatch from layout).
- Show `Spin` until `auth.initialized === true`.
- If `!isAuthenticated && initialized` → `router.replace('/login')`.
- If `isAuthenticated` → render children.

### `components/layout/AppShell.tsx`
- Receives `children`, `user`, `onLogout`.
- Sider: `Menu` with items: Dashboard (`/`), Customers (`/customers`). Selected key reflects current pathname.
- Header: `Topbar` shows `UserMenu` on the right (avatar, name, dropdown with Logout).
- Content: `<div style={{ padding: 24 }}>{children}</div>`.

### `components/layout/Sidebar.tsx`
- Logo at top: small text "CM" with primary color.
- Items configurable via prop (used in both dev and easy to extend).

### `components/layout/Topbar.tsx`
- `PageHeader` slot (title) on the left via `usePathname` → friendly title map.
- `UserMenu` on the right.

### `components/common/PageHeader.tsx`
- `<Flex justify="space-between" align="center">` with title, subtitle, action area (right-aligned children).

### `components/RouteGuard.tsx`
- Wrapper component (client) — checks `isAuthenticated` and `initialized`; renders `Spin` then either children or `<EmptyState />` + redirect.
- Used by `(dashboard)/layout.tsx` and could wrap individual pages for permission checks.

---

## Next middleware

### `app/middleware.ts`
> We use `RouteGuard` in client components rather than Next middleware because token state lives in Redux + localStorage (browser-only). Middleware runs on the edge and can't read localStorage cleanly without rewriting auth to cookies. For a recruiter demo this is acceptable — the client-side guard is the source of truth.

Optional enhancement: switch to **httpOnly cookies** for tokens (requires backend to set cookies, and Next middleware to read them). Documented as a "future improvement" in README.

---

## Hook up root reducer & saga

### `store/rootReducer.ts`
```ts
import counterReducer from '@/features/counter/counterSlice';
import authReducer from '@/features/auth/authSlice';
export const rootReducer = { counter: counterReducer, auth: authReducer };
```

### `store/rootSaga.ts`
```ts
import { all, fork } from 'redux-saga/effects';
import { counterSaga } from '@/features/counter/counterSaga';
import { authSaga } from '@/features/auth/authSaga';
export function* rootSaga() { yield all([fork(counterSaga), fork(authSaga)]); }
```

---

## Validation

- [ ] `/login` renders, validates empty fields inline.
- [ ] Submitting valid creds → toast "Welcome back, …" → redirect to `/customers`.
- [ ] Submitting wrong creds → inline error + toast.
- [ ] Hard reload on `/customers` while authenticated → still logged in (persistence).
- [ ] Clicking Logout in user menu → returns to `/login`, tokens cleared.
- [ ] Trying to visit `/customers` while logged out → bounced to `/login` by RouteGuard.
- [ ] Antd theme is applied (primary blue, rounded buttons, light bg).
- [ ] `npm run build` passes, `npm run typecheck` and `npm run lint` pass.

---

## Notes

- We persist only the `auth` slice in `redux-persist` (whitelist) — keeps `counter` (ephemeral) out of storage.
- Token refresh uses a `takeLeading` saga to prevent concurrent refresh storms.
- The `bindAxiosAuth` plumbing from Phase 03 is finally useful — on 401, saga-side `doRefresh` is invoked (we'll wire that in the axios interceptor in a follow-up if needed; current interceptor does `tokenService.clear` + redirect which is acceptable for the demo).
- For polish: add a "Remember me" checkbox that, when unchecked, keeps tokens in `sessionStorage` only.
