# Deployment Guide — Bloomtech ERP on Railway

This guide covers the complete process of deploying Bloomtech ERP to production on Railway from scratch.

---

## Prerequisites

Before starting, make sure you have:

- A [Railway](https://railway.app) account
- Access to the GitHub repository (`bloomtechmain/Bloomit`)
- Your Zoho email credentials for SMTP
- Your domain (`erpbloom.com`) with access to DNS settings

---

## Architecture Overview

The application has three Railway services that work together:

```
GitHub (main branch)
        ↓ auto-deploy on push
┌─────────────────────────────────────┐
│           Railway Project           │
│                                     │
│  ┌──────────┐   ┌────────────────┐  │
│  │ Backend  │──▶│  PostgreSQL DB │  │
│  │ (API)    │   │                │  │
│  └──────────┘   └────────────────┘  │
│       ▲                             │
│  ┌──────────┐                       │
│  │ Frontend │                       │
│  │ (React)  │                       │
│  └──────────┘                       │
└─────────────────────────────────────┘
```

---

## Step 1 — Create a Railway Project

1. Log in to [railway.app](https://railway.app)
2. Click **New Project**
3. Select **Deploy from GitHub repo**
4. Connect your GitHub account and select `bloomtechmain/Bloomit`
5. Railway will detect the repo — do not auto-deploy yet

---

## Step 2 — Add PostgreSQL Database

1. Inside your Railway project, click **+ New Service**
2. Select **Database → PostgreSQL**
3. Railway creates the database automatically
4. Click the PostgreSQL service → **Connect** tab
5. Copy the `DATABASE_URL` — you will need it in the next step

---

## Step 3 — Create the Backend Service

1. Click **+ New Service → GitHub Repo**
2. Select the same repo (`bloomtechmain/Bloomit`)
3. Set the **Root Directory** to `backend`
4. Railway will read `backend/railway.json` automatically for build and start commands

**Set environment variables** — go to the backend service → **Variables** tab and add:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Paste from PostgreSQL Connect tab |
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `FRONTEND_URL` | `https://erpbloom.com` |
| `JWT_SECRET` | Run `openssl rand -base64 32` and paste the output |
| `JWT_REFRESH_SECRET` | Run `openssl rand -base64 32` again (different value) |
| `SMTP_HOST` | `smtp.zoho.com` |
| `SMTP_PORT` | `587` |
| `SMTP_SECURE` | `false` |
| `SMTP_USER` | `info@bloomaudit.com` |
| `SMTP_PASS` | Your Zoho app password |
| `SMTP_FROM` | `Bloomtech ERP <info@bloomaudit.com>` |
| `TZ` | `America/Chicago` |

> **Never paste secrets into code files.** Only set them here in Railway's dashboard.

---

## Step 4 — Create the Frontend Service

1. Click **+ New Service → GitHub Repo**
2. Select the same repo
3. Set the **Root Directory** to `client`
4. Railway will read `client/railway.json` automatically

**Set environment variables** for the frontend service:

| Variable | Value |
|---|---|
| `VITE_API_URL` | The backend service's Railway URL (e.g. `https://bloomit-backend.up.railway.app`) |

---

## Step 5 — Deploy for the First Time

1. Trigger a deploy on the **backend service** first
2. Wait for it to show **Active** (green) in the Railway dashboard
3. Then trigger a deploy on the **frontend service**

Watch the **Logs** tab during deploy — it shows build output in real time. A successful backend deploy ends with:

```
Server running on port 3000
```

---

## Step 6 — Initialize the Database

This step only happens once — it creates all database tables and seeds the first admin user.

1. Go to your **backend service** in Railway
2. Open the **Shell** tab (or use the Railway CLI)
3. Run:

```bash
npm run railway:setup
```

This runs two things automatically:
- Creates all tables from `databasse.sql`
- Seeds the admin user so you can log in

---

## Step 7 — Connect Your Domain

1. Go to your **frontend service → Settings → Domains**
2. Click **Add Custom Domain**
3. Enter `erpbloom.com`
4. Railway shows you DNS records to add (usually a CNAME)
5. Log in to your domain registrar and add those DNS records
6. Wait up to 24 hours for DNS to propagate (usually much faster)

Repeat for the backend API subdomain if you want one (e.g. `api.erpbloom.com`).

---

## Step 8 — Verify Everything Works

Go through this checklist after the first deployment:

- [ ] Frontend loads at `https://erpbloom.com`
- [ ] You can log in with admin credentials
- [ ] Dashboard loads without errors
- [ ] Create a test vendor — verify it saves
- [ ] Send a test quote — verify email is received
- [ ] Check Railway logs — no red errors

---

## Step 9 — Enable Branch Protection on GitHub (Important)

This prevents anyone from pushing directly to `main` and accidentally taking the app down.

1. Go to your GitHub repo → **Settings → Branches**
2. Click **Add rule**
3. Branch name pattern: `main`
4. Check **Require a pull request before merging**
5. Check **Require status checks to pass** → select the CI checks
6. Save

---

## Step 10 — Enable Database Backups

1. Go to your **PostgreSQL service** in Railway
2. Look for **Backups** in the settings
3. Enable automatic daily backups
4. Store a manual backup before any major change

---

## How Railway Auto-Deploys Work

After this setup, every merge to `main` triggers Railway automatically:

```
Merge PR to main
      ↓
Railway detects push
      ↓
Runs: npm install --include=dev && npm run build
      ↓
Runs: npm start
      ↓
Health check passes → traffic switches to new version
```

You never manually deploy. Merging to `main` is deploying.

---

## Rollback if Something Goes Wrong

If a deploy breaks the app:

1. Go to Railway dashboard → your service → **Deployments**
2. Find the last working deployment
3. Click **Rollback**

The app reverts instantly to the previous version.

---

## Environment Variable Reference

See `.env.railway.example` at the root of the repo for the full list of variables needed with descriptions.

---

## Troubleshooting

| Problem | Where to look |
|---|---|
| App crashes on start | Backend service → Logs tab |
| Build fails | Backend service → Deployments → click failed deploy |
| Database connection error | Check `DATABASE_URL` variable is set correctly |
| Emails not sending | Check `SMTP_PASS` is correct in Railway variables |
| Domain not loading | Check DNS records at your registrar |
