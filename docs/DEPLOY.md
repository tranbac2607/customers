# Deployment Guide

This guide walks through deploying the app live with **MongoDB Atlas** (free M0) + **Vercel** (frontend, free) + your choice of backend host. All options below are **100% free** for a demo / assignment.

> **TL;DR** (recommended for fastest setup):
>
> 1. **MongoDB Atlas M0** — free DB
> 2. **Render.com** — free backend (spin down after 15 min idle; perfect for demo)
> 3. **Vercel** — free frontend
> 4. Total cost: **$0/month**

---

## Architecture

```
┌─────────────────┐     HTTPS    ┌──────────────────────┐
│  Browser (FE)   │ ◄──────────► │  Vercel (Next.js)    │
│  Redux Store    │              │  - SSR + Static      │
│  + Persist (LS) │              │  - Antd 6            │
└────────┬────────┘              └──────────┬───────────┘
         │                                  │
         │ Bearer JWT (auto-refresh)         │
         │                                  ▼
         │                       ┌──────────────────────┐
         └─────────────────────► │  Backend (Render /   │
              /api/*             │  Fly.io / Railway)   │
                                 │  - Express REST      │
                                 │  - JWT auth          │
                                 │  - Swagger /api/docs │
                                 └──────────┬───────────┘
                                            │ Mongoose
                                            ▼
                                 ┌──────────────────────┐
                                 │  MongoDB Atlas M0    │
                                 │  customers DB        │
                                 └──────────────────────┘
```

## Why one GitHub repo works for everything

The project is a **monorepo** with two workspaces:

```
customers/                 ← ONE GitHub repo
├── back-end/              ← Express + TypeScript API
├── front-end/             ← Next.js + Antd web app
├── render.yaml            ← Render.com deploy (optional)
├── fly.toml               ← Fly.io deploy (optional)
├── docs/
├── .github/workflows/     ← CI (GitHub Actions)
└── package.json           ← root with npm workspaces
```

- **Vercel** auto-detects Next.js → just point it at the `front-end/` root
- **Render / Fly.io** uses `render.yaml` / `fly.toml` to deploy `back-end/`
- One `git push` triggers all deploys

---

## 1. MongoDB Atlas (free M0)

### 1.1 Create account + cluster

1. Sign up at <https://www.mongodb.com/cloud/atlas> (or sign in with Google).
2. **Create a project** named `customer-management`.
3. Click **Build a Database → Shared (M0 FREE)**.
4. Region: pick closest to your users (e.g. `ap-southeast-1` Singapore for Vietnam).
5. Cluster name: `customers-cluster`.
6. Wait ~3 minutes for provisioning.

### 1.2 Configure access

- **Database Access → Add New Database User**
  - Username: `customers_app`
  - Password: `openssl rand -hex 24` (save in 1Password)
  - Built-in Role: `Read and write to any database`

- **Network Access → Add IP Address → Allow Access from Anywhere** (`0.0.0.0/0`)
  - Required because free-tier hosts use dynamic egress IPs.

- **Deployment → Database → Connect → Drivers**
  - Copy `mongodb+srv://…` URI
  - Replace `<password>` (URL-encode if it has special chars)
  - Save: `mongodb+srv://customers_app:PASSWORD@customers-cluster.xxxxx.mongodb.net/customers?retryWrites=true&w=majority`

### 1.3 Seed the database

From your local machine:

```bash
cd back-end
MONGODB_URI="mongodb+srv://..." \
JWT_ACCESS_SECRET="$(openssl rand -hex 32)" \
JWT_REFRESH_SECRET="$(openssl rand -hex 32)" \
npm run seed
```

This creates:

- Admin: `admin@example.com` / `Admin@123`
- 20 sample customers with identity documents

---

## 2. Backend — choose your free host

### Option A: Render.com (RECOMMENDED for free)

**Free tier**: 750 instance-hours/month, spins down after 15 min idle.

> The 15-min sleep is fine for a demo: the first request after idle takes ~30s to wake up, then it's instant. If you need 24/7 uptime, use Fly.io (Option B).

#### One-click deploy

