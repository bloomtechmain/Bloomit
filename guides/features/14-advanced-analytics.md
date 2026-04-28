# Feature 14 — Advanced Analytics & KPI Dashboards

**Phase:** 3 — Reporting & Intelligence  
**Priority:** Medium  
**Effort:** M (3–5 weeks)  
**Depends on:** Features 01, 06, 07, 08 (GL, Statements, Customers, Inventory)

---

## What This Is

A management dashboard with real-time KPI cards, drill-down charts, and customisable
widgets that give executives and managers an instant view of business health. Goes
beyond the current analytics page (which is a static summary) to provide interactive,
role-based dashboards with trend lines, alerts, and multi-period comparisons.

---

## Why It Matters

Data without visualisation is noise. The GL and financial statements provide the
numbers — this feature presents them in a way that triggers action. The right
KPI in the right person's dashboard at the right time is worth more than a
20-page report generated once a quarter.

---

## Current Gap

- Analytics module has basic P&L summary, AR aging, project profitability, and sales pipeline
- No trend charts (month-over-month, year-over-year)
- No role-based dashboards (everyone sees the same data)
- No KPI targets / RAG (Red-Amber-Green) status
- No drill-down from summary to underlying transactions

---

## Database Changes

```sql
CREATE TABLE dashboard_configs (
  id              SERIAL PRIMARY KEY,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id),
  user_id         INT NOT NULL REFERENCES users(id),
  dashboard_name  VARCHAR(100) DEFAULT 'Main',
  layout          JSONB NOT NULL DEFAULT '[]', -- widget positions and sizes
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, user_id, dashboard_name)
);

CREATE TABLE kpi_targets (
  id              SERIAL PRIMARY KEY,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id),
  kpi_key         VARCHAR(100) NOT NULL,     -- e.g. 'monthly_revenue', 'gross_margin'
  target_value    NUMERIC(15,2) NOT NULL,
  period          VARCHAR(20),               -- MONTHLY | QUARTERLY | ANNUAL
  fiscal_year     INT,
  month           INT,                       -- 1-12 if monthly
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, kpi_key, period, fiscal_year, month)
);
```

---

## Backend Implementation

### New Routes — `/api/analytics/v2`

| Method | Path | Action |
|--------|------|--------|
| GET | `/api/analytics/v2/kpis` | All KPI values for current period |
| GET | `/api/analytics/v2/revenue-trend` | Monthly revenue for last N months |
| GET | `/api/analytics/v2/expense-trend` | Monthly expense trend |
| GET | `/api/analytics/v2/cash-position` | Cash balances across all bank accounts |
| GET | `/api/analytics/v2/ar-summary` | Receivables summary with aging breakdown |
| GET | `/api/analytics/v2/ap-summary` | Payables summary with aging breakdown |
| GET | `/api/analytics/v2/gross-margin` | Gross margin trend (revenue - COGS) |
| GET | `/api/analytics/v2/top-customers` | Top N customers by revenue |
| GET | `/api/analytics/v2/top-products` | Top N products by revenue (if inventory) |
| GET | `/api/analytics/v2/project-health` | Project budget vs actual + timeline |
| GET | `/api/analytics/v2/payroll-cost` | Monthly payroll cost trend |
| GET | `/api/analytics/v2/burn-rate` | Monthly expense rate and runway |
| POST | `/api/analytics/v2/dashboard` | Save dashboard layout |
| GET | `/api/analytics/v2/dashboard` | Load user's dashboard layout |
| GET | `/api/analytics/v2/kpi-targets` | List KPI targets |
| PUT | `/api/analytics/v2/kpi-targets` | Set KPI targets |

### Key KPI Calculations

```typescript
// All KPIs calculated from GL entries and module tables

// Revenue KPIs (from GL revenue accounts)
monthly_revenue: sum of revenue GL credits for current month
revenue_growth:  (this_month - last_month) / last_month * 100
ytd_revenue:     sum of revenue GL credits from fiscal year start to today

// Profitability KPIs
gross_profit:    revenue - COGS
gross_margin:    gross_profit / revenue * 100
net_profit:      revenue - all expenses
ebitda:          net_profit + interest + tax + depreciation + amortisation

// Cash KPIs
cash_balance:    sum of all bank account balances
cash_runway:     cash_balance / avg_monthly_expenses  (in months)
ar_outstanding:  sum of unpaid invoice amounts
ap_outstanding:  sum of unpaid bill amounts

// Operational KPIs
invoice_count:   invoices issued this month
avg_payment_days: avg days from invoice issue to payment received
overdue_ratio:   overdue_amount / total_ar * 100
```

---

## Frontend Implementation

### Executive Dashboard (`/dashboard`)

Replace or extend the current dashboard with a fully configurable widget system.

**Default layout (can be customised):**

Row 1 — KPI Cards (4 across):
- Monthly Revenue (vs. prior month trend)
- Gross Margin %
- Cash Balance
- Outstanding AR

Row 2 — Charts (2 across):
- Revenue vs. Expenses (12-month bar chart with trend line)
- Cash Position (area chart showing bank balance over 12 months)

Row 3 — Mixed (3 across):
- AR Aging donut chart (0–30 / 31–60 / 61–90 / 90+)
- Top 5 Customers by Revenue (horizontal bar chart)
- Project Health table (over/under budget, on-time %)

Row 4 — Operational (2 across):
- Payroll Cost trend (monthly bar chart)
- Bills Due This Week (list widget)

**Widget Customisation:**

- Drag-and-drop layout (using react-grid-layout or similar)
- Click "Add Widget" → choose from widget library
- Each widget configurable: period, comparison, target

### KPI Cards Component

Each card shows:
- Current value (large)
- Change vs. prior period (up/down arrow + %)
- RAG indicator: Green (>= target), Amber (within 10% of target), Red (> 10% below target)
- Click → drill down to underlying report

### Drill-Down Navigation

Every chart and KPI card is clickable:
- Revenue KPI → opens P&L report filtered to current month
- AR Aging bar → opens invoice list filtered to that aging bucket
- Top Customer bar → opens customer profile
- Project Health row → opens project detail

### Role-Based Default Dashboards

| Role | Default widgets shown |
|------|-----------------------|
| CEO / Owner | All KPIs, revenue, margin, cash |
| Accountant | AR/AP aging, cash position, bank reconciliation status |
| Project Manager | Project health, time tracking, PTO pending |
| Sales | Quotes pipeline, top customers, invoice status |
| HR Manager | Payroll cost, headcount, PTO requests pending |

---

## Integration Points

All data comes from:
- GL (Features 01): Revenue, expense, cash balances
- Invoices (Feature 03): AR, overdue, payment days
- Bills (Feature 10): AP, aged payables
- Inventory (Feature 08): Stock value, top products
- Customers (Feature 07): Top customers by revenue
- Payroll: Payroll cost trends
- Projects: Project budget vs. actual
- Budget (Feature 12): KPI targets and RAG status

---

## Implementation Steps

1. Create `dashboard_configs` and `kpi_targets` tables
2. Build analytics v2 API endpoints (all KPI and trend queries)
3. Build KPI targets management API
4. Build reusable KPI Card component (value, trend, RAG)
5. Build Revenue vs. Expenses bar chart component
6. Build AR/AP Aging donut chart component
7. Build configurable dashboard page with drag-and-drop layout
8. Build "Add Widget" modal with widget library
9. Save/load dashboard layout per user
10. Implement drill-down navigation from each widget
