# Section 02 — User Accounts & Roles

**Priority:** Must Have (Go-Live)  
**Time to prepare:** ~30 minutes  
**Who should fill this:** HR manager or system administrator

---

## What This Is

A list of every person who will log in to Bloomit, what their role is, and what
they are allowed to see and do. Users are invited by email — they set their own
passwords and do not need to share passwords with you.

---

## Understanding Roles

Bloomit uses a Role-Based Access Control system. Each user is assigned one or more
roles, and each role controls what menus, actions, and data they can access.

### System Roles (Built-In)

These roles are pre-configured and ready to use:

| Role | Who it is for | What they can access |
|------|--------------|---------------------|
| **Admin** | Company owner, senior manager | Everything — full access to all modules |
| **Manager** | Department heads, project managers | Can approve timesheets, PTO, view reports |
| **Employee** | General staff | Employee portal only (own timesheets, payslips, PTO) |
| **Accountant** | Finance team | Financial modules: payables, receivables, payroll, reports |
| **HR** | Human resources team | Employee records, payroll, PTO, onboarding |
| **Procurement** | Purchasing team | Purchase orders, vendors |

> You can also create custom roles with specific permission combinations after go-live.

---

## Data Fields Required

Provide one row per person who needs a login.

| Field | What It Is | Required | Example |
|-------|-----------|----------|---------|
| Full Name | Person's full display name | ✅ Yes | Kasun Fernando |
| Email Address | Their work email — this is their login username | ✅ Yes | kasun@bloomtech.lk |
| Role(s) | Which role(s) to assign (from the list above) | ✅ Yes | Manager |
| Department | Their department (for reporting and directory) | Optional | Finance |
| Is Admin? | Should this person have full admin access? | ✅ Yes | Yes / No |

> **Note:** Each email address must be unique. Two users cannot share an email.

> **Note:** The Primary Contact Email from Section 01 is automatically created as
> an Admin user. You do not need to list them again here.

---

## Sample Dataset

| Full Name | Email | Role | Department | Is Admin? |
|-----------|-------|------|------------|-----------|
| Dilantha Perera | dilantha@bloomtech.lk | Admin | Management | Yes |
| Kasun Fernando | kasun@bloomtech.lk | Accountant | Finance | No |
| Nethmi Silva | nethmi@bloomtech.lk | HR | Human Resources | No |
| Ruwan Jayawardena | ruwan@bloomtech.lk | Manager | Operations | No |
| Sanduni Wickrama | sanduni@bloomtech.lk | Procurement | Purchasing | No |
| Amila Bandara | amila@bloomtech.lk | Employee | Engineering | No |
| Ishara Rathnayake | ishara@bloomtech.lk | Employee | Engineering | No |

---

## What Happens After You Submit

1. Each person on this list receives an email invitation to set their password
2. On first login, they will be prompted to change their password
3. Admin users can adjust roles and permissions at any time after go-live

---

## Tips

- **Start small.** Only add users who need to be active on go-live day.
  More users can be added at any time later.

- **Employees with only an Employee Portal login** (to see their own payslips and
  submit timesheets) do not need to be on this list. They are connected to their
  Employee record separately (see Section 05 — Employees).

- **Do not include inactive or former staff.** Only list people who are currently
  employed and need access.

---

## Minimum Required

You need at least **one Admin user** (the person who will manage the system).
All other users are optional at go-live.