1. Push this repo to GitHub (if you haven't already).
2. Sign up at <https://render.com> with GitHub.
3. **New → Blueprint**.
4. Point Render to your repo. It auto-detects `render.yaml` and creates the service.
5. In the service dashboard, update the sync-env vars:
   - `MONGODB_URI` = the Atlas URI from step 1
   - `CORS_ORIGIN` = (your Vercel URL — set this AFTER deploying FE)
6. Wait ~3-5 min for the first build. Get the public URL: `https://customers-api-xxxx.onrender.com`

#### Manual setup (if not using Blueprint)

1. New → Web Service → connect repo.
2. **Root Directory**: `back-end`
3. **Build Command**: `npm install && npm run build`
4. **Start Command**: `npm start`
5. **Health Check Path**: `/api/health`
6. **Instance Type**: Free
7. Add env vars (see `render.yaml` for the list).
8. Deploy.

#### Notes

- The free tier shares CPU with other apps — expect slower cold starts.
- Free Postgres on Render expires after 30 days (not relevant here since we use Atlas).

### Option B: Fly.io (best for production-like)

**Cost**: $0 trial credit, then ~$2/month for the smallest VM. Or stay within trial.

#### One-command deploy

```bash
# 1. Install flyctl
curl -L https://fly.io/install.sh | sh

# 2. Sign up
fly auth signup

# 3. Launch (uses fly.toml in repo root)
fly launch --copy-config --name customers-api-<your-suffix>

# 4. Set secrets
fly secrets set \
  MONGODB_URI="mongodb+srv://..." \
  JWT_ACCESS_SECRET="$(openssl rand -hex 32)" \
  JWT_REFRESH_SECRET="$(openssl rand -hex 32)" \
  CORS_ORIGIN="https://your-frontend.vercel.app"

# 5. Deploy
fly deploy
```

#### Why Fly.io

- No sleep/idle (or only when you set `auto_stop_machines: stop`).
- Global edge — fast from anywhere.
- Auto HTTPS, custom domain free.
- Dockerized, so the build is identical to local.

### Option C: Railway.app (no longer free, but paid plans start at $5/mo)

> Only use this if you have a Railway subscription. We removed it from the recommended path because the free tier was discontinued in 2024.

---

## 3. Vercel (frontend)

### 3.1 Setup

1. Sign up at <https://vercel.com> with GitHub.
2. **Add New Project → Import** the `customers` repo.
3. **Configure**:
   - **Root Directory**: `front-end` ← click Edit, then select
   - **Framework Preset**: Next.js (auto-detected)
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

### 3.2 Environment variables

| Variable                   | Value                                                      |
| -------------------------- | ---------------------------------------------------------- |
| `NEXT_PUBLIC_API_BASE_URL` | `https://customers-api-xxxx.onrender.com/api` (or Fly URL) |
| `NEXT_PUBLIC_APP_NAME`     | `Customer Management`                                      |

Apply to **Production** (and Preview if you want previews to point at production API).

### 3.3 Deploy

- Click **Deploy** → wait ~1-2 min.
- URL: `https://customers-frontend.vercel.app`

### 3.4 Update CORS on backend

Go back to Render / Fly → set `CORS_ORIGIN=https://customers-frontend.vercel.app` → redeploy.

### 3.5 Custom domain (optional)

Vercel → **Settings → Domains → Add** → follow DNS instructions. Update CORS too.

---

## 4. End-to-end smoke test (live URLs)

1. Open `https://customers-frontend.vercel.app` → login page renders.
2. Log in with `admin@example.com` / `Admin@123` → redirect to `/customers`.
3. List loads with 20 customers; pagination works; search works.
4. Click **New customer** → fill form (try a CCCD + a Passport) → save → redirect to detail page.
5. Open detail → all fields present.
6. Edit → change `occupation` → save → list reflects change.
7. Delete → confirm modal → row gone.
8. Open DevTools → Network → confirm all calls go to your BE URL.
9. Refresh page in browser → still logged in (redux-persist + localStorage).
10. Logout → return to login.

---

## 5. CI / CD

- **GitHub Actions** runs on every push to `main` and on PRs (see `.github/workflows/ci.yml`).
  - Format check, lint, typecheck, build, tests.
  - If green ✅, you can deploy with confidence.
- **Vercel** auto-deploys on push to `main`.
- **Render** auto-deploys on push to `main` (if you enable `autoDeploy: true`).
- **Fly.io** requires `fly deploy` manually, OR set up GitHub Actions deploy.

---

## 6. Cost summary

| Service   | Free option                             | Cost for production upgrade |
| --------- | --------------------------------------- | --------------------------- |
| Atlas M0  | 512 MB storage, 100 conns               | M10+ $57/mo                 |
| Render BE | 750 h/mo, sleeps after 15 min idle      | Starter $7/mo (always-on)   |
| Fly.io BE | $5 trial credit, then ~$2/mo for nano   | Custom                      |
| Vercel FE | 100 GB bandwidth/mo, unlimited projects | Pro $20/mo                  |

**Demo cost: $0/mo** (Render spins down when idle).
**Always-on production: ~$2-9/mo** depending on host.

---

## 7. Post-deploy housekeeping

- [ ] Seed Atlas with sample customers (done in step 1.3)
- [ ] Verify rate limiter doesn't lock you out (100 req/15min is generous)
- [ ] Monitor logs for the first 24h
- [ ] Optional: UptimeRobot pings `/api/health` every 5 min (free)
- [ ] Optional: add `helmet` CSP once all origins are known

---

## 8. Security checklist

- [ ] `JWT_*_SECRET` are 32+ random bytes (`openssl rand -hex 32`) — not committed
- [ ] `MONGODB_URI` is in the host's env, not in repo
- [ ] Atlas DB user has scoped role for production
- [ ] Atlas network access: prefer specific IPs over `0.0.0.0/0` for production
- [ ] Repo search for secrets: `git grep -iE "jwt_|mongodb_uri|secret"` → should be empty

```bash
git grep -iE "jwt_access_secret|jwt_refresh_secret|mongodb_uri" -- '*.ts' '*.tsx' '*.json'
# Expected: no matches outside .env.example
```

---

## 9. Rollback

- **Vercel**: Deployments tab → "Promote to Production" on a previous deployment
- **Render**: Deployments tab → click previous successful deploy → "Rollback"
- **Fly.io**: `fly releases list` → `fly releases rollback <version>`
- **MongoDB Atlas**: M0 doesn't support snapshots. Re-run the seed script.

---

## 10. Alternatives at a glance

| Need   | Best free option     | Notes                                      |
| ------ | -------------------- | ------------------------------------------ |
| DB     | Atlas M0             | 512 MB free forever                        |
| BE     | **Render** (easiest) | 750 h/mo + 15 min idle sleep               |
| BE alt | **Fly.io** (fastest) | $5 trial then ~$2/mo for nano              |
| FE     | **Vercel**           | Free, perfect Next.js support              |
| FE alt | Netlify              | Also great for Next.js                     |
| CI     | **GitHub Actions**   | Free for public repos, 2000 min/mo private |
