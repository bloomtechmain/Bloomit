# Feature 18 — Vendor Self-Service Portal

**Phase:** 4 — System & Integrations  
**Priority:** Low  
**Effort:** L (6–8 weeks)

---

## What This Is

A separate login portal for vendors (suppliers) to view their Purchase Orders,
submit invoices (bills) directly into the system, check payment status, and download
remittance advice. Reduces the AP team's email overhead and speeds up the
procure-to-pay cycle.

---

## Why It Matters

Currently, vendor invoice processing is fully manual:
1. Vendor emails a PDF invoice
2. AP staff manually creates a bill in the system
3. AP staff manually notifies vendor when payment is made

With a vendor portal:
- Vendors self-submit invoices → eliminates manual data entry
- Vendors check payment status → eliminates "have you paid me?" emails
- Vendors acknowledge POs → creates a digital paper trail
- AP team spends time on exceptions, not data entry

---

## Current Gap

- No vendor-facing login or portal
- Vendor management is one-directional (internal only)
- No PO acknowledgement workflow
- No remittance advice documents

---

## Database Changes

```sql
CREATE TABLE vendor_portal_users (
  id              SERIAL PRIMARY KEY,
  vendor_id       INT NOT NULL REFERENCES vendors(id),
  email           VARCHAR(150) NOT NULL UNIQUE,
  name            VARCHAR(150) NOT NULL,
  password_hash   TEXT NOT NULL,
  is_active       BOOLEAN DEFAULT TRUE,
  last_login      TIMESTAMPTZ,
  invite_token    TEXT,
  invite_expires  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE po_acknowledgements (
  id              SERIAL PRIMARY KEY,
  purchase_order_id INT NOT NULL REFERENCES purchase_orders(id),
  acknowledged_by INT NOT NULL REFERENCES vendor_portal_users(id),
  acknowledged_at TIMESTAMPTZ DEFAULT NOW(),
  notes           TEXT
);

CREATE TABLE remittance_advices (
  id              SERIAL PRIMARY KEY,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id),
  vendor_id       INT NOT NULL REFERENCES vendors(id),
  payment_date    DATE NOT NULL,
  total_amount    NUMERIC(15,2) NOT NULL,
  bill_ids        INT[] NOT NULL,           -- bills being settled
  document_id     INT,                      -- PDF stored as document
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Vendor invoice submissions (from portal)
CREATE TABLE vendor_invoice_submissions (
  id              SERIAL PRIMARY KEY,
  vendor_id       INT NOT NULL REFERENCES vendors(id),
  purchase_order_id INT REFERENCES purchase_orders(id),
  vendor_invoice_number VARCHAR(50) NOT NULL,
  invoice_date    DATE NOT NULL,
  due_date        DATE,
  total_amount    NUMERIC(15,2) NOT NULL,
  document_id     INT,                      -- uploaded invoice PDF
  status          VARCHAR(20) DEFAULT 'SUBMITTED', -- SUBMITTED | REVIEWED | ACCEPTED | REJECTED
  bill_id         INT REFERENCES vendor_bills(id), -- set when accepted and converted to bill
  submitted_by    INT REFERENCES vendor_portal_users(id),
  reviewed_by     INT REFERENCES users(id),
  review_notes    TEXT,
  submitted_at    TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Backend Implementation

### Vendor Portal Auth (separate from main JWT)

```typescript
// Vendor portal uses its own JWT with vendor_id claim
// Separate middleware: verifyVendorPortalToken()
// Scoped routes under: /vendor-portal/api/

