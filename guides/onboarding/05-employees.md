# Section 05 — Employees

**Priority:** Must Have (Go-Live)  
**Time to prepare:** 2–4 hours  
**Who should fill this:** HR manager  
**Source document:** HR files, employment contracts, employee registration forms

---

## What This Is

The complete employee register — every person currently employed by your company.
This data is used for payroll, time tracking, PTO requests, the employee directory,
and the employee self-service portal.

> **Confidentiality:** This data contains sensitive personal information.
> Submit it via the secure upload link provided by your onboarding specialist.
> Do not send it by regular email.

---

## Part A — Personal Information

| Field | What It Is | Required | Max Length | Example |
|-------|-----------|----------|-----------|---------|
| First Name | Employee's first name | ✅ Yes | 100 chars | Kasun |
| Last Name | Employee's last name / surname | ✅ Yes | 100 chars | Fernando |
| National Identity Card (NIC) | Sri Lanka NIC number (old or new format) | ✅ Yes | 50 chars | 199012345678 |
| Date of Birth | DD/MM/YYYY | ✅ Yes | — | 15/03/1990 |
| Personal Email Address | For portal login and payslip delivery | ✅ Yes | 150 chars | kasun.f@gmail.com |
| Personal Phone Number | Mobile or home phone | Optional | 30 chars | +94 77 123 4567 |
| Home Address | Full residential address | Optional | Text | 42/A, Galle Road, Colombo 06 |

---

## Part B — Employment Information

| Field | What It Is | Required | Example |
|-------|-----------|----------|---------|
| Hire Date | The date they joined the company (DD/MM/YYYY) | ✅ Yes | 01/06/2019 |
| Job Title / Designation | Their official job title | ✅ Yes | Senior Software Engineer |
| Department | Which department they belong to | ✅ Yes | Engineering |
| Role in System | Their system access level | ✅ Yes | Employee / Manager / Admin |
| Manager | Who their direct manager is (first and last name) | Optional | Ruwan Jayawardena |
| Employee Status | Are they currently active? | ✅ Yes | Active |

**Employee Status options:**
- `Active` — currently employed and working
- `Suspended` — temporarily not working (provide reason and date)
- `Terminated` — no longer with the company (do not include — we only import active staff)

---

## Part C — Payroll Information

| Field | What It Is | Required | Example |
|-------|-----------|----------|---------|
| Basic Salary (LKR) | Monthly basic salary before allowances | ✅ Yes | 85,000.00 |
| EPF Enabled? | Is this employee registered for EPF? | ✅ Yes | Yes |
| EPF Contribution Rate (%) | Employee's EPF deduction percentage | ✅ Yes | 8 (standard rate) |
| ETF Enabled? | Is ETF applicable for this employee? | ✅ Yes | Yes |
| Annual PTO Allowance (Days) | Total paid leave days per year | ✅ Yes | 20 |
| Tax Reference | Income tax file number or tax status | Optional | ITN-12345678 |

**About allowances:** Allowances (transport, meal, housing, etc.) are set up per
employee in Section 06 (Payroll Configuration). You do not need to list them here.

---

## Part D — Bank Details (for Payroll)

This is the bank account the employee's salary will be transferred to each month.

| Field | What It Is | Required | Example |
|-------|-----------|----------|---------|
| Bank Name | Employee's personal bank | ✅ Yes | Sampath Bank PLC |
| Bank Branch | Branch of their account | ✅ Yes | Maharagama Branch |
| Bank Account Number | Their personal account number | ✅ Yes | 0012345678901 |

---

## Part E — Emergency Contact

| Field | What It Is | Required | Example |
|-------|-----------|----------|---------|
| Emergency Contact Name | Name of next of kin / emergency contact | Optional | Sunethra Fernando |
| Relationship | Relationship to employee | Optional | Mother |
| Emergency Contact Phone | Their phone number | Optional | +94 77 987 6543 |

---

## Complete Sample Dataset (one employee row)

| Field | Value |
|-------|-------|
| First Name | Kasun |
| Last Name | Fernando |
| NIC | 199012345678 |
| Date of Birth | 15/03/1990 |
| Personal Email | kasun.f@gmail.com |
| Phone | +94 77 123 4567 |
| Home Address | 42/A, Galle Road, Colombo 06 |
| Hire Date | 01/06/2019 |
| Designation | Senior Software Engineer |
| Department | Engineering |
| System Role | Employee |
| Manager | Ruwan Jayawardena |
| Status | Active |
| Basic Salary | 85,000.00 |
| EPF Enabled | Yes |
| EPF Rate | 8% |
| ETF Enabled | Yes |
| PTO Allowance | 20 days |
| Tax Reference | ITN-12345678 |
| Bank Name | Sampath Bank PLC |
| Bank Branch | Maharagama Branch |
| Bank Account No. | 0012345678901 |
| Emergency Contact | Sunethra Fernando |
| Relationship | Mother |
| Emergency Phone | +94 77 987 6543 |

---

## Important Notes

**Include only currently active employees.**
Former employees, terminated staff, and contractors are not loaded at go-live.

**Manager names must match an employee on the list.**
If Kasun's manager is Ruwan, Ruwan must also be on the employee list.
If a manager is not an employee in the system (e.g., an external director), leave
the manager field blank.

**Email addresses must be unique.**
No two employees can share the same email address.

**Employee numbers are generated automatically.**
Do not try to assign employee numbers — the system creates them in the format EMP-0001,
EMP-0002, etc.

**Portal access is separate from system user access.**
An employee on this list gets access to the Employee Portal (to see their own
payslips, timesheets, and PTO). If they also need full system access (accountant,
manager, admin), they must also be on the User Accounts list in Section 02.
