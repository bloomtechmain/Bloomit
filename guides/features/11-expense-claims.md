# Feature 11 — Expense Claims & Reimbursements

**Phase:** 2 — Business Operations  
**Priority:** Medium  
**Effort:** M (2–3 weeks)

---

## What This Is

A system for employees to submit out-of-pocket business expenses for reimbursement.
Employees attach receipts, categorise expenses, and submit for manager approval.
Approved claims are paid via payroll or bank transfer and posted to the GL as
the appropriate expense category.

---

## Why It Matters

Currently, out-of-pocket employee expenses are either entered manually as payables
(losing the employee context) or processed through petty cash (not scalable for
travelling staff or remote employees). A proper expense claim system:
- Creates an audit trail per employee
- Enforces expense policies (limits, categories, receipt requirements)
- Integrates with payroll for seamless reimbursement
- Posts the correct expense category to the GL automatically

---

## Current Gap

- No `expense_claims` table
- No employee-initiated expense submission flow
- Out-of-pocket expenses tracked through petty cash or manual payables with no employee linkage

---

## Database Changes

```sql
CREATE TABLE expense_categories (
  id              SERIAL PRIMARY KEY,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id),
  name            VARCHAR(100) NOT NULL,     -- Travel, Meals, Office Supplies, etc.
  gl_account_id   INT REFERENCES chart_of_accounts(id),
  daily_limit     NUMERIC(10,2),             -- optional per-day cap
  requires_receipt BOOLEAN DEFAULT TRUE,
  is_active       BOOLEAN DEFAULT TRUE
);

CREATE TABLE expense_claims (
  id              SERIAL PRIMARY KEY,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id),
  claim_number    VARCHAR(20) NOT NULL,      -- EXP-2024-0001
  employee_id     INT NOT NULL REFERENCES employees(id),
  submitted_by    INT NOT NULL REFERENCES users(id),
  title           TEXT NOT NULL,             -- e.g. "Client visit — March 2024"
  period_from     DATE NOT NULL,
  period_to       DATE NOT NULL,
  total_amount    NUMERIC(15,2) NOT NULL,
  status          VARCHAR(20) DEFAULT 'DRAFT', -- DRAFT | SUBMITTED | APPROVED | REJECTED | PAID
  manager_id      INT REFERENCES users(id),
  approved_by     INT REFERENCES users(id),
  approved_at     TIMESTAMPTZ,
  rejection_reason TEXT,
  payment_method  VARCHAR(20),               -- PAYROLL | BANK_TRANSFER
  paid_at         TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, claim_number)
);

CREATE TABLE expense_items (
  id              SERIAL PRIMARY KEY,
  claim_id        INT NOT NULL REFERENCES expense_claims(id) ON DELETE CASCADE,
  expense_date    DATE NOT NULL,
  category_id     INT NOT NULL REFERENCES expense_categories(id),
  description     TEXT NOT NULL,
  amount          NUMERIC(10,2) NOT NULL,
  tax_amount      NUMERIC(10,2) DEFAULT 0,
  receipt_document_id INT,                  -- uploaded receipt file
  merchant        VARCHAR(150),
  project_id      INT REFERENCES projects(id),  -- for project cost allocation
  is_billable     BOOLEAN DEFAULT FALSE,        -- can be re-billed to customer
  customer_id     INT REFERENCES customers(id)  -- if billable
);
```

---

## Backend Implementation

### New Routes — `/api/expense-claims`

| Method | Path | Action |
|--------|------|--------|
| GET | `/api/expense-claims` | List all claims (admin/manager) |
| GET | `/api/expense-claims/my` | Employee's own claims |
| GET | `/api/expense-claims/:id` | Claim detail with all items |
| POST | `/api/expense-claims` | Create claim (DRAFT) |
| PUT | `/api/expense-claims/:id` | Update DRAFT claim |
| POST | `/api/expense-claims/:id/submit` | Submit for approval |
| POST | `/api/expense-claims/:id/approve` | Manager approves |
| POST | `/api/expense-claims/:id/reject` | Manager rejects with reason |
| POST | `/api/expense-claims/:id/pay` | Mark as paid (record payment) |
| POST | `/api/expense-claims/:id/items/:itemId/receipt` | Upload receipt image |
| GET | `/api/expense-categories` | List expense categories |
| POST | `/api/expense-categories` | Create category |
| GET | `/api/expense-claims/report` | Expense report by period / employee / category |

### Policy Enforcement

```typescript
// On submit, validate:
// 1. All items have receipts if category requires_receipt = true
// 2. No item exceeds category daily_limit
// 3. Expense dates are within the claim period
// 4. No duplicate claims (same date + same merchant + same amount)
async function validateClaimPolicy(claim: ExpenseClaim): Promise<PolicyViolation[]>
// Returns list of violations — block submit if any critical violation
```

### GL Posting on Approval

```typescript
// When claim is approved and paid:
// DR Expense Account (per item's category GL account)    [amount]
// DR Input Tax Recoverable                               [tax_amount if any]
//   CR Bank Account (or Salaries Payable if via payroll) [total]
async function postExpenseClaimToGL(claimId: number): Promise<void>
```

### Billable Expense Re-invoicing

Items marked `is_billable = true` appear in the customer's next invoice as a
pass-through line item. The `expenseClaims` controller flags these when the claim
is approved so the invoicing module can pick them up.

---

## Frontend Implementation

### Employee-Facing: Expense Portal (`/employee-portal/expenses`)

Built inside the existing Employee Portal:

- List of own claims with status badges
- "New Claim" button → multi-step form:
  1. Claim title and period
  2. Add expense items (date, category, amount, merchant, receipt upload)
  3. Assign to project (optional)
  4. Review and submit

### Admin/Manager View (`/expenses`)

- All claims list with filter: status, employee, date range, category
- Pending approval queue highlighted
- Claim detail: line items, receipt thumbnails, policy warnings
- Approve / Reject buttons with confirmation modal
- Bulk approve (for trusted employees)
- Mark as Paid with payment method and date

### Expense Reports (`/expenses/reports`)

- By employee: total claimed / total approved / outstanding
- By category: spend breakdown (pie chart)
- By project: project cost allocation (billable + non-billable)
- Date range filter, export to CSV

### Expense Categories (`/settings/expense-categories`)

- List of categories with GL account, daily limit, receipt requirement
- Add/edit/deactivate

---

## Integration Points

| Module | Connection |
|--------|-----------|
| Employees | Claim linked to employee profile |
| Projects | Optional project cost allocation per item |
| Customers (Feature 07) | Billable items link to customer for re-invoicing |
| Invoices (Feature 03) | Billable expenses pulled into next customer invoice |
| Tax (Feature 04) | Reclaimable input tax on expense items |
| GL (Feature 01) | Expense accounts debited on approval/payment |
| Payroll | Reimbursement via next payslip (add to net pay) |
| Employee Portal | Submission UI built into portal |

---

## Implementation Steps

1. Create `expense_categories`, `expense_claims`, `expense_items` tables
2. Build expense claim number auto-generation (EXP-YYYY-NNNN)
3. Build policy validation service
4. Build expense claims API routes and controller
5. Build GL posting hook on claim payment
6. Add expense submission UI to Employee Portal
7. Build admin expense list and approval page
8. Build expense categories settings page
9. Build expense reports page
10. Integrate billable expenses with invoicing module