// Invite flow:
// 1. Internal staff "Invite Vendor" → sends email with invite link
// 2. Vendor clicks link → sets their password
// 3. Vendor logs in at /vendor-portal (separate URL or subdomain)
```

### New Routes — `/vendor-portal/api/`

| Method | Path | Action |
|--------|------|--------|
| POST | `/vendor-portal/api/auth/login` | Vendor login |
| POST | `/vendor-portal/api/auth/accept-invite` | Accept invite + set password |
| GET | `/vendor-portal/api/purchase-orders` | Vendor's POs |
| POST | `/vendor-portal/api/purchase-orders/:id/acknowledge` | Acknowledge PO |
| GET | `/vendor-portal/api/invoices` | Vendor's submitted invoices |
| POST | `/vendor-portal/api/invoices` | Submit new invoice |
| GET | `/vendor-portal/api/payments` | Payment history |
| GET | `/vendor-portal/api/payments/:id/remittance` | Download remittance PDF |

### Internal AP Routes (vendor management)

| Method | Path | Action |
|--------|------|--------|
| POST | `/api/vendors/:id/portal-invite` | Send portal invite to vendor contact |
| GET | `/api/vendors/:id/submissions` | View vendor's invoice submissions |
| POST | `/api/vendor-submissions/:id/accept` | Accept submission → create bill |
| POST | `/api/vendor-submissions/:id/reject` | Reject with reason |
| POST | `/api/bills/:id/remittance` | Generate and send remittance advice |

### Invoice Submission → Bill Conversion

When AP staff accepts a vendor invoice submission:
```typescript
// 1. Create vendor_bill from submission data (3-way match if PO linked)
// 2. Link bill_id back to the submission
// 3. Update submission status to ACCEPTED
// 4. Notify vendor via email: "Your invoice has been received and is being processed"
async function acceptVendorSubmission(submissionId: number): Promise<VendorBill>
```

### Remittance Advice PDF

When a bill payment is recorded, generate a remittance advice PDF:
- Company name and payment date
- Vendor name and payment method
- Table of bills being settled (invoice number, amount, discount if any)
- Total paid
- Bank reference / cheque number
- Email to vendor automatically (or send via portal)

---

## Frontend Implementation

### Vendor Portal (separate React app or sub-route)

Lightweight portal at `/vendor-portal/` with its own login page and branding.

**Dashboard:**
- Outstanding POs awaiting acknowledgement (highlighted)
- Invoices submitted (with status badges)
- Recent payments received

**Purchase Orders:**
- List of POs sent to this vendor
- Status: SENT | ACKNOWLEDGED | PARTIALLY_DELIVERED | CLOSED
- PO detail: items, quantities, expected delivery
- "Acknowledge" button with optional notes

**Submit Invoice:**
- Select PO (or submit without PO reference)
- Enter invoice number and date
- Upload invoice PDF
- Enter line items (pre-filled from PO if linked)
- Submit for review

**Payments:**
- History of all payments received
- Download remittance advice PDF per payment

### Internal: Vendor Submissions Queue (`/bills/submissions`)

AP staff view of all pending vendor invoice submissions:
- Table: Vendor | Invoice # | Date | Amount | PO Match | Status
- Click row → review details
- Accept (creates bill, runs 3-way match check) or Reject (with reason)

### Vendor Profile: Portal Access Tab

Add "Portal Access" tab to vendor profile page:
- Shows invited contacts, portal login status
- "Invite Contact" button → sends email invite
- Revoke access button

---

## Integration Points

| Module | Connection |
|--------|-----------|
| Vendors (existing) | Vendor FK on all portal records |
| Purchase Orders | PO acknowledgement; submission linked to PO for 3-way match |
| Bills (Feature 10) | Accepted submission → vendor bill auto-created |
| Email | Invite emails, submission notifications, remittance advice |
| Documents | Invoice PDFs uploaded by vendor stored as documents |

---

## Implementation Steps

1. Create `vendor_portal_users`, `po_acknowledgements`, `remittance_advices`, `vendor_invoice_submissions` tables
2. Build vendor portal JWT auth (separate from main auth)
3. Build vendor portal backend routes
4. Build internal AP routes (invite, submissions queue, accept/reject)
5. Build remittance advice PDF generator
6. Build vendor portal frontend (dashboard, PO list, invoice submission, payments)
7. Build internal submissions queue page for AP staff
8. Add "Portal Access" tab to vendor profile
9. Add "Generate Remittance" action to bill payment flow
10. Send automated email notifications throughout the vendor portal workflow
