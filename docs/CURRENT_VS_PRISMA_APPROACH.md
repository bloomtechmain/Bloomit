# Current Method vs Prisma Approach — Simple Explanation

## Table of Contents

1. [The Big Picture](#1-the-big-picture)
2. [Current Method — Raw SQL with pg](#2-current-method--raw-sql-with-pg)
3. [Suggested Method — Prisma with Scoped Client](#3-suggested-method--prisma-with-scoped-client)
4. [Same Example, Both Ways](#4-same-example-both-ways)
5. [Request Lifecycle — Step by Step](#5-request-lifecycle--step-by-step)
6. [More Examples Side by Side](#6-more-examples-side-by-side)
7. [What Changes, What Stays the Same](#7-what-changes-what-stays-the-same)
8. [Summary Table](#8-summary-table)

---

## 1. The Big Picture

Imagine the database as an office building.

```
┌─────────────────────────────────────────────┐
│              Office Building                 │
│           (PostgreSQL Database)              │
│                                              │
│  ┌──────────────┐   ┌──────────────┐        │
│  │  Ground Floor│   │   Floor 1    │        │
│  │  (public)    │   │ (acme_corp)  │        │
│  │              │   │              │        │
│  │  - users     │   │  - employees │        │
│  │  - tenants   │   │  - payroll   │        │
│  │  - roles     │   │  - projects  │        │
│  └──────────────┘   └──────────────┘        │
│                                              │
│                      ┌──────────────┐        │
│                      │   Floor 2    │        │
│                      │ (globex_ltd) │        │
│                      │              │        │
│                      │  - employees │        │
│                      │  - payroll   │        │
│                      │  - projects  │        │
│                      └──────────────┘        │
└─────────────────────────────────────────────┘
```

- Each **company** (tenant) lives on its **own floor** (PostgreSQL schema)
- The **ground floor** (public schema) is shared — it holds login and user data
- A company on Floor 1 **cannot see** Floor 2's data — they are completely separate

Both the current method and the Prisma method use this same building layout.
**The difference is how you navigate to the right floor.**

---

## 2. Current Method — Raw SQL with pg

### How it works

The current method uses the `pg` library to run raw SQL queries. To get to the right
tenant's floor, it runs a special PostgreSQL command called `SET search_path`.

Think of `SET search_path` as telling the elevator: **"Go to Floor 1 (acme_corp)"**.
After that, every query you run happens on that floor.

### The flow

```
User logs in
    │
    ▼
Server reads tenantId from JWT token
    │
    ▼
Server looks up tenant's schema_name from the tenants table
    │  (e.g. tenantId: 5 → schema_name: "tenant_acme_corp")
    ▼
Middleware runs:  SET search_path TO "tenant_acme_corp", public
    │  (elevator goes to ACME Corp's floor)
    ▼
Controller runs raw SQL:  SELECT * FROM employees
    │  (query runs on ACME Corp's floor — returns only their employees)
    ▼
Response sent to user
```

### Simple example — Get all employees

**Step 1: Middleware sets the schema (tenant-schema.ts)**

```typescript
// This runs on every request after login
const result = await db.query(
  'SELECT schema_name FROM tenants WHERE id = $1',
  [req.user.tenantId]
)

const schemaName = result.rows[0].schema_name

// Tell PostgreSQL: "use this tenant's floor for all queries"
await db.query(`SET search_path TO "${schemaName}", public`)

// Attach the db connection to the request
req.db = db
next()
```

**Step 2: Controller fetches employees (employeeController.ts)**

```typescript
export async function getEmployees(req: Request, res: Response) {
  // search_path is already set to tenant's schema by middleware
  // So "employees" means "tenant_acme_corp.employees"
  const result = await req.db.query(`
    SELECT
      id,
      first_name,
      last_name,
      designation,
      base_salary
    FROM employees
    WHERE is_active = true
    ORDER BY created_at DESC
  `)

  res.json(result.rows)
}
```

### What this looks like in the database

```sql
-- PostgreSQL receives these commands in order:

SET search_path TO "tenant_acme_corp", public;
-- Now PostgreSQL knows: "employees" means "tenant_acme_corp.employees"

SELECT id, first_name, last_name, designation, base_salary
FROM employees          -- ← this resolves to tenant_acme_corp.employees
WHERE is_active = true
ORDER BY created_at DESC;

-- Returns only ACME Corp's employees ✓
-- Cannot accidentally return Globex Ltd's employees ✓
```

### The problem with the current method

```typescript
// The developer writes 1 query without raw SQL — and must write everything manually

// 1. No type safety — result.rows is typed as "any"
const employees = result.rows  // TypeScript has no idea what's in here

// 2. Typos cause runtime errors, not compile-time errors
const result = await db.query(`
  SELECT fist_name FROM employees  -- typo: "fist_name" instead of "first_name"
`)
// This fails only when the code runs, not when you write it

// 3. You must manually write every SQL query
// For a simple create, you write:
await db.query(`
  INSERT INTO employees
    (first_name, last_name, email, designation, base_salary, tenant_id)
  VALUES ($1, $2, $3, $4, $5, $6)
  RETURNING *
`, [firstName, lastName, email, designation, salary, tenantId])

// 4. Relationships require manual JOINs
await db.query(`
  SELECT e.*, p.gross_salary
  FROM employees e
  LEFT JOIN payslips p ON p.employee_id = e.id
  WHERE e.id = $1
`, [employeeId])
```

---

## 3. Suggested Method — Prisma with Scoped Client

### How it works

Prisma is an **ORM (Object Relational Mapper)**. Instead of writing raw SQL, you use
TypeScript functions. Prisma writes the SQL for you — and it knows the exact shape of
every table because you defined it in a schema file.

The key difference: instead of telling one shared connection to "switch floors",
we give each tenant their **own dedicated elevator** — a `PrismaClient` locked to
their floor from the start.

```
User logs in
    │
    ▼
Server reads tenantId from JWT token
    │
    ▼
Server looks up tenant's schema_name from the tenants table
    │  (e.g. tenantId: 5 → schema_name: "tenant_acme_corp")
    ▼
Factory creates (or reuses) a PrismaClient locked to that schema
    │  const prisma = getTenantPrismaClient("tenant_acme_corp")
    │  This client can ONLY talk to tenant_acme_corp's floor
    ▼
Controller uses prisma functions — no SQL needed
    │  prisma.employee.findMany({ where: { isActive: true } })
    ▼
Prisma generates the SQL internally and runs it
    │
    ▼
Response sent to user — fully type-safe
```

### Simple example — Get all employees (same task as above)

**Step 1: The client factory (tenantPrismaClient.ts)**

```typescript
import { PrismaClient } from '../generated/tenant-client'

// A cache so we reuse the same client for the same tenant
const cache = new Map<string, PrismaClient>()

export function getTenantPrismaClient(schemaName: string): PrismaClient {
  // Return existing client if already created for this tenant
  if (cache.has(schemaName)) {
    return cache.get(schemaName)!
  }

  // Create a new Prisma client locked to this tenant's schema
  const client = new PrismaClient({
    datasources: {
      db: {
        url: `${process.env.DATABASE_URL}?schema=${schemaName}`
        //   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        //   This client can ONLY access tenant_acme_corp's tables
        //   It physically cannot reach tenant_globex_ltd's tables
      }
    }
  })

  cache.set(schemaName, client)
  return client
}
```

**Step 2: Middleware attaches the scoped client (tenant-prisma.ts)**

```typescript
export async function attachTenantPrisma(req, res, next) {
  // Get the tenant's schema name
  const tenant = await publicPrisma.tenant.findUnique({
    where: { id: req.user.tenantId },
    select: { schema_name: true }
  })

  // Attach a client that is locked to this tenant's schema
  req.tenantPrisma = getTenantPrismaClient(tenant.schema_name)

  next()
}
```

**Step 3: Controller fetches employees (employeeController.ts)**

```typescript
export async function getEmployees(req: Request, res: Response) {
  // No SQL. No search_path. Just a function call.
  const employees = await req.tenantPrisma.employee.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' }
  })
  //  ^^^^^^^^
  //  TypeScript KNOWS the shape of "employees" here
  //  employees[0].firstName  ← autocomplete works
  //  employees[0].fistName   ← TypeScript ERROR at compile time

  res.json(employees)
}
```

### What Prisma generates internally

Prisma takes your function call and converts it to the same SQL the current method
writes by hand:

```typescript
// You write this:
prisma.employee.findMany({
  where: { isActive: true },
  orderBy: { createdAt: 'desc' }
})

// Prisma generates and runs this SQL:
// SELECT "id", "first_name", "last_name", "designation", "base_salary"
// FROM "tenant_acme_corp"."employees"
// WHERE "is_active" = true
// ORDER BY "created_at" DESC;
```

You get the same result — but with full type safety and no manual SQL.

---

## 4. Same Example, Both Ways

Let's use one complete, realistic example: **creating a new employee**.

### Current method — raw SQL

```typescript
// employeeController.ts — current approach
export async function createEmployee(req: Request, res: Response) {
  const {
    firstName, lastName, email,
    designation, baseSalary, tenantId
  } = req.body

  // Must write INSERT manually
  // Must know every column name exactly
  // No compile-time checking
  const result = await req.db.query(`
    INSERT INTO employees (
      first_name,
      last_name,
      email,
      designation,
      base_salary,
      tenant_id,
      is_active,
      created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, true, NOW())
    RETURNING *
  `, [firstName, lastName, email, designation, baseSalary, tenantId])

  // result.rows[0] is typed as "any" — no autocomplete
  res.status(201).json(result.rows[0])
}
```

### Suggested method — Prisma

```typescript
// employeeController.ts — Prisma approach
export async function createEmployee(req: Request, res: Response) {
  const {
    firstName, lastName, email,
    designation, baseSalary
  } = req.body

  // Prisma writes the SQL for you
  // TypeScript checks every field name at compile time
  const employee = await req.tenantPrisma.employee.create({
    data: {
      firstName,       // ← TypeScript error if field doesn't exist
      lastName,
      email,
      designation,
      baseSalary,
      isActive: true
    }
  })

  // "employee" is fully typed — you get autocomplete on every field
  res.status(201).json(employee)
}
```

### Same example with a relationship — Get employee with their latest payslip

**Current method:**

```typescript
// Must manually write a JOIN query
const result = await req.db.query(`
  SELECT
    e.id,
    e.first_name,
    e.last_name,
    e.designation,
    p.gross_salary,
    p.net_salary,
    p.month,
    p.year
  FROM employees e
  LEFT JOIN payslips p ON p.employee_id = e.id
  WHERE e.id = $1
  ORDER BY p.year DESC, p.month DESC
  LIMIT 1
`, [req.params.id])

const employee = result.rows[0]  // typed as "any"
```

**Prisma method:**

```typescript
// Prisma handles the JOIN for you
const employee = await req.tenantPrisma.employee.findUnique({
  where: { id: Number(req.params.id) },
  include: {
    payslips: {
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: 1
    }
  }
})

// employee.payslips[0].grossSalary  ← fully typed, autocomplete works
```

---

## 5. Request Lifecycle — Step by Step

Here is what happens from the moment a user clicks "View Employees" to when they see the list.

### Current Method

```
Browser → GET /employees
              │
              ▼
        ┌─────────────────────────────────────────┐
        │  1. auth.ts middleware                   │
        │     - Reads JWT from Authorization header │
        │     - Verifies token signature            │
        │     - Extracts: userId=42, tenantId=5    │
        │     - Checks active_sessions table        │
        └──────────────────┬──────────────────────┘
                           │
                           ▼
        ┌─────────────────────────────────────────┐
        │  2. tenant-schema.ts middleware          │
        │                                          │
        │  db.query(                               │
        │    "SELECT schema_name FROM tenants      │
        │     WHERE id = $1", [5]                  │
        │  )                                       │
        │  → schema_name = "tenant_acme_corp"      │
        │                                          │
        │  db.query(                               │
        │    'SET search_path TO                   │
        │     "tenant_acme_corp", public'          │
        │  )                                       │
        │  → PostgreSQL: "I'll use acme's floor"  │
        │                                          │
        │  req.db = db  ← attach connection        │
        └──────────────────┬──────────────────────┘
                           │
                           ▼
        ┌─────────────────────────────────────────┐
        │  3. employeeController.ts               │
        │                                          │
        │  req.db.query(                           │
        │    "SELECT * FROM employees              │
        │     WHERE is_active = true"              │
        │  )                                       │
        │  → runs on tenant_acme_corp.employees   │
        └──────────────────┬──────────────────────┘
                           │
                           ▼
              Response: [ { id:1, first_name:"Ali"... } ]
```

### Suggested Method (Prisma)

```
Browser → GET /employees
              │
              ▼
        ┌─────────────────────────────────────────┐
        │  1. auth.ts middleware (unchanged)       │
        │     - Same JWT verification              │
        │     - Extracts: userId=42, tenantId=5   │
        └──────────────────┬──────────────────────┘
                           │
                           ▼
        ┌─────────────────────────────────────────┐
        │  2. tenant-prisma.ts middleware          │
        │                                          │
        │  publicPrisma.tenant.findUnique(         │
        │    { where: { id: 5 } }                  │
        │  )                                       │
        │  → schema_name = "tenant_acme_corp"      │
        │                                          │
        │  getTenantPrismaClient(                  │
        │    "tenant_acme_corp"                    │
        │  )                                       │
        │  → returns a PrismaClient that is        │
        │    LOCKED to tenant_acme_corp schema     │
        │    (this client has no idea other        │
        │     schemas exist)                       │
        │                                          │
        │  req.tenantPrisma = client               │
        └──────────────────┬──────────────────────┘
                           │
                           ▼
        ┌─────────────────────────────────────────┐
        │  3. employeeController.ts               │
        │                                          │
        │  req.tenantPrisma.employee.findMany({    │
        │    where: { isActive: true }             │
        │  })                                      │
        │                                          │
        │  Prisma internally generates:            │
        │  SELECT * FROM                           │
        │  "tenant_acme_corp"."employees"          │
        │  WHERE is_active = true                  │
        └──────────────────┬──────────────────────┘
                           │
                           ▼
              Response: [ { id:1, firstName:"Ali"... } ]
                            ↑ fully typed Employee object
```

**The key difference in step 2:**

| | Current | Prisma |
|--|---------|--------|
| How schema is set | `SET search_path` on a shared connection | Separate `PrismaClient` per tenant, URL locked to schema |
| Risk | If search_path is not set or resets, query hits wrong schema | Client is physically bound to one schema — cannot drift |
| Connection type | Shared pool with schema switching | Dedicated client per tenant |

---

## 6. More Examples Side by Side

### Example A — Update employee salary

**Current:**
```typescript
await req.db.query(`
  UPDATE employees
  SET base_salary = $1, updated_at = NOW()
  WHERE id = $2
`, [newSalary, employeeId])
```

**Prisma:**
```typescript
await req.tenantPrisma.employee.update({
  where: { id: employeeId },
  data: { baseSalary: newSalary }
})
```

---

### Example B — Delete an employee record

**Current:**
```typescript
await req.db.query(
  'DELETE FROM employees WHERE id = $1',
  [employeeId]
)
```

**Prisma:**
```typescript
await req.tenantPrisma.employee.delete({
  where: { id: employeeId }
})
```

---

### Example C — Get all unpaid payables with vendor name

**Current:**
```typescript
const result = await req.db.query(`
  SELECT
    p.payable_id,
    p.amount,
    p.due_date,
    v.name AS vendor_name
  FROM payables p
  LEFT JOIN vendors v ON v.id = p.vendor_id
  WHERE p.is_active = true
  ORDER BY p.due_date ASC
`)

const payables = result.rows  // type: any[]
```

**Prisma:**
```typescript
const payables = await req.tenantPrisma.payable.findMany({
  where: { isActive: true },
  include: { vendor: true },       // JOIN handled automatically
  orderBy: { dueDate: 'asc' }
})

// payables[0].vendor.name  ← typed, autocomplete works
// payables[0].amount       ← typed as Decimal
```

---

### Example D — Count active employees per department

**Current:**
```typescript
const result = await req.db.query(`
  SELECT
    employee_department,
    COUNT(*) as total
  FROM employees
  WHERE is_active = true
  GROUP BY employee_department
`)

const stats = result.rows  // type: any[]
```

**Prisma:**
```typescript
const stats = await req.tenantPrisma.employee.groupBy({
  by: ['employeeDepartment'],
  where: { isActive: true },
  _count: { id: true }
})

// stats[0].employeeDepartment  ← typed string
// stats[0]._count.id           ← typed number
```

---

## 7. What Changes, What Stays the Same

### What STAYS THE SAME

```
✓ PostgreSQL database — no changes
✓ Schema-per-tenant architecture — no changes
✓ JWT authentication flow — no changes
✓ RBAC permission system — no changes
✓ tenant_id in public.users — no changes
✓ Express routes and middleware structure — no changes
✓ Frontend code — no changes at all
✓ How tenants are provisioned — no changes
```

### What CHANGES

```
✗ How controllers talk to the database
  Before:  req.db.query("SELECT * FROM employees")
  After:   req.tenantPrisma.employee.findMany()

✗ How the tenant schema is applied
  Before:  SET search_path TO "tenant_acme_corp"
  After:   PrismaClient locked to "tenant_acme_corp" in its URL

✗ Type safety
  Before:  result.rows is "any" — no compile-time checks
  After:   Every query returns a fully typed object

✗ Error detection
  Before:  Typos and wrong column names fail at runtime
  After:   TypeScript catches them before the code even runs
```

---

## 8. Summary Table

| Topic | Current Method | Prisma Method |
|-------|---------------|---------------|
| **Language** | Raw SQL strings | TypeScript functions |
| **Type safety** | None — everything is `any` | Full — every model is typed |
| **Schema switching** | `SET search_path` per request | Separate client per tenant, URL locked to schema |
| **Typo detection** | Runtime crash | Compile-time TypeScript error |
| **Writing queries** | Manual SQL for every operation | `findMany`, `create`, `update`, `delete` functions |
| **Relationships** | Manual `JOIN` SQL | `include: { vendor: true }` |
| **Risk of wrong schema** | Possible if search_path drifts | Not possible — client is locked |
| **Autocomplete in editor** | None | Full autocomplete for all fields |
| **Database** | PostgreSQL — unchanged | PostgreSQL — unchanged |
| **Architecture** | Schema-per-tenant | Schema-per-tenant (same) |
| **Security level** | Good | Better (locked client + optional RLS) |
| **Migration effort** | N/A (current state) | Gradual — replace one controller at a time |

---

### In one sentence

> **The current method tells a shared connection which floor to go to before each query.
> The Prisma method gives each tenant their own elevator that only goes to their floor —
> and replaces hand-written SQL with typed TypeScript functions.**

---

*Document maintained by Bloomtech Engineering. Last updated: April 2026.*
