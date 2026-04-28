# Feature 01 — Chart of Accounts & General Ledger

**Phase:** 1 — Accounting Core  
**Priority:** Critical (everything else depends on this)  
**Effort:** L (6–8 weeks)

---

## What This Is

The Chart of Accounts (COA) is the master list of every account a company uses to
record financial transactions. The General Ledger (GL) is the complete record of every
debit and credit that has ever hit those accounts. Together they are the backbone of
double-entry accounting — without them, you have a cash tracker, not an accounting system.

---

## Why It Matters

Right now every module (receivables, payables, petty cash, payroll) stores its own
numbers in isolation. There is no way to produce a Balance Sheet or Income Statement
because there is no single source of truth that ties everything together. The GL is
that source of truth. Every other feature in this roadmap either feeds into or reads
from the GL.

---

## Current Gap

- No `accounts` table exists.
- No concept of debit/credit posting.
- Financial numbers live only in their own module tables.
- No trial balance is possible.

---

## Database Changes

```sql
-- account_types: Asset | Liability | Equity | Revenue | Expense
CREATE TABLE chart_of_accounts (
  id             SERIAL PRIMARY KEY,
  tenant_id      TEXT NOT NULL REFERENCES tenants(id),
  code           VARCHAR(10) NOT NULL,       -- e.g. 1010, 2100, 4000
  name           VARCHAR(150) NOT NULL,
  account_type   VARCHAR(20) NOT NULL,       -- ASSET | LIABILITY | EQUITY | REVENUE | EXPENSE
  sub_type       VARCHAR(50),               -- Current Asset, Fixed Asset, etc.
  parent_id      INT REFERENCES chart_of_accounts(id), -- for sub-accounts
  is_system      BOOLEAN DEFAULT FALSE,     -- system accounts cannot be deleted
  is_active      BOOLEAN DEFAULT TRUE,
  description    TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, code)
);

CREATE TABLE gl_entries (
  id             SERIAL PRIMARY KEY,
  tenant_id      TEXT NOT NULL REFERENCES tenants(id),
  entry_date     DATE NOT NULL,
  reference      VARCHAR(50),              -- e.g. INV-2024-0001, PO-2024-0012
  description    TEXT NOT NULL,
  account_id     INT NOT NULL REFERENCES chart_of_accounts(id),
  debit          NUMERIC(15,2) DEFAULT 0,
  credit         NUMERIC(15,2) DEFAULT 0,
  journal_id     INT REFERENCES journal_entries(id),
  source_module  VARCHAR(30),             -- INVOICE | PAYABLE | PAYROLL | MANUAL | etc.
  source_id      INT,                     -- FK to the originating record
  posted_at      TIMESTAMPTZ DEFAULT NOW(),
  posted_by      INT REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX idx_gl_tenant_date ON gl_entries(tenant_id, entry_date);
CREATE INDEX idx_gl_account ON gl_entries(account_id);
```

---

## Default Chart of Accounts (Seeded on Tenant Creation)

| Code | Name | Type |
|------|------|------|
| 1000 | Cash & Cash Equivalents | Asset |
| 1010 | Bank Account — Primary | Asset |
| 1100 | Accounts Receivable | Asset |
| 1200 | Inventory | Asset |
| 1500 | Prepaid Expenses | Asset |
| 1600 | Fixed Assets | Asset |
| 1610 | Accumulated Depreciation | Asset (contra) |
| 2000 | Accounts Payable | Liability |
| 2100 | Accrued Expenses | Liability |
| 2200 | Loans Payable | Liability |
| 2300 | Tax Payable — VAT | Liability |
| 3000 | Owner's Equity | Equity |
| 3100 | Retained Earnings | Equity |
| 4000 | Revenue | Revenue |
| 4100 | Service Revenue | Revenue |
| 4200 | Product Sales | Revenue |
| 5000 | Cost of Goods Sold | Expense |
| 5100 | Salaries & Wages | Expense |
| 5200 | Rent Expense | Expense |
| 5300 | Utilities | Expense |
| 5400 | Office Supplies | Expense |
| 5500 | Depreciation Expense | Expense |
| 5600 | Bank Charges | Expense |
| 5700 | Tax Expense | Expense |

---

## Backend Implementation

### New Routes — `/api/accounts`

| Method | Path | Action |
|--------|------|--------|
| GET | `/api/accounts` | List all accounts for tenant |
| POST | `/api/accounts` | Create new account |
| PUT | `/api/accounts/:id` | Update account name/description |
| DELETE | `/api/accounts/:id` | Deactivate (no delete if has GL entries) |
| GET | `/api/accounts/:id/ledger` | All GL entries for one account |
| GET | `/api/gl/trial-balance` | Debit/Credit totals per account |

### GL Posting Service

Create `backend/src/services/glPostingService.ts`:

```typescript
// Called by every module when a financial event occurs
async function postToGL(entries: GLEntry[], journalId: number): Promise<void>

// Auto-post when invoice is created: DR Accounts Receivable / CR Revenue
// Auto-post when payment received: DR Bank / CR Accounts Receivable
// Auto-post when payable paid: DR Accounts Payable / CR Bank
// Auto-post when payroll run: DR Salaries Expense / CR Salaries Payable
// Auto-post when asset purchased: DR Fixed Asset / CR Bank
// Auto-post when depreciation run: DR Depreciation Expense / CR Accumulated Depreciation
```

Each existing module controller needs a GL posting hook added at the point of
state change (e.g., invoice marked paid, PO approved and paid, payslip approved).

---

## Frontend Implementation

### New Page — Chart of Accounts (`/settings/accounts`)

- Hierarchical tree view of all accounts (grouped by type)
- Add / edit / deactivate account
- Account code and name editable (system accounts read-only)
- Show current balance per account

### New Page — General Ledger (`/accounting/ledger`)

- Filter by: account, date range, source module, reference
- Table showing: date, description, reference, debit, credit, running balance
- Export to CSV

### New Page — Trial Balance (`/accounting/trial-balance`)

- Table: Account Code | Account Name | Debit Total | Credit Total
- Period selector (month/quarter/year)
- Highlight accounts that are out of balance
- Export to PDF

---

## Integration Points

This is the integration hub — every other module connects here:

| Module | What auto-posts to GL |
|--------|-----------------------|
| Invoices (Feature 03) | Revenue + AR on issue; Bank + AR on payment |
| Payables | AP on bill creation; Bank on payment |
| Payroll | Salary expense on approval |
| Purchase Orders | Asset or Expense + AP on approval |
| Petty Cash | Petty Cash account debit/credit |
| Loans | Loan Payable on creation; Interest Expense on installment |
| Assets | Fixed Asset on purchase; Depreciation monthly |
| Tax (Feature 04) | Tax Payable on invoice; Tax payment on settlement |

---

## Implementation Steps

1. Create `chart_of_accounts` and `gl_entries` tables in `databasse.sql`
2. Write seed function that inserts default COA on tenant creation
3. Build `glPostingService.ts` with the posting function
4. Build the accounts API routes and controller
5. Add GL posting hooks to: payables, receivables, petty cash, loans, assets, payroll controllers
6. Build COA settings page (tree view + CRUD)
7. Build GL ledger page (filterable transaction list)
8. Build trial balance page
