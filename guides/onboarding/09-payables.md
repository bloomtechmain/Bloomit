# Section 09 — Payables (Money Going Out)

**Priority:** Recommended  
**Time to prepare:** 1–2 hours  
**Who should fill this:** Finance manager or accounts payable team  
**Source document:** Accounts payable listing, recurring expense schedule, outstanding vendor invoices

---

## What This Is

Payables are amounts your company owes to vendors and suppliers — money you need to
pay out. Each payable record captures who you owe, how much, when it is due, and
whether it is a one-off or a recurring expense.

---

## Data Fields Required

Provide one row per outstanding payment or expense stream.

| Field | What It Is | Required | Example |
|-------|-----------|----------|---------|
| Vendor Name | Which vendor / supplier this is for (must match Section 04) | ✅ Yes | Dialog Axiata PLC |
| Payable Name | A short label for this expense | ✅ Yes | Monthly Mobile Bill — April 2024 |
| Description | More detail about what this payment is for | Optional | Corporate SIM package — 15 connections |
| Payable Type | Category of expense | ✅ Yes | See options below |
| Amount (LKR) | The amount per payment | ✅ Yes | 48,500.00 |
| Frequency | How often this expense recurs | ✅ Yes | See options below |
| Start Date | When the first payment is due (DD/MM/YYYY) | Optional | 20/04/2024 |
| End Date | When this expense ends (if known) | Optional | 20/03/2025 |
| Contract | If linked to a project contract (from Section 07) | Optional | Phase 1 — Civil Works |
| Bank Account | Which of your accounts this is paid from | Optional | Commercial Bank — 1234567890 |
| Payment Method | How you pay this vendor | Optional | See options below |
| Reference Number | Invoice number or any reference | Optional | DLG-2024-03-456 |
| Active? | Is this payable currently open / ongoing? | ✅ Yes | Yes |

---

## Field Options

**Payable Type:**
- `VENDOR` — regular vendor invoice / supplier payment
- `RECURRING` — fixed recurring expense (rent, lease, subscription)
- `PETTY_CASH` — small expense paid from petty cash
- `UTILITY` — electricity, water, telecoms
- `SALARY` — payroll (usually handled through the Payroll module, but can be listed here for reference)
- `OTHER` — any other expense not fitting the above

**Frequency:**
- `One-Time` — single payment (an outstanding vendor invoice)
- `Monthly` — paid every month
- `Quarterly` — every 3 months
- `Bi-Annual` — every 6 months
- `Annual` — once per year

**Payment Method:**
- `Bank Transfer`
- `Cheque` (include cheque number if already issued)
- `Cash`
- `Direct Debit` — auto-debited from your bank account

---

## Sample Dataset

| Vendor | Payable Name | Type | Amount (LKR) | Frequency | Due Date | Payment Method | Active? |
|--------|------------|------|-------------|-----------|----------|---------------|---------|
| Dialog Axiata PLC | Monthly Mobile Bill — April | Utility | 48,500 | Monthly | 20/04/2024 | Bank Transfer | Yes |
| SLT-Mobitel Broadband | Broadband — April | Utility | 12,800 | Monthly | 25/04/2024 | Direct Debit | Yes |
| CEB (Ceylon Electricity Board) | Electricity — March | Utility | 94,200 | Monthly | 30/04/2024 | Bank Transfer | Yes |
| Nawaloka Printers | Office Stationery — Q1 | Vendor | 38,000 | One-Time | 15/04/2024 | Cheque | Yes |
| Lanka Office Supplies (Pvt) Ltd | Laptop — Finance Dept | Vendor | 215,000 | One-Time | 10/04/2024 | Bank Transfer | Yes |
| [Landlord Name] | Office Rent — April | Recurring | 350,000 | Monthly | 01/04/2024 | Cheque | Yes |
| Perera & Sons Hardware | Site materials — Phase 1 | Vendor | 125,000 | One-Time | 18/04/2024 | Cheque | Yes |

---

## Tips

**Enter only unpaid amounts.**
Only include payables that have not yet been settled as of your go-live date.
Paid invoices do not need to be entered.

**Recurring expenses are entered once.**
Office rent, utility bills, and standing orders are entered once as recurring payables.
You do not need to create 12 rows for 12 months of rent — just set the frequency
to Monthly and the start date.

**For each outstanding vendor invoice, create one row.**
If you owe Nawaloka Printers for two separate invoices, create two rows — one per invoice.

**Link to contracts when possible.**
If a vendor payment is for materials or services on a specific project contract
(e.g., site materials for Phase 1 Civil Works), link it. This allows the system
to calculate true project cost vs. budget.

**Cheque numbers for issued but uncleared cheques:**
If you have already written a cheque that has not yet cleared the bank, include the
cheque number in the Reference Number field. This helps reconcile your bank account.

---

## What to Include vs. Exclude

| Include | Exclude |
|---------|---------|
| Outstanding vendor invoices not yet paid | Bills that were paid before go-live |
| Monthly recurring expenses going forward | Historical payment records |
| Cheques issued but not yet cleared by the bank | |
| Direct debit / standing order expenses | |
| Any liability you currently owe to a vendor | |
