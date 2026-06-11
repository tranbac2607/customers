# Customer Management Web App — Implementation Plan

## Overview

A polished, full-stack customer management system built as a recruiter assignment. Demonstrates production-grade architecture, clean code, and excellent UX across both backend and frontend.

**Tech stack:**
- **Backend:** Node.js + Express + TypeScript + Mongoose + JWT + Zod + Swagger
- **Frontend:** Next.js 14 (App Router) + TypeScript + Redux Toolkit + Redux Saga + Antd 5 + Redux Persist
- **Forms:** react-hook-form + zod (shared schemas with backend)
- **Extras:** dayjs, lodash, react-toastify, RTK Query (optional), helmet, winston, express-rate-limit
- **Database:** MongoDB Atlas M0 (free)
- **Hosting:** Railway.app (backend) + Vercel (frontend)

## Architecture

```
customers/
├── back-end/                   # Express API
│   ├── src/
│   │   ├── config/             # env, db, swagger, logger
│   │   ├── modules/            # feature modules (auth, customers)
│   │   │   └── <feature>/
│   │   │       ├── <feature>.model.ts
│   │   │       ├── <feature>.repository.ts
│   │   │       ├── <feature>.service.ts
│   │   │       ├── <feature>.controller.ts
│   │   │       ├── <feature>.routes.ts
│   │   │       ├── <feature>.schema.ts        # zod validation
│   │   │       ├── <feature>.dto.ts
│   │   │       └── __tests__/
│   │   ├── middlewares/        # auth, error, validate, rate-limit
│   │   ├── utils/              # ApiError, ApiResponse, jwt, asyncHandler
│   │   ├── types/              # express.d.ts, shared types
│   │   ├── app.ts
│   │   └── server.ts
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
│
├── front-end/                  # Next.js app
│   ├── src/
│   │   ├── app/                # App Router
│   │   │   ├── (auth)/login/
│   │   │   ├── (dashboard)/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── customers/
│   │   │   │   │   ├── page.tsx          # list
│   │   │   │   │   ├── new/page.tsx
│   │   │   │   │   └── [id]/
│   │   │   │   │       ├── page.tsx      # detail
│   │   │   │   │       └── edit/page.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── layout.tsx
│   │   │   ├── providers.tsx
│   │   │   └── globals.css
│   │   ├── components/         # shared UI
│   │   ├── features/           # feature modules
│   │   │   └── <feature>/
│   │   │       ├── <feature>Slice.ts
│   │   │       ├── <feature>Saga.ts
│   │   │       ├── <feature>Types.ts
│   │   │       ├── <feature>Api.ts
│   │   │       └── components/
│   │   ├── store/              # redux store, root reducer, root saga
│   │   ├── lib/                # axios client, theme, constants
│   │   ├── hooks/              # typed redux hooks
│   │   ├── schemas/            # zod schemas (shared shape)
│   │   ├── types/
│   │   └── middleware.ts       # redux-persist
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
│
└── plans/customer-management-app/   # this plan
```

## Data Model

**Customer** (Mongoose)
```
- _id, fullName, dateOfBirth, address, phone, email
- gender (male|female|other), nationality, occupation
- identityDocuments: [{ type, number, issueDate, issuePlace }]   // subdoc array
  - unique compound index: (customerId, type) via app-level check + unique on type per customer
- createdAt, updatedAt, createdBy
```

**User** (Mongoose) — simple auth
```
- _id, email (unique), passwordHash, name, role (admin|user)
- refreshTokens: [string] (hashed)
```

## API Surface

| Method | Path                              | Auth | Description                          |
|--------|-----------------------------------|------|--------------------------------------|
| POST   | /api/auth/login                   | -    | email + password → access+refresh   |
| POST   | /api/auth/refresh                 | -    | refresh token → new access           |
| POST   | /api/auth/logout                  | ✅   | invalidate refresh token             |
| GET    | /api/auth/me                      | ✅   | current user profile                 |
| GET    | /api/customers                    | ✅   | list (search, page, limit, sort)    |
| GET    | /api/customers/:id                | ✅   | detail                               |
| POST   | /api/customers                    | ✅   | create                               |
| PUT    | /api/customers/:id                | ✅   | update                               |
| DELETE | /api/customers/:id                | ✅   | delete (soft)                        |
| GET    | /api/health                       | -    | liveness                             |
| GET    | /api/docs                         | -    | Swagger UI                           |

## Phases

| #  | Phase                              | Est. Effort |
|----|------------------------------------|-------------|
| 00 | Setup (repos, tooling, monorepo)   | XS          |
| 01 | Backend foundation                 | M           |
| 02 | Backend customers + auth           | M           |
| 03 | Frontend setup + theme             | S           |
| 04 | Frontend auth + layout             | S           |
| 05 | Frontend customer list + search    | M           |
| 06 | Frontend customer CRUD             | M           |
| 07 | Deployment (Atlas + Railway + Vercel) | S       |
| 08 | Documentation + polish             | S           |

See individual phase files for detailed steps, files to create, dependencies, and validation criteria.

## Quality Gates (must pass before each phase is "done")
- `pnpm lint` & `pnpm typecheck` pass
- Backend: `pnpm test` + `pnpm dev` boots cleanly
- Frontend: `pnpm build` succeeds, `pnpm dev` renders
- Swagger docs render at `/api/docs`
- All forms show validation errors inline
- All async actions show loading + error toast
- No `any` in shared types (use `unknown` + narrow)
- README updated for each phase
