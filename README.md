# Customers — Full-stack Customer Management Web App

A polished, production-grade full-stack app to manage customers and their identity documents.

**Stack:** Next.js 16 · React 19 · TypeScript · Redux Toolkit + Redux Saga · Antd 6 · react-hook-form + zod · Node.js · Express 5 · Mongoose 9 · JWT · MongoDB Atlas

> Designed as a recruiter assignment. Built with extra care: 49 tests, CI, Docker, dark mode, comprehensive error handling, and deployment guides for **multiple free hosting options** (no credit card required).

## Quick start (local, no setup)

```bash
# 1. Install everything
npm install

# 2. Start API (uses in-memory MongoDB, no Atlas needed)
cd back-end && npm run dev:memory   # → http://localhost:4000

# 3. Start web app (separate terminal)
cd front-end && npm run dev         # → http://localhost:3000

# 4. Open http://localhost:3000 → log in with admin@example.com / Admin@123
```

## Live deployment (100% free)

This is **one GitHub repo** with everything — no separate repos needed.

| Service     | Free host                                               | Cost                                    |
| ----------- | ------------------------------------------------------- | --------------------------------------- |
| Database    | [MongoDB Atlas M0](https://www.mongodb.com/cloud/atlas) | $0 forever                              |
| Backend     | [Render.com](https://render.com) (Blueprint deploy)     | $0/mo (750 h, sleeps after 15 min idle) |
| Backend alt | [Fly.io](https://fly.io)                                | $5 trial then ~$2/mo for nano VM        |
| Frontend    | [Vercel](https://vercel.com)                            | $0/mo (free hobby tier)                 |

Full step-by-step: see [`docs/DEPLOY.md`](./docs/DEPLOY.md). The repo includes:

- `render.yaml` — one-click Render Blueprint
- `fly.toml` — `fly launch --copy-config` does the rest
- `back-end/Dockerfile` — portable container build
- `.github/workflows/ci.yml` — auto-test on push/PR

## Project structure

```
customers/                ← ONE GitHub repo
├── back-end/             # Express + TypeScript API
├── front-end/            # Next.js + Antd web app
├── docs/                 # Architecture, ADRs, deploy guide
├── plans/                # Implementation plan
├── render.yaml           # Render Blueprint (one-click)
├── fly.toml              # Fly.io config
├── .github/workflows/    # CI (GitHub Actions)
└── package.json          # Root with npm workspaces
```

## Features

- **Mock authentication** with JWT access + refresh tokens, hashed storage, rotation with reuse detection
- **Customer list** with pagination, debounced search, sortable columns
- **Customer CRUD** — create, view, edit, soft-delete
- **Multiple identity documents per customer** (CCCD, Driver License, Passport) — one per type
- **Form validation** with zod, shared shape between FE & BE
- **Auto-refresh of access tokens** on 401 with request queueing
- **Dark mode** toggle (state in Redux)
- **Polished UX** — Antd 6, loading skeletons, error boundaries, toast notifications
- **Centralized error handling** with structured logging (winston + daily rotate)
- **Rate limiting**, helmet, CORS, request ID
- **Swagger UI** for API at `/api/docs`
- **49 tests** (18 BE + 31 FE) all green
- **CI** (GitHub Actions) + **Docker** + **commit hooks** (husky + commitlint)

## Scripts (run from root)

| Script              | What it does                          |
| ------------------- | ------------------------------------- |
| `npm install`       | Install all workspaces                |
| `npm run dev:be`    | Start BE with in-memory Mongo         |
| `npm run dev:fe`    | Start FE dev server                   |
| `npm run lint`      | Lint BE + FE                          |
| `npm run typecheck` | TypeScript check BE + FE              |
| `npm run test`      | Run all tests (BE + FE)               |
| `npm run build`     | Production build BE + FE              |
| `npm run format`    | Prettier write                        |
| `npm run seed`      | Seed admin + 20 customers (in-memory) |

## Default credentials

- Email: `admin@example.com`
- Password: `Admin@123`

## Tech choices (TL;DR)

- **State**: Redux Toolkit + Redux Saga (explicit async flow as required by assignment)
- **Forms**: react-hook-form + zod (single source of truth for FE & BE validation)
- **UI**: Antd 6 with custom light + dark theme
- **Backend**: Express + Mongoose with feature-based module structure
- **Auth**: Short-lived access (15m) + long-lived refresh (7d) with rotation; refresh tokens stored **hashed** in DB

See [`docs/architecture.md`](./docs/architecture.md) for detailed design notes.
