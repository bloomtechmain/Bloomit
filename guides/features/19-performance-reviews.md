# Feature 19 — Employee Performance Reviews

**Phase:** 4 — System & Integrations  
**Priority:** Low  
**Effort:** M (3–4 weeks)

---

## What This Is

A structured performance review system that lets managers set goals for employees,
conduct regular reviews (quarterly, annually), score performance, and maintain a
development history per employee. Integrates with the existing HR module and payroll
(salary adjustments triggered by review outcomes).

---

## Why It Matters

The system already has a strong HR foundation (employees, payroll, time tracking, PTO).
Performance reviews are the natural next layer: the structured, documented process for
evaluating whether employees are meeting expectations, setting goals for growth, and
justifying salary changes or promotions. Without this, performance decisions are
informal and undocumented — a compliance and fairness risk.

---

## Current Gap

- No performance review concept in the system
- Employee profiles have no goal-setting or review history
- Salary changes (in payroll data) have no formal justification trail
- No 360-degree feedback mechanism

---

## Database Changes

```sql
CREATE TABLE review_cycles (
  id              SERIAL PRIMARY KEY,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id),
  name            VARCHAR(100) NOT NULL,     -- "Annual Review 2024", "Q2 2024 Mid-Year"
  cycle_type      VARCHAR(20) NOT NULL,      -- ANNUAL | SEMI_ANNUAL | QUARTERLY | PROBATION
  review_period_from DATE NOT NULL,
  review_period_to   DATE NOT NULL,
  submission_deadline DATE,
  status          VARCHAR(20) DEFAULT 'DRAFT', -- DRAFT | ACTIVE | CLOSED
  created_by      INT REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE performance_goals (
  id              SERIAL PRIMARY KEY,
  employee_id     INT NOT NULL REFERENCES employees(id),
  review_cycle_id INT REFERENCES review_cycles(id),
  title           TEXT NOT NULL,
  description     TEXT,
  category        VARCHAR(50),              -- PERFORMANCE | DEVELOPMENT | BEHAVIOUR
  target          TEXT,                     -- measurable target
  weight          NUMERIC(5,2) DEFAULT 1,  -- relative importance
  status          VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE | ACHIEVED | MISSED | CANCELLED
  due_date        DATE,
  set_by          INT REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE performance_reviews (
  id              SERIAL PRIMARY KEY,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id),
  review_cycle_id INT NOT NULL REFERENCES review_cycles(id),
  employee_id     INT NOT NULL REFERENCES employees(id),
  reviewer_id     INT NOT NULL REFERENCES users(id),
  status          VARCHAR(20) DEFAULT 'DRAFT',
  -- Self assessment
  self_overall_score  NUMERIC(3,1),       -- 1.0 to 5.0
  self_comments       TEXT,
  self_submitted_at   TIMESTAMPTZ,
  -- Manager review
  manager_overall_score NUMERIC(3,1),
  manager_comments      TEXT,
  manager_submitted_at  TIMESTAMPTZ,
  -- Outcome
  outcome             VARCHAR(30),         -- EXCEEDS | MEETS | BELOW | IMPROVEMENT_PLAN
  recommended_action  VARCHAR(30),         -- PROMOTION | SALARY_INCREASE | MAINTAIN | PIP
  salary_increase_pct NUMERIC(5,2),        -- if salary adjustment recommended
  promotion_title     VARCHAR(100),
  hr_notes            TEXT,
  hr_approved_by      INT REFERENCES users(id),
  hr_approved_at      TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE review_scores (
  id              SERIAL PRIMARY KEY,
  review_id       INT NOT NULL REFERENCES performance_reviews(id) ON DELETE CASCADE,
  competency      VARCHAR(100) NOT NULL,    -- e.g. "Communication", "Teamwork", "Technical Skills"
  self_score      NUMERIC(3,1),
  manager_score   NUMERIC(3,1),
  manager_comment TEXT
);
```

---

## Backend Implementation

### New Routes — `/api/performance`

