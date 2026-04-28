# Bloomit ERP — Feature Roadmap

## What's Already Built

Bloomit is a solid multi-tenant ERP with strong HR and operational coverage:
Projects, Contracts, Receivables, Payables, Petty Cash, Bank Accounts, Loans, Assets,
Quotes, Purchase Orders, Payroll (with digital signatures), Time Tracking, PTO,
Employee Portal, RBAC, Notes, Todos, Documents, basic Analytics.

**The gap:** accounting is treated as cash tracking rather than double-entry bookkeeping.
There is no General Ledger, no Chart of Accounts, no proper invoicing, no tax engine,
and no auto-generated financial statements. These are the features that separate a
*cash-flow tracker* from a real *accounting system*.

---

## Feature Roadmap

### Phase 1 — Accounting Core (Build this first)

> Without these, every other financial number in the system is unauditable.
> This is the foundation everything else sits on.

| # | Feature | File | Effort |
|---|---------|------|--------|
| 1 | Chart of Accounts & General Ledger | [01-chart-of-accounts-gl.md](01-chart-of-accounts-gl.md) | L |
| 2 | Journal Entries (Double-Entry Bookkeeping) | [02-journal-entries.md](02-journal-entries.md) | L |
| 3 | Invoice Management | [03-invoice-management.md](03-invoice-management.md) | M |
| 4 | Tax Management (VAT / GST / WHT) | [04-tax-management.md](04-tax-management.md) | M |
| 5 | Bank Reconciliation | [05-bank-reconciliation.md](05-bank-reconciliation.md) | M |
| 6 | Financial Statements (BS, P&L, Cash Flow) | [06-financial-statements.md](06-financial-statements.md) | M |

---

### Phase 2 — Business Operations (Build after Phase 1)

> Strengthen the buy-sell cycle and fill the gaps between quotes and cash.

| # | Feature | File | Effort |
|---|---------|------|--------|
| 7 | Customer Management (CRM Lite) | [07-customer-management.md](07-customer-management.md) | M |
| 8 | Inventory & Stock Management | [08-inventory-management.md](08-inventory-management.md) | L |
| 9 | Sales Orders | [09-sales-orders.md](09-sales-orders.md) | M |
| 10 | Bill Management (AP Bills) | [10-bill-management.md](10-bill-management.md) | S |
| 11 | Expense Claims & Reimbursements | [11-expense-claims.md](11-expense-claims.md) | M |

---

### Phase 3 — Reporting & Intelligence (Build after Phase 2)

> Turn the data you now have into decisions.

| # | Feature | File | Effort |
|---|---------|------|--------|
| 12 | Budget Planning & Variance Analysis | [12-budget-variance.md](12-budget-variance.md) | M |
| 13 | Multi-Currency Support | [13-multi-currency.md](13-multi-currency.md) | L |
| 14 | Advanced Analytics & KPI Dashboards | [14-advanced-analytics.md](14-advanced-analytics.md) | M |
| 15 | Compliance & Audit Reports | [15-compliance-audit.md](15-compliance-audit.md) | M |

---

### Phase 4 — System & Integrations (Build after Phase 3)

> Connect the system to the outside world and scale the team.

| # | Feature | File | Effort |
|---|---------|------|--------|
| 16 | Bulk Import / Export | [16-bulk-import-export.md](16-bulk-import-export.md) | M |
| 17 | API Webhooks & External Integrations | [17-api-webhooks.md](17-api-webhooks.md) | L |
| 18 | Vendor Self-Service Portal | [18-vendor-portal.md](18-vendor-portal.md) | L |
| 19 | Employee Performance Reviews | [19-performance-reviews.md](19-performance-reviews.md) | M |
| 20 | Attendance Management | [20-attendance-management.md](20-attendance-management.md) | M |

---

## Effort Key

| Label | Meaning |
|-------|---------|
| S — Small | 1–2 weeks. New tables + CRUD + UI. No complex logic. |
| M — Medium | 3–5 weeks. Business logic, workflows, multi-step UI. |
| L — Large | 6–10 weeks. Architectural impact, cross-module integration, complex rules. |

---

## Why This Order

```
Phase 1 (GL + Invoices + Tax + Statements)
    ↓  Every transaction auto-posts to the GL
Phase 2 (Inventory + Sales Orders + Bills)
    ↓  Inventory moves post COGS to GL; sales orders drive invoices
Phase 3 (Budgets + Currency + Reports)
    ↓  GL data feeds reports; multi-currency needs GL first
Phase 4 (Integrations + Portals)
         Data is now rich enough to expose externally
```

Start at Phase 1, Feature 1. The Chart of Accounts is the skeleton — everything
else hangs off it.
