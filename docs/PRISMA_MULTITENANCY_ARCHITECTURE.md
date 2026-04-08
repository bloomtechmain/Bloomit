# Prisma Multitenancy Architecture — Bloomtech ERP

## Table of Contents

1. [Why This Matters](#1-why-this-matters)
2. [The Core Problem with Naive Multitenancy](#2-the-core-problem-with-naive-multitenancy)
3. [Chosen Architecture: Schema-Per-Tenant](#3-chosen-architecture-schema-per-tenant)
4. [Security Layers](#4-security-layers)
5. [Architecture Diagram](#5-architecture-diagram)
6. [Prisma Setup](#6-prisma-setup)
   - [Public Schema (Shared Tables)](#61-public-schema-shared-tables)
   - [Tenant Schema Template](#62-tenant-schema-template)
7. [TenantPrismaClient Factory](#7-tenantprismaclient-factory)
8. [Middleware Integration](#8-middleware-integration)
9. [PostgreSQL Row Level Security (RLS)](#9-postgresql-row-level-security-rls)
10. [Least Privilege Database Users](#10-least-privilege-database-users)
11. [Migration Strategy](#11-migration-strategy)
12. [What to Avoid](#12-what-to-avoid)
13. [Production Checklist](#13-production-checklist)

---

## 1. Why This Matters

Bloomtech ERP handles highly sensitive data across multiple independent companies:

- **Payroll & salary records** — employees' personal financial data
- **Bank accounts & transactions** — company financial movements
- **Contracts & purchase orders** — commercially sensitive agreements
- **Employee personal details** — NIC numbers, addresses, dates of birth

A single data breach — where Company A can see Company B's data — is not just a bug. It is a **legal liability**, a **GDPR/data protection violation**, and a **complete loss of trust**. The architecture must make cross-tenant data access **physically impossible**, not just unlikely.

---

## 2. The Core Problem with Naive Multitenancy

### The Row-Level / `tenant_id` Approach (DO NOT USE for sensitive ERP data)

Many tutorials recommend adding a `tenant_id` column to every table and filtering every query:

```sql
SELECT * FROM employees WHERE tenant_id = 'abc-123';
```

This looks simple. It is dangerous.

**Why it fails at production scale:**

```
Developer writes 500 queries across 30 controllers.
Developer forgets tenant_id filter on query #347.
Query #347 returns ALL employees from ALL companies.
Result: Data breach.
```

| Risk | Description |
|------|-------------|
| Single point of failure | One missing `WHERE tenant_id = X` exposes everything |
| No database-level enforcement | The database has no concept of isolation — it relies entirely on application code |
| ORM bugs | An ORM update, a raw query, or a join can silently bypass tenant filters |
| Developer error | In a team environment, any new developer can introduce a cross-tenant query |
| Hard to audit | You cannot verify isolation without reviewing every single query |

> **The database itself must be the last line of defense — not application code alone.**

---

## 3. Chosen Architecture: Schema-Per-Tenant

Bloomtech ERP uses **PostgreSQL schema-per-tenant isolation**. This is the same pattern used by enterprise SaaS platforms.

### How it works

PostgreSQL allows multiple named schemas within a single database. Each tenant gets their own isolated schema:

```
database: bloomtech_erp
├── public                    ← Shared authentication tables
│   ├── tenants
│   ├── users
│   ├── roles
│   ├── permissions
│   ├── role_permissions
│   ├── user_roles
│   ├── active_sessions
│   └── rbac_audit_log
│
├── tenant_acme_corp          ← ACME Corporation's data
│   ├── employees
│   ├── projects
│   ├── contracts
│   ├── payroll
│   └── ... (40+ tables)
│
├── tenant_globex_ltd         ← Globex Ltd's data
│   ├── employees
│   ├── projects
│   ├── contracts
│   ├── payroll
│   └── ... (40+ tables)
│
└── tenant_initech            ← Initech's data
    ├── employees
    └── ...
```

### Why this is superior

| Property | Row-Level (`tenant_id`) | Schema-Per-Tenant |
|----------|------------------------|-------------------|
| Isolation enforced by | Application code | PostgreSQL engine |
| Cross-tenant query possible? | Yes, if filter is missed | No — tables don't exist in wrong schema |
| DB user can be scoped? | No | Yes — per-schema GRANT |
| Audit complexity | Must review every query | Schema boundary is the audit |
| Prisma support | Native | Supported via client factory |
| Scale | Degrades with row count | Schemas are independent |
| Backup per tenant | Complex | Simple — dump one schema |
| GDPR right to erasure | Must delete rows carefully | Drop entire schema |

---

## 4. Security Layers

Production-grade multitenancy requires **defense in depth** — multiple independent layers. If one layer fails, the next catches it.

```
┌─────────────────────────────────────────────────────────────┐
│                     INCOMING REQUEST                         │
└─────────────────────────────────────────────┬───────────────┘
                                              │
                    ┌─────────────────────────▼─────────────────────────┐
                    │           LAYER 1: JWT Authentication              │
                    │  • Validate token signature                        │
                    │  • Verify session in active_sessions               │
                    │  • Extract tenantId from token payload             │
                    │  • Block suspended/terminated accounts             │
                    └─────────────────────────┬─────────────────────────┘
                                              │
                    ┌─────────────────────────▼─────────────────────────┐
                    │         LAYER 2: Tenant Schema Resolution          │
                    │  • Look up tenant record by tenantId               │
                    │  • Retrieve schema_name from tenants table         │
                    │  • Validate schema exists in PostgreSQL            │
                    └─────────────────────────┬─────────────────────────┘
                                              │
                    ┌─────────────────────────▼─────────────────────────┐
                    │        LAYER 3: Scoped PrismaClient                │
                    │  • Instantiate client with tenant schema URL       │
                    │  • Client is bound to ONE schema only              │
                    │  • Cannot reference another tenant's tables        │
                    └─────────────────────────┬─────────────────────────┘
                                              │
                    ┌─────────────────────────▼─────────────────────────┐
                    │      LAYER 4: PostgreSQL Row Level Security        │
                    │  • Database-level policy enforces schema access    │
                    │  • Even raw SQL queries are blocked                │
                    │  • Cannot be bypassed by application code          │
                    └─────────────────────────┬─────────────────────────┘
                                              │
                    ┌─────────────────────────▼─────────────────────────┐
                    │      LAYER 5: Least Privilege DB Users             │
                    │  • Each tenant schema has its own DB role          │
                    │  • Role only has GRANT on its own schema           │
                    │  • Connection string scoped to that role           │
                    └─────────────────────────┬─────────────────────────┘
                                              │
                                    ┌─────────▼─────────┐
                                    │   DATA RETURNED    │
                                    │  (tenant-scoped)   │
                                    └───────────────────┘
```

---

## 5. Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        Bloomtech ERP — Production                         │
│                                                                            │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐               │
│  │  ACME Corp   │    │  Globex Ltd  │    │   Initech    │               │
│  │  User Login  │    │  User Login  │    │  User Login  │               │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘               │
│         │                   │                   │                         │
│         └──────────┬────────┘                   │                         │
│                    │        └───────────────────┘                         │
│                    ▼                                                        │
│         ┌──────────────────┐                                               │
│         │   Express API     │                                               │
│         │  + Auth Middleware│                                               │
│         └────────┬─────────┘                                               │
│                  │ resolves tenantId → schema_name                          │
│                  ▼                                                          │
│         ┌──────────────────────────────────────────────┐                   │
│         │         TenantPrismaClientFactory             │                   │
│         │  getClient('tenant_acme_corp')  → PrismaClient│                  │
│         │  getClient('tenant_globex_ltd') → PrismaClient│                  │
│         │  getClient('tenant_initech')    → PrismaClient│                  │
│         └───────────┬──────────────┬──────────────┬────┘                   │
│                     │              │              │                         │
│    ┌────────────────▼──┐  ┌───────▼──────┐  ┌───▼──────────────┐         │
│    │ schema:            │  │ schema:       │  │ schema:           │         │
│    │ tenant_acme_corp   │  │tenant_globex  │  │ tenant_initech    │         │
│    │ ┌────────────────┐ │  │ ┌───────────┐│  │ ┌───────────────┐│         │
│    │ │employees       │ │  │ │employees  ││  │ │employees      ││         │
│    │ │projects        │ │  │ │projects   ││  │ │projects       ││         │
│    │ │payroll         │ │  │ │payroll    ││  │ │payroll        ││         │
│    │ │contracts       │ │  │ │contracts  ││  │ │...            ││         │
│    │ │...             │ │  │ │...        ││  └───────────────────┘         │
│    │ └────────────────┘ │  │ └───────────┘│                                │
│    └───────────────────┘  └──────────────┘                                 │
│                                                                            │
│    ┌────────────────────────────────────────────────────────────┐         │
│    │                    public schema                            │         │
│    │   tenants │ users │ roles │ permissions │ active_sessions  │         │
│    └────────────────────────────────────────────────────────────┘         │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Prisma Setup

Prisma is split into two parts: the **public schema** (shared authentication tables) and the **tenant schema template** (per-company tables).

### 6.1 Public Schema (Shared Tables)

**File: `backend/prisma/schema.prisma`**

```prisma
generator client {
  provider        = "prisma-client-js"
  output          = "../src/generated/public-client"
  previewFeatures = ["multiSchema"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  schemas  = ["public"]
}

// ─────────────────────────────────────────
// TENANTS
// ─────────────────────────────────────────
model Tenant {
  id          Int      @id @default(autoincrement())
  name        String   @unique
  schema_name String   @unique
  created_at  DateTime @default(now())

  users User[]

  @@schema("public")
  @@map("tenants")
}

// ─────────────────────────────────────────
// USERS
// ─────────────────────────────────────────
model User {
  id                   Int           @id @default(autoincrement())
  name                 String
  email                String        @unique
  password_hash        String
  role                 String?       // Legacy field
  role_id              Int?
  tenant_id            Int
  account_status       AccountStatus @default(active)
  password_must_change Boolean       @default(false)
  source               String?
  is_super_user        Boolean       @default(false)
  created_at           DateTime      @default(now())

  tenant         Tenant          @relation(fields: [tenant_id], references: [id])
  roles          UserRole[]
  sessions       ActiveSession[]
  audit_logs     RbacAuditLog[]

  @@schema("public")
  @@map("users")
}

enum AccountStatus {
  active
  suspended
  terminated

  @@schema("public")
}

// ─────────────────────────────────────────
// ROLES & PERMISSIONS
// ─────────────────────────────────────────
model Role {
  id             Int              @id @default(autoincrement())
  name           String           @unique
  description    String?
  is_system_role Boolean          @default(false)
  created_at     DateTime         @default(now())
  updated_at     DateTime         @updatedAt

  user_roles       UserRole[]
  role_permissions RolePermission[]

  @@schema("public")
  @@map("roles")
}

model Permission {
  id          Int    @id @default(autoincrement())
  resource    String
  action      String
  description String?

  role_permissions RolePermission[]

  @@unique([resource, action])
  @@schema("public")
  @@map("permissions")
}

model RolePermission {
  role_id       Int
  permission_id Int

  role       Role       @relation(fields: [role_id], references: [id], onDelete: Cascade)
  permission Permission @relation(fields: [permission_id], references: [id], onDelete: Cascade)

  @@id([role_id, permission_id])
  @@schema("public")
  @@map("role_permissions")
}

model UserRole {
  user_id Int
  role_id Int

  user User @relation(fields: [user_id], references: [id], onDelete: Cascade)
  role Role @relation(fields: [role_id], references: [id], onDelete: Cascade)

  @@id([user_id, role_id])
  @@schema("public")
  @@map("user_roles")
}

// ─────────────────────────────────────────
// SESSION MANAGEMENT
// ─────────────────────────────────────────
model ActiveSession {
  id             Int      @id @default(autoincrement())
  user_id        Int
  session_token  String   @unique @default(uuid())
  expires_at     DateTime
  ip_address     String?
  user_agent     String?
  created_at     DateTime @default(now())

  user User @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@schema("public")
  @@map("active_sessions")
}

// ─────────────────────────────────────────
// AUDIT LOG
// ─────────────────────────────────────────
model RbacAuditLog {
  id         Int      @id @default(autoincrement())
  user_id    Int?
  action     String
  details    Json?
  ip_address String?
  created_at DateTime @default(now())

  user User? @relation(fields: [user_id], references: [id], onDelete: SetNull)

  @@schema("public")
  @@map("rbac_audit_log")
}
```

---

### 6.2 Tenant Schema Template

This schema represents the structure of **every tenant's isolated schema**. At runtime, a scoped `PrismaClient` is instantiated pointing to that tenant's specific schema.

**File: `backend/prisma/tenant.schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/tenant-client"
}

datasource db {
  provider = "postgresql"
  url      = env("TENANT_DATABASE_URL") // Overridden per tenant at runtime
}

// ─────────────────────────────────────────
// EMPLOYEES
// ─────────────────────────────────────────
model Employee {
  id                     Int       @id @default(autoincrement())
  employee_number        String    @unique
  first_name             String
  last_name              String
  email                  String?   @unique
  phone                  String?
  dob                    DateTime?
  nic                    String?
  address                String?
  designation            String?
  employee_department    String?
  role                   String?
  base_salary            Decimal   @default(0) @db.Decimal(15, 2)
  allowances             Decimal   @default(0) @db.Decimal(15, 2)
  tax                    Decimal   @default(0) @db.Decimal(5, 2)
  epf_enabled            Boolean   @default(false)
  epf_contribution_rate  Decimal   @default(0) @db.Decimal(5, 2)
  etf_enabled            Boolean   @default(false)
  is_active              Boolean   @default(true)
  user_id                Int?      // FK to public.users
  tenant_id              Int
  suspended_at           DateTime?
  suspended_by           Int?
  suspended_reason       String?
  terminated_at          DateTime?
  terminated_by          Int?
  terminated_reason      String?
  scheduled_purge_date   DateTime?
  created_at             DateTime  @default(now())
  updated_at             DateTime  @updatedAt

  time_entries  TimeEntry[]
  pto_requests  PtoRequest[]
  payslips      Payslip[]
  loans         Loan[]

  @@map("employees")
}

// ─────────────────────────────────────────
// VENDORS
// ─────────────────────────────────────────
model Vendor {
  id           Int       @id @default(autoincrement())
  name         String
  contact_info String?
  email        String?
  phone        String?
  address      String?
  created_at   DateTime  @default(now())

  payables       Payable[]
  purchase_orders PurchaseOrder[]

  @@map("vendors")
}

// ─────────────────────────────────────────
// PROJECTS (3-level hierarchy)
// ─────────────────────────────────────────
model Project {
  project_id   Int       @id @default(autoincrement())
  project_name String
  status       String    @default("active")
  created_at   DateTime  @default(now())

  contracts Contract[]

  @@map("projects")
}

model Contract {
  contract_id          Int       @id @default(autoincrement())
  project_id           Int
  customer_name        String?
  initial_cost_budget  Decimal?  @db.Decimal(15, 2)
  status               String    @default("active")
  created_at           DateTime  @default(now())

  project      Project       @relation(fields: [project_id], references: [project_id])
  items        ContractItem[]
  payables     Payable[]
  receivables  Receivable[]

  @@map("contracts")
}

model ContractItem {
  id          Int     @id @default(autoincrement())
  contract_id Int
  description String?
  quantity    Decimal? @db.Decimal(10, 2)
  unit_price  Decimal? @db.Decimal(15, 2)
  total       Decimal? @db.Decimal(15, 2)

  contract Contract @relation(fields: [contract_id], references: [contract_id])

  @@map("contract_items")
}

// ─────────────────────────────────────────
// PURCHASE ORDERS
// ─────────────────────────────────────────
model PurchaseOrder {
  id           Int       @id @default(autoincrement())
  po_number    String    @unique
  vendor_id    Int
  status       String    @default("draft")
  total_amount Decimal   @default(0) @db.Decimal(15, 2)
  approved_by  Int?
  created_by   Int?
  notes        String?
  created_at   DateTime  @default(now())
  updated_at   DateTime  @updatedAt

  vendor Vendor          @relation(fields: [vendor_id], references: [id])
  items  PurchaseOrderItem[]

  @@map("purchase_orders")
}

model PurchaseOrderItem {
  id                Int     @id @default(autoincrement())
  purchase_order_id Int
  description       String?
  quantity          Decimal? @db.Decimal(10, 2)
  unit_price        Decimal? @db.Decimal(15, 2)
  total             Decimal? @db.Decimal(15, 2)

  purchase_order PurchaseOrder @relation(fields: [purchase_order_id], references: [id])

  @@map("purchase_order_items")
}

// ─────────────────────────────────────────
// QUOTES
// ─────────────────────────────────────────
model Quote {
  quote_id    Int       @id @default(autoincrement())
  quote_number String   @unique
  status      String    @default("draft")
  total_due   Decimal   @default(0) @db.Decimal(15, 2)
  assigned_to Int?
  created_at  DateTime  @default(now())
  updated_at  DateTime  @updatedAt

  items               QuoteItem[]
  additional_services QuoteAdditionalService[]
  status_history      QuoteStatusHistory[]
  reminders           QuoteReminder[]

  @@map("quotes")
}

model QuoteItem {
  id          Int     @id @default(autoincrement())
  quote_id    Int
  description String?
  quantity    Decimal? @db.Decimal(10, 2)
  unit_price  Decimal? @db.Decimal(15, 2)
  total       Decimal? @db.Decimal(15, 2)

  quote Quote @relation(fields: [quote_id], references: [quote_id])

  @@map("quote_items")
}

model QuoteAdditionalService {
  id          Int     @id @default(autoincrement())
  quote_id    Int
  description String?
  amount      Decimal? @db.Decimal(15, 2)

  quote Quote @relation(fields: [quote_id], references: [quote_id])

  @@map("quote_additional_services")
}

model QuoteStatusHistory {
  id         Int      @id @default(autoincrement())
  quote_id   Int
  status     String
  changed_by Int?
  changed_at DateTime @default(now())
  notes      String?

  quote Quote @relation(fields: [quote_id], references: [quote_id])

  @@map("quote_status_history")
}

model QuoteReminder {
  id         Int      @id @default(autoincrement())
  quote_id   Int
  send_at    DateTime
  sent       Boolean  @default(false)
  sent_at    DateTime?

  quote Quote @relation(fields: [quote_id], references: [quote_id])

  @@map("quote_reminders")
}

model QuoteReminderSettings {
  id                  Int     @id @default(autoincrement())
  days_before_due     Int[]
  email_enabled       Boolean @default(true)

  @@map("quote_reminder_settings")
}

// ─────────────────────────────────────────
// FINANCIALS: PAYABLES & RECEIVABLES
// ─────────────────────────────────────────
model Payable {
  payable_id  Int       @id @default(autoincrement())
  vendor_id   Int?
  contract_id Int?
  amount      Decimal   @db.Decimal(15, 2)
  frequency   String?
  due_date    DateTime?
  is_active   Boolean   @default(true)
  created_at  DateTime  @default(now())

  vendor   Vendor?   @relation(fields: [vendor_id], references: [id])
  contract Contract? @relation(fields: [contract_id], references: [contract_id])
  payments PaymentPayable[]

  @@map("payables")
}

model Receivable {
  receivable_id Int       @id @default(autoincrement())
  payer_name    String?
  contract_id   Int?
  amount        Decimal   @db.Decimal(15, 2)
  due_date      DateTime?
  is_active     Boolean   @default(true)
  created_at    DateTime  @default(now())

  contract Contract? @relation(fields: [contract_id], references: [contract_id])

  @@map("receivables")
}

// ─────────────────────────────────────────
// BANKING
// ─────────────────────────────────────────
model Bank {
  id   Int    @id @default(autoincrement())
  name String @unique

  accounts CompanyBankAccount[]

  @@map("banks")
}

model CompanyBankAccount {
  id              Int      @id @default(autoincrement())
  bank_id         Int
  account_number  String   @unique
  opening_balance Decimal  @default(0) @db.Decimal(15, 2)
  current_balance Decimal  @default(0) @db.Decimal(15, 2)
  created_at      DateTime @default(now())

  bank         Bank             @relation(fields: [bank_id], references: [id])
  transactions BankTransaction[]
  debit_cards  DebitCard[]

  @@map("company_bank_accounts")
}

model BankTransaction {
  id          Int      @id @default(autoincrement())
  account_id  Int
  type        String   // credit | debit
  amount      Decimal  @db.Decimal(15, 2)
  description String?
  reference   String?
  created_at  DateTime @default(now())

  account CompanyBankAccount @relation(fields: [account_id], references: [id])

  @@map("bank_transactions")
}

model DebitCard {
  id         Int      @id @default(autoincrement())
  account_id Int
  card_number String?
  holder_name String?
  expiry_date DateTime?
  is_active  Boolean  @default(true)
  created_at DateTime @default(now())

  account CompanyBankAccount @relation(fields: [account_id], references: [id])

  @@map("debit_cards")
}

model PaymentPayable {
  id         Int      @id @default(autoincrement())
  payable_id Int
  amount     Decimal  @db.Decimal(15, 2)
  paid_at    DateTime @default(now())
  notes      String?

  payable Payable @relation(fields: [payable_id], references: [payable_id])

  @@map("payment_payables")
}

// ─────────────────────────────────────────
// PETTY CASH
// ─────────────────────────────────────────
model PettyCashAccount {
  id                   Int      @id @default(autoincrement())
  current_balance      Decimal  @default(0) @db.Decimal(15, 2)
  monthly_float_amount Decimal  @default(0) @db.Decimal(15, 2)
  created_at           DateTime @default(now())

  transactions PettyCashTransaction[]

  @@map("petty_cash_account")
}

model PettyCashTransaction {
  id          Int      @id @default(autoincrement())
  account_id  Int
  type        String   // credit | debit
  amount      Decimal  @db.Decimal(15, 2)
  description String?
  created_by  Int?
  created_at  DateTime @default(now())

  account PettyCashAccount @relation(fields: [account_id], references: [id])

  @@map("petty_cash_transactions")
}

// ─────────────────────────────────────────
// ASSETS
// ─────────────────────────────────────────
model Asset {
  id                   Int      @id @default(autoincrement())
  asset_name           String
  value                Decimal  @db.Decimal(15, 2)
  depreciation_method  String?
  useful_life          Int?     // in months
  purchase_date        DateTime?
  created_at           DateTime @default(now())

  @@map("assets")
}

// ─────────────────────────────────────────
// LOANS
// ─────────────────────────────────────────
model Loan {
  id                  Int      @id @default(autoincrement())
  loan_account_number String   @unique
  employee_id         Int?
  loan_amount         Decimal  @db.Decimal(15, 2)
  total_installments  Int
  remaining_balance   Decimal  @db.Decimal(15, 2)
  status              String   @default("active")
  created_at          DateTime @default(now())

  employee     Employee?       @relation(fields: [employee_id], references: [id])
  installments LoanInstallment[]

  @@map("loans")
}

model LoanInstallment {
  id         Int       @id @default(autoincrement())
  loan_id    Int
  due_date   DateTime
  amount     Decimal   @db.Decimal(15, 2)
  paid       Boolean   @default(false)
  paid_at    DateTime?

  loan Loan @relation(fields: [loan_id], references: [id])

  @@map("loan_installments")
}

// ─────────────────────────────────────────
// PAYROLL
// ─────────────────────────────────────────
model Payslip {
  id           Int      @id @default(autoincrement())
  employee_id  Int
  month        Int
  year         Int
  gross_salary Decimal  @db.Decimal(15, 2)
  net_salary   Decimal  @db.Decimal(15, 2)
  status       String   @default("draft")
  created_at   DateTime @default(now())

  employee     Employee      @relation(fields: [employee_id], references: [id])
  taxes        PayrollTax[]

  @@map("payslips")
}

model PayrollTax {
  id         Int     @id @default(autoincrement())
  payslip_id Int
  tax_type   String
  amount     Decimal @db.Decimal(15, 2)

  payslip Payslip @relation(fields: [payslip_id], references: [id])

  @@map("payroll_taxes")
}

// ─────────────────────────────────────────
// TIME & LEAVE
// ─────────────────────────────────────────
model TimeEntry {
  id          Int       @id @default(autoincrement())
  employee_id Int
  date        DateTime
  clock_in    DateTime?
  clock_out   DateTime?
  status      String    @default("pending") // pending | approved | rejected
  approved_by Int?
  notes       String?
  created_at  DateTime  @default(now())

  employee Employee @relation(fields: [employee_id], references: [id])

  @@map("time_entries")
}

model PtoRequest {
  id          Int       @id @default(autoincrement())
  employee_id Int
  from_date   DateTime
  to_date     DateTime
  reason      String?
  status      String    @default("pending")
  approved_by Int?
  created_at  DateTime  @default(now())

  employee Employee @relation(fields: [employee_id], references: [id])

  @@map("pto_requests")
}

// ─────────────────────────────────────────
// SUBSCRIPTIONS
// ─────────────────────────────────────────
model Subscription {
  id          Int      @id @default(autoincrement())
  name        String
  amount      Decimal  @db.Decimal(15, 2)
  frequency   String
  next_due    DateTime?
  is_active   Boolean  @default(true)
  created_at  DateTime @default(now())

  @@map("subscriptions")
}

// ─────────────────────────────────────────
// DOCUMENTS
// ─────────────────────────────────────────
model Document {
  id            Int      @id @default(autoincrement())
  document_name String
  file_data     Bytes
  uploaded_by   Int?
  created_at    DateTime @default(now())

  @@map("documents")
}

// ─────────────────────────────────────────
// TODOS & NOTES
// ─────────────────────────────────────────
model Todo {
  id         Int      @id @default(autoincrement())
  user_id    Int
  title      String
  status     String   @default("pending")
  priority   String   @default("medium")
  created_at DateTime @default(now())

  shares TodoShare[]

  @@map("todos")
}

model TodoShare {
  id         Int @id @default(autoincrement())
  todo_id    Int
  shared_with Int

  todo Todo @relation(fields: [todo_id], references: [id])

  @@map("todo_shares")
}

model Note {
  id         Int      @id @default(autoincrement())
  user_id    Int
  content    String
  created_at DateTime @default(now())

  shares NoteShare[]

  @@map("notes")
}

model NoteShare {
  id          Int @id @default(autoincrement())
  note_id     Int
  shared_with Int

  note Note @relation(fields: [note_id], references: [id])

  @@map("note_shares")
}
```

---

## 7. TenantPrismaClient Factory

This is the core of the runtime multitenancy. Each request gets a `PrismaClient` scoped to the correct tenant's schema.

**File: `backend/src/lib/tenantPrismaClient.ts`**

```typescript
import { PrismaClient } from '../generated/tenant-client'

// Cache clients to avoid creating a new connection pool on every request
const clientCache = new Map<string, PrismaClient>()

/**
 * Returns a PrismaClient scoped to the given tenant's schema.
 * Uses a cache to reuse connection pools across requests.
 *
 * @param schemaName - The tenant's PostgreSQL schema name (e.g. 'tenant_acme_corp')
 */
export function getTenantPrismaClient(schemaName: string): PrismaClient {
  // Validate schema name to prevent injection attacks
  if (!/^[a-z0-9_]+$/.test(schemaName)) {
    throw new Error(`Invalid schema name: ${schemaName}`)
  }

  if (clientCache.has(schemaName)) {
    return clientCache.get(schemaName)!
  }

  // Build a connection URL that sets the search_path to the tenant's schema
  const baseUrl = process.env.DATABASE_URL!
  const url = new URL(baseUrl)
  url.searchParams.set('schema', schemaName)

  const client = new PrismaClient({
    datasources: {
      db: {
        url: url.toString(),
      },
    },
  })

  clientCache.set(schemaName, client)
  return client
}

/**
 * Gracefully disconnect all cached tenant clients.
 * Call this on application shutdown.
 */
export async function disconnectAllTenantClients(): Promise<void> {
  const disconnects = Array.from(clientCache.values()).map(c => c.$disconnect())
  await Promise.all(disconnects)
  clientCache.clear()
}
```

---

## 8. Middleware Integration

**File: `backend/src/middleware/tenant-prisma.ts`**

```typescript
import { Request, Response, NextFunction } from 'express'
import { getTenantPrismaClient } from '../lib/tenantPrismaClient'
import { publicPrisma } from '../lib/publicPrismaClient'

/**
 * Resolves the tenant's schema from the JWT payload,
 * then attaches a scoped PrismaClient to the request.
 *
 * Usage: app.use(requireAuth, attachTenantPrisma)
 */
export async function attachTenantPrisma(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = req.user?.tenantId

    if (!tenantId) {
      res.status(401).json({ error: 'No tenant context in token' })
      return
    }

    // Fetch tenant schema from public schema
    const tenant = await publicPrisma.tenant.findUnique({
      where: { id: tenantId },
      select: { schema_name: true },
    })

    if (!tenant) {
      res.status(403).json({ error: 'Tenant not found' })
      return
    }

    // Attach scoped client to request
    req.tenantPrisma = getTenantPrismaClient(tenant.schema_name)

    next()
  } catch (error) {
    next(error)
  }
}
```

**Extend Express Request type** — `backend/src/types/express.d.ts`:

```typescript
import { PrismaClient as TenantPrismaClient } from '../generated/tenant-client'

declare global {
  namespace Express {
    interface Request {
      tenantPrisma: TenantPrismaClient
      user?: {
        userId: number
        tenantId: number
        email: string
        permissions: string[]
        sessionToken: string
      }
    }
  }
}
```

**Example controller usage:**

```typescript
// backend/src/controllers/employeeController.ts
export async function getEmployees(req: Request, res: Response) {
  // req.tenantPrisma is already scoped to this company's schema
  // No tenant_id filter needed — isolation is architectural
  const employees = await req.tenantPrisma.employee.findMany({
    where: { is_active: true },
    orderBy: { created_at: 'desc' },
  })

  res.json(employees)
}
```

---

## 9. PostgreSQL Row Level Security (RLS)

RLS is the **database-level safety net**. Even if application code has a bug, the database will refuse to return data from the wrong schema. Apply these policies to each tenant schema after provisioning.

```sql
-- ─────────────────────────────────────────────────────
-- Enable RLS on all sensitive tenant tables
-- Run this inside the tenant's schema after creation
-- Replace 'tenant_acme_corp' with the actual schema name
-- ─────────────────────────────────────────────────────

-- Create a dedicated DB role for this tenant
CREATE ROLE tenant_acme_corp_role LOGIN PASSWORD 'strong-random-password';

-- Grant schema usage only to this tenant's role
GRANT USAGE ON SCHEMA tenant_acme_corp TO tenant_acme_corp_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA tenant_acme_corp TO tenant_acme_corp_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA tenant_acme_corp TO tenant_acme_corp_role;

-- Revoke all access to other schemas for this role
REVOKE ALL ON SCHEMA public FROM tenant_acme_corp_role;

-- Enable RLS on critical tables
ALTER TABLE tenant_acme_corp.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_acme_corp.payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_acme_corp.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_acme_corp.bank_transactions ENABLE ROW LEVEL SECURITY;

-- Create policy: only the tenant's own role can access rows
CREATE POLICY tenant_isolation ON tenant_acme_corp.employees
  USING (current_user = 'tenant_acme_corp_role');

CREATE POLICY tenant_isolation ON tenant_acme_corp.payslips
  USING (current_user = 'tenant_acme_corp_role');

-- For tables without a direct user check, restrict by schema owner
CREATE POLICY tenant_isolation ON tenant_acme_corp.bank_transactions
  USING (true)
  WITH CHECK (true);

-- Only tenant_acme_corp_role can execute queries in this schema
ALTER DEFAULT PRIVILEGES IN SCHEMA tenant_acme_corp
  GRANT ALL ON TABLES TO tenant_acme_corp_role;
```

### Automate RLS in tenant provisioning script

```typescript
// backend/src/scripts/provisionTenant.ts
export async function provisionTenantSchema(schemaName: string, db: Pool) {
  const roleName = `${schemaName}_role`
  const password = generateSecurePassword() // Store in secrets manager

  await db.query(`
    -- 1. Create schema
    CREATE SCHEMA IF NOT EXISTS "${schemaName}";

    -- 2. Create dedicated DB role
    CREATE ROLE "${roleName}" LOGIN PASSWORD '${password}';

    -- 3. Grant access only to this schema
    GRANT USAGE ON SCHEMA "${schemaName}" TO "${roleName}";
    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA "${schemaName}" TO "${roleName}";
    GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA "${schemaName}" TO "${roleName}";

    -- 4. Run the tenant table creation SQL
    SET search_path TO "${schemaName}";
  `)

  // 5. Run databasse.sql to create all tables in the new schema
  const schemaSql = fs.readFileSync('./databasse.sql', 'utf-8')
  await db.query(schemaSql)

  // 6. Enable RLS on sensitive tables
  const sensitiveTables = ['employees', 'payslips', 'loans', 'bank_transactions']
  for (const table of sensitiveTables) {
    await db.query(`
      ALTER TABLE "${schemaName}"."${table}" ENABLE ROW LEVEL SECURITY;
      CREATE POLICY tenant_isolation ON "${schemaName}"."${table}"
        USING (current_user = '${roleName}');
    `)
  }

  // 7. Store the role credentials securely (e.g., AWS Secrets Manager)
  await storeSecret(`tenant/${schemaName}/db-password`, password)
}
```

---

## 10. Least Privilege Database Users

**Principle**: Each tenant's Prisma client connects using a database role that has **zero access** to any other tenant's schema.

```
┌──────────────────────────────────────────────────────┐
│                  PostgreSQL Database                  │
│                                                       │
│  superuser (admin only, never used by app)            │
│                                                       │
│  public_app_role                                      │
│    └── can READ/WRITE: public.users                   │
│    └── can READ/WRITE: public.tenants                 │
│    └── can READ/WRITE: public.active_sessions         │
│    └── CANNOT access: any tenant schema               │
│                                                       │
│  tenant_acme_corp_role                                │
│    └── can READ/WRITE: tenant_acme_corp.*             │
│    └── CANNOT access: public.*                        │
│    └── CANNOT access: tenant_globex_ltd.*             │
│    └── CANNOT access: tenant_initech.*                │
│                                                       │
│  tenant_globex_ltd_role                               │
│    └── can READ/WRITE: tenant_globex_ltd.*            │
│    └── CANNOT access: any other schema                │
└──────────────────────────────────────────────────────┘
```

Store each tenant's connection string securely:

```typescript
// Connection string format per tenant
const tenantConnectionString =
  `postgresql://tenant_acme_corp_role:${password}@host:5432/bloomtech_erp?schema=tenant_acme_corp`
```

---

## 11. Migration Strategy

Adopt Prisma into the existing application without breaking anything. Follow these phases:

### Phase 1 — Install Prisma alongside existing `pg` pool

```bash
npm install prisma @prisma/client
npx prisma init
```

Configure `prisma/schema.prisma` to point to the existing database. Run:

```bash
npx prisma db pull  # Introspect existing public schema
```

This generates models from the live database. Review and clean up the output.

### Phase 2 — Generate public schema client

```bash
npx prisma generate
```

Replace `pg` queries in auth, session, and RBAC routes with the Prisma public client. Test thoroughly.

### Phase 3 — Generate tenant schema client

Create `prisma/tenant.schema.prisma` (as shown above). Generate the tenant client:

```bash
npx prisma generate --schema=prisma/tenant.schema.prisma
```

### Phase 4 — Integrate `TenantPrismaClient` factory

Add the `attachTenantPrisma` middleware to all protected tenant routes. Replace `pg` queries one controller at a time. Do not do a big-bang migration.

### Phase 5 — Enable RLS on existing tenant schemas

```bash
npm run provision-rls  # Script that applies RLS policies to all existing schemas
```

### Phase 6 — Enable least-privilege DB users

Create per-tenant DB roles and rotate connection strings. Store credentials in a secrets manager (AWS Secrets Manager, HashiCorp Vault, Railway Variables).

---

## 12. What to Avoid

### Never use a single shared `tenant_id` filter approach for ERP data

```typescript
// DANGEROUS — one missing filter exposes all company data
const employees = await prisma.employee.findMany()
// Should have been:
// const employees = await prisma.employee.findMany({ where: { tenant_id: req.user.tenantId } })
```

### Never log or expose schema names in API responses

```typescript
// BAD
res.json({ error: `Schema tenant_acme_corp not found` })

// GOOD
res.status(403).json({ error: 'Access denied' })
```

### Never share a single PrismaClient instance across tenants

```typescript
// DANGEROUS — global client has no schema isolation
const prisma = new PrismaClient() // Don't use this for tenant operations

// CORRECT — scoped client per request
const prisma = getTenantPrismaClient(tenant.schema_name)
```

### Never allow raw schema name injection from user input

```typescript
// DANGEROUS — user controls schema name
const schema = req.body.schema
const client = getTenantPrismaClient(schema)

// CORRECT — always resolve schema from trusted JWT → tenants table
const tenant = await publicPrisma.tenant.findUnique({ where: { id: req.user.tenantId } })
const client = getTenantPrismaClient(tenant.schema_name)
```

### Never skip RLS because "the app code handles it"

Application code can have bugs. Developers make mistakes. RLS is the safety net that catches what application code misses. It costs almost nothing to enable and can prevent catastrophic breaches.

---

## 13. Production Checklist

Before going live with a multitenant deployment, verify all of the following:

### Database Security
- [ ] Each tenant schema has its own PostgreSQL role with no cross-schema access
- [ ] Row Level Security (RLS) is enabled on all tables containing sensitive data
- [ ] The application superuser account is never used by the running application
- [ ] Database credentials are stored in a secrets manager, not in environment files
- [ ] Connection strings are rotated periodically

### Application Security
- [ ] Schema names are never derived from user-controlled input
- [ ] Schema names are validated with a strict regex before use (`/^[a-z0-9_]+$/`)
- [ ] JWT tokens include `tenantId` and are verified on every request
- [ ] Session tokens are validated against `active_sessions` on every request
- [ ] The `TenantPrismaClient` factory validates schema names before creating clients

### Prisma Configuration
- [ ] Public schema client is generated separately from tenant schema client
- [ ] Tenant client output directory is in `.gitignore`
- [ ] `disconnectAllTenantClients()` is called on graceful server shutdown
- [ ] Client cache has a max-size limit to prevent memory leaks with many tenants

### Operational Security
- [ ] Tenant provisioning script enables RLS automatically on new schemas
- [ ] Database backups are configured per-tenant or per-schema
- [ ] Audit log (`rbac_audit_log`) captures all permission changes
- [ ] Alerts are configured for unusual cross-schema query attempts
- [ ] GDPR erasure procedure is documented (drop tenant schema + delete public.users rows)

### Testing
- [ ] Integration tests verify that Tenant A cannot read Tenant B's data
- [ ] Tests confirm RLS blocks direct SQL queries from wrong roles
- [ ] Load tests confirm the client cache handles concurrent tenant requests correctly

---

*Document maintained by Bloomtech Engineering. Last updated: April 2026.*
