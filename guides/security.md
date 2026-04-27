# Bloomtech ERP — Security Overview

Last reviewed: 2026-04-28

---

## Overall Status

| Area | Status |
|------|--------|
| Authentication & JWT | ✅ Pass |
| CORS | ✅ Pass |
| Security Headers | ✅ Pass |
| Rate Limiting | ✅ Pass |
| Password Hashing | ✅ Pass |
| Password Strength | ✅ Pass |
| Input Validation | ✅ Pass |
| Audit Logging | ✅ Pass |
| Session Management | ✅ Pass |
| Tenant Isolation | ✅ Pass |
| RBAC | ✅ Pass |
| Environment Variables | ✅ Pass |
| SQL Injection | ✅ Pass |
| Secrets / Debug Logs | ✅ Pass |
| Dependency Vulnerabilities | ✅ Pass |
| Dev Endpoints | ✅ Pass |
| Body Size / Content-Type | ✅ Pass |

---

## 1. Authentication & JWT

- Access tokens expire in **30 minutes** (`JWT_SECRET`)
- Refresh tokens expire in **7 days** (`JWT_REFRESH_SECRET`)
- Both secrets are **required at startup** — the server refuses to start if either is missing
- No hardcoded fallback secrets anywhere in the codebase
- The `/auth/refresh` endpoint verifies tokens with `verifyRefreshToken()` (uses `JWT_REFRESH_SECRET`), not the access-token verifier — preventing token type confusion attacks

---

## 2. CORS

- Wildcard `*` is **never used** in any environment
- Allowed origins are explicit: `FRONTEND_URL` env var + production domain
- `localhost` origins are only added when `NODE_ENV !== 'production'`
- All CORS responses include `credentials: true` to support cookie-based auth if needed in future

---

## 3. Security Headers

