# Section 08 — Receivables (Money Coming In)

**Priority:** Recommended  
**Time to prepare:** 1–2 hours  
**Who should fill this:** Finance manager or accountant  
**Source document:** Accounts receivable listing, client payment schedules, recurring invoice register

---

## What This Is

Receivables are amounts that clients owe you — money you are expecting to receive.
Each receivable record tracks who is paying, how much, when, and how often.

> **Receivables ≠ Invoices.** At this stage, Bloomit's Receivables module records
> expected income streams and tracks payments received. Full invoice management
> (with invoice numbers and PDF generation) is a separate feature.

---

## Data Fields Required

Provide one row per expected payment or income stream.

| Field | What It Is | Required | Example |
|-------|-----------|----------|---------|
| Payer Name | The client or company that owes you the money | ✅ Yes | XYZ Corporation (Pvt) Ltd |
| Receivable Name | A short label for this income item | ✅ Yes | Phase 1 Milestone — Foundation Works |
| Description | More detail about what this payment is for | Optional | Payment on completion of foundation and columns |
| Receivable Type | Category of income | ✅ Yes | See options below |
| Amount (LKR) | The amount expected per payment | ✅ Yes | 4,000,000.00 |
| Frequency | How often this payment recurs | ✅ Yes | See options below |
| Start Date | When the first payment is expected (DD/MM/YYYY) | Optional | 15/04/2024 |
| End Date | When this income stream ends (if known) | Optional | 15/10/2024 |
| Contract | Which project contract this is linked to | Optional | Phase 1 — Civil Works |
| Bank Account | Which of your accounts this is deposited into | Optional | Commercial Bank — 1234567890 |
| Payment Method | How the client pays | Optional | See options below |
| Reference Number | Client PO number or any reference | Optional | PO-XYZ-2024-0045 |
| Active? | Is this receivable currently open? | ✅ Yes | Yes |

---

## Field Options

**Receivable Type:**
- `Contract Payment` — payment linked to a project contract
- `Recurring` — regular fixed-amount income (retainer, subscription, rent)
- `One-Time` — a single payment not expected to recur
- `Advance` — upfront payment received before work begins
- `Retention Release` — held-back retention amount being released

**Frequency:**
- `One-Time` — single payment
- `Monthly` — every month on the same date
- `Quarterly` — every 3 months
- `Bi-Annual` — every 6 months
- `Annual` — once a year
- `Milestone` — triggered by project milestone completion

**Payment Method:**
- `Bank Transfer` — direct bank-to-bank
- `Cheque` — paper cheque
- `Cash` — cash payment
- `Online Payment` — payment gateway / online banking

---

## Sample Dataset

| Payer | Receivable Name | Type | Amount (LKR) | Frequency | Start Date | Contract | Bank Account | Active? |
|-------|---------------|------|-------------|-----------|------------|----------|-------------|---------|
| XYZ Corporation (Pvt) Ltd | Phase 1 Milestone — Foundation | Contract Payment | 4,000,000 | One-Time | 30/04/2024 | Phase 1 — Civil Works | Commercial Bank | Yes |
| XYZ Corporation (Pvt) Ltd | Phase 1 Milestone — Slab | Contract Payment | 3,200,000 | One-Time | 31/05/2024 | Phase 1 — Civil Works | Commercial Bank | Yes |
| ABC Bank PLC | ERP — Milestone 1 Payment | Contract Payment | 1,750,000 | One-Time | 15/04/2024 | Phase 1 — Discovery | BOC Account | Yes |
| City Hotel (Pvt) Ltd | Monthly Maintenance Fee | Recurring | 150,000 | Monthly | 01/04/2024 | Year 3 Maintenance | Commercial Bank | Yes |
| National Trust | Website Project Advance | Advance | 500,000 | One-Time | 10/04/2024 | (none) | BOC Account | Yes |

---

## Tips

**Enter only open (unpaid) receivables.**
Do not enter receivables that have already been fully paid. Only include amounts
you are still expecting to receive as of your go-live date.

**Recurring income is entered once, not per occurrence.**
If City Hotel pays LKR 150,000 every month, enter it once as a recurring receivable
with frequency "Monthly". You do not need to create 12 separate rows.

**Link to contracts where possible.**
If a payment is related to a project contract (from Section 07), link it.
This enables project profitability tracking.

**Amounts are per payment, not total contract value.**
If a contract has 5 milestone payments of LKR 4,000,000 each, create 5 separate
rows — one for each payment with its expected date.

---

## What to Include vs. Exclude

| Include | Exclude |
|---------|---------|
| Outstanding milestone payments not yet received | Payments already received before go-live |
| Monthly retainer / recurring income going forward | Historical transactions |
| Advances expected from new clients | Revenue from completed contracts already paid |
| Amounts for which you have issued (or will issue) an invoice | |
