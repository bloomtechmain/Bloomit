# Feature 02 — Journal Entries (Double-Entry Bookkeeping)

**Phase:** 1 — Accounting Core  
**Priority:** Critical  
**Effort:** L (5–7 weeks)

---

## What This Is

A Journal Entry (JE) is the formal record of a financial transaction using the
double-entry method: every transaction has at least one debit and one credit, and
the total debits must always equal total credits. Journal entries are the mechanism
by which every financial event moves into the General Ledger.

There are two types:
- **Auto-posted** — created by the system when a module event occurs (invoice paid, payroll approved, etc.)
- **Manual** — created by an accountant to record adjustments, accruals, or corrections

---

## Why It Matters

Without journal entries, your GL is empty. This feature is the pipe between
business events (paying a bill, running payroll) and the accounting records
(GL accounts, financial statements). It also gives accountants the manual
override they need for month-end adjustments and accruals.

---

## Current Gap

- No journal entry concept exists.
- Transactions in payables, payroll, etc. do not post to any ledger.
- There is no way to make accounting adjustments (accruals, corrections, depreciation entries).

---

## Database Changes

```sql
CREATE TABLE journal_entries (
  id             SERIAL PRIMARY KEY,
  tenant_id      TEXT NOT NULL REFERENCES tenants(id),
  entry_number   VARCHAR(20) NOT NULL,    -- JE-2024-0001
  entry_date     DATE NOT NULL,
  description    TEXT NOT NULL,
  entry_type     VARCHAR(20) NOT NULL,    -- MANUAL | AUTO
  source_module  VARCHAR(30),            -- AUTO entries: which module triggered this
  source_id      INT,                    -- FK to the source record
  status         VARCHAR(20) DEFAULT 'DRAFT', -- DRAFT | POSTED | REVERSED
  reversed_by    INT REFERENCES journal_entries(id),
  created_by     INT REFERENCES users(id),
  approved_by    INT REFERENCES users(id),
  approved_at    TIMESTAMPTZ,
  posted_at      TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE journal_entry_lines (
  id             SERIAL PRIMARY KEY,
  journal_id     INT NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id     INT NOT NULL REFERENCES chart_of_accounts(id),
  description    TEXT,
  debit          NUMERIC(15,2) DEFAULT 0,
  credit         NUMERIC(15,2) DEFAULT 0,
  CONSTRAINT debit_or_credit CHECK (
    (debit > 0 AND credit = 0) OR (debit = 0 AND credit > 0)
  )
);

-- Constraint: total debits = total credits per journal enforced at service layer
```

---

## Backend Implementation

### New Routes — `/api/journal-entries`

| Method | Path | Action |
|--------|------|--------|
| GET | `/api/journal-entries` | List all JEs (paginated, filterable) |
| GET | `/api/journal-entries/:id` | Single JE with all lines |
| POST | `/api/journal-entries` | Create manual JE (status: DRAFT) |
| PUT | `/api/journal-entries/:id` | Update DRAFT JE |
| POST | `/api/journal-entries/:id/post` | Post DRAFT → POSTED (writes to GL) |
| POST | `/api/journal-entries/:id/reverse` | Create reversal entry |
| DELETE | `/api/journal-entries/:id` | Delete DRAFT only |

### Core Validation Rules (service layer)

```typescript
// Before posting, enforce:
// 1. Sum of all debits === sum of all credits
// 2. At least 2 lines
// 3. No line has both debit > 0 and credit > 0
// 4. All referenced accounts are active
function validateJournalEntry(lines: JournalLine[]): void

// Auto-number JEs sequentially per tenant per year
function generateEntryNumber(tenantId: string): Promise<string>
```

### Auto-Posting Templates

These are called by other module controllers when key events fire:

```typescript
// Invoice issued
autoPost('INVOICE_ISSUED', {
  lines: [
    { account: 'Accounts Receivable', debit: invoiceTotal },
    { account: 'Sales Revenue',       credit: invoiceAmount },
    { account: 'VAT Payable',         credit: taxAmount },
  ]
})

// Invoice payment received
autoPost('INVOICE_PAID', {
  lines: [
    { account: 'Bank Account',        debit: amountReceived },
    { account: 'Accounts Receivable', credit: amountReceived },
  ]
})

// Payroll approved
autoPost('PAYROLL_APPROVED', {
  lines: [
    { account: 'Salaries Expense',    debit: grossSalary },
    { account: 'EPF Payable',         credit: epfEmployeeAmount },
    { account: 'Salaries Payable',    credit: netSalary },
  ]
})
```

---

## Frontend Implementation

### New Page — Journal Entries (`/accounting/journals`)

**List view:**
- Table: JE Number | Date | Description | Type | Status | Total Debits | Actions
- Filter by: date range, type (manual/auto), status, source module
- Badge: DRAFT (yellow), POSTED (green), REVERSED (grey)

**Detail / Create view:**
- Header fields: date, description, reference
- Line items table (editable for DRAFT):
  - Account selector (searchable dropdown from COA)
  - Description per line
  - Debit amount
  - Credit amount
- Running totals at bottom: Total Debits | Total Credits | Difference (must be 0 to post)
- Post button (disabled if debits ≠ credits)
- Reverse button (POSTED entries only)

### Journal Entry Viewer (read-only, embedded)

Reusable component that other modules can embed to show "Journal entries for this invoice/payroll/etc."

---

## Integration Points

| Module | When auto-JE fires |
|--------|-------------------|
| Invoices | On issue, on payment, on credit note |
| Payables / Bills | On bill creation, on payment |
| Payroll | On admin approval |
| Petty Cash | On replenishment, on expense |
| Purchase Orders | On approval (asset or expense) |
| Loans | On disbursement, on installment payment |
| Assets | On purchase, on monthly depreciation run |
| Bank Reconciliation | On adjustment entries |

---

## Month-End Workflow

Accountants use manual JEs for:

1. **Accruals** — Record expenses incurred but not yet invoiced
2. **Prepayments** — Amortise prepaid expenses over time
3. **Depreciation adjustments** — Override auto-calculated depreciation
4. **Currency adjustments** — Revalue foreign-currency balances
5. **Correction entries** — Fix mis-posted transactions (by reversing and re-posting)

---

## Implementation Steps

1. Create `journal_entries` and `journal_entry_lines` tables in `databasse.sql`
2. Build `journalEntryService.ts` with: validate, generate number, post, reverse
3. Build the journal entries API routes and controller
4. Integrate auto-posting hooks into: invoiceController, payableController, payrollController, petty cash, loans, assets
5. Build journal entry list page with filters
6. Build journal entry create/edit form with live debit/credit balance check
7. Build journal entry detail viewer (read-only)
8. Add "View Journal Entries" tab to invoice, payroll, and PO detail pages
