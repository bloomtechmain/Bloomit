# Section 12 — Subscriptions & Recurring Payments

**Priority:** Optional  
**Time to prepare:** ~20 minutes  
**Who should fill this:** Finance manager or office manager  
**Source document:** Credit card statements, bank statements, software invoice emails

---

## What This Is

Recurring payments for software tools, licenses, memberships, and services that
your company pays on a fixed schedule — monthly, quarterly, or annually. These are
typically smaller, automated payments that are easy to miss or forget to track.

> **Note:** Large recurring vendor payments (office rent, utilities, supplier contracts)
> are better tracked in Section 09 — Payables. This section is specifically for
> subscriptions and SaaS / membership-type recurring charges.

---

## Data Fields Required

Provide one row per active subscription.

| Field | What It Is | Required | Example |
|-------|-----------|----------|---------|
| Description | Name of the subscription or service | ✅ Yes | Microsoft 365 Business Premium |
| Amount (LKR) | The amount charged per billing cycle | ✅ Yes | 18,500.00 |
| Due Date | Next payment date (DD/MM/YYYY) | ✅ Yes | 05/05/2024 |
| Frequency | How often you are billed | ✅ Yes | See options below |
| Auto Pay? | Is this charged automatically (credit card / direct debit)? | Optional | Yes |
| Active? | Is this subscription still active? | ✅ Yes | Yes |

---

## Field Options

**Frequency:**
- `Monthly` — billed every month
- `Quarterly` — billed every 3 months
- `Annual` — billed once per year
- `One-Time` — not recurring, but a single scheduled payment

---

## Sample Dataset

| Description | Amount (LKR) | Due Date | Frequency | Auto Pay? | Active? |
|------------|-------------|----------|-----------|-----------|---------|
| Microsoft 365 Business Premium (×10 users) | 18,500 | 05/05/2024 | Monthly | Yes | Yes |
| Adobe Creative Cloud (×3 licences) | 24,200 | 12/05/2024 | Monthly | Yes | Yes |
| Zoom Pro — Business Plan | 5,800 | 20/05/2024 | Monthly | Yes | Yes |
| AWS (Amazon Web Services) | 38,000 | 01/05/2024 | Monthly | Yes | Yes |
| QuickBooks Online (will cancel on go-live) | 9,500 | 15/05/2024 | Monthly | Yes | No |
| Domain & Hosting — Namecheap | 12,000 | 01/01/2025 | Annual | Yes | Yes |
| CIMA Membership — Corporate | 85,000 | 01/07/2024 | Annual | No | Yes |
| VirusTotal Enterprise | 6,200 | 10/05/2024 | Monthly | Yes | Yes |

---

## Tips

**Check your credit card statement line by line.**
The most reliable source for subscriptions is 1–2 months of credit card statements.
Many subscriptions are billed in USD or other foreign currencies — convert to LKR
at the approximate rate you pay.

**Foreign currency subscriptions:**
If a subscription is billed in USD (e.g., AWS, Zoom), enter the approximate LKR
amount based on your bank's exchange rate. Note the original USD amount in the
Description field.

Example description: `AWS — approx. USD 25 / month (LKR ~8,000)`

**Include subscriptions you plan to cancel at go-live, but mark them Inactive.**
This gives you a complete picture of what you were spending before migration.

**Do not include:**
- One-off software purchases (enter as an Asset in Section 10 if significant,
  or as a Payable in Section 09 if still unpaid)
- Payroll, rent, utilities (those go in Section 09)
- Loan repayments (those go in Section 11)

---

## Common Subscriptions Businesses Use

| Category | Examples |
|---------|---------|
| Productivity | Microsoft 365, Google Workspace |
| Communication | Zoom, Slack, Microsoft Teams |
| Design | Adobe Creative Cloud, Canva Pro, Figma |
| Cloud / Hosting | AWS, Google Cloud, Azure, Namecheap, GoDaddy |
| Accounting (previous system) | QuickBooks, Xero, Tally |
| CRM / Sales | Salesforce, HubSpot |
| Security | Bitdefender, Norton, CrowdStrike |
| Project Management | Jira, Monday.com, Asana, Trello |
| HR / Payroll | Prior payroll software |
| Professional Memberships | ICASL, CIMA, SLASSCOM |
