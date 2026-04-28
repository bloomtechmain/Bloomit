# Feature 17 — API Webhooks & External Integrations

**Phase:** 4 — System & Integrations  
**Priority:** Low–Medium  
**Effort:** L (5–7 weeks)

---

## What This Is

A webhook system that fires HTTP events to external URLs when things happen inside
Bloomit (invoice paid, payroll approved, PO created), plus pre-built integrations
with key external services: payment gateways, bank data feeds, accounting data
export to third-party tools, and single sign-on (SSO).

---

## Why It Matters

As the business grows, Bloomit needs to connect to the ecosystem around it:
- Payment gateways so customers can pay invoices online
- Bank data feeds for automatic transaction import (replaces manual CSV upload in reconciliation)
- CRM or communication tools for customer notifications
- Payroll bank file exports (direct debit instructions to the bank)

Without integrations, staff manually bridges the gaps — double entry, CSV exports,
copy-paste. Webhooks let partner tools react to Bloomit events in real time.

---

## Current Gap

- No public or internal webhook system
- No payment gateway integration
- No bank feed integration
- No SSO / OAuth2 login
- No payroll bank file export

---

## Database Changes

```sql
CREATE TABLE webhook_endpoints (
  id              SERIAL PRIMARY KEY,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id),
  name            VARCHAR(100) NOT NULL,
  url             TEXT NOT NULL,
  secret          TEXT NOT NULL,             -- HMAC signing secret
  events          TEXT[] NOT NULL,           -- ['invoice.paid', 'payroll.approved', ...]
  is_active       BOOLEAN DEFAULT TRUE,
  created_by      INT REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE webhook_deliveries (
  id              SERIAL PRIMARY KEY,
  endpoint_id     INT NOT NULL REFERENCES webhook_endpoints(id),
  event_type      VARCHAR(50) NOT NULL,
  payload         JSONB NOT NULL,
  response_status INT,
  response_body   TEXT,
  delivered_at    TIMESTAMPTZ,
  duration_ms     INT,
  success         BOOLEAN,
  retry_count     INT DEFAULT 0,
  next_retry_at   TIMESTAMPTZ
);

CREATE TABLE api_keys (
  id              SERIAL PRIMARY KEY,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id),
  name            VARCHAR(100) NOT NULL,
  key_hash        TEXT NOT NULL,             -- stored as hash, never plaintext
  scopes          TEXT[] NOT NULL,           -- ['invoices:read', 'payments:write', ...]
  last_used_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  created_by      INT REFERENCES users(id),
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Backend Implementation

### Webhook Delivery Service

```typescript
// backend/src/services/webhookService.ts

// Called when a significant event occurs in any module
async function fireWebhook(
  tenantId: string,
  eventType: string,   // e.g. 'invoice.paid', 'bill.approved'
  payload: object
): Promise<void>
// Finds all active endpoints subscribed to this event type
// Signs payload with HMAC-SHA256 using endpoint.secret
// Posts to endpoint URL with X-Bloomit-Signature header
// Retries on failure: 1 min, 5 min, 30 min, 2 hr, 8 hr (exponential backoff)
// Logs delivery result to webhook_deliveries

