# Feature 06 — Financial Statements (Balance Sheet, P&L, Cash Flow)

**Phase:** 1 — Accounting Core  
**Priority:** High  
**Effort:** M (3–5 weeks)  
**Depends on:** Feature 01 (GL) and Feature 02 (Journal Entries)

---

## What This Is

Auto-generated financial statements derived directly from the General Ledger:

1. **Balance Sheet** — snapshot of assets, liabilities, and equity at a point in time
2. **Profit & Loss (Income Statement)** — revenue and expenses over a period
3. **Cash Flow Statement** — movement of cash (indirect method, derived from P&L + balance sheet changes)
4. **Trial Balance** — full listing of all account balances (debit/credit) for a period

All statements pull live data from `gl_entries` grouped by `chart_of_accounts` — no separate data entry required.

---

## Why It Matters

Financial statements are the end product of everything the accounting system does.
They are required for:
- Tax filing
- Bank loan applications
- Investor reporting
- Management decisions
- Audit purposes

With the GL in place (Feature 01), generating these statements is primarily a
reporting/aggregation problem, not a data collection problem.

---

## Current Gap

- No financial statements exist in the system
- The analytics module has P&L fragments but they are based on raw module data, not the GL
- No Balance Sheet possible without the GL
- No Cash Flow Statement
- No comparative period analysis

---

## Database Changes

No new tables needed. All data comes from `gl_entries` joined to `chart_of_accounts`.

Optional (for performance on large datasets):
```sql
-- Materialized view: account balances by month (refresh nightly or on-demand)
CREATE MATERIALIZED VIEW gl_monthly_balances AS
SELECT
  tenant_id,
  account_id,
  DATE_TRUNC('month', entry_date) AS month,
  SUM(debit)  AS total_debit,
  SUM(credit) AS total_credit,
  SUM(debit - credit) AS net
FROM gl_entries
GROUP BY tenant_id, account_id, DATE_TRUNC('month', entry_date);

CREATE UNIQUE INDEX ON gl_monthly_balances(tenant_id, account_id, month);
```

---

## Backend Implementation

### New Routes — `/api/reports`

| Method | Path | Action |
|--------|------|--------|
| GET | `/api/reports/balance-sheet` | Balance Sheet at a given date |
| GET | `/api/reports/profit-loss` | P&L for a date range |
| GET | `/api/reports/cash-flow` | Cash Flow Statement for a date range |
| GET | `/api/reports/trial-balance` | Trial Balance for a date range |
| GET | `/api/reports/balance-sheet/pdf` | Download Balance Sheet as PDF |
| GET | `/api/reports/profit-loss/pdf` | Download P&L as PDF |

### Report Generation Logic

```typescript
// backend/src/services/financialReportsService.ts

// Balance Sheet: sum GL entries by account up to 'asOfDate'
// Assets = total of accounts with type = ASSET (debit-normal)
// Liabilities = total of accounts with type = LIABILITY (credit-normal)
// Equity = total of accounts with type = EQUITY (credit-normal)
// Verification: Assets = Liabilities + Equity (must always balance)
async function getBalanceSheet(tenantId: string, asOfDate: Date): Promise<BalanceSheet>

// P&L: sum GL entries for revenue and expense accounts within date range
// Revenue accounts (credit-normal): sum credits - sum debits
// Expense accounts (debit-normal): sum debits - sum credits
// Net Income = Revenue - Expenses
async function getProfitAndLoss(tenantId: string, from: Date, to: Date): Promise<PnL>

// Cash Flow (indirect method):
// Start with Net Income
// Adjust for non-cash items (depreciation, amortisation)
// Adjust for changes in working capital (AR, AP, inventory)
// Add investing activities (asset purchases/sales)
// Add financing activities (loan proceeds/repayments, equity injections)
async function getCashFlow(tenantId: string, from: Date, to: Date): Promise<CashFlow>

// Trial Balance: net balance per account for the period
async function getTrialBalance(tenantId: string, from: Date, to: Date): Promise<TrialBalance>
```