[Helmet](https://helmetjs.github.io/) is applied globally and sets the following headers on every response:

- `Content-Security-Policy`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security`
- `X-XSS-Protection`
- `Cross-Origin-Resource-Policy: cross-origin`

---

## 4. Rate Limiting

Auth endpoints are rate-limited with [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit):

| Endpoint | Limit |
|----------|-------|
| `POST /auth/login` | 20 requests per 15 minutes per IP |

Exceeding the limit returns `429 Too Many Requests` with a retry hint.

---

## 5. Password Hashing

All passwords are hashed with **bcrypt at cost factor 12** before storage. Plain-text passwords are never stored, logged, or returned in API responses (admin-reset flows return the temporary password once to the admin only, never persisted in logs).

---

## 6. Password Strength

All user-facing password operations enforce the following minimum requirements:

- At least **10 characters**
- At least one **uppercase letter**
- At least one **lowercase letter**
- At least one **number**
- At least one **special symbol** (`!@#$%^&*` etc.)

Enforced at: `POST /auth/change-password`

System-generated temporary passwords (admin create-user, admin reset-password) are produced by a cryptographically secure generator that inherently satisfies all requirements.

**Password history:** The last 3 password hashes are stored per user. A new password is rejected if it matches any of them.

---

## 7. Input Validation

Critical endpoints use [Zod](https://zod.dev) schema validation. Invalid or missing fields return `400 validation_error` with a descriptive message before any business logic runs.

| Endpoint | Schema |
|----------|--------|
| `POST /auth/login` | email (string), password (string), force (bool, optional) |
| `POST /rbac/roles` | name (string, max 50), description (string, max 500, optional) |
| `POST /rbac/users` | email (valid format), roleIds (non-empty int array) |
| `PUT /rbac/roles/:id/permissions` | permissionIds (int array) |

---

## 8. Audit Logging

Security-relevant events are written to the `rbac_audit_log` table with `user_id`, `action`, `details` (JSON), `ip_address`, and `created_at`. Audit failures are non-blocking — they never prevent the main operation from completing.

| Event | Trigger |
|-------|---------|
| `LOGIN` | Successful login |
| `LOGOUT` | Explicit logout |
| `CHANGE_PASSWORD` | User self-service password change |
| `CREATE_ROLE` | New RBAC role created |
| `UPDATE_ROLE` | Role name/description changed |
| `DELETE_ROLE` | Role deleted |
| `UPDATE_ROLE_PERMISSIONS` | Permissions assigned to a role |
| `CREATE_USER` | New user added to a tenant |
| `ASSIGN_ROLES` | User's roles changed |
| `RESET_USER_PASSWORD` | Admin resets a user's password |
| `MIGRATE_GRANULAR_PERMISSIONS` | Permission migration executed |
| `ONBOARD_EMPLOYEE` | Employee onboarding completed |

---

## 9. Session Management

- **Single-session enforcement**: Only one active session is allowed per user. A second login from a new device is blocked unless the user explicitly forces it (which invalidates the previous session).
- **Idle timeout**: Sessions are invalidated after **8 hours of inactivity**. Each authenticated request refreshes the `last_activity_at` timestamp.
- **Absolute expiry**: Sessions have a hard 7-day maximum regardless of activity.
- **Logout**: Invalidates the session immediately — the refresh token can no longer be used.
- **Session token in JWT**: The session token is embedded in both access and refresh tokens and validated on every request. Changing passwords or force-logging-in from a new device invalidates all previous tokens.

---

## 10. Tenant Isolation

This is a **multi-tenant SaaS application**. Each tenant's data lives in a dedicated PostgreSQL schema (`tenant_<name>`). Isolation is enforced at multiple layers:

1. **JWT claim**: The `tenantId` is embedded in the token at login time.
2. **Server-side verification**: `tenant-schema` middleware verifies the authenticated user actually belongs to the claimed tenant by querying `public.users` — a tampered JWT cannot cross tenant boundaries.
3. **Schema switch**: After verification, the database `search_path` is set to the tenant's schema. All subsequent queries in that request are scoped to that schema only.
4. **Reset after response**: The `search_path` is reset to `public` after every response to prevent leakage between requests on a pooled connection.

---

## 11. Role-Based Access Control (RBAC)

- Permissions follow the `resource:action` format (e.g., `employees:read`, `payroll:manage`)
- Each user can have multiple roles; permissions are the union of all roles
- `403 Forbidden` responses contain only `{ "error": "forbidden" }` — no permission names, role names, or required scopes are revealed
- System roles (e.g., Super Admin) cannot be modified or deleted
- The Super Admin role always has `settings:manage` — this is enforced as a safety net at login time

---

## 12. Environment Variable Validation

The server will **refuse to start** if any of these are missing:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Signs access tokens |
| `JWT_REFRESH_SECRET` | Signs refresh tokens (must differ from JWT_SECRET) |
| `FRONTEND_URL` | Used for CORS allowed origins |

---

## 13. SQL Injection

All database queries throughout the codebase use **parameterized statements** (`$1`, `$2`, … placeholders). No user input is ever interpolated directly into SQL strings. This applies to all 40+ controllers and service files.

---

## 14. Dependency Vulnerabilities

```
npm audit: found 0 vulnerabilities
```

Key dependency versions as of last review:

| Package | Version |
|---------|---------|
| bcryptjs | ^3.0.3 |
| jsonwebtoken | ^9.0.3 |
| helmet | ^8.1.0 |
| express-rate-limit | ^8.4.1 |
| node-cron | ^4.2.1 |
| nodemailer | ^8.0.7 |
| zod | ^4.x |

---

## 15. Dev Endpoints

`/dev/seed-user` and `/dev/upsert-user` are only registered when **both** conditions are true:

1. `ENABLE_DEV_ENDPOINTS=true` (must be explicitly set)
2. `NODE_ENV !== 'production'`

These routes are never accessible in production regardless of environment variables.

---

## 16. Body Size & Content-Type

- `express.json()` limit is set to **10 MB** — prevents large-payload denial-of-service
- Express only parses `application/json` content-type by default
- Helmet sets `X-Content-Type-Options: nosniff` to prevent MIME sniffing

---

## Known Limitations

- Zod validation is applied to auth and RBAC endpoints. Other CRUD endpoints (employees, projects, payables, etc.) use manual type-checking. These are lower-risk as they are behind `requireAuth + tenantSchemaMiddleware`, but full Zod coverage is the long-term goal.
- No CSRF protection — acceptable as long as the frontend uses `Authorization: Bearer` headers (not cookies). If cookies are introduced for auth in future, CSRF tokens must be added.
- Rate limiting currently targets only `/auth/login`. High-volume write endpoints (e.g., bulk imports) may warrant additional limits in future.
