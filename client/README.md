# BloomTech System — Run Guide

## Prerequisites
- Node.js 18+ and npm
- PostgreSQL running locally
- Set backend env in `backend/.env`:
  - `PGHOST=localhost`
  - `PGUSER=postgres`
  - `PGPASSWORD=postgres`
  - `PGDATABASE=Bloomtech`
  - `PGPORT=5432`

## Install
- From `backend/`: `npm install`
- From `client/`: `npm install`

## Database
- Create tables using `databasse.sql` (root file): import via pgAdmin or `psql`.
- Seed admin user: from `backend/` run `npm run seed:admin`
  - Login: `admin` or `admin@example.com`
  - Password: `admin123`

## Run (Development)
- Start API: from `backend/` run `npm run dev` (listens on `http://localhost:3000`)
- Start frontend: from `client/` run `npm run dev` → `http://localhost:5173`

## Troubleshooting
- Port in use (`EADDRINUSE`): stop duplicate dev servers; keep one backend on `3000` and one frontend on `5173`.
- DB connection errors: confirm PostgreSQL is running and `.env` matches your credentials.
- CORS: API enables `cors()` for local dev.

## Theme
- Colors are defined in `client/src/index.css` (`--primary: #063062`, `--accent: #e14504`, `--bg: gray`).
- To change Login container to blue, set form `background: 'var(--primary)'` in `client/src/pages/Login.tsx`.
