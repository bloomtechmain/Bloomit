# Section 03 — Bank Accounts

**Priority:** Must Have (Go-Live)  
**Time to prepare:** ~20 minutes  
**Who should fill this:** Finance manager or accountant  
**Source document:** Latest bank statement for each account

---

## What This Is

All business bank accounts your company uses. Bloomit tracks the balance of each
account and records every payment going in or out. The opening balance you provide
must match your bank statement on the go-live date.

---

## Part A — Banks

First, list the banks (financial institutions) your accounts are held at.
If two accounts are at the same bank, list the bank only once.

| Field | What It Is | Required | Example |
|-------|-----------|----------|---------|
| Bank Name | Full name of the bank | ✅ Yes | Commercial Bank of Ceylon PLC |
| Branch Name | The specific branch | ✅ Yes | Colombo 03 — Union Place Branch |

### Sample Bank List

| Bank Name | Branch |
|-----------|--------|
| Commercial Bank of Ceylon PLC | Union Place Branch, Colombo 03 |
| Bank of Ceylon | Nugegoda Branch |
| Sampath Bank PLC | Head Office, Colombo 02 |

---

## Part B — Bank Accounts

For each account, provide the following:

| Field | What It Is | Required | Example |
|-------|-----------|----------|---------|
| Bank Name | Which bank from Part A | ✅ Yes | Commercial Bank of Ceylon PLC |
| Account Number | Full bank account number | ✅ Yes | 1234567890 |
| Account Name | The name on the account (usually your company name) | ✅ Yes | Bloomtech Solutions (Pvt) Ltd |
| Opening Balance | The account balance as at your go-live date | ✅ Yes | LKR 1,250,000.00 |
| Active? | Is this account currently in use? | ✅ Yes | Yes |

> **Important:** Opening balance must be the **closing balance from your bank statement
> on the last day of the month before go-live.** For example, if you go live on
> 1 April 2024, use the 31 March 2024 closing balance from your bank statement.

> **Important:** If the account has a negative balance (overdraft), enter it as
> a negative number. Example: `-500,000.00`

### Sample Bank Account Dataset

| Bank | Account Number | Account Name | Opening Balance | Active? |
|------|---------------|--------------|-----------------|---------|
| Commercial Bank of Ceylon PLC | 1234567890 | Bloomtech Solutions (Pvt) Ltd | 1,250,000.00 | Yes |
| Bank of Ceylon | 9876543210 | Bloomtech Solutions (Pvt) Ltd | 380,000.00 | Yes |
| Sampath Bank PLC | 5556667778 | Bloomtech Solutions — Payroll | 0.00 | Yes |

---

## Part C — Debit Cards (Optional)

If your company has debit cards linked to any of these accounts, you may register
them for record-keeping. For security, we only store the **last 4 digits** of the
card number — never the full number.

| Field | What It Is | Required | Example |
|-------|-----------|----------|---------|
| Linked Bank Account | Which account this card is linked to | ✅ Yes | Commercial Bank — 1234567890 |
| Last 4 Digits | Last 4 digits of the card number only | ✅ Yes | 7823 |
| Cardholder Name | Name printed on the card | ✅ Yes | DILANTHA PERERA |
| Expiry Date | Card expiry (MM/YYYY) | ✅ Yes | 08/2027 |

### Sample Debit Card Dataset

| Linked Account | Last 4 Digits | Cardholder Name | Expiry |
|---------------|---------------|-----------------|--------|
| Commercial Bank — 1234567890 | 7823 | DILANTHA PERERA | 08/2027 |
| BOC — 9876543210 | 4491 | KASUN FERNANDO | 03/2026 |

---

## What You Do NOT Need to Provide

- Full card numbers (we never store these)
- CVV / security codes (we never store these)
- Transaction history (historical transactions are not imported — only the opening balance)
- Online banking login credentials (we do not need or want these)

---

## Common Mistakes to Avoid

| Mistake | What to do instead |
|---------|-------------------|
| Using today's balance instead of the month-end balance | Use the closing balance from your last bank statement |
| Including personal bank accounts | Only include business accounts |
| Forgetting inactive accounts you still need to reference | Include all accounts even if the balance is zero |
