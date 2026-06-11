# ADR 0001 — Stack choice

## Status

Accepted (2026-06-11)

## Context

Recruiter assignment requires a customer management web app with auth + customer CRUD, multiple identity documents per customer, and a polished UX. The assignment mentions NextJS + ReactJS + Redux + Antd but the candidate is encouraged to extend with additional libraries.

## Decision

**Frontend:**
- Next.js 14 (App Router) + TypeScript + React 18
- Redux Toolkit + Redux Saga for state and async flow
- redux-persist for the `auth` slice
- Antd 5 with a custom light professional theme
- react-hook-form + zod for forms
- dayjs, lodash, react-toastify as small quality-of-life libs
- axios with interceptors for auth + refresh

**Backend:**
- Node.js + Express + TypeScript
- Mongoose for MongoDB
- JWT (access + refresh) for auth
- zod for request validation
- swagger-jsdoc + swagger-ui-express for API docs
- winston + winston-daily-rotate-file for logging
- helmet, cors, compression, express-rate-limit for security/perf
- bcryptjs for password hashing
- jest + supertest + mongodb-memory-server for tests

**Database:** MongoDB Atlas M0 (free)
**Hosting:** Railway (BE) + Vercel (FE)

## Consequences

### Positive
- All recruiter-required technologies are present.
- Adding Redux Saga shows comfort with imperative async flows (which recruiters explicitly requested).
- Module-based backend (model / repository / service / controller / routes) is easy to maintain and scale.
- Shared zod schemas between FE and BE mean we have a single source of truth for validation.
- Antd 5 with `cssVar: true` + `optimizePackageImports` keeps bundle small and theme consistent.
- Auto-refresh-on-401 with a request queue gives a seamless experience without manual re-login.

### Negative
- Redux Saga is more boilerplate than RTK Query for a small app — but the assignment specifically asks for saga.
- Mongoose adds a layer of magic; using `lean()` or a lighter ODM would be faster for very simple queries.
- Antd 5 + Next.js 14 has known SSR caveats (handled by `@ant-design/nextjs-registry`).

## Alternatives considered

- **Next.js full-stack with API routes instead of separate Express** — rejected because the assignment is more impressive with proper BE/FE separation and a standalone Node service.
- **RTK Query instead of Saga** — rejected; the assignment explicitly mentions Saga.
- **Tailwind + shadcn/ui instead of Antd** — rejected; the assignment explicitly mentions Antd.
