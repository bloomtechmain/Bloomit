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
