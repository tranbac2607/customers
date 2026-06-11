# Architecture

High-level overview of the system.

## System diagram

```
┌─────────────────┐     HTTPS    ┌──────────────────────┐
│                 │              │                      │
│  Browser (FE)   │ ───────────► │  Vercel (Next.js)    │
│  - Redux Store  │              │  - SSR + Static      │
│  - Persist (LS) │ ◄─────────── │  - Antd 6            │
│                 │   JSON+JWT   │                      │
└────────┬────────┘              └──────────┬───────────┘
         │                                  │
         │ Bearer JWT (in-memory)           │  Server actions / API
         │ Auto-refresh on 401              │
         │                                  ▼
         │                       ┌──────────────────────┐
         │                       │  Railway (Express)   │
         └─────────────────────► │  - REST API          │
              /api/*             │  - JWT auth          │
                                 │  - Zod validation    │
                                 │  - Swagger UI        │
                                 └──────────┬───────────┘
                                            │ Mongoose ODM
                                            ▼
                                 ┌──────────────────────┐
                                 │  MongoDB Atlas M0    │
                                 │  - customers DB      │
                                 │  - users collection  │
                                 └──────────────────────┘
```

## Frontend architecture

```
src/
├── app/                         # Next.js App Router
│   ├── (auth)/login/            # public auth pages (no layout chrome)
│   ├── (dashboard)/             # protected pages (sider + header chrome)
│   │   ├── layout.tsx           #   - wraps in <AuthGuard>
│   │   ├── customers/
│   │   │   ├── page.tsx         # list
│   │   │   ├── new/page.tsx     # create
│   │   │   └── [id]/
│   │   │       ├── page.tsx     # detail
│   │   │       └── edit/page.tsx
│   │   └── dashboard/page.tsx
│   ├── layout.tsx               # root <html> + <Providers>
│   ├── providers.tsx            # Redux + Persist + Antd + Toastify
│   └── globals.css
│
├── features/                    # feature-sliced design
│   ├── auth/                    # auth slice, saga, types
│   ├── customers/               # customers slice, saga, form
│   └── counter/                 # dev-only sanity check
│
├── components/                  # shared UI (AuthGuard)
├── store/                       # configureStore, rootReducer, rootSaga, hooks
├── lib/                         # axios, theme, env, constants
├── hooks/                       # (reserved)
├── schemas/                     # (reserved for shared zod schemas)
└── types/                       # cross-cutting types (api.ts)
```

### State management flow

```
User clicks "Login"
      │
      ▼
  dispatch(loginRequest({ email, password }))
      │
      ▼
  Redux store → authSaga → handleLogin
      │
      ▼
  call(api.post('/auth/login', …))
      │
      ▼
  Backend returns { success, data: { accessToken, refreshToken, user } }
      │
      ▼
  put(loginSuccess({ accessToken, refreshToken, user }))
      │
      ▼
  Redux state.auth.isAuthenticated = true
  redux-persist saves to localStorage
      │
      ▼
  AuthGuard re-renders → router.replace('/customers')
```

### Auto-refresh on 401

```
Request returns 401
   │
   ▼
Axios response interceptor catches it
   │
   ├─ is the request to /auth/*? → reject
   │
   └─ otherwise:
      │
      ├─ if another request is already refreshing:
      │     queue this request's `resolve(token)`
      │
      └─ else:
           mark isRefreshing = true
           POST /auth/refresh with current refreshToken
              │
              ├─ success → onTokenRefreshed(newAccess, newRefresh)
              │            flush queue with new token
              │            retry original request
              │
              └─ failure → flush queue with null
                           onUnauthorized() → dispatch(logout()) → router.replace('/login')
```

## Backend architecture

