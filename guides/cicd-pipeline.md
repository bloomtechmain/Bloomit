# Bloomtech ERP — CI/CD Pipeline

---

## What CI/CD Means

**CI (Continuous Integration)** — every code change is automatically built and tested before it can be merged. Broken code is caught before it reaches production.

**CD (Continuous Deployment)** — once code is merged to the right branch, it is automatically deployed to the live environment without manual steps.

---

## Current Pipeline Overview

```
Developer pushes code
        │
        ▼
  GitHub (feature branch)
        │
        ▼
  Opens Pull Request → GitHub Actions runs CI
        │                     │
        │              ┌──────┴──────┐
        │              │             │
        │       Backend tests   Frontend
        │       TypeScript      TypeScript
        │       check + Jest    check
        │              │             │
        │              └──────┬──────┘
        │                     │
        │              Both pass? ✅
        │                     │
        ▼                     ▼
  PR merged to staging  ──► Railway deploys staging
        │
        ▼
  PR merged to main  ──► Railway deploys production
```

---

## Technologies Used

### 1. GitHub Actions

**What it is:** GitHub's built-in automation platform. Workflows are YAML files stored in `.github/workflows/`. They run on GitHub's servers automatically when triggered by events (push, pull request, etc.).

**Why we use it:** It's free for public repos and integrated directly into GitHub — no separate CI service to set up or pay for. Workflows live alongside the code so CI changes go through the same PR process as code changes.

**Our workflow file:** `.github/workflows/ci.yml`

---

### 2. Ubuntu Runner (`ubuntu-latest`)

**What it is:** The virtual machine that executes each CI job. GitHub provides Linux, Windows, and macOS runners. We use `ubuntu-latest` which is Ubuntu 22.04.

**Why we use it:** Linux is the same OS as our Railway production environment. Running tests on Linux ensures there are no OS-specific surprises that would pass locally (Windows) but fail in production.

---

### 3. Node.js 20 (`actions/setup-node@v4`)

**What it is:** The action that installs a specific Node.js version on the runner.

**Why version 20:** Node 20 is the current LTS (Long-Term Support) release — it receives security patches until April 2026. Railway also runs Node 20 by default via Nixpacks.

**npm cache:** The action caches `node_modules` based on `package-lock.json`. If dependencies haven't changed, the cache is reused and `npm ci` runs in seconds instead of minutes.

---

### 4. `npm ci` (not `npm install`)

**What it is:** A stricter version of `npm install` designed for CI environments.

**Difference from `npm install`:**
- `npm ci` installs exactly what is in `package-lock.json` — no version resolution, no surprises
- `npm ci` fails if `package.json` and `package-lock.json` are out of sync
- `npm ci` deletes `node_modules` before installing, ensuring a clean state

**Why it matters:** `npm install` can silently upgrade minor versions and install different packages than what's in the lockfile. CI must be deterministic.

---

### 5. TypeScript Compiler (`tsc --noEmit`)

**What it is:** Runs the TypeScript type checker across the entire codebase without producing any output files.

**What it catches:** Type mismatches, missing properties, wrong function arguments, undefined variables — all caught before the code runs.

**Why `--noEmit`:** We only want the type errors, not the compiled JavaScript (Railway compiles it separately during build).

---

### 6. PostgreSQL 15 Service Container

**What it is:** A real PostgreSQL database that runs inside Docker alongside the CI job. Defined under `services:` in the workflow.

**Why a real database:** Our tests use actual SQL queries against a real PostgreSQL instance — not mocks. This catches bugs that mocks would miss: wrong column names, constraint violations, transaction edge cases.

**Health check:** The workflow waits for PostgreSQL to be ready (`pg_isready`) before running tests. Without this, tests would fail randomly because the DB wasn't up yet.

---

### 7. Jest + ts-jest

**What it is:** Jest is the test runner. `ts-jest` is a plugin that lets Jest run TypeScript test files directly without a separate compile step.

**What we test:** 19 test files, 97 tests covering:
- Authentication (login, logout, token refresh, session handling)
- RBAC (roles, permissions, user creation)
- All major business domains (employees, payroll, quotes, etc.)
- Multi-tenant isolation

**`--runInBand`:** Tests run sequentially (one at a time) rather than in parallel. This is required because all tests share the same PostgreSQL database — parallel tests would conflict with each other.

---

### 8. Railway (Deployment Platform)

**What it is:** A Platform-as-a-Service (PaaS) that hosts both the backend API and the frontend. Similar to Heroku but more modern.

**How deployment works:**
1. Code is merged to `main`
2. Railway detects the push via GitHub webhook
3. Railway builds the service using Nixpacks
4. The new container replaces the old one (zero-downtime rolling restart)
5. If the build fails, the previous version keeps running

**Our two Railway services:**
| Service | Build | Start command |
|---------|-------|---------------|
| Backend | `npm install --include=dev && npm run build` (compiles TypeScript) | `npm start` (runs `node dist/index.js`) |
| Frontend | `npm install && npm run build:railway` (Vite build) | `npx serve -s dist` (serves static files) |

---

### 9. Nixpacks (Railway's Build System)

**What it is:** An open-source build system created by Railway. It automatically detects the language/framework (Node.js, Python, etc.) and generates a reproducible build without a Dockerfile.

**How it works:**
1. Detects `package.json` → identifies as Node.js
2. Runs `buildCommand` from `railway.json`
3. Packages the result into a Docker image
4. Deploys the image

