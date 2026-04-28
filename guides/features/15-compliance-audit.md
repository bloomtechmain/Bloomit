# Feature 15 — Compliance & Audit Reports

**Phase:** 3 — Reporting & Intelligence  
**Priority:** Medium  
**Effort:** M (3–4 weeks)  
**Depends on:** Features 01, 02, 04 (GL, Journal Entries, Tax)

---

## What This Is

A set of compliance-focused reports and system-wide audit trail features that satisfy
auditor and regulatory requirements: a complete immutable record of who changed what,
when, and why — across all financial transactions and user actions. Also includes
statutory reports (payroll compliance, tax summaries, regulatory filings).

---

## Why It Matters

External auditors and tax authorities require:
1. Evidence that transactions cannot be backdated or altered without a trace
2. Proper segregation of duties (who approved what)
3. Statutory reports in a prescribed format (EPF/ETF schedules, WHT certificates)
4. The ability to trace any balance back to individual source transactions

Without audit infrastructure, the system is not enterprise-grade and cannot pass
an external audit.

---

## Current Gap

- `employee_audit_log` and `rbac_audit_log` tables exist but only cover HR and permissions
- No audit log for financial transactions (invoices, bills, payroll changes)
- No immutability enforcement on posted GL entries
- No statutory payroll reports (EPF/ETF schedules)
- No audit trail UI for accountants

---

## Database Changes

```sql
-- Universal financial audit log
CREATE TABLE financial_audit_log (
  id              SERIAL PRIMARY KEY,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id),
  entity_type     VARCHAR(50) NOT NULL,  -- INVOICE | BILL | JOURNAL_ENTRY | PAYROLL | etc.
  entity_id       INT NOT NULL,
  action          VARCHAR(30) NOT NULL,  -- CREATED | UPDATED | DELETED | STATUS_CHANGED | POSTED | REVERSED
  old_values      JSONB,
  new_values      JSONB,
  changed_by      INT REFERENCES users(id),
  changed_at      TIMESTAMPTZ DEFAULT NOW(),
  ip_address      INET,
  session_id      TEXT
);

CREATE INDEX idx_fin_audit_entity ON financial_audit_log(tenant_id, entity_type, entity_id);
CREATE INDEX idx_fin_audit_user   ON financial_audit_log(tenant_id, changed_by);

-- Statutory report tracking (which reports have been generated/filed)
CREATE TABLE statutory_reports (
  id              SERIAL PRIMARY KEY,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id),
  report_type     VARCHAR(50) NOT NULL,  -- EPF | ETF | WHT | VAT_RETURN | PAYROLL_SUMMARY
  period_from     DATE NOT NULL,
  period_to       DATE NOT NULL,
  generated_at    TIMESTAMPTZ,
  generated_by    INT REFERENCES users(id),
  filed_at        TIMESTAMPTZ,
  filed_by        INT REFERENCES users(id),
  notes           TEXT
);
```

---

## Backend Implementation

### Audit Logging Middleware

```typescript
// backend/src/middleware/auditLogger.ts

// Called from every controller that modifies financial data
async function logFinancialAudit(
  tenantId: string,
  entityType: string,
  entityId: number,
  action: string,
  oldValues: object | null,
  newValues: object | null,
  userId: number,
  request: Request
): Promise<void>

// Hook into: invoiceController, billController, journalEntryController,
//            payrollController, payableController, assetController, loanController
```

### Immutability Rules

Once a journal entry is POSTED:
- It cannot be edited or deleted
- It can only be REVERSED (which creates a new opposite entry)
- Attempts to modify posted entries return HTTP 403

These rules enforced at the service layer, not the database layer (for flexibility),
but the audit log makes any bypass detectable.

### New Routes — `/api/audit`

| Method | Path | Action |
|--------|------|--------|
| GET | `/api/audit/financial` | Financial audit log (filter by entity, user, date) |
| GET | `/api/audit/financial/:entityType/:entityId` | Audit trail for one record |
| GET | `/api/audit/user-activity` | All actions by a specific user |
| GET | `/api/reports/epf-etf` | EPF/ETF schedule for a payroll period |
| GET | `/api/reports/wht-schedule` | WHT deduction schedule by vendor |
| GET | `/api/reports/payroll-summary` | Monthly payroll summary (statutory format) |
| GET | `/api/reports/vat-return` | VAT return (links to Feature 04) |
| GET | `/api/reports/gl-extract` | Full GL extract (for external audit) |

### Statutory Reports

**EPF/ETF Schedule:**
```
Employee | NIC | Gross Salary | EPF (Employee 8%) | EPF (Employer 12%) | ETF (Employer 3%)
```
Generated per month, exportable as CSV for submission to the Labour Department.

**WHT Certificate:**
Per vendor, per period: name, NIC/BR number, gross payment, WHT rate, WHT amount.
Required to be issued to vendors annually (or at time of payment in some jurisdictions).

**Payroll Summary:**
Department-wise summary: headcount, gross payroll, total EPF, total ETF, net payroll.

---

## Frontend Implementation

### Audit Trail Page (`/accounting/audit`)

**Financial Audit Log:**
- Table: Date/Time | Entity | Record ID | Action | Changed By | Old Value | New Value
- Filter by: entity type, user, date range, action
- Click row → Audit detail modal showing JSON diff of old vs new values
- Export to CSV (for auditors)

**User Activity Report:**
- Per-user view: all actions taken in the system
- Useful for investigating suspicious activity or access reviews
- Filter by user, date range, module

### Compliance Reports (`/reports/compliance`)

Tab-based layout:

1. **EPF/ETF Schedule** — period picker, generate/download CSV
2. **WHT Schedule** — vendor list with WHT summary, download PDF
3. **Payroll Summary** — month picker, department breakdown, download PDF
4. **VAT Return** — links to Feature 04's VAT return
5. **GL Extract** — full GL download for audit (date range, account filter)

### Audit Badge on Records

Add a small "Audit Trail" icon to invoice, payslip, and journal entry detail pages.
Clicking it opens a side panel showing the full history of that record.

---

## Integration Points

| Module | Connection |
|--------|-----------|
| GL (Feature 01) | Audit all GL entry changes |
| Journal Entries (Feature 02) | Immutability enforcement on posted entries |
| Tax (Feature 04) | VAT return data |
| Payroll | EPF/ETF and payroll summary reports |
| All controllers | Audit log middleware hooks |

---

## Implementation Steps

1. Create `financial_audit_log` and `statutory_reports` tables
2. Build `auditLogger.ts` middleware
3. Add audit logging to: invoice, bill, journal entry, payroll, payable, asset, loan controllers
4. Enforce immutability rules on posted journal entries (403 on edit/delete)
5. Build EPF/ETF schedule generator
6. Build WHT certificate generator (PDF)
7. Build payroll summary report
8. Build audit trail page with filters and JSON diff viewer
9. Build compliance reports page with all statutory report tabs
10. Add "Audit Trail" side panel to invoice, payslip, and journal entry detail pages
