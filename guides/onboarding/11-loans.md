# Section 11 — Business Loans

**Priority:** Optional  
**Time to prepare:** ~30 minutes  
**Who should fill this:** Finance manager or accountant  
**Source document:** Loan agreements, bank loan statements, amortisation schedules

---

## What This Is

Business loans your company has taken from banks or financial institutions. Bloomit
tracks each loan's repayment schedule, records each installment paid, and shows the
remaining outstanding balance. The system auto-generates the full amortisation
(repayment) schedule when you enter the loan details.

---

## Data Fields Required

Provide one row per active loan.

| Field | What It Is | Required | Example |
|-------|-----------|----------|---------|
| Loan Account Number | The loan reference number from the bank | ✅ Yes | LN-COM-2022-045678 |
| Borrower Name | The name on the loan agreement (usually your company name) | ✅ Yes | Bloomtech Solutions (Pvt) Ltd |
| Bank Name | The bank that issued the loan | ✅ Yes | Commercial Bank of Ceylon PLC |
| Loan Amount (LKR) | The original full loan amount (not the remaining balance) | ✅ Yes | 15,000,000.00 |
| Total Installments | Total number of monthly payments for the full loan | ✅ Yes | 60 (= 5 years × 12 months) |
| Monthly Installment Amount (LKR) | The fixed amount paid each month | ✅ Yes | 320,000.00 |
| Interest Rate (%) | Annual interest rate on the loan | Optional | 14.50 |
| Loan Type | Type of loan | ✅ Yes | See options below |
| Loan Start Date | When the first installment was due (DD/MM/YYYY) | ✅ Yes | 01/09/2022 |
| Notes | Any additional notes (e.g., grace period, special conditions) | Optional | 3-month grace period applied |

---

## Field Options

**Loan Type:**
- `BUSINESS` — general business / working capital loan
- `EQUIPMENT` — loan taken to purchase a specific piece of equipment or machinery
- `VEHICLE` — loan taken to purchase a company vehicle
- `PROPERTY` — mortgage or commercial property loan
- `PERSONAL` — personal loan (for a director/owner recorded in the company)
- `OVERDRAFT` — bank overdraft facility

---

## Installments Already Paid

If some installments have already been paid before your go-live date, provide a
list of which ones so the system can mark them as paid and show the correct
remaining balance.

| Field | What It Is | Required | Example |
|-------|-----------|----------|---------|
| Loan Account Number | Which loan this relates to | ✅ Yes | LN-COM-2022-045678 |
| Installment Number(s) Already Paid | Which installment numbers have been paid | ✅ Yes | 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12 |
| Last Payment Date | Date of the most recent payment | Optional | 01/08/2024 |

> **Tip:** The installment number is the sequence of the payment.
> If the loan started in September 2022 and it is now August 2024 (24 months later),
> then installments 1 through 24 would be paid (assuming monthly payments on time).

---

## Sample Loan Dataset

| Loan Account No. | Borrower | Bank | Loan Amount (LKR) | Total Installments | Monthly Installment (LKR) | Interest Rate | Type | Start Date |
|-----------------|---------|------|------------------|-------------------|--------------------------|--------------|------|-----------|
| LN-COM-2022-045678 | Bloomtech Solutions (Pvt) Ltd | Commercial Bank | 15,000,000 | 60 | 320,000 | 14.50% | BUSINESS | 01/09/2022 |
| LN-SAM-2023-089123 | Bloomtech Solutions (Pvt) Ltd | Sampath Bank | 8,500,000 | 36 | 285,000 | 15.25% | VEHICLE | 01/03/2023 |

**Paid installments for LN-COM-2022-045678:**
Installments 1–23 paid (loan started Sep 2022, go-live Aug 2024 = 23 months paid)

**Paid installments for LN-SAM-2023-089123:**
Installments 1–17 paid (loan started Mar 2023, go-live Aug 2024 = 17 months paid)

---

## What the System Generates Automatically

Once you enter the loan details, Bloomit will:
1. Generate the full repayment schedule (all installments with due dates and amounts)
2. Mark installments you specify as already paid
3. Show remaining balance and number of installments outstanding
4. Calculate total interest paid and total interest remaining

---

## Tips

**Use the original loan amount, not the current outstanding balance.**
The system calculates the outstanding balance itself based on how many installments
have been paid. If you enter the current balance instead of the original amount,
the schedule will be wrong.

**Monthly installment should match your bank statement exactly.**
Check your loan account statement from the bank to confirm the exact monthly
deduction amount (it may include both principal and interest).

**Do not enter paid-off loans.**
Only include loans that still have installments outstanding as of go-live.

**Overdraft facilities:**
If you have a bank overdraft (revolving credit line, not fixed installments),
enter it as type `OVERDRAFT` with the loan amount set to your approved overdraft limit
and a note explaining it is revolving.
