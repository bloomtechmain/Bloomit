# Feature 03 — Invoice Management

**Phase:** 1 — Accounting Core  
**Priority:** Critical  
**Effort:** M (3–5 weeks)

---

## What This Is

A proper invoicing system separate from the existing Quote Generator. Invoices are
legally binding documents sent to customers requesting payment. They have sequential
invoice numbers, payment terms, partial payment tracking, credit notes, and direct
linkage to Accounts Receivable in the GL.

Quotes become Invoices. Invoices become payments. Payments close receivables.

---

## Why It Matters

Currently the system has Quotes and Receivables as disconnected modules. There is
no formal invoice document that a customer receives with a legal invoice number,
payment due date, and itemised breakdown. Without this:
- There is no audit trail from "sale" to "cash received"
- Accounts Receivable in the GL cannot be populated correctly
- Customers cannot be sent a proper tax invoice
- Partial payments cannot be tracked against a specific invoice

---

## Current Gap

- No `invoices` table — quotes are used informally as invoices but have no invoice number series
- No payment terms (Net 30, Net 60, etc.)
- No partial payment tracking against an invoice
- No credit notes
- No overdue invoice tracking
- Receivables are manually entered, not auto-created from an invoice

---

## Database Changes

```sql
CREATE TABLE invoices (
  id              SERIAL PRIMARY KEY,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id),
  invoice_number  VARCHAR(20) NOT NULL,       -- INV-2024-0001
  quote_id        INT REFERENCES quotes(id),  -- if converted from quote
  customer_id     INT REFERENCES customers(id), -- Feature 07
  customer_name   VARCHAR(150),               -- snapshot at invoice time
  customer_email  VARCHAR(150),
  customer_address TEXT,
  issue_date      DATE NOT NULL,
  due_date        DATE NOT NULL,
  payment_terms   VARCHAR(20) DEFAULT 'NET30', -- NET15 | NET30 | NET60 | DUE_ON_RECEIPT
  status          VARCHAR(20) DEFAULT 'DRAFT', -- DRAFT | SENT | PARTIAL | PAID | OVERDUE | VOID
  subtotal        NUMERIC(15,2) NOT NULL,
  tax_amount      NUMERIC(15,2) DEFAULT 0,
  discount_amount NUMERIC(15,2) DEFAULT 0,
  total           NUMERIC(15,2) NOT NULL,
  amount_paid     NUMERIC(15,2) DEFAULT 0,
  amount_due      NUMERIC(15,2) GENERATED ALWAYS AS (total - amount_paid) STORED,
  notes           TEXT,
  terms_and_conditions TEXT,
  created_by      INT REFERENCES users(id),
  sent_at         TIMESTAMPTZ,
  void_reason     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, invoice_number)
);

CREATE TABLE invoice_items (
  id              SERIAL PRIMARY KEY,
  invoice_id      INT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description     TEXT NOT NULL,
  quantity        NUMERIC(10,2) NOT NULL,
  unit_price      NUMERIC(15,2) NOT NULL,
  tax_rate_id     INT REFERENCES tax_rates(id),  -- Feature 04
  tax_amount      NUMERIC(15,2) DEFAULT 0,
  total           NUMERIC(15,2) NOT NULL
);

CREATE TABLE invoice_payments (
  id              SERIAL PRIMARY KEY,
  invoice_id      INT NOT NULL REFERENCES invoices(id),
  payment_date    DATE NOT NULL,
  amount          NUMERIC(15,2) NOT NULL,
  payment_method  VARCHAR(30),              -- BANK_TRANSFER | CASH | CHEQUE | CARD
  reference       VARCHAR(100),             -- cheque number, bank reference, etc.
  bank_account_id INT REFERENCES company_bank_accounts(id),
  notes           TEXT,
  recorded_by     INT REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE credit_notes (
  id              SERIAL PRIMARY KEY,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id),
  credit_note_number VARCHAR(20) NOT NULL,  -- CN-2024-0001
  invoice_id      INT REFERENCES invoices(id),
  reason          TEXT NOT NULL,
  amount          NUMERIC(15,2) NOT NULL,
  status          VARCHAR(20) DEFAULT 'ISSUED', -- ISSUED | APPLIED | VOID
  issued_date     DATE NOT NULL,
  created_by      INT REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Backend Implementation

### New Routes — `/api/invoices`

| Method | Path | Action |
|--------|------|--------|
| GET | `/api/invoices` | List invoices (filter by status, customer, date) |
| GET | `/api/invoices/:id` | Invoice detail with items and payment history |
| POST | `/api/invoices` | Create invoice (DRAFT) |
| POST | `/api/invoices/from-quote/:quoteId` | Convert quote → invoice |
| PUT | `/api/invoices/:id` | Update DRAFT invoice |
| POST | `/api/invoices/:id/send` | Mark as SENT, send email to customer |
| POST | `/api/invoices/:id/payment` | Record a payment (partial or full) |
| POST | `/api/invoices/:id/void` | Void invoice |
| GET | `/api/invoices/:id/pdf` | Download invoice as PDF |
| POST | `/api/invoices/credit-notes` | Issue credit note |
| GET | `/api/invoices/aging` | AR aging report (0–30, 31–60, 61–90, 90+) |
| GET | `/api/invoices/overdue` | List overdue invoices |

### Key Business Logic

```typescript
// Status transitions
DRAFT → SENT (when emailed to customer)
SENT  → PARTIAL (first partial payment recorded)
SENT/PARTIAL → PAID (amount_paid >= total)
SENT/PARTIAL → OVERDUE (due_date passed and not paid — cron job checks daily)
ANY → VOID (manual void with reason)