// Standard webhook payload shape:
{
  event: "invoice.paid",
  occurred_at: "2024-03-15T10:30:00Z",
  tenant_id: "bloomtech",
  data: { invoice_id, customer_name, amount, currency, ... }
}
```

### Webhook Events Catalogue

| Event | Triggered when |
|-------|---------------|
| `invoice.created` | Invoice is created |
| `invoice.sent` | Invoice is emailed to customer |
| `invoice.paid` | Full payment recorded |
| `invoice.overdue` | Due date passes without full payment |
| `bill.approved` | AP bill approved |
| `bill.paid` | AP bill payment recorded |
| `payroll.approved` | Payslip admin-approved |
| `po.approved` | Purchase order approved |
| `quote.accepted` | Quote status changed to ACCEPTED |
| `pto.approved` | PTO request approved |
| `expense.approved` | Expense claim approved |
| `employee.terminated` | Employee terminated |

### REST API (for external integrations)

Build a versioned public REST API (`/api/v1/`) secured with API keys:

| Scope | Example endpoints |
|-------|-----------------|
| `invoices:read` | GET /api/v1/invoices |
| `invoices:write` | POST /api/v1/invoices |
| `payments:write` | POST /api/v1/invoices/:id/payment |
| `customers:read` | GET /api/v1/customers |
| `reports:read` | GET /api/v1/reports/trial-balance |

API key auth: `Authorization: Bearer <api_key>` header.
Rate limit: 100 requests/minute per API key.

### Pre-Built Integrations

**Payment Gateway (PayHere / Stripe):**
- Add "Pay Online" link to invoice PDF and email
- Customer clicks → redirected to payment gateway checkout
- On successful payment, gateway fires callback → Bloomit records payment automatically
- Supports: PayHere (Sri Lanka), Stripe (international)

**Bank Feed (automatic statement import):**
- OAuth2 connection to bank's Open Banking API (where available)
- Daily automatic fetch of bank transactions
- Replaces manual CSV upload in bank reconciliation (Feature 05)
- For Sri Lanka: manual CSV remains primary until Open Banking is available

**Payroll Bank File (SLIPS format):**
- Export approved payroll as a bank direct-credit instruction file
- Format: bank-specific (Sampath, Commercial, BOC, etc. have different formats)
- Upload to internet banking to bulk-pay all employees in one transaction

**SSO / OAuth2 Login:**
- Login with Google Workspace (common for businesses already on Google)
- Login with Microsoft Azure AD (for enterprises)
- SAML 2.0 support for enterprise clients
- First login creates user account automatically, role assigned by admin

---

## Frontend Implementation

### API & Webhooks Settings (`/settings/integrations`)

**Webhooks tab:**
- List of configured webhook endpoints (name, URL, subscribed events, status)
- "Add Webhook" modal: URL, secret, event checkboxes
- Test delivery button (sends a sample payload)
- Delivery log per endpoint (last 50 deliveries, status, response)
- Edit / Deactivate / Delete

**API Keys tab:**
- List of active API keys (name, scopes, last used, expiry)
- "Create API Key" modal: name, scopes, expiry date
- Key shown only once on creation (copy button)
- Revoke key button

**Connected Integrations tab:**
- PayHere: Connect / Disconnect, status indicator
- Google (SSO): Connect / Disconnect
- Bank Feed: Connect per bank account (where supported)

### Online Payment on Invoice

When PayHere is connected, invoice PDF and email includes a "Pay Now" button.
Invoice detail page shows payment link with QR code option.

---

## Integration Points

| Module | Webhook fired |
|--------|-------------|
| Invoices | invoice.created, invoice.sent, invoice.paid, invoice.overdue |
| Bills | bill.approved, bill.paid |
| Payroll | payroll.approved (triggers bank file export) |
| Purchase Orders | po.approved |
| Quotes | quote.accepted |
| PTO | pto.approved |
| Expense Claims | expense.approved |
| HR | employee.terminated |

---

## Implementation Steps

1. Create `webhook_endpoints`, `webhook_deliveries`, `api_keys` tables
2. Build `webhookService.ts` with HMAC signing, delivery, retry logic
3. Add webhook fire calls to: invoice, bill, payroll, PO, quote, PTO controllers
4. Build versioned public REST API (`/api/v1/`) with API key auth and rate limiting
5. Build webhook settings page (endpoints, delivery log)
6. Build API keys management page
7. Integrate PayHere payment gateway (sandbox first, production after testing)
8. Build payroll bank file export (one bank format initially, extensible)
9. Implement Google OAuth2 SSO login
10. Build connected integrations status page
