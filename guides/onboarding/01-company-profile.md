# Section 01 — Company Profile & Settings

**Priority:** Must Have (Go-Live)  
**Time to prepare:** ~15 minutes  
**Who should fill this:** Business owner or managing director

---

## What This Is

Your company's basic identity inside Bloomit — the name, type of business, and
system-wide preferences that apply to every user and every transaction.

---

## Data Fields Required

### Company Information

| Field | What It Is | Required | Example |
|-------|-----------|----------|---------|
| Company / Business Name | The legal trading name of your business | ✅ Yes | Bloomtech Solutions (Pvt) Ltd |
| Company Type | The structure of your business | ✅ Yes | See options below |
| Primary Contact Name | Name of the admin user who manages the system | ✅ Yes | Dilantha Perera |
| Primary Contact Email | Email for the main admin login | ✅ Yes | dilantha@bloomtech.lk |

**Company Type options:**
- `Private Limited` — (Pvt) Ltd company registered with the ROC
- `Sole Proprietorship` — Individual trading under a business name
- `Partnership` — Two or more partners
- `PLC` — Public Limited Company
- `NGO / Non-Profit` — Registered charity or NGO
- `Other` — Any other structure

---

### System Preferences

These control how Bloomit behaves for your entire organisation.

| Setting | What It Controls | Required | Example / Options |
|---------|-----------------|----------|-------------------|
| Default Currency | Currency used for all transactions and reports | ✅ Yes | LKR (Sri Lankan Rupee) |
| Fiscal Year Start Month | Which month your financial year begins | ✅ Yes | `1` = January, `4` = April, `7` = July |
| Time Zone | Your business's local time zone | ✅ Yes | `Asia/Colombo` |
| Date Format | How dates appear across the system | ✅ Yes | `DD/MM/YYYY` or `YYYY-MM-DD` |
| Default Language | System display language | ✅ Yes | `en` (English) |

---

### Email Configuration

Bloomit sends automated emails (welcome messages, PO approvals, payslip notifications,
quote reminders). To enable this, provide your outgoing email details.

| Field | What It Is | Required | Example |
|-------|-----------|----------|---------|
| SMTP Host | Your email provider's outgoing mail server | ✅ Yes | smtp.zoho.com |
| SMTP Port | The port number for sending email | ✅ Yes | 587 |
| SMTP Email Address | The "from" email address | ✅ Yes | erp@bloomtech.lk |
| SMTP Password / App Password | The email account's app password | ✅ Yes | (keep confidential) |
| Display Name (From Name) | How the sender appears in email | ✅ Yes | Bloomtech ERP |

> **Tip:** If you use Zoho Mail, Gmail, or Outlook, you need an **App Password**,
> not your regular login password. Check your email provider's settings for
> "App Passwords" or "Less Secure App Access."

> **Tip:** If you do not set up email, the system will still work — but automated
> emails (PO approvals, payslip links, quote reminders) will not be sent.

---

### Petty Cash Setup

If your business maintains a petty cash float, provide these starting values:

| Field | What It Is | Required | Example |
|-------|-----------|----------|---------|
| Petty Cash Opening Balance | Current petty cash amount on hand | Optional | LKR 25,000.00 |
| Monthly Float Amount | The standard amount you replenish petty cash to each month | Optional | LKR 50,000.00 |

---

## Where to Find This Information

| Information | Where to look |
|------------|--------------|
| Legal company name | Certificate of Incorporation, BR certificate |
| Fiscal year start | Ask your accountant or check your tax filing history |
| SMTP settings | Your IT person or email provider's help documentation |
| Petty cash balance | Your petty cash book or current cashbox count |

---

## Sample Filled Form

```
Company Name:          Bloomtech Solutions (Pvt) Ltd
Company Type:          Private Limited
Primary Contact Name:  Dilantha Perera
Primary Contact Email: dilantha@bloomtech.lk

Default Currency:      LKR
Fiscal Year Start:     January (month 1)
Time Zone:             Asia/Colombo
Date Format:           DD/MM/YYYY

SMTP Host:             smtp.zoho.com
SMTP Port:             587
SMTP Email:            erp@bloomtech.lk
SMTP Display Name:     Bloomtech ERP

Petty Cash Opening Balance: LKR 18,500.00
Monthly Float Amount:       LKR 50,000.00
```
