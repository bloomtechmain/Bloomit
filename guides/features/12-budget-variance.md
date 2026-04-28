# Feature 12 — Budget Planning & Variance Analysis

**Phase:** 3 — Reporting & Intelligence  
**Priority:** Medium  
**Effort:** M (3–4 weeks)  
**Depends on:** Feature 01 (GL), Feature 06 (Financial Statements)

---

## What This Is

A budgeting system that lets management set annual or monthly financial targets per
GL account (revenue targets, expense limits, project budgets), then automatically
compares actuals from the GL against those targets to show variances — how far over
or under budget the business is running.

---

## Why It Matters

Without budgets, management has no benchmark to measure performance against. You can
see that you spent LKR 650,000 on salaries — but is that good or bad? A budget says
the plan was LKR 600,000, so you are 8.3% over. Variance analysis turns raw numbers
into actionable intelligence and is a core management accounting tool.

---

## Current Gap

- No budget concept exists
- Analytics module shows actuals only, no targets
- No variance reporting
- Project budgets exist per project (in the Projects module) but are not connected to the GL

---

## Database Changes

```sql
CREATE TABLE budget_periods (
  id              SERIAL PRIMARY KEY,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id),
  name            VARCHAR(100) NOT NULL,     -- "FY 2024", "Q1 2024"
  fiscal_year     INT NOT NULL,
  period_type     VARCHAR(20) NOT NULL,      -- ANNUAL | QUARTERLY | MONTHLY
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  status          VARCHAR(20) DEFAULT 'DRAFT', -- DRAFT | ACTIVE | LOCKED
  created_by      INT REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE budget_lines (
  id              SERIAL PRIMARY KEY,
  budget_period_id INT NOT NULL REFERENCES budget_periods(id) ON DELETE CASCADE,
  account_id      INT NOT NULL REFERENCES chart_of_accounts(id),
  month           DATE,                      -- NULL for annual budgets; month start for monthly
  budgeted_amount NUMERIC(15,2) NOT NULL,
  notes           TEXT,
  UNIQUE(budget_period_id, account_id, month)
);

-- Optional: department/cost-centre dimension
CREATE TABLE cost_centres (
  id              SERIAL PRIMARY KEY,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id),
  name            VARCHAR(100) NOT NULL,
  code            VARCHAR(20) NOT NULL,
  is_active       BOOLEAN DEFAULT TRUE
);

-- Add cost_centre_id to gl_entries for department-level reporting
ALTER TABLE gl_entries ADD COLUMN cost_centre_id INT REFERENCES cost_centres(id);
```

---

## Backend Implementation

### New Routes — `/api/budgets`

| Method | Path | Action |
|--------|------|--------|
| GET | `/api/budgets` | List budget periods |
| POST | `/api/budgets` | Create budget period |
| PUT | `/api/budgets/:id` | Update DRAFT budget |
| POST | `/api/budgets/:id/activate` | Activate (set as current) |
| POST | `/api/budgets/:id/lock` | Lock (prevent further edits) |
| GET | `/api/budgets/:id/lines` | All budget lines for a period |
| PUT | `/api/budgets/:id/lines` | Bulk update budget lines |
| GET | `/api/budgets/:id/variance` | Variance report (actual vs budget) |
| GET | `/api/budgets/:id/variance/summary` | Top-line summary (revenue, expenses, profit) |

### Variance Calculation Service

```typescript
// backend/src/services/budgetService.ts

interface VarianceLine {
  accountId: number;
  accountName: string;
  accountType: string;
  budgeted: number;
  actual: number;
  variance: number;        // actual - budgeted
  variancePercent: number; // (variance / budgeted) * 100
  isFavourable: boolean;   // revenue over = favourable; expense over = unfavourable
}

async function getVarianceReport(
  budgetPeriodId: number,
  asOfDate: Date
): Promise<VarianceLine[]>

// For each budget line:
// 1. Get budgeted_amount from budget_lines
// 2. Get actual amount from gl_entries (sum debit - credit or credit - debit depending on account type)
// 3. Calculate variance and flag favourable/unfavourable
```

### Budget Copy / Rollforward

Common workflow: copy last year's budget as starting point for next year with
optional percentage uplift across all lines.

```typescript
async function copyBudget(
  sourcePeriodId: number,
  targetPeriodName: string,
  upliftPercent: number  // e.g. 10 for a 10% increase
): Promise<BudgetPeriod>
```

---

## Frontend Implementation

### Budget Management (`/budgets`)

**Budget List:**
- Table: Period | Type | Fiscal Year | Status | Actions
- Active budget highlighted
- "New Budget" and "Copy Previous" buttons

**Budget Editor:**

Spreadsheet-like interface:
- Rows = GL accounts (grouped by type: Revenue, COGS, Operating Expenses, etc.)
- Columns = months (Jan → Dec) for annual budgets, or single column for period budgets
- Inline editable cells
- Row totals and column totals auto-calculated
- Import from CSV option (paste from Excel)

**Variance Report (`/budgets/variance`):**

```
BUDGET VS ACTUAL — FY 2024 (as at 30 June 2024)
                        Budget      Actual     Variance    %
Revenue
  Service Revenue     4,200,000   3,980,000   -220,000  -5.2% ⚠️
  Product Sales         680,000     721,000   +41,000   +6.0% ✅

Total Revenue         4,880,000   4,701,000   -179,000  -3.7%

Expenses
  Salaries            1,200,000   1,267,000   +67,000   +5.6% ⚠️  (over budget)
  Rent                  170,000     170,000        0     0.0% ✅
  Marketing             240,000     198,000   -42,000  -17.5% ✅  (under budget)

Total Expenses        1,610,000   1,635,000   +25,000   +1.6%

Net Profit            3,270,000   3,066,000   -204,000  -6.2% ⚠️
```

- Green = favourable variance
- Red = unfavourable variance
- Drill down per account to see underlying GL transactions
- Period selector: YTD, specific month, custom range

**Dashboard Widget:**

Add "Budget Performance" widget to main dashboard:
- Revenue: X% of annual target reached
- Expenses: X% of budget used
- Net Profit: vs. target (gauge chart)

---

## Integration Points

| Module | Connection |
|--------|-----------|
| GL (Feature 01) | Actuals come from gl_entries |
| Chart of Accounts | Budget lines linked to COA accounts |
| Financial Statements (Feature 06) | Variance report mirrors P&L structure |
| Projects | Project budget vs. actual (separate from GL-level budget) |
| Cost Centres | Department-level budgeting and variance |

---

## Implementation Steps

1. Create `budget_periods`, `budget_lines`, `cost_centres` tables
2. Add `cost_centre_id` to `gl_entries`
3. Build variance calculation service
4. Build budget copy/rollforward service
5. Build budget API routes and controller
6. Build budget list and period management page
7. Build spreadsheet-like budget editor (monthly columns)
8. Build variance report page with colour coding
9. Add budget performance widget to main dashboard
10. Build cost centre configuration page in settings
