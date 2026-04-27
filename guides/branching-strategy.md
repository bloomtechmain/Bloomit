# Branching Strategy & Feature Update Workflow

This guide covers how to develop new features safely, how the automated CI pipeline works, and what to do when deploying changes to production.

---

## The Golden Rule

> **Never commit directly to `main`.** Every change — no matter how small — goes through a branch and a Pull Request.

`main` is always live. A broken push to `main` = a broken app for real users.

---

## Branch Structure

```
main          → always live in production (erpbloom.com)
  └── feature/invoice-export     ← new feature
  └── fix/quote-email-bug        ← bug fix
  └── chore/update-dependencies  ← maintenance
```

You create a branch, do your work, then merge it back to `main` via a Pull Request. Railway deploys automatically when `main` is updated.

---

## Step-by-Step: Adding Any Feature or Fix

### 1. Start from an up-to-date main

```bash
git checkout main
git pull origin main
```

### 2. Create a branch

Name it clearly so anyone knows what it does:

```bash
# New feature
git checkout -b feature/invoice-pdf-export

# Bug fix
git checkout -b fix/login-redirect-loop

# Maintenance task
git checkout -b chore/upgrade-node-20
```

### 3. Build and test locally

Make your changes, then run the app locally to verify it works. For backend changes:

```bash
cd backend
npm run dev
```

For frontend changes:

```bash
cd client
npm run dev
```

### 4. Run tests before pushing

```bash
cd backend
npm test
```

All tests must pass locally before you push.

### 5. Commit your changes

```bash
git add .
git commit -m "feat: add PDF export for invoices"
```

Use clear commit message prefixes:
- `feat:` — new feature
- `fix:` — bug fix
- `chore:` — maintenance, config, dependencies
- `migrate:` — database schema change

### 6. Push your branch

```bash
git push origin feature/invoice-pdf-export
```

### 7. Open a Pull Request on GitHub

1. Go to the GitHub repo
2. Click the banner **"Compare & pull request"** that appears after pushing
3. Fill in the PR template (what it does, checklist)
4. Create the Pull Request

### 8. Wait for CI to pass

GitHub Actions automatically runs two checks on every PR:

| Check | What it does |
|---|---|
| Backend — Typecheck & Tests | Runs TypeScript check + all 19 backend tests |
| Frontend — Typecheck | Runs TypeScript check on React code |

You will see green checkmarks ✅ or red crosses ❌ on the PR page.

- **All green** → safe to merge
- **Any red** → fix the issue before merging

### 9. Merge the PR

Once CI is green, click **Merge pull request** on GitHub. Railway detects the push to `main` and deploys automatically within 2–3 minutes.

### 10. Verify on production

After the deploy shows **Active** in Railway:
- Visit `erpbloom.com` and test the new feature
- Check Railway logs for any runtime errors

---

## Special Case: Database Schema Changes

If your feature adds a new table or column, follow this extended process.

### What counts as a schema change?
- Adding a new table
- Adding a column to an existing table
- Removing or renaming a column
- Adding an index

### The process

**Before coding:**

Make sure your migration script is ready. Your project already has a pattern for this in `backend/src/scripts/`.

**After merging to main and Railway deploys:**

1. Go to Railway dashboard → backend service → **Shell** tab
2. Run your migration:

```bash
npm run migrate:your-migration-name
```

3. Update `backend/src/databasse.sql` to reflect the change — this file is the source of truth for the full schema. Always keep it in sync.

**Why this order matters:**

Deploy code first, then run the migration. The new code should always be compatible with both the old and new schema so there is no downtime during the transition.

---

## What Happens When You Add a Feature Without Tests

The CI still runs all existing tests. Two outcomes:

**Your feature doesn't touch existing code:**
- All 19 existing tests pass ✅
- PR is allowed to merge
- Your new feature is untested but existing features are verified safe

**Your feature accidentally breaks something existing:**
- One or more existing tests fail ❌
- PR is blocked until you fix it
- This is CI doing its job — it caught a regression

The PR template includes a checkbox to acknowledge whether you wrote tests. If you didn't, you should note why (e.g., "UI-only change, no business logic"). This keeps it a conscious decision rather than something you forget.

---

## How the CI Pipeline Works

Every time you push to a branch that has an open PR (or push to `main`), GitHub Actions runs automatically:

```
Push to branch
      ↓
GitHub Actions starts (free, runs in the cloud)
      ↓
┌────────────────────────────────┐  ┌─────────────────────────┐
│  Backend Job                   │  │  Frontend Job            │
│  1. Start PostgreSQL database  │  │  1. Install dependencies │
│  2. Install dependencies       │  │  2. TypeScript check     │
│  3. TypeScript check           │  └─────────────────────────┘
│  4. Run all 19 tests           │
└────────────────────────────────┘
      ↓
All pass → PR shows ✅ → safe to merge
Any fail → PR shows ❌ → must fix first
```

The PostgreSQL database used by CI is temporary — it is created fresh for every run and destroyed after. It uses your `databasse.sql` schema automatically via the test setup.

---

## Handling Failures in CI

### TypeScript error

The error message will tell you exactly which file and line has the type error. Fix it locally, commit, and push again. CI re-runs automatically.

### Test failure

The CI logs show which test failed and why. Common causes:

- You changed an API response shape and a test expects the old shape → update the test
- A test depends on data that no longer exists → fix the test setup
- A genuine bug in your new code → fix the bug

### CI passes but production still breaks

This means the issue is environment-specific (missing env var, database migration not run, etc.). Check Railway logs immediately.

---

## Quick Reference

### Starting a new feature
```bash
git checkout main && git pull origin main
git checkout -b feature/your-feature-name
# ... make changes ...
npm test  # in backend/
git add . && git commit -m "feat: describe what you did"
git push origin feature/your-feature-name
# → Open PR on GitHub → wait for CI → merge
```

### Checking what's different from main
```bash
git diff main
```

### Discarding local changes if something goes wrong
```bash
git checkout main  # go back to main
# your branch changes are safe — just switch away
```

### PR checklist (before every merge)
- [ ] Works locally end-to-end
- [ ] `npm test` passes locally
- [ ] CI is green on GitHub
- [ ] If schema changed: migration script ready to run after deploy
- [ ] If schema changed: `databasse.sql` is updated
- [ ] If new env var: added to Railway dashboard already

---

## Commit Message Convention

| Prefix | When to use |
|---|---|
| `feat:` | New feature or capability |
| `fix:` | Bug fix |
| `chore:` | Config, dependencies, cleanup |
| `migrate:` | Database schema change |
| `security:` | Security-related change |
| `docs:` | Documentation only |

Example: `feat: add PDF export for invoices`
