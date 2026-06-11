# Back-end (Express + TypeScript)

Customer Management API.

## Setup

```bash
cd back-end
cp .env.example .env       # fill in MONGO_URI, JWT secrets
npm install
npm run dev                 # http://localhost:4000
```

## Scripts

- `npm run dev` — start dev server with hot-reload
- `npm run build` — compile TypeScript
- `npm start` — run production build
- `npm run lint` — ESLint
- `npm run typecheck` — tsc --noEmit
- `npm test` — Jest tests
- `npm run seed` — seed sample admin user + customers

## API Docs

Swagger UI available at `http://localhost:4000/api/docs` in non-production environments.

## Default Mock Credentials

After running `npm run seed`:

- **Email**: `admin@example.com`
- **Password**: `Admin@123`
