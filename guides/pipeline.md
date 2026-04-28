# Bloomtech ERP — CI/CD Pipeline

## Flow

```mermaid
flowchart TD
    A([👨‍💻 Developer]) -->|git push| B[feature/* branch\non GitHub]
    B -->|Open Pull Request| C{GitHub Actions CI}

    C --> D[Job 1\nBackend — Typecheck & Tests]
    C --> E[Job 2\nFrontend — Typecheck]

    D --> D1[npm ci]
    D1 --> D2[tsc --noEmit]
    D2 --> D3[pg_isready\nwait for DB]
    D3 --> D4[npm test\n97 tests against\nreal PostgreSQL]

    E --> E1[npm ci]
    E1 --> E2[tsc --noEmit]

    D4 --> F{Both jobs\npassed?}
    E2 --> F

    F -->|❌ Fail| G([PR blocked\nCannot merge])
    F -->|✅ Pass| H[PR can be merged]

    H -->|Merge to staging| I[Railway deploys\nSTAGING environment]
    H -->|Merge to main| J[Railway deploys\nPRODUCTION environment]

    I --> K[Nixpacks builds\nbackend + frontend]
    J --> K

    K --> L([🌐 Live on Railway])
```

---

## Branches & What Triggers What

| Branch | CI runs? | Auto-deploys to |
|--------|----------|-----------------|
| `feature/*` | On PR open/update | Nothing |
| `staging` | On PR + merge | *(no Railway env yet — planned)* |
| `main` | On PR + merge | Production (Railway) |

---

## CI Jobs (GitHub Actions)

### Job 1 — Backend: Typecheck & Tests

Runs on: `ubuntu-latest`  
Working directory: `backend/`

| Step | Tool | What it does |
|------|------|-------------|
| Checkout | `actions/checkout@v4` | Clones the repo |
| Setup Node | `actions/setup-node@v4` (Node 20) | Installs Node, restores npm cache |
| Install deps | `npm ci` | Installs exact versions from lockfile |
| Type check | `tsc --noEmit` | Catches TypeScript errors with no output files |
| Wait for DB | `pg_isready` | Confirms PostgreSQL service is accepting connections |
| Run tests | `npm test` (Jest) | Runs 97 integration tests against a real PostgreSQL 15 database |

**PostgreSQL service container**

```yaml
services:
  postgres:
    image: postgres:15
    env:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: postgres
    ports:
      - 5432:5432
```

A real database (not a mock) runs alongside the job inside Docker. Tests create and tear down their own schema. This catches SQL bugs that mocks would miss.

---

### Job 2 — Frontend: Typecheck

Runs on: `ubuntu-latest`  
Working directory: `client/`

| Step | Tool | What it does |
|------|------|-------------|
| Checkout | `actions/checkout@v4` | Clones the repo |
| Setup Node | `actions/setup-node@v4` (Node 20) | Installs Node, restores npm cache |
| Install deps | `npm ci` | Installs exact versions from lockfile |
| Type check | `tsc --noEmit` | Catches TypeScript errors across the React codebase |

---

## Railway Deployment

Both the backend and frontend are separate Railway services, each with their own `railway.json`.

### Backend

```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install --include=dev && npm run build"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10,
    "healthcheckPath": "/",
    "healthcheckTimeout": 300
  }
}
```

Build compiles TypeScript → `dist/`. Start runs `node dist/index.js`.  
If the process crashes, Railway restarts it automatically (up to 10 times).

### Frontend

```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && npm run build:railway"
  },
  "deploy": {
    "startCommand": "npx serve -s dist -l tcp://0.0.0.0:$PORT",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

Build runs Vite → `dist/`. Start serves the static files with `serve`.

### Nixpacks

Railway uses [Nixpacks](https://nixpacks.com) to build without a Dockerfile. It detects Node.js from `package.json` and runs the `buildCommand` from `railway.json`. The result is packaged into a Docker image and deployed.

---

## Branch Protection (GitHub Rulesets)

`main` and `staging` have rulesets that enforce:

- Direct pushes are **blocked** — all changes must go through a PR
- Both CI check names must pass before merge is allowed:
  - `Backend — Typecheck & Tests`
  - `Frontend — Typecheck`

Even the repo owner cannot bypass this.

---

## Environment Variables in CI

Test runs use safe dummy values injected via the workflow:

| Variable | CI value |
|----------|----------|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/bloomtech_test` |
| `NODE_ENV` | `test` |
| `JWT_SECRET` | `test-jwt-secret-not-for-production` |
| `JWT_REFRESH_SECRET` | `test-refresh-secret-not-for-production` |
| `FRONTEND_URL` | `http://localhost:5173` |
| `SMTP_HOST` | `localhost` |
| `SMTP_PORT` | `1025` |

Production secrets live in Railway's Variables panel — they are never stored in the repo.

---

## What Happens When CI Fails

```
❌ PR is blocked — merge button is disabled
✅ GitHub shows exactly which step failed and the full log
```

**Common failure causes and fixes:**

