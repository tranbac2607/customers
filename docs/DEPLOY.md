# Deployment Guide

This guide walks through deploying the app live with **MongoDB Atlas** (free M0), **Railway** (backend), and **Vercel** (frontend) — all free tiers.

## Stack overview

| Service       | Provider       | Plan       | Cost    | Region            |
|---------------|----------------|------------|---------|-------------------|
| Database      | MongoDB Atlas  | M0 Free    | $0      | AWS (any)         |
| Backend API   | Railway.app    | Free $5/mo | $0–$5   | us-east-1 (auto)  |
| Frontend      | Vercel         | Hobby      | $0      | auto (CDN)        |

---

## 1. MongoDB Atlas (free M0 cluster)

### 1.1 Create account + cluster

1. Sign up at <https://www.mongodb.com/cloud/atlas> (or sign in with Google).
2. **Create a project** named `customer-management`.
3. Click **Build a Database** → **Shared (M0 FREE)**.
4. Pick a region closest to your users (e.g. `ap-southeast-1` Singapore for Vietnam).
5. Cluster name: `customers-cluster`.
6. Click **Create Cluster** (takes ~3 minutes to provision).

### 1.2 Configure access

#### Database user
- **Security → Database Access → Add New Database User**
  - Username: `customers_app`
  - Password: generate with `openssl rand -hex 24` and **store it safely** (1Password / Bitwarden)
  - Built-in Role: `Read and write to any database`

#### Network access
- **Security → Network Access → Add IP Address → Allow Access from Anywhere** (`0.0.0.0/0`)
  - Required because Railway uses dynamic egress IPs.

#### Connection string
- **Deployment → Database → Connect → Drivers**
- Copy the `mongodb+srv://…` URI, replace `<password>` with the actual password (URL-encode if it contains special chars).
- Final form: `mongodb+srv://customers_app:PASSWORD@customers-cluster.xxxxx.mongodb.net/customers?retryWrites=true&w=majority`

### 1.3 Seed the database

From your local machine:

```bash
cd back-end
MONGODB_URI="mongodb+srv://customers_app:PASSWORD@customers-cluster.xxxxx.mongodb.net/customers?retryWrites=true&w=majority" \
JWT_ACCESS_SECRET="$(openssl rand -hex 32)" \
JWT_REFRESH_SECRET="$(openssl rand -hex 32)" \
npm run seed
```

This creates:
- Admin user: `admin@example.com` / `Admin@123`
- 20 sample customers with identity documents

Verify in Atlas UI → **Browse Collections** → `customers.customers` should have documents.

---

## 2. Railway (Backend)

### 2.1 Setup

1. Sign up at <https://railway.app> with your GitHub account.
2. **New Project → Deploy from GitHub repo** → select the `customers` repo.
3. Railway will start the build.

### 2.2 Configure service

