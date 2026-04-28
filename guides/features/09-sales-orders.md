# Feature 09 — Sales Orders

**Phase:** 2 — Business Operations  
**Priority:** Medium  
**Effort:** M (3–4 weeks)  
**Depends on:** Feature 07 (Customers), Feature 08 (Inventory)

---

## What This Is

A Sales Order (SO) is the internal commitment to fulfil a customer's purchase before
the invoice is raised. The flow is:

```
Quote → Sales Order → Fulfillment / Delivery → Invoice → Payment
```

Sales orders reserve stock, trigger picking/packing, and convert to invoices upon
delivery confirmation. For service businesses, a sales order acts as a work order
authorising the team to begin work.

---

## Why It Matters

Currently the system jumps from Quote directly to Receivables with no intermediate
step. This means:
- Stock is not reserved when a sale is confirmed (risk of over-selling)
- There is no record of what was promised vs. what was actually delivered
- Partial deliveries cannot be tracked
- The operations team has no visibility of confirmed orders to fulfil

---

## Current Gap

- No `sales_orders` table
- No stock reservation mechanism
- No concept of order fulfilment or partial delivery

---

## Database Changes

```sql
CREATE TABLE sales_orders (
  id              SERIAL PRIMARY KEY,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id),
  order_number    VARCHAR(20) NOT NULL,      -- SO-2024-0001
  quote_id        INT REFERENCES quotes(id),
  customer_id     INT REFERENCES customers(id),
  order_date      DATE NOT NULL,
  expected_delivery DATE,
  status          VARCHAR(20) DEFAULT 'CONFIRMED', -- CONFIRMED | PROCESSING | PARTIAL | FULFILLED | CANCELLED
  shipping_address TEXT,
  notes           TEXT,
  assigned_to     INT REFERENCES users(id),
  subtotal        NUMERIC(15,2),
  tax_amount      NUMERIC(15,2) DEFAULT 0,
  total           NUMERIC(15,2),
  created_by      INT REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, order_number)
);

CREATE TABLE sales_order_items (
  id              SERIAL PRIMARY KEY,
  order_id        INT NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  product_id      INT REFERENCES products(id), -- NULL for service items
  description     TEXT NOT NULL,
  quantity_ordered NUMERIC(12,2) NOT NULL,
  quantity_delivered NUMERIC(12,2) DEFAULT 0,
  quantity_remaining NUMERIC(12,2) GENERATED ALWAYS AS (quantity_ordered - quantity_delivered) STORED,
  unit_price      NUMERIC(15,2) NOT NULL,
  tax_rate_id     INT REFERENCES tax_rates(id),
  total           NUMERIC(15,2) NOT NULL
);

CREATE TABLE deliveries (
  id              SERIAL PRIMARY KEY,
  order_id        INT NOT NULL REFERENCES sales_orders(id),
  delivery_number VARCHAR(20) NOT NULL,      -- DEL-2024-0001
  delivery_date   DATE NOT NULL,
  notes           TEXT,
  delivered_by    INT REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE delivery_items (
  id              SERIAL PRIMARY KEY,
  delivery_id     INT NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  order_item_id   INT NOT NULL REFERENCES sales_order_items(id),
  quantity_delivered NUMERIC(12,2) NOT NULL
);
```

---

## Backend Implementation

### New Routes — `/api/sales-orders`

| Method | Path | Action |
|--------|------|--------|
| GET | `/api/sales-orders` | List all orders (filter by status, customer, date) |
| GET | `/api/sales-orders/:id` | Order detail with items and delivery history |
| POST | `/api/sales-orders` | Create order |
| POST | `/api/sales-orders/from-quote/:quoteId` | Convert accepted quote → SO |
| PUT | `/api/sales-orders/:id` | Update CONFIRMED order |
| POST | `/api/sales-orders/:id/cancel` | Cancel order (releases reserved stock) |
| POST | `/api/sales-orders/:id/deliver` | Record a delivery (full or partial) |
| POST | `/api/sales-orders/:id/invoice` | Convert fulfilled SO → Invoice |

### Key Business Logic

```typescript
// On SO creation: reserve stock for all product line items
async function reserveStock(orderId: number): Promise<void>
// Updates stock_levels.quantity_reserved += ordered_qty

// On delivery recorded:
// 1. Dispatch stock (reduce on-hand, release reservation)
// 2. Update SO item quantity_delivered
// 3. Update SO status (PARTIAL or FULFILLED)
// 4. Post GL: DR COGS / CR Inventory (per item delivered)
async function recordDelivery(orderId: number, deliveryItems: DeliveryItem[]): Promise<void>

// On cancel:
// Release all reserved stock
// Cannot cancel if any delivery has been made (must do return/credit note instead)

// Convert to Invoice:
// Create invoice with all delivered-but-not-yet-invoiced lines
// Prefill from SO (customer, items, prices, tax)
```

### Partial Delivery Handling

A delivery can fulfil part of an order. The SO stays PARTIAL until all items are
fully delivered. Multiple deliveries can be made, and each delivery can be converted
to a separate invoice (for milestone billing) or held until full delivery before invoicing.

---

## Frontend Implementation

### Sales Orders Page (`/sales-orders`)

**List view:**
- Table: SO # | Customer | Date | Expected Delivery | Status | Total | Fulfilment %
- Filter by: status, customer, date range
- Progress bar showing fulfilment percentage
- Click row → Order detail

**Order Detail:**

Tab layout:
1. **Items** — ordered items with qty ordered / delivered / remaining
2. **Deliveries** — history of all deliveries made
3. **Invoices** — invoices raised from this order
4. **Timeline** — audit trail of status changes

**Record Delivery Modal:**

- For each line item: show quantity_remaining, input quantity_delivered
- Delivery date
- Notes
- Confirm → updates stock, GL, and SO status

**Convert to Invoice Button:**
- Appears when order status is PARTIAL or FULFILLED and there are un-invoiced delivered items
- Pre-fills invoice form with the unin-voiced delivered quantities

### Kanban Board View (optional)

Cards per sales order, columns: Confirmed | Processing | Partial | Fulfilled.
Drag-and-drop to move between stages.

---

## Integration Points

| Module | Connection |
|--------|-----------|
| Quotes (existing) | Convert accepted quote → Sales Order |
| Customers (Feature 07) | Customer FK |
| Inventory (Feature 08) | Stock reservation and dispatch |
| Invoices (Feature 03) | Convert fulfilled SO → Invoice |
| GL (Feature 01) | COGS and inventory GL posts on delivery |
| Tax (Feature 04) | Tax rates per line item |

---

## Implementation Steps

1. Create `sales_orders`, `sales_order_items`, `deliveries`, `delivery_items` tables
2. Build stock reservation and release service functions
3. Build sales orders API routes and controller
4. Add "Convert to Sales Order" action to accepted quote detail
5. Build sales orders list page
6. Build order detail page (4-tab layout)
7. Build "Record Delivery" modal with quantity tracking
8. Build "Convert to Invoice" action from fulfilled orders
9. Update inventory stock levels on delivery confirmation
10. Add GL posting hooks for COGS on delivery
