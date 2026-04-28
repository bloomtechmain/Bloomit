# Feature 07 — Customer Management (CRM Lite)

**Phase:** 2 — Business Operations  
**Priority:** High  
**Effort:** M (3–4 weeks)

---

## What This Is

A customer database that stores billing information, contact history, and the full
financial relationship with each customer. Not a full CRM — the focus is on the
accounting relationship: what has been quoted, invoiced, and paid, and what is
outstanding. Quotes, Invoices, and Receivables all link to a Customer record.

---

## Why It Matters

Currently, customer information is embedded inside individual quotes and (soon) invoices
as free-text fields. This means:
- The same customer is typed repeatedly with no consistency
- There is no way to see all invoices for one customer in one place
- AR aging cannot be broken down by customer
- No credit limits or payment terms per customer

---

## Current Gap

- No `customers` table
- Quote customer fields are free-text (name, email, address)
- No customer-level reporting (total billed, total paid, outstanding balance)

---

## Database Changes

```sql
CREATE TABLE customers (
  id              SERIAL PRIMARY KEY,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id),
  customer_number VARCHAR(20) NOT NULL,     -- CUST-0001
  name            VARCHAR(150) NOT NULL,
  email           VARCHAR(150),
  phone           VARCHAR(30),
  company_name    VARCHAR(150),
  tax_id          VARCHAR(50),              -- VAT registration number, etc.
  billing_address TEXT,
  shipping_address TEXT,
  payment_terms   VARCHAR(20) DEFAULT 'NET30',
  credit_limit    NUMERIC(15,2),
  currency        VARCHAR(3) DEFAULT 'LKR',
  account_manager INT REFERENCES users(id),
  notes           TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, customer_number)
);

CREATE TABLE customer_contacts (
  id              SERIAL PRIMARY KEY,
  customer_id     INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name            VARCHAR(150) NOT NULL,
  role            VARCHAR(100),             -- e.g. "Finance Manager", "Procurement"
  email           VARCHAR(150),
  phone           VARCHAR(30),
  is_primary      BOOLEAN DEFAULT FALSE
);

CREATE TABLE customer_notes (
  id              SERIAL PRIMARY KEY,
  customer_id     INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  note            TEXT NOT NULL,
  created_by      INT REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Add customer_id to existing tables
ALTER TABLE quotes    ADD COLUMN customer_id INT REFERENCES customers(id);
ALTER TABLE invoices  ADD COLUMN customer_id INT REFERENCES customers(id);
ALTER TABLE receivables ADD COLUMN customer_id INT REFERENCES customers(id);
```

---

## Backend Implementation

### New Routes — `/api/customers`

| Method | Path | Action |
|--------|------|--------|
| GET | `/api/customers` | List all customers (search, filter by active) |
| GET | `/api/customers/:id` | Customer profile |
| POST | `/api/customers` | Create customer |
| PUT | `/api/customers/:id` | Update customer |
| DELETE | `/api/customers/:id` | Deactivate customer |
| GET | `/api/customers/:id/quotes` | All quotes for this customer |
| GET | `/api/customers/:id/invoices` | All invoices for this customer |
| GET | `/api/customers/:id/statement` | Customer account statement |
| GET | `/api/customers/:id/balance` | Outstanding balance |
| POST | `/api/customers/:id/contacts` | Add contact |
| DELETE | `/api/customers/:id/contacts/:contactId` | Remove contact |
| POST | `/api/customers/:id/notes` | Add note |
| GET | `/api/customers/aging` | AR aging summary grouped by customer |

### Customer Statement Logic

```typescript
// Account statement for a customer between two dates:
// Opening balance at start date
// + Invoices issued
// - Payments received
// - Credit notes applied
// = Closing balance
async function getCustomerStatement(
  customerId: number,
  from: Date,
  to: Date
): Promise<CustomerStatement>
```

### Credit Limit Enforcement

When creating an invoice for a customer, check:
```typescript
if (customer.creditLimit && customer.outstandingBalance + invoiceTotal > customer.creditLimit) {
  // Return warning (not hard block — let user override with reason)
}
```

---

## Frontend Implementation

### Customers Page (`/customers`)

**List view:**
- Table: Customer # | Name | Company | Outstanding Balance | Last Invoice | Status
- Search by name, email, company
- Filter: Active / Inactive
- Click row → Customer profile

**Customer Profile:**

Four-tab layout:
1. **Overview** — contact info, payment terms, credit limit, account manager
2. **Transactions** — all invoices and payments in one timeline
3. **Statement** — printable account statement (date range selector)
4. **Notes** — internal notes with timestamps

**Quick stats cards at top:**
- Total Billed (all time)
- Total Paid
- Outstanding Balance
- Overdue Amount

**Customer Selector Component (reusable)**

Used in: Quote form, Invoice form, Receivables form.
- Searchable dropdown
- Option to "Create new customer" inline (opens mini-form in modal)
- Shows customer name + payment terms on selection

---

## Integration Points

| Module | Connection |
|--------|-----------|
| Quotes | `customer_id` replaces free-text customer fields |
| Invoices (Feature 03) | `customer_id` links invoices to customer |
| Receivables | `customer_id` for AR aging by customer |
| Tax (Feature 04) | Customer tax ID for tax invoice compliance |
| Financial Statements (Feature 06) | AR aging feeds into Balance Sheet notes |
| Multi-currency (Feature 13) | Customer currency setting |

---

## Implementation Steps

1. Create `customers`, `customer_contacts`, `customer_notes` tables
2. Add `customer_id` FK to `quotes`, `invoices`, `receivables`
3. Build customer number auto-generation (CUST-NNNN)
4. Build customer CRUD API routes and controller
5. Build customer statement endpoint
6. Build customers list page with search and filters
7. Build customer profile page (4-tab layout)
8. Build reusable Customer Selector component
9. Update Quote form to use Customer Selector
10. Update Invoice form to use Customer Selector and pull payment terms automatically