### Comparative Periods

Every statement accepts an optional `comparePeriod` parameter. When provided, the
response includes two columns: current period and prior period, with variance (absolute and %).

---

## Frontend Implementation

### Financial Reports Page (`/accounting/reports`)

**Navigation:**
- Sidebar tabs: Balance Sheet | P&L | Cash Flow | Trial Balance

**Common controls (all reports):**
- Period selector: month, quarter, year, custom range
- "Compare to prior year" toggle
- Download PDF button
- Expand/collapse account groups

**Balance Sheet layout:**

```
BALANCE SHEET — as at 31 March 2024
                                    Mar 2024    Mar 2023    Change
ASSETS
  Current Assets
    Cash & Equivalents              1,250,000   980,000    +27.6%
    Accounts Receivable               845,000   620,000    +36.3%
    Inventory                         320,000   290,000    +10.3%
  Total Current Assets             2,415,000  1,890,000

  Non-Current Assets
    Fixed Assets (net)              3,200,000  3,500,000
  Total Assets                     5,615,000  5,390,000

LIABILITIES
  Accounts Payable                    480,000   410,000
  Loans Payable                     1,200,000  1,400,000
  VAT Payable                         92,000    78,000
  Total Liabilities                 1,772,000  1,888,000

EQUITY
  Retained Earnings                 3,843,000  3,502,000
  Total Equity                      3,843,000  3,502,000

  Total Liabilities + Equity        5,615,000  5,390,000
```

**P&L layout:**

```
PROFIT & LOSS — 1 Jan 2024 to 31 Mar 2024
                                    Q1 2024    Q1 2023    Change
Revenue
  Service Revenue                  2,100,000  1,850,000  +13.5%
  Product Sales                      340,000    290,000  +17.2%
Total Revenue                      2,440,000  2,140,000

Cost of Goods Sold                   820,000    730,000
Gross Profit                       1,620,000  1,410,000

Operating Expenses
  Salaries & Wages                   640,000    580,000
  Rent                                85,000     85,000
  Utilities                           22,000     19,000
  Depreciation                        45,000     45,000
Total Operating Expenses             792,000    729,000

Operating Profit                     828,000    681,000
Interest Expense                      48,000     56,000
Net Profit Before Tax                780,000    625,000
Tax Expense (30%)                    234,000    187,500
Net Profit After Tax                 546,000    437,500
```

**PDF Export:**
- Company header (name, address, logo)
- Report title and period
- Proper accounting formatting (thousands separator, negative numbers in brackets)
- Page numbers and "prepared on" date
- Footer: "This report is generated from the Bloomit ERP system"

---

## Integration Points

| Module | How it feeds the statements |
|--------|----------------------------|
| GL (Feature 01) | All `gl_entries` are the data source |
| Journal Entries (Feature 02) | Auto and manual JEs both contribute |
| Invoices (Feature 03) | Revenue and AR balances |
| Tax (Feature 04) | Tax payable on Balance Sheet; tax expense on P&L |
| Payroll | Salary expense on P&L; payables on Balance Sheet |
| Loans | Loan payable on Balance Sheet; interest on P&L |
| Assets | Fixed assets on Balance Sheet; depreciation on P&L |

---

## Implementation Steps

1. Build `financialReportsService.ts` with all four report functions
2. Create the materialized view for performance (optional, add if queries are slow)
3. Build report API routes with period and compare-period parameters
4. Build the financial reports page with tab navigation
5. Implement Balance Sheet component with expand/collapse groups
6. Implement P&L component with comparative column support
7. Implement Cash Flow component (indirect method)
8. Implement Trial Balance component
9. Extend PDFKit to generate all four reports as formatted PDFs
10. Add "comparative period" toggle and variance column rendering
