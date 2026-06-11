# Phase 03 — Frontend Setup + Theme

**Goal:** Bootstrap a Next.js 14 App Router project with TypeScript, configure Antd 5 with a custom light professional theme, install Redux Toolkit + Saga + Persist, and wire up the providers tree. No business screens yet — just a styled landing page proving the stack works.

---

## Working dir: `/Users/bac/Desktop/Dev/customers/front-end/`

---

## Steps

### 1. Scaffold (manual, not `create-next-app` to keep control)

Create files directly. Use Next 14.2.x (stable App Router).

**Files to create:**
```
front-end/
├── .env.example
├── .env.local                     # gitignored
├── .eslintrc.json
├── .prettierrc.json
├── next.config.mjs
├── next-env.d.ts
├── package.json
├── tsconfig.json
├── postcss.config.mjs             # for antd v5 reset
├── README.md
├── public/
│   ├── favicon.ico
│   └── logo.svg                   # simple svg, optional
└── src/
    ├── app/
    │   ├── layout.tsx             # root layout
    │   ├── page.tsx               # landing (redirect or hero)
    │   ├── providers.tsx          # 'use client' — antd + redux + persist
    │   └── globals.css
    ├── lib/
    │   ├── theme.ts               # antd theme tokens
    │   ├── axios.ts               # axios instance with interceptors
    │   ├── env.ts                 # public env validation
    │   └── constants.ts
    ├── store/
    │   ├── index.ts               # configureStore + persistor
    │   ├── rootReducer.ts
    │   ├── rootSaga.ts
    │   └── hooks.ts               # typed useAppDispatch/useAppSelector
    ├── features/
    │   └── counter/               # sanity check feature
    │       ├── counterSlice.ts
    │       ├── counterSaga.ts
    │       ├── counterSelectors.ts
    │       └── CounterExample.tsx
    ├── types/
    │   └── api.ts                 # base response types
    ├── schemas/                   # placeholder for zod
    │   └── .gitkeep
    └── middleware.ts              # redux-persist nextjs-safe wrapper (if needed)
```

---

## Dependencies

```bash
npm init -y
```

### Runtime
```bash
npm i next@14.2 react@18 react-dom@18 \
      antd @ant-design/icons @ant-design/nextjs-registry \
      @reduxjs/toolkit react-redux redux-saga redux-persist \
      axios dayjs lodash react-toastify \
      react-hook-form @hookform/resolvers zod
```

### Dev
```bash
npm i -D typescript @types/react @types/react-dom @types/node \
        @types/lodash \
        eslint eslint-config-next @typescript-eslint/parser @typescript-eslint/eslint-plugin \
        eslint-config-prettier prettier
```

---

## Key configs

### `package.json` (excerpt)
```json
{
  "name": "front-end",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start -p 3000",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "format": "prettier --write \"src/**/*.{ts,tsx,json,md}\""
  }
}
```

### `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "es2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "baseUrl": "src",
    "paths": {
      "@/*": ["*"]
    }
  },
  "include": ["next-env.d.ts", "src/**/*", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### `next.config.mjs`
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: { optimizePackageImports: ['antd', '@ant-design/icons', 'lodash'] },
  transpilePackages: ['antd', '@ant-design/icons', 'rc-util', 'rc-pagination', 'rc-picker'],
};
export default nextConfig;
```

### `postcss.config.mjs`
> Antd 5 ships its CSS-in-JS — no PostCSS config strictly required, but include if we ever add Tailwind later. Empty for now:
```js
export default { plugins: {} };
```

### `.env.example`
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api
NEXT_PUBLIC_APP_NAME=Customer Management
```

### `src/lib/env.ts`
```ts
import { z } from 'zod';
const schema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.string().url(),
  NEXT_PUBLIC_APP_NAME: z.string().default('Customer Management'),
});
export const env = schema.parse({
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
});
```

### `src/lib/theme.ts` (Antd 5 — light, clean, professional)
```ts
import type { ThemeConfig } from 'antd';
import { theme } from 'antd';

export const antdTheme: ThemeConfig = {
  algorithm: theme.defaultAlgorithm,
  cssVar: true,
  token: {
    colorPrimary: '#1677ff',         // Antd blue
    colorInfo: '#1677ff',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    colorBgLayout: '#f5f7fa',
    colorTextBase: '#1f2937',
    borderRadius: 8,
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: 14,
    wireframe: false,
  },
  components: {
    Layout: {
      headerBg: '#ffffff',
      headerHeight: 64,
      headerPadding: '0 24px',
      siderBg: '#001529',
      bodyBg: '#f5f7fa',
    },
    Menu: {
      darkItemBg: '#001529',
      darkItemSelectedBg: '#1677ff',
    },
    Table: {
      headerBg: '#fafafa',
      headerColor: '#374151',
      borderColor: '#f0f0f0',
    },
    Card: { borderRadiusLG: 12 },
    Button: { borderRadius: 8, controlHeight: 36 },
  },
};
```

