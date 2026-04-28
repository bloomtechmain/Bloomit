# Feature 04 — Tax Management (VAT / GST / WHT)

**Phase:** 1 — Accounting Core  
**Priority:** Critical  
**Effort:** M (3–4 weeks)

---

## What This Is

A configurable tax engine that applies the correct tax rates to invoices, bills,
and purchase orders, accumulates tax liability in the GL, and produces tax reports
suitable for filing returns. Covers output tax (collected from customers) and input
tax (paid to vendors), with Withholding Tax (WHT) support.

---

## Why It Matters

Tax compliance is non-negotiable for any business. Currently the system has no tax
configuration, so invoices and POs have no tax calculation. This means:
- Tax amounts are not tracked separately from revenue
- VAT payable to the tax authority is unknown
- Input tax credits cannot be claimed
- Tax filing requires manual recalculation outside the system

---

## Current Gap

- No `tax_rates` table
- No tax fields on invoices, POs, or bills
- No tax payable account posted to GL
- No tax reports (VAT return, WHT certificates)

---

## Database Changes

```sql
CREATE TABLE tax_rates (
  id              SERIAL PRIMARY KEY,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id),
  name            VARCHAR(100) NOT NULL,     -- e.g. "VAT 18%", "GST 10%", "WHT 5%"
  rate            NUMERIC(6,4) NOT NULL,     -- e.g. 0.1800 for 18%
  tax_type        VARCHAR(20) NOT NULL,      -- VAT | GST | WHT | NONE
  applies_to      VARCHAR(20) DEFAULT 'BOTH', -- SALES | PURCHASES | BOTH
  is_compound     BOOLEAN DEFAULT FALSE,     -- tax on tax
  gl_account_id   INT REFERENCES chart_of_accounts(id), -- Tax Payable or Tax Recoverable account
  is_default      BOOLEAN DEFAULT FALSE,
  is_active       BOOLEAN DEFAULT TRUE,
  description     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tax_periods (
  id              SERIAL PRIMARY KEY,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id),
  period_name     VARCHAR(50) NOT NULL,      -- e.g. "Q1 2024", "March 2024"
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  status          VARCHAR(20) DEFAULT 'OPEN', -- OPEN | LOCKED | FILED
  filed_at        TIMESTAMPTZ,
  filed_by        INT REFERENCES users(id),
  notes           TEXT
);

-- Tax transactions (linked from invoices and bills)
CREATE TABLE tax_transactions (
  id              SERIAL PRIMARY KEY,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id),
  tax_rate_id     INT NOT NULL REFERENCES tax_rates(id),
  transaction_date DATE NOT NULL,
  tax_type        VARCHAR(20) NOT NULL,      -- OUTPUT (from sales) | INPUT (from purchases)
  source_module   VARCHAR(30) NOT NULL,      -- INVOICE | BILL | PURCHASE_ORDER
  source_id       INT NOT NULL,
  taxable_amount  NUMERIC(15,2) NOT NULL,
  tax_amount      NUMERIC(15,2) NOT NULL,
  period_id       INT REFERENCES tax_periods(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Backend Implementation

### New Routes — `/api/tax`

| Method | Path | Action |
|--------|------|--------|
| GET | `/api/tax/rates` | List all tax rates |
| POST | `/api/tax/rates` | Create tax rate |
| PUT | `/api/tax/rates/:id` | Update tax rate |
| DELETE | `/api/tax/rates/:id` | Deactivate rate |
| GET | `/api/tax/periods` | List tax periods |
| POST | `/api/tax/periods` | Create new tax period |
| POST | `/api/tax/periods/:id/lock` | Lock period (prevent edits) |
| POST | `/api/tax/periods/:id/file` | Mark as filed |
| GET | `/api/tax/report` | Tax summary report (output, input, net) |
| GET | `/api/tax/vat-return` | VAT return data for a period |

### Tax Calculation Service

```typescript
// backend/src/services/taxService.ts

// Calculate tax for a single line item
function calculateLineTax(
  amount: number,
  taxRateId: number,
  inclusive: boolean  // tax-inclusive vs tax-exclusive
): { taxableAmount: number; taxAmount: number; total: number }

// Calculate total tax for a document (invoice / bill)
function calculateDocumentTax(lines: TaxableLine[]): TaxSummary

// Record tax transaction when invoice/bill is posted
async function recordTaxTransaction(
  source: 'INVOICE' | 'BILL',
  sourceId: number,
  taxType: 'OUTPUT' | 'INPUT',
  lines: TaxableLine[]
): Promise<void>

// Get net VAT position for a period (OUTPUT - INPUT = amount to remit)
async function getVATPosition(tenantId: string, periodId: number): Promise<VATSummary>
```

### WHT (Withholding Tax) Handling

WHT is deducted from vendor payments and remitted to the tax authority:
- When paying a vendor invoice with WHT: vendor receives (gross - WHT), WHT held separately
- Generate WHT certificate per vendor per period
- WHT payable account tracked separately in GL

---

## Frontend Implementation

### Tax Settings Page (`/settings/tax`)

- Tax rate configuration table (name, type, rate %, GL account)
- Toggle default rate per transaction type
- Tax period management (create, lock, mark as filed)

### Tax Report Page (`/accounting/tax-report`)

**VAT Return view:**
- Period selector
- Summary boxes: Total Output VAT | Total Input VAT | Net VAT Payable
- Transaction drill-down (click to see individual transactions)
- Export to CSV (for manual filing)

**WHT Report:**
- List of vendor payments with WHT deducted
- Group by vendor
- Generate WHT certificate per vendor (PDF)

### Tax on Invoices and Bills

When creating an invoice or bill line item, a "Tax" column appears:
- Dropdown showing all active tax rates
- Rate auto-applies, shows tax amount per line
- Invoice footer shows: Subtotal | Tax Breakdown (one row per rate) | Total

---

## Integration Points

| Module | Connection |
|--------|-----------|
| Invoices (Feature 03) | Output tax applied per line item |
| Bill Management (Feature 10) | Input tax applied per line item |
| Purchase Orders | Tax on PO totals |
| GL (Feature 01) | Tax Payable / Tax Recoverable accounts posted |
| Journal Entries (Feature 02) | Tax transactions auto-posted on each document |
| Financial Statements (Feature 06) | Tax liability on Balance Sheet; Tax expense on P&L |

---

## Sri Lanka Specific Notes

Based on EPF/ETF in the payroll, this appears to be a Sri Lanka company.
Relevant taxes to configure:
- **VAT** — 18% (standard rate as of 2024)
- **NBT (Nation Building Tax)** — if applicable
- **Income Tax / Withholding Tax (WHT)** — 5–14% on service payments
- **SSCL (Social Security Contribution Levy)** — 2.5% on turnover over threshold

These should be seeded as default tax rates when the tenant is created.

---

## Implementation Steps

1. Create `tax_rates`, `tax_periods`, `tax_transactions` tables in `databasse.sql`
2. Seed default Sri Lanka tax rates on tenant creation
3. Build `taxService.ts` with calculation and recording functions
4. Build tax rates and periods API routes
5. Build VAT return and WHT report endpoints
6. Add tax rate selector to invoice and bill line items
7. Build tax settings page
8. Build tax report page with period filter and drill-down
9. Add tax posting hooks to invoice and bill controllers
10. Generate WHT certificate PDF per vendor