// Auto-number: INV-YYYY-NNNN, sequential per tenant per year
// When payment recorded:
//   1. Insert into invoice_payments
//   2. Update invoices.amount_paid
//   3. Update status (PARTIAL or PAID)
//   4. Credit bank account balance
//   5. Auto-post GL journal entry (DR Bank / CR Accounts Receivable)

// Overdue cron job (daily 8 AM, alongside quote reminders):
//   SELECT invoices WHERE due_date < TODAY AND status NOT IN ('PAID', 'VOID')
//   UPDATE status = 'OVERDUE'
//   Send overdue notification email
```

### PDF Generation

Extend the existing PDFKit setup to generate invoice PDFs:
- Company logo and name
- Invoice number and dates
- Customer billing address
- Line items table (description, qty, unit price, tax, total)
- Subtotal / tax / discount / total
- Payment terms and bank details
- "PAID" watermark if status is PAID

---

## Frontend Implementation

### New Page — Invoices (`/invoices`)

**List view:**
- Table: Invoice # | Customer | Issue Date | Due Date | Total | Amount Due | Status
- Color-coded status badges
- Filter by: status, date range, customer
- Quick actions: View PDF, Record Payment, Send Email

**Create / Edit view:**
- Customer selector (or manual entry if no CRM yet)
- Issue date and payment terms (auto-calculates due date)
- Line items (same pattern as quote generator)
- Tax per line (dropdown from tax rates — Feature 04)
- Notes and terms
- Running total at bottom

**Detail view:**
- Invoice preview (matches PDF layout)
- Payment history timeline
- "Record Payment" modal (amount, date, method, reference)
- Credit notes section
- Journal entries tab (shows auto-posted GL entries)
- Send / Void / Download PDF buttons

### Quote → Invoice Conversion

On the Quote detail page, add a "Convert to Invoice" button (available when status
is ACCEPTED). This prefills the invoice form with all quote line items, then marks
the quote as Invoiced.

---

## Integration Points

| Module | Connection |
|--------|-----------|
| Quotes | Convert accepted quote → invoice |
| Customers (Feature 07) | Pull customer details |
| Tax (Feature 04) | Apply tax rates per line item |
| GL (Feature 01) | Auto-post on issue and on payment |
| Journal Entries (Feature 02) | Create JE on each payment |
| Bank Accounts | Credit bank on payment receipt |
| Receivables | Auto-create receivable record when invoice issued |

---

## Implementation Steps

1. Create `invoices`, `invoice_items`, `invoice_payments`, `credit_notes` tables
2. Build invoice number auto-generation (INV-YYYY-NNNN)
3. Build invoice API routes and controller
4. Add daily cron job to mark overdue invoices and send email alerts
5. Extend PDFKit to generate branded invoice PDF
6. Add "Convert to Invoice" action to Quote detail page
7. Build invoice list page with filters and status badges
8. Build invoice create/edit form with line items and tax
9. Build invoice detail page with payment history and journal entries tab
10. Add GL auto-posting hooks to invoice controller