### `src/store/index.ts`
```ts
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { rootSaga } from './rootSaga';
import { rootReducer as initialRootReducer } from './rootReducer';

const rootReducer = combineReducers(initialRootReducer);

const persistConfig = {
  key: 'root',
  version: 1,
  storage,
  whitelist: ['auth'], // only persist auth slice
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

const sagaMiddleware = createSagaMiddleware();

export const makeStore = () => {
  const store = configureStore({
    reducer: persistedReducer,
    middleware: (gDM) =>
      gDM({
        serializableCheck: { ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER] },
      }).concat(sagaMiddleware),
    devTools: process.env.NODE_ENV !== 'production',
  });
  sagaMiddleware.run(rootSaga);
  return store;
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = AppStore['dispatch'];
```

### `src/store/rootReducer.ts`
```ts
import counterReducer from '@/features/counter/counterSlice';
import authReducer from '@/features/auth/authSlice'; // added in phase 4
export const rootReducer = {
  counter: counterReducer,
  // auth: authReducer,
};
```

### `src/store/rootSaga.ts`
```ts
import { all, fork } from 'redux-saga/effects';
import { counterSaga } from '@/features/counter/counterSaga';
export function* rootSaga() { yield all([fork(counterSaga)]); }
```

### `src/store/hooks.ts`
```ts
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from './index';
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

### `src/lib/axios.ts`
```ts
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { env } from './env';
import { store } from '@/store'; // we'll add a getter for store in providers
import { toast } from 'react-toastify';
import { tokenService } from '@/features/auth/tokenService';

export const api = axios.create({ baseURL: env.NEXT_PUBLIC_API_BASE_URL, timeout: 15000 });

// Lazy store reference (set once from providers) to avoid circular import
let getAccessToken: () => string | null = () => null;
let onUnauthorized: () => void = () => {};
export const bindAxiosAuth = (tokenGetter: () => string | null, unauthorized: () => void) => {
  getAccessToken = tokenGetter;
  onUnauthorized = unauthorized;
};