- **Settings → Service → Root Directory**: `back-end`
- **Settings → Build Command**: `npm install && npm run build`
- **Settings → Start Command**: `npm start`
- **Settings → Watch Paths**: `back-end/**` (so FE pushes don't trigger BE rebuilds)
- **Settings → Health Check Path**: `/api/health`

### 2.3 Environment variables (Variables tab)

| Variable                | Value                                                                                  |
|-------------------------|----------------------------------------------------------------------------------------|
| `NODE_ENV`              | `production`                                                                           |
| `PORT`                  | `4000`                                                                                 |
| `CORS_ORIGIN`           | `https://customers-frontend.vercel.app` (set after Vercel deploy)                      |
| `MONGODB_URI`           | The Atlas URI from step 1.2                                                            |
| `JWT_ACCESS_SECRET`     | `openssl rand -hex 32`                                                                 |
| `JWT_REFRESH_SECRET`    | `openssl rand -hex 32`                                                                 |
| `JWT_ACCESS_EXPIRES`    | `15m`                                                                                  |
| `JWT_REFRESH_EXPIRES`   | `7d`                                                                                   |
| `RATE_LIMIT_WINDOW_MS`  | `900000`                                                                               |
| `RATE_LIMIT_MAX`        | `100`                                                                                  |
| `LOG_LEVEL`             | `info`                                                                                 |

### 2.4 Get public URL

- **Settings → Networking → Generate Domain**
- Railway will assign something like `https://customers-api.up.railway.app`.
- Test: `curl https://customers-api.up.railway.app/api/health` → should return `{ success: true, data: { status: "ok", … } }`

### 2.5 Smoke test

```bash
curl https://customers-api.up.railway.app/api/health
# Login
curl -X POST https://customers-api.up.railway.app/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"Admin@123"}'
```

Swagger UI: `https://customers-api.up.railway.app/api/docs`

---

## 3. Vercel (Frontend)

### 3.1 Setup

1. Sign up at <https://vercel.com> with GitHub.
2. **Add New Project → Import** the `customers` repo.
3. **Configure**:
   - **Root Directory**: `front-end` (click Edit, then select)
   - **Framework Preset**: Next.js (auto-detected)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (default)

### 3.2 Environment variables

| Variable                   | Value                                                          |
|----------------------------|----------------------------------------------------------------|
| `NEXT_PUBLIC_API_BASE_URL` | `https://customers-api.up.railway.app/api`                     |
| `NEXT_PUBLIC_APP_NAME`     | `Customer Management`                                          |

Apply to **Production** (and Preview if you want previews to also point at production API).

### 3.3 Deploy

- Click **Deploy** → wait ~1–2 min for build.
- Vercel assigns a URL like `https://customers-frontend.vercel.app`.

### 3.4 Update CORS on Railway

- Go back to **Railway** → set `CORS_ORIGIN=https://customers-frontend.vercel.app` (the exact Vercel URL).
- Trigger a redeploy (or Railway will auto-redeploy on env change).

### 3.5 Custom domain (optional polish)

- Vercel → **Settings → Domains → Add** → follow DNS instructions.
- Update Railway's `CORS_ORIGIN` to match.

---

## 4. End-to-end smoke test (live URLs)

1. Open `https://customers-frontend.vercel.app` → login page renders.
2. Log in with `admin@example.com` / `Admin@123` → redirect to `/customers`.
3. List loads with 20 customers; pagination works; search works.
4. Click **New customer** → fill form (try a CCCD + a Passport) → save → redirect to detail page.
5. Open detail → all fields present.
6. Click **Edit** → change `occupation` → save → list reflects change.
7. Click **Delete** → confirm modal → row gone.
8. Open DevTools → Network → confirm:
   - All calls go to `https://customers-api.up.railway.app/api/...`
   - `Authorization: Bearer …` header is present on protected calls
9. Refresh page in browser → still logged in (redux-persist + localStorage).
10. Logout → return to login.

---

## 5. CI / CD

Both Vercel and Railway auto-deploy on push to `main`:

- `main` → production (Vercel + Railway)
- `feat/*` branches → Vercel preview URLs (free); Railway preview environments are paid

For preview URLs, point `NEXT_PUBLIC_API_BASE_URL` to the production API (simplest) or a shared staging API.

---

## 6. Post-deploy housekeeping

- [ ] Seed Atlas with at least 20 customers (done in step 1.3)
- [ ] Verify rate limiter doesn't lock you out (100 req/15min is generous)
- [ ] Monitor Railway logs for the first 24h
- [ ] Optional: UptimeRobot pings `/api/health` every 5 min
- [ ] Optional: add `helmet` CSP once all origins are known

---

## 7. Rollback

- **Railway**: Deployments tab → click previous successful deploy → **Rollback**
- **Vercel**: Deployments tab → **Promote to Production** on a previous deployment
- **Atlas**: M0 doesn't support snapshots. If data loss, re-run the seed script.

---

## 8. Security checklist

- [ ] `JWT_*_SECRET` are 32+ random bytes (`openssl rand -hex 32`) — not committed
- [ ] `MONGODB_URI` is in Railway env, not in repo
- [ ] Atlas DB user has **scoped** role (`readWrite` on `customers` DB only) — recommended for production
- [ ] Atlas network access: prefer specific IPs over `0.0.0.0/0` for production
- [ ] Repo search for secrets: `git grep -iE "jwt_|mongodb_uri|secret"` → should be empty

```bash
git grep -iE "jwt_access_secret|jwt_refresh_secret|mongodb_uri" -- '*.ts' '*.tsx' '*.json'
# Expected: no matches outside .env.example
```

---

## 9. Cost summary

| Service       | Free tier limit                              | After limit     |
|---------------|----------------------------------------------|-----------------|
| Atlas M0      | 512 MB storage, 100 connections              | M10+ ($57/mo)   |
| Railway       | $5 credit / month (small API uses <$1)       | Pay-as-you-go   |
| Vercel        | 100 GB bandwidth, unlimited personal projects| Pro $20/mo      |

For a demo / assignment, expect **$0/mo total**.

---

## 10. Alternatives

If you don't want to use these providers:

| Need         | Atlas+ Railway + Vercel | Alternative                                          |
|--------------|-------------------------|------------------------------------------------------|
| DB           | Atlas M0                | Local MongoDB (dev only), Supabase Postgres          |
| BE           | Railway                 | Render.com (sleeps), Fly.io, DigitalOcean App Plat.  |
| FE           | Vercel                  | Netlify, Cloudflare Pages                            |
