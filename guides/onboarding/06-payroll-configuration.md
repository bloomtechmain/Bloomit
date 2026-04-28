# Section 06 — Payroll Configuration

**Priority:** Must Have (Go-Live)  
**Time to prepare:** 1–2 hours  
**Who should fill this:** HR manager or payroll administrator  
**Source document:** Current payslips, employment contracts, salary schedules

---

## What This Is

The payroll rules and per-employee pay structure that Bloomit uses when generating
monthly payslips. This includes allowances (additions to salary), deductions
(amounts taken away), and the statutory EPF / ETF rates.

---

## Part A — Company-Wide Payroll Settings

These settings apply to all employees unless overridden per person.

| Setting | What It Is | Standard Value | Notes |
|---------|-----------|----------------|-------|
| EPF Employee Contribution Rate | % of basic salary deducted from employee and paid into EPF | **8%** | As per Sri Lanka Labour Law |
| EPF Employer Contribution Rate | % the company contributes to EPF on top of the employee's salary | **12%** | As per Sri Lanka Labour Law |
| ETF Employer Contribution Rate | % the company pays to ETF (not deducted from employee) | **3%** | As per Sri Lanka Labour Law |
| Payroll Run Day | On which day of the month payslips are generated | e.g. last working day | Your preference |
| Payslip Approval Levels | Who must approve before employees can see their payslip | Staff → Admin → Employee | Configurable |

> **Note:** EPF and ETF are statutory (legally required) contributions in Sri Lanka.
> These rates are set by law and should not be changed unless advised by your
> accountant after a legal change.

---

## Part B — Allowance Types

List the types of allowances your company pays. These are additions to basic salary.

| Field | What It Is | Required | Example |
|-------|-----------|----------|---------|
| Allowance Name | Descriptive label | ✅ Yes | Transport Allowance |
| Is it a fixed amount or percentage? | How it is calculated | ✅ Yes | Fixed Amount |
| Typical Amount / Rate | Common value (varies per employee) | Optional | LKR 5,000 per month |
| Taxable? | Is this allowance subject to income tax? | Optional | No |

### Common Allowances in Sri Lanka

| Allowance Type | Typical Amount | Taxable? |
|---------------|---------------|---------|
| Transport Allowance | LKR 3,000 – 10,000 | No (up to limit) |
| Meal / Food Allowance | LKR 2,500 – 6,000 | No (up to limit) |
| Housing Allowance | LKR 10,000 – 50,000 | Yes |
| Medical Allowance | LKR 2,000 – 5,000 | No |
| Mobile Phone Allowance | LKR 1,500 – 3,000 | No |
| Performance Bonus | Variable | Yes |
| Overtime Pay | Per hour rate | Yes |

---

## Part C — Deduction Types

List the types of deductions your company applies. These are amounts taken from salary.

| Field | What It Is | Required | Example |
|-------|-----------|----------|---------|
| Deduction Name | Descriptive label | ✅ Yes | Salary Advance Recovery |
| Is it fixed or percentage? | How it is calculated | ✅ Yes | Fixed Amount |
| Notes | Any conditions or rules | Optional | Only applied in specific months |

### Common Deduction Types

| Deduction Type | Notes |
|---------------|-------|
| EPF (Employee) | Statutory — auto-calculated (8% of basic) |
| Salary Advance Recovery | When employee received an advance |
| Loan Repayment | Internal company loan |
| Welfare Fund | Company welfare/social fund |
| Absence Deduction | For unapproved unpaid leave |
| Uniform / Equipment | For issued items, recovered over time |

---

## Part D — Per-Employee Allowance & Deduction Details

For each employee, specify the exact allowances and deductions that appear on their payslip.
This is in addition to their basic salary from Section 05.

Provide one section per employee:

| Field | What It Is | Required | Example |
|-------|-----------|----------|---------|
| Employee Name | Must match name from Section 05 | ✅ Yes | Kasun Fernando |
| Allowance Name | The type from Part B above | ✅ Yes | Transport Allowance |
| Allowance Amount (LKR) | Monthly amount | ✅ Yes | 5,000.00 |
| Deduction Name | The type from Part C above | Optional | Salary Advance Recovery |
| Deduction Amount (LKR) | Monthly deduction | Optional | 10,000.00 |

### Sample Per-Employee Payroll Detail

**Employee: Kasun Fernando** — Basic Salary: LKR 85,000

| Type | Name | Amount (LKR) |
|------|------|-------------|
| Allowance | Transport Allowance | 5,000.00 |
| Allowance | Meal Allowance | 3,000.00 |
| Allowance | Mobile Allowance | 2,000.00 |
| Deduction | EPF (8%) | 6,800.00 (auto-calculated) |
| Deduction | Welfare Fund | 500.00 |

**Resulting Payslip:**
```
Basic Salary:            85,000.00
+ Transport Allowance:    5,000.00
+ Meal Allowance:         3,000.00
+ Mobile Allowance:       2,000.00
─────────────────────────────────
Gross Salary:            95,000.00
- EPF (Employee 8%):      6,800.00
- Welfare Fund:             500.00
─────────────────────────────────
Net Salary:              87,700.00

Company contributions (not deducted from employee):
  EPF Employer (12%):    10,200.00
  ETF Employer (3%):      2,550.00
```

---

## Part E — Employees with Non-Standard EPF Rates

If any employees have a different EPF rate (e.g., a director on a higher rate,
or an employee exempt from EPF), list them here:

| Employee Name | EPF Enabled? | EPF Rate (%) | Reason |
|--------------|-------------|-------------|--------|
| Dilantha Perera | No | 0 | Director — EPF exempt |
| Sanduni Wickrama | Yes | 10 | Agreed higher rate |

---

## What You Do NOT Need to Provide

- Payslip history / old payslips (these are not migrated — Bloomit generates new payslips from go-live)
- Tax calculations (the system calculates statutory deductions automatically)
- Bank transfer files (the system generates these after payslip approval)
