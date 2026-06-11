# Customers — Full-stack Customer Management App

A polished, production-grade full-stack web application for managing customers and their identity documents.

## Tech Stack

| Layer    | Tech                                                                                       |
|----------|--------------------------------------------------------------------------------------------|
| Frontend | Next.js 14 (App Router), TypeScript, Redux Toolkit + Redux Saga, Antd 5, react-hook-form |
| Backend  | Node.js, Express, TypeScript, Mongoose, JWT, Zod, Swagger                                 |
| Database | MongoDB Atlas M0 (free)                                                                    |
| Hosting  | Railway.app (BE) + Vercel (FE)                                                             |

## Project Structure

```
customers/
├── back-end/         # Express API (TypeScript)
├── front-end/        # Next.js app (TypeScript)
├── docs/             # Documentation
└── plans/            # Implementation plan
```

## Quick Start

```bash
# 1. Install dependencies (workspaces)
npm install

# 2. Set up environment
cp back-end/.env.example back-end/.env
cp front-end/.env.example front-end/.env.local

# 3. Run in development (two terminals)
npm run dev:be     # http://localhost:4000
npm run dev:fe     # http://localhost:3000
```

## Documentation

- **Backend setup**: see [`back-end/README.md`](./back-end/README.md)
- **Frontend setup**: see [`front-end/README.md`](./front-end/README.md)
- **API docs**: `http://localhost:4000/api/docs` (Swagger UI, after running BE)
- **Implementation plan**: see [`plans/customer-management-app/`](./plans/customer-management-app/plan.md)

## Features

- Mock authentication (JWT access + refresh)
- Customer list with pagination, search, sort
- Customer create / edit / view
- Multiple identity documents per customer (one per type)
- Form validation (zod, shared between FE and BE)
- Responsive UI, loading states, error handling
- Swagger API documentation