| Failure | Likely cause | Fix |
|---------|-------------|-----|
| TypeScript error | Type mismatch introduced in the PR | Fix the type error locally, push again |
| Test failure | A test assertion broke | Read the Jest output, fix the failing test |
| `pg_isready` timeout | PostgreSQL service didn't start | Flaky runner — re-run the job |
| `npm ci` fails | `package-lock.json` out of sync | Run `npm install` locally and commit the updated lockfile |

---

## Developer Workflow (Day-to-Day)

```
1. Pull latest main
   git checkout main && git pull

2. Create a feature branch
   git checkout -b feature/your-feature-name

3. Make changes + run tests locally (see below)

4. Push the branch
   git push -u origin feature/your-feature-name

5. Open a Pull Request → main on GitHub
   CI runs automatically — check the Actions tab

6. Fix any CI failures, push again

7. Get review approval (if required) then merge
   Railway deploys production automatically
```

Direct pushes to `main` are blocked. Every change goes through a PR.

---

## Running Tests Locally

The test suite runs against a real PostgreSQL database — no mocks.

### Prerequisites

Create `backend/.env.test`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bloomtech_test
NODE_ENV=test
PORT=3001
FRONTEND_URL=http://localhost:5173
JWT_SECRET=test-jwt-secret-not-for-production
JWT_REFRESH_SECRET=test-refresh-secret-not-for-production
SMTP_HOST=localhost
SMTP_PORT=1025
```

Make sure the `bloomtech_test` database exists:

```bash
createdb bloomtech_test
```

### Running

```bash
cd backend

# Run all tests once
npm test

# Watch mode (re-runs on file save)
npm run test:watch

# Type check only (fast, no DB needed)
npm run typecheck
```

Tests run with `--runInBand` (serially) so they don't interfere with each other. Each test file sets up and tears down its own schema.

---

## Database Migrations

### The golden rule

**`backend/src/databasse.sql` is the source of truth for all tenant provisioning.** Whenever you add, change, or drop a table or column, you must update this file to reflect the final schema state.

### Adding a schema change

1. Write a migration script in `backend/src/scripts/` (e.g. `addFooColumnToBar.ts`)
2. Run it locally against your dev database
3. Update `backend/src/databasse.sql` so it matches the new schema
4. Add a `package.json` script entry for easy re-running (e.g. `"migrate:foo": "ts-node src/scripts/addFooColumnToBar.ts"`)
5. Include the migration script and the updated `databasse.sql` in the same PR

### Running a migration on Railway (production)

```bash
# Set env to production and point at the Railway DB
cross-env NODE_ENV=production ts-node -r dotenv/config src/scripts/yourMigration.ts \
  dotenv_config_path=.env.production
```

Most migrations already have a `:railway` variant in `package.json` — check there first.

### Initialising a fresh Railway database

```bash
# In Railway shell or via the CLI
npm run railway:setup
# Runs: railway:init-db → seed:railway-admin
```

---

## PR Template

Every PR opens with `.github/pull_request_template.md` pre-filled. The key checklist items:

| Item | Why it matters |
|------|---------------|
| Tested locally end-to-end | CI only type-checks + runs unit/integration tests — manual testing catches UI regressions |
| Tests written (or reason why not) | Keeps the 97-test suite honest |
| `databasse.sql` updated on schema change | Without this, new tenant provisioning breaks |
| New env var added to Railway before merging | If the backend starts before the variable exists, it will crash |

---

## Adding a New Environment Variable

Follow this order to avoid a production crash:

1. **Add it to Railway** — Variables panel for the affected service (backend or frontend)
2. **Add it to the CI workflow** — `env:` block in `.github/workflows/ci.yml` under `Run tests` (use a safe dummy value)
3. **Add it to `backend/.env.example`** — so future developers know it exists
4. **Merge the PR** — Railway redeploys with the new variable already present

Never commit real secrets to the repo. Railway's Variables panel is the only place production values live.

---

## Rolling Back a Deployment

Railway keeps a full deploy history per service.

1. Open the Railway dashboard → select the service (Backend or Frontend)
2. Click **Deployments** in the sidebar
3. Find the last good deploy
4. Click **Redeploy** on that entry

The rollback is instant — Railway swaps traffic to the old image without rebuilding.

If the rollback is due to a bad database migration, you will also need to revert the schema change manually (Railway has no automatic DB rollback).

---

## Quick Reference

```bash
# --- Local dev ---
cd backend && npm run dev          # API on :3000
cd client  && npm run dev          # UI  on :5173

# --- Tests ---
cd backend && npm test             # full suite (real DB)
cd backend && npm run typecheck    # TS only, no DB needed
cd client  && npx tsc --noEmit     # frontend TS check

# --- Database ---
psql -d Bloomtech -f backend/src/databasse.sql   # fresh local schema
cd backend && npm run seed:admin                  # create admin user

# --- Migrations ---
# (check package.json for the full list of migrate:* and db:* scripts)
cd backend && npm run migrate:<name>              # run locally
cd backend && npm run migrate:<name>:railway      # run against Railway DB

# --- Railway init ---
cd backend && npm run railway:setup               # init DB + seed admin on Railway
```
