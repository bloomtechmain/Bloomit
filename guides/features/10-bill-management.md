# Feature 10 — Bill Management (AP Bills)

**Phase:** 2 — Business Operations  
**Priority:** High  
**Effort:** S (1–2 weeks)  
**Note:** This is an enhancement of the existing Payables module, not a replacement.

---

## What This Is

A formal Accounts Payable (AP) bill workflow that gives vendor invoices (bills) a
proper lifecycle: received → approved → scheduled for payment → paid. Bills link
directly to Purchase Orders (3-way match), accumulate in the GL as AP, and reduce
AP when paid. This is more structured than the current Payables module.

---

## Why It Matters

The existing Payables module tracks outgoing payments but does not model the moment
when a vendor invoice arrives and creates an AP liability before payment. Without this:
- AP balance on the Balance Sheet is unknown until actually paid
- Cannot do 3-way PO matching (PO vs. receipt vs. bill)
- Accrual accounting is impossible (expense is not recorded until cash goes out)
- Cannot schedule future payments or track what's due when

---

## Current Gap

- `payables` table records cash payments, not bills-received
- No `bills_received` concept or liability-before-payment
- No 3-way match (PO → Receipt → Bill)
- No AP aging from unpaid bills

---

## Database Changes

This extends the existing payables concept with a formal bill table:

```sql
CREATE TABLE vendor_bills (
  id              SERIAL PRIMARY KEY,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id),
  bill_number     VARCHAR(50) NOT NULL,      -- vendor's own invoice number
  internal_number VARCHAR(20) NOT NULL,      -- BILL-2024-0001 (internal)
  vendor_id       INT REFERENCES vendors(id),
  purchase_order_id INT REFERENCES purchase_orders(id), -- for 3-way match
  bill_date       DATE NOT NULL,             -- date on vendor's invoice
  due_date        DATE NOT NULL,
  payment_terms   VARCHAR(20) DEFAULT 'NET30',
  status          VARCHAR(20) DEFAULT 'RECEIVED', -- RECEIVED | APPROVED | SCHEDULED | PAID | DISPUTED | VOID
  subtotal        NUMERIC(15,2) NOT NULL,
  tax_amount      NUMERIC(15,2) DEFAULT 0,
  total           NUMERIC(15,2) NOT NULL,
  amount_paid     NUMERIC(15,2) DEFAULT 0,
  amount_due      NUMERIC(15,2) GENERATED ALWAYS AS (total - amount_paid) STORED,
  notes           TEXT,
  attachment_id   INT,                       -- scanned invoice document
  approved_by     INT REFERENCES users(id),
  approved_at     TIMESTAMPTZ,
  created_by      INT REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE vendor_bill_items (
  id              SERIAL PRIMARY KEY,
  bill_id         INT NOT NULL REFERENCES vendor_bills(id) ON DELETE CASCADE,
  description     TEXT NOT NULL,
  quantity        NUMERIC(10,2),
  unit_price      NUMERIC(15,2),
  gl_account_id   INT REFERENCES chart_of_accounts(id), -- which expense account to debit
  tax_rate_id     INT REFERENCES tax_rates(id),
  tax_amount      NUMERIC(15,2) DEFAULT 0,
  total           NUMERIC(15,2) NOT NULL
);

CREATE TABLE bill_payments (
  id              SERIAL PRIMARY KEY,
  bill_id         INT NOT NULL REFERENCES vendor_bills(id),
  payment_date    DATE NOT NULL,
  amount          NUMERIC(15,2) NOT NULL,
  payment_method  VARCHAR(30),
  bank_account_id INT REFERENCES company_bank_accounts(id),
  reference       VARCHAR(100),
  notes           TEXT,
  recorded_by     INT REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Backend Implementation

### New Routes — `/api/bills`

| Method | Path | Action |
|--------|------|--------|
| GET | `/api/bills` | List bills (filter by status, vendor, due date) |
| GET | `/api/bills/:id` | Bill detail |
| POST | `/api/bills` | Create bill (RECEIVED) |
| POST | `/api/bills/from-po/:poId` | Create bill from approved PO |
| PUT | `/api/bills/:id` | Update RECEIVED bill |
| POST | `/api/bills/:id/approve` | Approve bill (status → APPROVED) |
| POST | `/api/bills/:id/payment` | Record payment |
| POST | `/api/bills/:id/dispute` | Mark as disputed with reason |
| GET | `/api/bills/aging` | AP aging by vendor (0–30, 31–60, 61–90, 90+) |
| GET | `/api/bills/due-this-week` | Bills due in the next 7 days |

### Key Business Logic

```typescript
// Status transitions
RECEIVED  → APPROVED  (after review; GL posts: DR Expense/Asset / CR Accounts Payable)
APPROVED  → SCHEDULED (payment date set in advance)
SCHEDULED → PAID      (payment recorded; GL posts: DR Accounts Payable / CR Bank)
RECEIVED  → DISPUTED  (vendor error — put on hold)

// 3-way match check when creating bill from PO:
// 1. PO amounts match bill amounts (±5% tolerance configurable)
// 2. PO items were actually received (linked to stock movement if inventory)
// 3. Bill quantity ≤ PO quantity
async function checkThreeWayMatch(poId: number, bill: BillDraft): Promise<MatchResult>

// AP aging:
// Sum amount_due grouped by (0–30 days, 31–60, 61–90, 90+) past due_date
```

### GL Auto-Posting

On bill APPROVED:
```
DR Expense Account (per line item's gl_account_id)  [amount]
DR Input Tax Recoverable                             [tax_amount]
  CR Accounts Payable                                [total]
```

On bill PAID:
```
DR Accounts Payable   [amount_paid]
  CR Bank Account     [amount_paid]
```

---

## Frontend Implementation

### Bills Page (`/bills`)

**List view:**
- Table: Bill # | Vendor | PO # | Bill Date | Due Date | Total | Amount Due | Status
- Overdue bills highlighted in red
- Filter by: status, vendor, due date range
- "Due This Week" quick filter

**Bill Detail:**
- Header: vendor, bill date, due date, status
- Line items table (description, GL account, tax, total)
- 3-way match status badge (if linked to PO)
- Payment history
- Approve / Record Payment / Dispute buttons

**AP Aging Report (`/bills/aging`):**
- Table per vendor: Current | 1–30 | 31–60 | 61–90 | 90+ | Total
- Total row at bottom
- Export to PDF

### "Bills Due This Week" Widget

Add to the main dashboard: a list of bills due in the next 7 days with quick-pay action.

---

## Integration Points

| Module | Connection |
|--------|-----------|
| Purchase Orders | Create bill from approved PO; 3-way match |
| Vendors (existing) | Vendor FK |
| GL (Feature 01) | AP posting on approval; Bank posting on payment |
| Tax (Feature 04) | Input tax per line item |
| Bank Reconciliation (Feature 05) | Bill payments appear in GL for reconciliation |
| Financial Statements (Feature 06) | AP balance on Balance Sheet |

---

## Implementation Steps

1. Create `vendor_bills`, `vendor_bill_items`, `bill_payments` tables
2. Build bill controller with status machine
3. Build 3-way match validation service
4. Build AP aging query
5. Add "Create Bill" action to approved PO detail page
6. Build bills list page with overdue highlighting
7. Build bill detail page with approval/payment actions
8. Build AP aging report page
9. Add GL auto-posting hooks on approve and payment
10. Add "Bills Due This Week" dashboard widget
