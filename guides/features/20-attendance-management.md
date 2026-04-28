# Feature 20 — Attendance Management

**Phase:** 4 — System & Integrations  
**Priority:** Low–Medium  
**Effort:** M (3–4 weeks)

---

## What This Is

A formal attendance and shift management system that tracks daily presence, tardiness,
and absences for all employees. Complements the existing Time Tracking module (which
tracks billable hours per project) with a people-management view: who is in today,
who is late, and what is the attendance rate per department. Feeds into payroll for
absence-based salary deductions.

---

## Why It Matters

The current Time Tracking module records project-based hours approved by managers.
Attendance management is different — it answers operational questions like:
- Is this employee in today?
- How many days did they miss this month?
- What is the department's attendance rate?
- Should payroll deduct for unapproved absences?

Without this, attendance is either tracked in a spreadsheet or not tracked at all,
making payroll adjustments for absences manual and error-prone.

---

## Current Gap

- Time entries track hours per project but not daily attendance
- No shift definitions
- No attendance rate reporting
- No automatic deduction for unapproved absences in payroll
- No late arrival tracking

---

## Database Changes

```sql
CREATE TABLE shifts (
  id              SERIAL PRIMARY KEY,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id),
  name            VARCHAR(100) NOT NULL,    -- "Day Shift", "Night Shift", "Flex"
  start_time      TIME NOT NULL,            -- e.g. 08:30
  end_time        TIME NOT NULL,            -- e.g. 17:30
  break_minutes   INT DEFAULT 60,
  grace_period_minutes INT DEFAULT 15,      -- late after X minutes past start_time
  days_of_week    INT[] NOT NULL,           -- [1,2,3,4,5] = Mon-Fri
  is_active       BOOLEAN DEFAULT TRUE
);

CREATE TABLE employee_shifts (
  id              SERIAL PRIMARY KEY,
  employee_id     INT NOT NULL REFERENCES employees(id),
  shift_id        INT NOT NULL REFERENCES shifts(id),
  effective_from  DATE NOT NULL,
  effective_to    DATE,                     -- NULL = current
  assigned_by     INT REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE attendance_records (
  id              SERIAL PRIMARY KEY,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id),
  employee_id     INT NOT NULL REFERENCES employees(id),
  attendance_date DATE NOT NULL,
  shift_id        INT REFERENCES shifts(id),
  check_in        TIMESTAMPTZ,
  check_out       TIMESTAMPTZ,
  total_hours     NUMERIC(5,2),
  overtime_hours  NUMERIC(5,2) DEFAULT 0,
  status          VARCHAR(20) NOT NULL,     -- PRESENT | ABSENT | LATE | HALF_DAY | HOLIDAY | LEAVE
  late_minutes    INT DEFAULT 0,
  early_leave_minutes INT DEFAULT 0,
  source          VARCHAR(20) DEFAULT 'MANUAL', -- MANUAL | SYSTEM | BIOMETRIC
  notes           TEXT,
  approved_by     INT REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, attendance_date)
);

CREATE TABLE public_holidays (
  id              SERIAL PRIMARY KEY,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id),
  holiday_date    DATE NOT NULL,
  name            VARCHAR(100) NOT NULL,
  is_paid         BOOLEAN DEFAULT TRUE,
  UNIQUE(tenant_id, holiday_date)
);

-- Leave balance tracking (connects PTO with attendance)
CREATE TABLE leave_balances (
  id              SERIAL PRIMARY KEY,
  employee_id     INT NOT NULL REFERENCES employees(id),
  leave_type      VARCHAR(30) NOT NULL,     -- ANNUAL | SICK | CASUAL | MATERNITY | etc.
  year            INT NOT NULL,
  entitled_days   NUMERIC(5,1) NOT NULL,
  taken_days      NUMERIC(5,1) DEFAULT 0,
  balance_days    NUMERIC(5,1) GENERATED ALWAYS AS (entitled_days - taken_days) STORED,
  UNIQUE(employee_id, leave_type, year)
);
```

---

## Backend Implementation

### New Routes — `/api/attendance`

