# Feature 13 — Multi-Currency Support

**Phase:** 3 — Reporting & Intelligence  
**Priority:** Medium  
**Effort:** L (6–8 weeks)  
**Depends on:** Feature 01 (GL), Feature 03 (Invoices), Feature 07 (Customers)

---

## What This Is

Support for transacting in foreign currencies across invoices, bills, and bank
accounts, while maintaining all financial reporting in the company's functional
(home) currency. Includes exchange rate management, automatic currency conversion,
and unrealised/realised foreign exchange (FX) gain/loss tracking.

---

## Why It Matters

Any business with international customers or suppliers needs multi-currency. Without
it, foreign currency invoices must be manually converted before entry — which loses
the original currency amount, introduces human error, and makes FX gain/loss tracking
impossible.

---

## Current Gap

- All amounts are stored without currency context
- No exchange rate table
- No FX gain/loss accounts in the default COA
- The system implicitly assumes a single currency (LKR)

---

## Database Changes

```sql
CREATE TABLE currencies (
  code            VARCHAR(3) PRIMARY KEY,   -- ISO 4217: USD, EUR, GBP, LKR
  name            VARCHAR(50) NOT NULL,
  symbol          VARCHAR(5) NOT NULL,
  decimal_places  INT DEFAULT 2,
  is_active       BOOLEAN DEFAULT TRUE
);

CREATE TABLE exchange_rates (
  id              SERIAL PRIMARY KEY,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id),
  from_currency   VARCHAR(3) NOT NULL REFERENCES currencies(code),
  to_currency     VARCHAR(3) NOT NULL REFERENCES currencies(code),
  rate            NUMERIC(18,8) NOT NULL,   -- units of to_currency per 1 unit of from_currency
  rate_date       DATE NOT NULL,
  source          VARCHAR(20) DEFAULT 'MANUAL', -- MANUAL | AUTO_FEED
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, from_currency, to_currency, rate_date)
);

-- Add currency columns to transactional tables
ALTER TABLE invoices        ADD COLUMN currency VARCHAR(3) DEFAULT 'LKR' REFERENCES currencies(code);
ALTER TABLE invoices        ADD COLUMN exchange_rate NUMERIC(18,8) DEFAULT 1;
ALTER TABLE invoices        ADD COLUMN functional_total NUMERIC(15,2); -- total in home currency

ALTER TABLE vendor_bills    ADD COLUMN currency VARCHAR(3) DEFAULT 'LKR';
ALTER TABLE vendor_bills    ADD COLUMN exchange_rate NUMERIC(18,8) DEFAULT 1;
ALTER TABLE vendor_bills    ADD COLUMN functional_total NUMERIC(15,2);

ALTER TABLE company_bank_accounts ADD COLUMN currency VARCHAR(3) DEFAULT 'LKR';
ALTER TABLE customers       ADD COLUMN default_currency VARCHAR(3) DEFAULT 'LKR';
ALTER TABLE vendors         ADD COLUMN default_currency VARCHAR(3) DEFAULT 'LKR';

-- FX gain/loss accounts (added to default COA seed)
-- 6000 — Unrealised FX Gain/Loss (Balance Sheet)
-- 7000 — Realised FX Gain/Loss (P&L)
```

### Tenant Currency Setting

Add to `application_settings`:
- `functional_currency` — home reporting currency (e.g. `LKR`)
- `default_transaction_currency` — default for new transactions

---

## Backend Implementation

### Exchange Rate Service

```typescript
// backend/src/services/currencyService.ts

// Get rate for a given date (falls back to nearest available rate)
async function getRate(
  tenantId: string,
  fromCurrency: string,
  toCurrency: string,
  date: Date
): Promise<number>

// Convert amount to functional currency
function toFunctional(amount: number, currency: string, rate: number): number

// Calculate FX gain/loss on invoice payment
// Booked rate (when invoice issued) vs. payment rate (when payment received)
// Gain/Loss = (payment_rate - invoice_rate) * invoice_amount_in_foreign_currency
function calculateRealisedFXGainLoss(
  invoiceAmount: number,
  currency: string,
  invoiceRate: number,
  paymentRate: number
): number

// Month-end: revalue open foreign currency balances at current rate
// Unrealised gain/loss posted to GL
async function revalueOpenItems(tenantId: string, asOfDate: Date): Promise<void>
```

### Optional: Automatic Rate Feed

Integrate with a free exchange rate API (e.g., exchangerate-api.com or Open Exchange Rates)
to auto-populate daily rates. Store in `exchange_rates` with `source = 'AUTO_FEED'`.
A daily cron job fetches rates for all active currencies.

### New Routes — `/api/currency`

| Method | Path | Action |
|--------|------|--------|
| GET | `/api/currency/rates` | List rates for a date range |
| POST | `/api/currency/rates` | Manually enter exchange rate |
| GET | `/api/currency/rates/latest` | Latest rate per currency pair |
| POST | `/api/currency/revalue` | Trigger month-end revaluation |
| GET | `/api/currency/fx-report` | FX gain/loss report |

---

## Frontend Implementation

### Currency Settings (`/settings/currencies`)

- List of active currencies with symbols
- Exchange rate table: enter daily/weekly rates per currency pair
- "Fetch Latest Rates" button (triggers auto-feed)
- Functional currency selector (set once, rarely changed)

### Currency on Invoices and Bills

- Currency dropdown on invoice/bill header (defaults to customer/vendor default currency)
- Exchange rate field (auto-filled if rate exists for today, manually overridable)
- All line item amounts entered in the transaction currency
- "Functional Amount" shown beside each total in grey (home currency equivalent)

### FX Gain/Loss Report (`/accounting/fx-report`)

- Period selector
- Table: Transaction | Currency | Booked Rate | Settlement Rate | FX Gain/Loss
- Total realised FX gain/loss for the period
- Total unrealised FX gain/loss (open items)

### Multi-Currency Bank Accounts

- Bank account creation now has a currency field
- Foreign currency bank account balance shown in both foreign and functional currency
- Revaluation adjustments shown in account transaction history

---

## Integration Points

| Module | Connection |
|--------|-----------|
| Invoices (Feature 03) | Invoice currency + rate; FX gain/loss on payment |
| Bills (Feature 10) | Bill currency + rate; FX gain/loss on payment |
| Customers (Feature 07) | Default currency per customer |
| Bank Accounts | Foreign currency accounts |
| GL (Feature 01) | FX gain/loss accounts; all GL amounts in functional currency |
| Financial Statements (Feature 06) | All statements in functional currency; FX line on P&L |
| Bank Reconciliation (Feature 05) | Reconcile foreign currency accounts |

---

## Implementation Steps

1. Create `currencies`, `exchange_rates` tables; seed common currencies
2. Add currency and exchange_rate columns to `invoices`, `vendor_bills`, `company_bank_accounts`
3. Add functional_currency to `application_settings` per tenant
4. Build `currencyService.ts` (rate lookup, conversion, FX gain/loss, revaluation)
5. Build optional auto-rate-feed cron job
6. Build currency settings page with rate entry and auto-fetch
7. Add currency dropdown and rate field to invoice and bill forms
8. Add functional currency display to all amount fields
9. Build FX gain/loss report
10. Implement month-end revaluation with GL posting
