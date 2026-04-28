# Feature 05 — Bank Reconciliation

**Phase:** 1 — Accounting Core  
**Priority:** High  
**Effort:** M (3–4 weeks)

---

## What This Is

Bank Reconciliation is the process of matching the company's internal bank account
records (GL entries) against the actual bank statement provided by the bank. It
identifies deposits in transit, outstanding cheques, bank charges, and any
discrepancies that need to be investigated or corrected with adjusting journal entries.

---

## Why It Matters

Without reconciliation, you cannot trust your bank balances. Errors accumulate
silently — a missed bank charge, a payment posted to the wrong account, a duplicate
entry. Monthly reconciliation is a core internal control that every auditor requires.
It also ensures the GL balance for a bank account matches the bank statement balance.

---

## Current Gap

- Bank transactions exist in the system (`bank_transactions` table) but they are
  never compared against an external bank statement
- No concept of "reconciled" vs "unreconciled" transactions
- Bank charges and interest income from bank statements cannot be imported
- No adjusted bank balance or GL balance calculation

---

## Database Changes

```sql
-- Tracks each reconciliation session per bank account per period
CREATE TABLE bank_reconciliations (
  id                    SERIAL PRIMARY KEY,
  tenant_id             TEXT NOT NULL REFERENCES tenants(id),
  bank_account_id       INT NOT NULL REFERENCES company_bank_accounts(id),
  statement_date        DATE NOT NULL,
  statement_balance     NUMERIC(15,2) NOT NULL,  -- closing balance on bank statement
  gl_balance            NUMERIC(15,2) NOT NULL,  -- GL balance at statement date
  adjusted_bank_balance NUMERIC(15,2),           -- after deposits in transit / outstanding cheques
  adjusted_gl_balance   NUMERIC(15,2),           -- after adjusting entries
  difference            NUMERIC(15,2) GENERATED ALWAYS AS (adjusted_bank_balance - adjusted_gl_balance) STORED,
  status                VARCHAR(20) DEFAULT 'IN_PROGRESS', -- IN_PROGRESS | COMPLETED
  completed_at          TIMESTAMPTZ,
  completed_by          INT REFERENCES users(id),
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Imported bank statement lines
CREATE TABLE bank_statement_lines (
  id                    SERIAL PRIMARY KEY,
  reconciliation_id     INT NOT NULL REFERENCES bank_reconciliations(id) ON DELETE CASCADE,
  transaction_date      DATE NOT NULL,
  description           TEXT NOT NULL,
  debit                 NUMERIC(15,2) DEFAULT 0,   -- money out (from bank's perspective)
  credit                NUMERIC(15,2) DEFAULT 0,   -- money in (from bank's perspective)
  reference             VARCHAR(100),
  matched_transaction_id INT REFERENCES bank_transactions(id),
  is_matched            BOOLEAN DEFAULT FALSE,
  match_type            VARCHAR(20),  -- AUTO | MANUAL
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Track which GL transactions have been reconciled
ALTER TABLE bank_transactions ADD COLUMN reconciliation_id INT REFERENCES bank_reconciliations(id);
ALTER TABLE bank_transactions ADD COLUMN is_reconciled BOOLEAN DEFAULT FALSE;
ALTER TABLE bank_transactions ADD COLUMN reconciled_at TIMESTAMPTZ;
```

---

## Backend Implementation

### New Routes — `/api/reconciliations`

| Method | Path | Action |
|--------|------|--------|
| GET | `/api/reconciliations` | List reconciliation history for an account |
| POST | `/api/reconciliations` | Start new reconciliation session |
| GET | `/api/reconciliations/:id` | Get reconciliation with matched/unmatched lines |
| POST | `/api/reconciliations/:id/import` | Upload CSV bank statement |
| POST | `/api/reconciliations/:id/match` | Manually match a statement line to a GL transaction |
| POST | `/api/reconciliations/:id/unmatch` | Undo a match |
| POST | `/api/reconciliations/:id/auto-match` | Run auto-matching algorithm |
| POST | `/api/reconciliations/:id/adjusting-entry` | Create adjusting JE (for bank charges etc.) |
| POST | `/api/reconciliations/:id/complete` | Complete reconciliation (difference must be 0) |

### Auto-Matching Algorithm

```typescript
// Match bank statement lines to GL transactions using:
// 1. Exact amount + exact date → high confidence match
// 2. Exact amount + date within 3 days → medium confidence (flag for review)
// 3. Description keyword matching → low confidence (flag for review)
// Auto-match all HIGH confidence, present MEDIUM for user review

async function autoMatch(reconciliationId: number): Promise<MatchSummary> {
  // Returns: { matched: n, needsReview: n, unmatched: n }
}
```

### CSV Import Parser

Parse standard bank CSV exports. Support multiple formats:
- Generic CSV (date, description, debit, credit, balance)
- Configurable column mapping (user maps columns on first import)
- Duplicate detection (skip rows already imported for this account)

---

## Frontend Implementation

### Reconciliation Hub (`/accounting/reconciliation`)

**Account overview:**
- List of all bank accounts
- Last reconciled date per account
- Outstanding unreconciled items count
- "Start Reconciliation" button per account

**Reconciliation workspace:**

The main working view is a two-column layout:

```
Left: Bank Statement Lines          Right: GL Transactions (unreconciled)
────────────────────────────────    ─────────────────────────────────────
Date | Description | Amount          Date | Description | Amount | Source
[ ] 01 Mar — Vendor Payment 5,000   [x] 01 Mar — PO#123 Payment 5,000 ✓
[ ] 05 Mar — Bank Charge     150    [ ] 03 Mar — Invoice PMT     3,200
[ ] 10 Mar — Customer PMT  3,200    [ ] ...
```

- Click a bank line and a GL line → Match button activates
- Auto-Match button runs the algorithm and highlights confident matches
- Unmatched bank lines with no GL equivalent → "Create Adjusting Entry" button (for bank charges, bank interest)
- Summary bar at top: Statement Balance | Outstanding Cheques | Deposits in Transit | Adjusted Balance | GL Balance | Difference

**Completion:**
- Difference must be LKR 0.00 to click Complete
- Completed reconciliations are read-only history

---

## Integration Points

| Module | Connection |
|--------|-----------|
| Bank Accounts | Per-account reconciliation sessions |
| GL / Journal Entries (Features 01 & 02) | GL transactions pulled as right-hand side; adjusting entries posted |
| Invoices (Feature 03) | Invoice payments appear in GL transactions |
| Payables / Bills | Bill payments appear in GL transactions |
| Financial Statements (Feature 06) | Reconciled balance feeds Balance Sheet |

---

## Implementation Steps

1. Create `bank_reconciliations` and `bank_statement_lines` tables
2. Add `is_reconciled` and `reconciliation_id` columns to `bank_transactions`
3. Build CSV import parser with configurable column mapping
4. Build auto-matching service
5. Build reconciliation API routes and controller
6. Build reconciliation hub page (account list with status)
7. Build reconciliation workspace UI (two-column matching interface)
8. Add adjusting journal entry creation from within the reconciliation screen
9. Lock completed reconciliations from further edits