| Method | Path | Action |
|--------|------|--------|
| GET | `/api/performance/cycles` | List review cycles |
| POST | `/api/performance/cycles` | Create review cycle |
| POST | `/api/performance/cycles/:id/activate` | Activate cycle (opens reviews for all) |
| GET | `/api/performance/reviews` | List reviews for a cycle (manager view) |
| GET | `/api/performance/reviews/my` | Employee's own reviews |
| GET | `/api/performance/reviews/:id` | Review detail |
| POST | `/api/performance/reviews/:id/self-submit` | Employee submits self-assessment |
| POST | `/api/performance/reviews/:id/manager-submit` | Manager submits review |
| POST | `/api/performance/reviews/:id/hr-approve` | HR finalises and approves |
| GET | `/api/performance/goals/my` | Employee's goals |
| POST | `/api/performance/goals` | Create goal |
| PUT | `/api/performance/goals/:id` | Update goal |
| PUT | `/api/performance/goals/:id/status` | Mark achieved/missed |
| GET | `/api/performance/summary/:employeeId` | Full review history for one employee |

### Review Workflow

```typescript
// On cycle ACTIVATE:
// Auto-create performance_reviews for all active employees
// Set reviewer = employee's manager (from employees.manager_id)
// Send notification to each employee: "Your review for [cycle] is now open"
async function activateCycle(cycleId: number): Promise<void>

// Employee submits self-assessment:
// Update self_overall_score, self_comments, self_submitted_at
// Notify manager: "Employee X has submitted their self-assessment"
// Status → SELF_SUBMITTED

// Manager submits review:
// Update manager scores and comments
// Status → MANAGER_SUBMITTED
// Notify HR / employee's skip-level

// HR approves:
// Status → APPROVED
// If salary_increase_pct > 0: alert payroll module to update employee salary
// Notify employee of outcome (configurable: share score or just outcome label)
```

### Integration with Payroll

When a review is HR-approved with a salary increase recommendation:
```typescript
// Flag the employee's payroll record for the next pay run
// HR or payroll admin confirms the salary update before it takes effect
```

---

## Frontend Implementation

### Performance Hub (`/performance`)

**Manager view:**

- Active review cycles list
- For each cycle: progress bar (X of Y reviews submitted)
- My team's reviews: employee list with status badges
- Click employee → open/continue their review

**HR Admin view:**

- All cycles management (create, activate, close)
- Organisation-wide summary: completion rate per department
- Reviews pending HR approval
- Salary change recommendations (list of recommended increases from approved reviews)

**Employee view (Employee Portal):**

Add "Performance" tab to Employee Portal:
- Current cycle: self-assessment form
- Goals: view and self-report progress on goals
- Historical reviews: read-only past reviews

### Review Form

Step-by-step form for manager:

1. **Goals Review** — for each goal set last cycle: achieved / partially achieved / missed, comments
2. **Competency Scores** — rate each competency (1–5 scale) with comment
3. **Overall Score** — overall rating with free-text summary
4. **Outcome & Recommendation** — select outcome, recommended action, salary increase %
5. **Confirm & Submit**

Self-assessment form has the same competency sections but from the employee's perspective.
Both forms are shown side-by-side in the HR approval view.

### Goal Management (`/performance/goals`)

- Table: Employee | Goal | Category | Target | Due Date | Status
- "Set Goals" button: assign goals to employee(s) for the upcoming cycle
- Filter by department, cycle, status

---

## Integration Points

| Module | Connection |
|--------|-----------|
| Employees | Review linked to employee profile |
| Payroll | Salary increase recommendation triggers payroll update |
| Employee Portal | Self-assessment submission UI |
| RBAC | Manager sees only their team; HR sees all |
| Notifications | Alerts throughout the review workflow |

---

## Implementation Steps

1. Create `review_cycles`, `performance_goals`, `performance_reviews`, `review_scores` tables
2. Build review cycle activation (auto-create reviews for all employees)
3. Build performance reviews API routes and controller
4. Build goals API routes
5. Build manager review form (multi-step)
6. Build self-assessment form in Employee Portal
7. Build HR approval view (side-by-side self + manager)
8. Build performance hub (manager and HR views)
9. Add salary increase flag integration with payroll
10. Build review history view on employee profile page
