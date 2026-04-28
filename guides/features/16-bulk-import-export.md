# Feature 16 — Bulk Import / Export

**Phase:** 4 — System & Integrations  
**Priority:** Medium  
**Effort:** M (3–4 weeks)

---

## What This Is

Tools for importing data in bulk from CSV/Excel files (useful for initial data
migration, recurring uploads, or accountant hand-offs) and exporting data from
any module as CSV, Excel, or PDF. Also includes a data migration wizard for
businesses switching from other accounting software (QuickBooks, Xero, Tally, Sage).

---

## Why It Matters

No business starts fresh. When a new client adopts Bloomit, they have years of
existing data in spreadsheets, QuickBooks, or Tally. Without import tools, the
setup friction is prohibitive. Similarly, accountants working outside the system
(e.g., for tax filing or reporting) need clean data exports they can process in Excel.

---

## Current Gap

- No bulk import capability for any module
- Export is limited to individual PDF downloads (invoices, payslips)
- No CSV/Excel export from any list view
- No data migration tooling

---

## Database Changes

```sql
CREATE TABLE import_jobs (
  id              SERIAL PRIMARY KEY,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id),
  import_type     VARCHAR(50) NOT NULL,    -- CUSTOMERS | VENDORS | PRODUCTS | INVOICES | GL_ENTRIES | etc.
  file_name       VARCHAR(255) NOT NULL,
  total_rows      INT,
  processed_rows  INT DEFAULT 0,
  success_rows    INT DEFAULT 0,
  error_rows      INT DEFAULT 0,
  status          VARCHAR(20) DEFAULT 'PENDING', -- PENDING | PROCESSING | COMPLETED | FAILED
  errors          JSONB,                   -- array of { row, field, message }
  imported_by     INT REFERENCES users(id),
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Backend Implementation

### New Routes — `/api/import-export`

| Method | Path | Action |
|--------|------|--------|
| GET | `/api/export/:module` | Export any module as CSV or Excel |
| GET | `/api/export/gl` | Export GL entries (date range, account filter) |
| GET | `/api/export/payroll` | Export payroll register for a period |
| GET | `/api/export/template/:type` | Download import template CSV |
| POST | `/api/import/:type` | Upload CSV/Excel file for import |
| GET | `/api/import/jobs` | List import job history |
| GET | `/api/import/jobs/:id` | Import job status and errors |

### Import Pipeline

```typescript
// backend/src/services/importService.ts

// Generalised import pipeline:
// 1. Parse CSV/Excel → array of raw rows
// 2. Map columns (using template headers or user-configured column mapping)
// 3. Validate each row (required fields, data types, referential integrity)
// 4. Insert valid rows, skip invalid rows
// 5. Return summary: total / success / errors (with row number and reason)

async function runImport(
  tenantId: string,
  importType: ImportType,
  fileBuffer: Buffer,
  userId: number
): Promise<ImportResult>
```

### Supported Import Types

| Import Type | Key Columns | Notes |
|-------------|-------------|-------|
| Customers | name, email, phone, address, payment_terms | Auto-generates customer number |
| Vendors | name, email, phone, address | Auto-generates vendor code |
| Products | sku, name, category, cost_price, selling_price, opening_stock | Requires warehouses set up |
| Opening Balances | account_code, debit, credit | One-time GL opening balance import |
| Historical Invoices | invoice_number, customer, date, amount | For data migration from prior system |
| Employees | name, email, hire_date, department, salary | Matches to existing system format |
| Chart of Accounts | code, name, type, sub_type | Bulk COA setup |

### Export Service

```typescript
// Every list view can be exported
// Export uses the same filter parameters as the list view API

async function exportToCSV(data: object[]): Promise<Buffer>
async function exportToExcel(data: object[], sheetName: string): Promise<Buffer>

// Header row maps internal field names to human-readable column names
// Number formatting (2 decimal places), date formatting (YYYY-MM-DD)
// Large exports (>10,000 rows) run as background jobs
```

### Excel Import (xlsx parsing)

Use the `xlsx` npm package (already available or easy to add) to parse `.xlsx` files.
First row must be headers matching the template. Flexible column ordering (matched by
header name, not position).

---

## Frontend Implementation

### Import / Export Page (`/settings/import-export`)

**Export section:**

Table of exportable modules with "Export" button per row:
- Customers, Vendors, Products
- Invoices, Bills, Purchase Orders
- GL Entries, Trial Balance
- Payroll Register, EPF/ETF Schedule
- Employees, Time Entries

Format selector: CSV | Excel | PDF (where available)
Date range / filter summary shown before export.

**Import section:**

Step-by-step wizard:
1. Select import type (dropdown)
2. Download template (shows expected format)
3. Upload your file (CSV or Excel)
4. Column mapping (if columns don't match template exactly)
5. Preview first 5 rows
6. Confirm import
7. Results: success count, error list with row numbers

**Import History:**
Table of past imports: type, file, date, success/error counts, status.
Click to see error details.

### Export Button on Every List Page

Add an "Export" dropdown button (CSV | Excel) to the top-right of every list page:
- Invoices, Bills, Customers, Vendors, Employees, Payroll, etc.
- Exports the current filtered view, not everything
- Shows "Exporting..." spinner for large files

### Opening Balance Import Wizard

A special guided workflow for new tenants going live:
1. Download pre-formatted Excel template with COA accounts
2. Enter opening balances per account as of the go-live date
3. Upload → system creates a single Journal Entry with all opening balances
4. Validate: Assets = Liabilities + Equity (must balance before import)

---

## Integration Points

Imports write directly to module tables (customers, vendors, products, invoices, gl_entries).
Exports read from the same APIs used by the list views.

| Module | Import | Export |
|--------|--------|--------|
| Customers | ✅ | ✅ |
| Vendors | ✅ | ✅ |
| Products | ✅ | ✅ |
| Invoices | ✅ (migration only) | ✅ |
| GL Entries | ✅ (opening balances) | ✅ |
| Payroll | ❌ | ✅ |
| Employees | ✅ | ✅ |

---

## Implementation Steps

1. Create `import_jobs` table
2. Add `xlsx` package for Excel parsing/generation
3. Build `importService.ts` with generic pipeline (parse → validate → insert)
4. Build `exportService.ts` with CSV and Excel generation
5. Create import templates for each type (CSV files with header row and example row)
6. Build import/export settings page with wizard UI
7. Add "Export" dropdown button to all major list pages
8. Build opening balance import wizard
9. Build import job history page with error detail drill-down
10. Handle large exports as background jobs with download link on completion