```
src/
├── app.ts                       # createApp() — pure factory (no .listen)
├── server.ts                    # entry: connect DB + listen
├── bootstrap.ts                 # startServer() — used by both server.ts & server.memory.ts
├── config/
│   ├── env.ts                   # zod-validated env loader
│   ├── database.ts              # mongoose connect (strictQuery, indexes)
│   ├── logger.ts                # winston (console + daily rotate file)
│   ├── swagger.ts               # swagger-jsdoc config
│   └── schemas.ts               # swagger component schemas (Customer, etc.)
│
├── middlewares/
│   ├── requestId.middleware.ts
│   ├── requestLogger.middleware.ts
│   ├── validate.middleware.ts   # generic zod validator
│   ├── error.middleware.ts      # ApiError + Mongoose + JWT + default
│   └── notFound.middleware.ts
│
├── utils/
│   ├── ApiError.ts              # typed error with .status, .code
│   ├── ApiResponse.ts           # { success, data, meta } envelope
│   ├── asyncHandler.ts
│   ├── crypto.ts                # hashToken, newJti
│   ├── jwt.ts                   # sign/verify access+refresh
│   ├── password.ts              # bcrypt hash/compare
│   └── pagination.ts
│
├── modules/                     # feature-based modules
│   ├── auth/                    # User model, repository, service, controller, routes
│   ├── customers/               # Customer model, repository, service, controller, routes
│   └── health/                  # /api/health
│
├── db/seed.ts                   # admin + 20 sample customers
├── __tests__/                   # jest + supertest + mongodb-memory-server
└── types/express.d.ts           # Request augmentation (id, user)
```

### Request lifecycle

```
HTTP request
   │
   ▼
requestId middleware  ──►  attaches X-Request-Id to req + response header
   │
   ▼
requestLogger (morgan)  ──►  logs to winston
   │
   ▼
helmet  ──►  security headers
cors  ──►  origin allowlist
compression, cookieParser, express.json, urlencoded
   │
   ▼
rate-limit  ──►  blocks > 100 req / 15 min / IP for /api
   │
   ▼
router  ──►  /api/auth, /api/customers, /api/health
   │
   ▼
authenticate (if protected)  ──►  verifies Bearer JWT
   │
   ▼
validate(schema)  ──►  zod parse body / query / params
   │
   ▼
controller  ──►  service  ──►  repository  ──►  Mongoose
   │
   ▼
ok(data)  ──►  { success: true, data }  sent as JSON
   │
   ▼
   error path: error middleware maps ApiError / Zod / Mongoose / JWT / unknown → JSON
```

## Data model

### User (collection: `users`)

```ts
{
  _id: ObjectId,
  email: string,            // unique, lowercase, indexed
  passwordHash: string,     // select: false (opt-in)
  name: string,
  role: 'admin' | 'user',   // default 'user'
  refreshTokens: string[],  // SHA-256 hashes, select: false
  lastLoginAt?: Date,
  createdAt, updatedAt
}
```

### Customer (collection: `customers`)

```ts
{
  _id: ObjectId,
  fullName: string,            // 1..200
  dateOfBirth: Date,           // < now
  address: string,             // 1..500
  phone: string,               // 6..30
  email: string,               // unique case-insensitive among active
  gender: 'male' | 'female' | 'other',
  nationality: string,         // 1..100
  occupation: string,          // 1..200
  identityDocuments: [         // up to 10
    {
      _id: ObjectId,
      type: 'CCCD' | 'DRIVER_LICENSE' | 'PASSPORT',
      number: string,          // 1..50
      issueDate: Date,
      issuePlace: string,      // 1..200
    }
  ],
  isDeleted: boolean,          // soft delete
  createdBy: ObjectId → User,
  createdAt, updatedAt
}

// Indexes:
//   text: fullName, email, phone, nationality, occupation, address
//   single: email (lowercase)
//   single: phone
//   single: isDeleted
//   single: createdAt (desc)
```

### Uniqueness rules (application-enforced)

- **Email** uniqueness among `isDeleted: false` customers (case-insensitive)
- **Identity document type** uniqueness per customer (enforced by Mongoose validator + zod superRefine)