**Why not Docker directly:** Nixpacks removes the need to maintain a Dockerfile. For a Node.js app, it handles everything automatically. We only override the build and start commands via `railway.json`.

---

### 10. GitHub Rulesets (Branch Protection)

**What it is:** Rules enforced by GitHub on specific branches. A PR cannot be merged until all rules pass.

**Our rules for `main` and `staging`:**
- Require a pull request (no direct pushes)
- Both CI checks must pass:
  - `Backend — Typecheck & Tests`
  - `Frontend — Typecheck`

**Why this matters:** It's impossible (even for the repo owner) to merge broken code. The CI acts as a gate, not just a notification.

---

## Current Pipeline Limitations

| Limitation | Impact |
|------------|--------|
| No staging Railway environment | `staging` branch exists but nothing auto-deploys to a staging server — there's nothing to test before merging to main |
| No frontend tests | CI only type-checks the frontend. No Jest/Vitest unit tests, no browser tests |
| No error monitoring | Production errors are only visible in Railway logs — no alerts, no Sentry |
| No code coverage threshold | Tests run but there's no minimum coverage requirement — gaps can grow silently |
| No dependency update automation | New security patches in npm packages require manual PR |

---

## Recommended Future Upgrades

These are prioritised by impact. Each one is independent — add them one at a time.

---

### Priority 1 — Sentry (Error Monitoring)

**What:** Sentry captures every uncaught exception in production and sends an alert. It shows the full stack trace, the request that caused it, and which users were affected.

**Why now:** Currently, if the production API throws a 500 error, you find out when a user complains. Sentry tells you immediately.

**Effort:** ~2 hours. Install `@sentry/node`, add one `Sentry.init()` call, add one error-handling middleware.

```
npm install @sentry/node
```

---

### Priority 2 — Staging Railway Environment

**What:** A second Railway environment (separate database, separate URL) that auto-deploys from the `staging` branch. Changes are tested on real infrastructure before reaching production.

**Why:** Right now staging is just a git branch. There's no actual staging server to test against.

**How:** In Railway, duplicate the current backend service, point it at the `staging` branch, give it its own `DATABASE_URL`. The frontend CI/CD doc should also mention this.

---

### Priority 3 — Dependabot

**What:** A GitHub bot that automatically opens PRs to update dependencies when new versions are released. Each PR runs CI so you know immediately if an update breaks something.

**Why:** Security patches in npm packages (e.g., a critical vulnerability in `jsonwebtoken`) would be automatically surfaced and easy to merge.

**Setup:** Create `.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /backend
    schedule:
      interval: weekly
  - package-ecosystem: npm
    directory: /client
    schedule:
      interval: weekly
```

---

### Priority 4 — Code Coverage Threshold

**What:** Jest can measure which lines of code are executed during tests and fail CI if coverage drops below a threshold (e.g., 70%).

**Why:** Prevents coverage from silently degrading as new features are added without tests.

**How:** Add to `backend/jest.config.ts`:

```typescript
coverageThreshold: {
  global: {
    lines: 70,
    functions: 70
  }
}
```

And add `--coverage` to the CI test command.

---

### Priority 5 — Frontend Test Suite (Vitest)

**What:** Unit and component tests for the React frontend using Vitest (Vite-native, fast) and React Testing Library.

**Why:** Currently the frontend has zero automated tests. A broken component ships silently as long as TypeScript is happy.

**What to test first:** Auth flow (login, token refresh, logout), permission guards, any component that handles money or sensitive data.

---

### Priority 6 — End-to-End Tests (Playwright)

**What:** Browser-level tests that simulate a real user clicking through the app. Playwright controls a real Chromium browser.

**Why:** Catches bugs that unit tests miss — wrong API endpoint called, button doesn't trigger the right action, redirect goes to the wrong page.

**How it fits in CI:**

```yaml
- name: Run E2E tests
  run: npx playwright test
  env:
    BASE_URL: http://localhost:5173
    API_URL: http://localhost:3001
```

These run against the full stack (frontend + backend + database) started locally in CI.

---

### Priority 7 — Docker Compose for Local Development

**What:** A `docker-compose.yml` that starts the backend, frontend, and PostgreSQL with one command:

```bash
docker compose up
```

**Why:** Eliminates "works on my machine" problems. Every developer and the CI runner uses the identical environment.

**Note:** This doesn't change how Railway deploys (still Nixpacks) — it only standardises local development.

---

### Priority 8 — Structured Log Shipping

**What:** Send logs to a log aggregation service (Logtail, Datadog, or Papertrail) so you can search, filter, and alert on production logs after the fact.

**Why:** Railway logs are ephemeral — they disappear after a while. When debugging a production issue from last week, you need searchable logs.

**Easiest option:** Logtail — add the `@logtail/node` package, replace the custom logger wrapper with Logtail, done.

---

## Upgrade Roadmap Summary

| # | Upgrade | Effort | Impact |
|---|---------|--------|--------|
| 1 | Sentry error monitoring | 2 hours | High — know about errors before users do |
| 2 | Staging Railway environment | 1 hour | High — actually test before prod |
| 3 | Dependabot | 10 minutes | Medium — auto security patches |
| 4 | Coverage threshold | 30 minutes | Medium — prevent test gaps growing |
| 5 | Vitest frontend tests | 1-2 days | Medium — catch frontend regressions |
| 6 | Playwright E2E tests | 2-3 days | High — catch full-stack bugs |
| 7 | Docker Compose local dev | 2 hours | Medium — consistent dev environments |
| 8 | Structured log shipping | 1 hour | Medium — searchable production logs |