| Method | Path | Action |
|--------|------|--------|
| GET | `/api/attendance` | Attendance list (date, department filter) |
| GET | `/api/attendance/today` | Today's attendance summary |
| POST | `/api/attendance/check-in` | Record employee check-in |
| POST | `/api/attendance/check-out` | Record employee check-out |
| POST | `/api/attendance/manual` | Manual attendance entry (HR/manager) |
| POST | `/api/attendance/bulk` | Bulk import from CSV (biometric device export) |
| GET | `/api/attendance/employee/:id` | Employee's attendance history |
| GET | `/api/attendance/report` | Attendance report (period, department) |
| GET | `/api/attendance/absent-today` | List of employees marked absent today |
| GET | `/api/shifts` | List shifts |
| POST | `/api/shifts` | Create shift |
| PUT | `/api/shifts/:id` | Update shift |
| POST | `/api/employees/:id/shifts` | Assign shift to employee |
| GET | `/api/attendance/leave-balances` | Leave balances per employee |
| GET | `/api/holidays` | List public holidays |
| POST | `/api/holidays` | Add public holiday |

### Daily Attendance Processing (Cron Job)

```typescript
// Runs at end of each working day (e.g. 11:59 PM)
// For each active employee on a working day:
// 1. If no check-in record exists → mark ABSENT
// 2. If check-in but late by more than grace_period → mark LATE
// 3. If early check-out → record early_leave_minutes
// 4. Calculate total_hours from check_in and check_out
// 5. Check if date is a public holiday → mark HOLIDAY
// 6. Check if approved PTO exists for this date → mark LEAVE
async function processDailyAttendance(tenantId: string, date: Date): Promise<void>
```

### Payroll Integration

When a payslip is created for a month, the attendance service provides:
```typescript
async function getAttendanceSummary(
  employeeId: number,
  month: Date
): Promise<{
  presentDays: number,
  absentDays: number,         // unapproved
  lateDays: number,
  overtimeHours: number,
  leavesTaken: number
}>
// Used by payroll to calculate: salary deductions for unapproved absences,
// overtime pay, and late deductions (if policy applies)
```

### Biometric Device Integration

Most Sri Lankan businesses use fingerprint/face recognition devices that export CSV files.
The `/api/attendance/bulk` endpoint accepts this CSV and creates attendance records:
- Map device employee code to Bloomit employee ID
- Parse raw punches (multiple check-in/check-out entries per day)
- Determine first punch = check-in, last punch = check-out
- Flag anomalies (no check-out, more than one check-in without check-out)

---

## Frontend Implementation

### Attendance Dashboard (`/attendance`)

**Today view (default):**

- Summary cards: Present | Absent | Late | On Leave | Total Working
- Department filter
- Employee list with check-in/check-out times and status badge
- Colour coding: Green (on time) | Yellow (late) | Red (absent) | Blue (on leave)
- Manual check-in/out override (for HR)

**Monthly calendar view:**

Per-employee calendar showing attendance status per day:
- Click any day → see check-in time, check-out time, shift, notes

**Attendance Report:**

- Period selector (month/quarter)
- Department breakdown
- Per-employee: present days / absent days / late days / leave days / attendance %
- Export to CSV

### Shift Management (`/settings/shifts`)

- List of defined shifts with timings
- Assign shift to employee (effective from a date)
- View shift assignments across the team

### Leave Balances (`/attendance/leave-balances`)

- Table: Employee | Annual | Sick | Casual | Taken | Remaining
- Adjust balances (for annual entitlement changes)
- Linked to PTO approval (Feature: PTO auto-updates leave balance)

### Public Holidays (`/settings/holidays`)

- Calendar view of public holidays
- Add/edit/remove holidays
- Bulk import from CSV (e.g., import government gazette holidays for the year)

### Employee Portal — My Attendance

Add "Attendance" tab to Employee Portal:
- My calendar for current month
- Leave balance summary
- Request leave shortcut (links to existing PTO)

---

## Integration Points

| Module | Connection |
|--------|-----------|
| Employees | Attendance records per employee |
| PTO Requests | Approved PTO auto-marks attendance as LEAVE |
| Payroll | Absent/late deductions, overtime pay inputs |
| Time Tracking | Time entries feed into billable hours; attendance records separate |
| Employee Portal | Personal attendance view |
| Shifts | Determines expected hours and late threshold |

---

## Implementation Steps

1. Create `shifts`, `employee_shifts`, `attendance_records`, `public_holidays`, `leave_balances` tables
2. Build daily attendance processing cron job
3. Build attendance API routes and controller
4. Build biometric CSV bulk import parser
5. Build attendance dashboard with today view
6. Build monthly calendar view per employee
7. Build attendance report with department breakdown
8. Build shift management settings page
9. Build leave balances page with manual adjustment
10. Add "My Attendance" tab to Employee Portal
11. Connect PTO approval to auto-mark attendance as LEAVE
12. Add attendance summary input to payroll creation flow
