# Customer Management Web App

A polished, full-stack customer management system built as a recruiter assignment.

**Stack:** Next.js 14 · React 18 · TypeScript · Redux Toolkit + Redux Saga · Antd 5 · react-hook-form + zod · Node.js · Express · Mongoose · JWT · MongoDB Atlas

## Quick start (local)

```bash
# 1. Install everything
npm install

# 2. Start the API (in-memory MongoDB, no Atlas needed)
npm run dev:be --workspace back-end -- --  # OR
cd back-end && npm run dev:memory

# 3. Start the web app
npm run dev:fe

# 4. Open http://localhost:3000 → log in with admin@example.com / Admin@123
```

See [`docs/DEPLOY.md`](./docs/DEPLOY.md) for production deployment (Atlas + Railway + Vercel).

## Structure

```
customers/
├── back-end/         # Express + TypeScript API
├── front-end/        # Next.js + Antd web app
├── docs/             # Deployment guide
└── plans/            # Implementation plan
```

## Features

- Mock authentication (JWT access + refresh, hashed tokens, rotation + reuse detection)
- Customer list with pagination, debounced search, sortable columns
- Customer create / view / edit / soft-delete
- Each customer can hold **multiple** identity documents (CCCD, Driver License, Passport) — one per type
- Form validation (zod) shared shape between FE and BE
- Auto-refresh of access tokens on 401 with request queueing
- Centralized error handling, request id, structured logging
- Rate limiting, helmet, CORS
- Swagger UI for the API (`/api/docs`)

## Tech choices

- **State management**: Redux Toolkit + Redux Saga for explicit async flow, redux-persist for `auth` slice (so refresh keeps you logged in)
- **Forms**: react-hook-form (perf) + zod (single source of truth for FE + BE validation)
- **UI**: Antd 5 with custom light professional theme; CSS-in-JS so no global CSS fights
- **Backend**: Express + Mongoose with feature-based module structure (`modules/<feature>/{model,repository,service,controller,routes,schema,dto}`)
- **Validation**: zod everywhere, with shared shape between FE & BE
- **Auth**: short-lived access (15m) + long-lived refresh (7d) with rotation; refresh tokens stored **hashed** in DB; reuse-detection purges all sessions

See [`back-end/README.md`](./back-end/README.md) and [`front-end/README.md`](./front-end/README.md) for details.