api.interceptors.request.use((cfg: InternalAxiosRequestConfig) => {
  const t = getAccessToken();
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  (err: AxiosError<ApiFailure>) => {
    const status = err.response?.status;
    const msg = err.response?.data?.error?.message ?? err.message ?? 'Request failed';
    if (status === 401) {
      onUnauthorized();
    } else if (status && status >= 500) {
      toast.error('Server error. Please try again.');
    } else if (msg) {
      // 4xx (except 401) — show as warning so user can act
      toast.warning(msg);
    }
    return Promise.reject(err);
  },
);

interface ApiFailure { error: { code: string; message: string; details?: unknown } }
```

### `src/types/api.ts`
```ts
export interface ApiSuccess<T> { success: true; data: T; meta?: Record<string, unknown> }
export interface ApiFailure { success: false; error: { code: string; message: string; details?: unknown } }
export interface PageMeta { page: number; limit: number; total: number; totalPages: number }
export interface Paginated<T> { items: T[]; pagination: PageMeta }
```

### `src/app/providers.tsx`
```tsx
'use client';
import { ReactNode, useRef, useEffect } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { ConfigProvider, App as AntdApp } from 'antd';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { makeStore, persistor } from '@/store';
import { antdTheme } from '@/lib/theme';
import { bindAxiosAuth } from '@/lib/axios';
import { tokenService } from '@/features/auth/tokenService';
import { useRouter } from 'next/navigation';

export function Providers({ children }: { children: ReactNode }) {
  const storeRef = useRef<ReturnType<typeof makeStore> | null>(null);
  if (!storeRef.current) storeRef.current = makeStore();
  const router = useRouter();

  useEffect(() => {
    bindAxiosAuth(
      () => tokenService.getAccess(),
      () => {
        tokenService.clear();
        router.replace('/login');
      },
    );
  }, [router]);

  return (
    <Provider store={storeRef.current}>
      <PersistGate loading={null} persistor={persistor(storeRef.current)}>
        <AntdRegistry>
          <ConfigProvider theme={antdTheme}>
            <AntdApp>
              {children}
              <ToastContainer position="top-right" autoClose={3000} theme="light" />
            </AntdApp>
          </ConfigProvider>
        </AntdRegistry>
      </PersistGate>
    </Provider>
  );
}
```

> `persistor` is a getter function in our store to avoid SSR-time `localStorage` access — see note below.

### `src/app/layout.tsx`
```tsx
import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Customer Management',
  description: 'Manage your customers professionally.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
```

### `src/app/globals.css`
```css
:root { color-scheme: light; }
html, body { padding: 0; margin: 0; }
body { font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
* { box-sizing: border-box; }
```

### `src/app/page.tsx`
- Simple hero with a "Get started" button → `/login` (we'll create the route in phase 4).
- For now, an Antd `Card` with title + `Typography.Title` showing the app loads and theme applies.

### `src/features/counter/counterSlice.ts` (sanity)
```ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
interface State { value: number; loading: boolean; error: string | null }
const initial: State = { value: 0, loading: false, error: null };
const slice = createSlice({
  name: 'counter',
  initialState: initial,
  reducers: {
    increment(state) { state.value += 1 },
    decrement(state) { state.value -= 1 },
    fetchRequest(state) { state.loading = true; state.error = null },
    fetchSuccess(state, a: PayloadAction<number>) { state.loading = false; state.value = a.payload },
    fetchFailure(state, a: PayloadAction<string>) { state.loading = false; state.error = a.payload },
  },
});
export const { increment, decrement, fetchRequest, fetchSuccess, fetchFailure } = slice.actions;
export default slice.reducer;
```

### `src/features/counter/counterSaga.ts`
```ts
import { takeLatest, put, delay } from 'redux-saga/effects';
import { fetchRequest, fetchSuccess, fetchFailure } from './counterSlice';
function* handleFetch() {
  try { yield delay(800); yield put(fetchSuccess(Math.floor(Math.random() * 100))); }
  catch (e) { yield put(fetchFailure((e as Error).message)); }
}
export function* counterSaga() { yield takeLatest(fetchRequest.type, handleFetch); }
```

### `src/features/counter/CounterExample.tsx`
- A Card with `Button`s increment/decrement and a "fetch async" button. Demonstrates saga flow.
- Mounted on the landing page for now.

### `tokenService.ts` (placeholder for phase 4)
```ts
// Will be filled in phase 4 — included here so axios wiring compiles.
export const tokenService = {
  getAccess: () => null as string | null,
  clear: () => {},
};
```

> We'll replace this with a real implementation in Phase 04. To keep this phase compilable, we ship a stub.

### `.eslintrc.json`
```json
{
  "extends": ["next/core-web-vitals", "prettier"],
  "plugins": ["@typescript-eslint"],
  "parser": "@typescript-eslint/parser",
  "rules": { "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }] }
}
```

### `next-env.d.ts`
Standard Next generated file (committed).

---

## SSR + redux-persist note

Next App Router renders on the server. `localStorage` is browser-only.

**Solution:** export `persistor` as a *function* `(store) => persistStore(store)`; only call it inside `useEffect`/after mount. The pattern above with `useRef` storing the store and `PersistGate` mounted after mount avoids hydration mismatch.

Alternative: use `redux-persist`'s `createNoopStorage` on the server and swap to real storage in `useEffect`. We prefer the `useRef` approach — cleaner.

---

## Validation

- [ ] `npm run dev` starts on `:3000`, landing page renders with Antd theme applied.
- [ ] Counter buttons work (sync + async via saga).
- [ ] `npm run build` succeeds (no SSR/CSR mismatch warnings).
- [ ] `npm run lint` and `npm run typecheck` pass.
- [ ] Toast container visible in top-right when an error toast triggers (test by temporarily calling `toast.error('hi')`).
- [ ] Network panel shows axios `baseURL` = `http://localhost:4000/api`.

---

## Notes

- `@ant-design/nextjs-registry` is the official SSR style registry for Antd 5 + Next App Router. Don't use the legacy `<StyleProvider>` hacks.
- We use `optimizePackageImports` in `next.config.mjs` to tree-shake Antd + lodash — important for bundle size.
- Antd 5 with `cssVar: true` enables runtime CSS variables; combine with `theme.defaultAlgorithm` for the light look.
- Saga + persist in the same store: register the persistor *after* the saga has run, or simply wrap with `PersistGate` and `sagaMiddleware.run` once in `makeStore`. This is safe because the store reference is stable.
