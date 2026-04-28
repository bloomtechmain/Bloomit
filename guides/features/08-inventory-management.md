# Feature 08 — Inventory & Stock Management

**Phase:** 2 — Business Operations  
**Priority:** Medium  
**Effort:** L (6–8 weeks)

---

## What This Is

A stock management system for businesses that buy and sell physical goods. Tracks
products (SKUs), stock levels, purchase costs, sales prices, warehouse locations,
and inventory valuation. Every stock movement (purchase receipt, sales delivery,
adjustment) posts to the GL automatically.

---

## Why It Matters

Without inventory tracking, product-based businesses cannot:
- Know current stock levels or when to reorder
- Calculate Cost of Goods Sold (COGS) accurately
- Value their inventory on the Balance Sheet
- Track profit margin per product
- Prevent over-selling (selling stock you don't have)

---

## Current Gap

- No `products` or `inventory` tables
- No stock movement tracking
- COGS cannot be calculated per sale
- Inventory is missing from the Balance Sheet

---

## Database Changes

```sql
CREATE TABLE products (
  id              SERIAL PRIMARY KEY,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id),
  sku             VARCHAR(50) NOT NULL,
  name            VARCHAR(150) NOT NULL,
  description     TEXT,
  category        VARCHAR(100),
  unit_of_measure VARCHAR(20) DEFAULT 'unit',   -- unit, kg, litre, box, etc.
  cost_price      NUMERIC(15,2),                -- average purchase cost
  selling_price   NUMERIC(15,2),
  reorder_point   INT DEFAULT 0,                -- trigger low-stock alert below this
  reorder_quantity INT DEFAULT 0,
  track_inventory BOOLEAN DEFAULT TRUE,
  gl_asset_account_id    INT REFERENCES chart_of_accounts(id),  -- Inventory account
  gl_expense_account_id  INT REFERENCES chart_of_accounts(id),  -- COGS account
  gl_revenue_account_id  INT REFERENCES chart_of_accounts(id),  -- Revenue account
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, sku)
);

CREATE TABLE warehouses (
  id              SERIAL PRIMARY KEY,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id),
  name            VARCHAR(100) NOT NULL,
  address         TEXT,
  is_default      BOOLEAN DEFAULT FALSE,
  is_active       BOOLEAN DEFAULT TRUE
);

CREATE TABLE stock_levels (
  id              SERIAL PRIMARY KEY,
  product_id      INT NOT NULL REFERENCES products(id),
  warehouse_id    INT NOT NULL REFERENCES warehouses(id),
  quantity_on_hand NUMERIC(12,2) DEFAULT 0,
  quantity_reserved NUMERIC(12,2) DEFAULT 0,  -- reserved for pending sales orders
  quantity_available NUMERIC(12,2) GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, warehouse_id)
);

CREATE TABLE stock_movements (
  id              SERIAL PRIMARY KEY,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id),
  product_id      INT NOT NULL REFERENCES products(id),
  warehouse_id    INT NOT NULL REFERENCES warehouses(id),
  movement_type   VARCHAR(30) NOT NULL,   -- PURCHASE | SALE | ADJUSTMENT | TRANSFER | RETURN
  quantity        NUMERIC(12,2) NOT NULL, -- positive = in, negative = out
  unit_cost       NUMERIC(15,2),          -- cost per unit at time of movement
  total_cost      NUMERIC(15,2),
  reference       VARCHAR(50),            -- PO number, invoice number, etc.
  source_module   VARCHAR(30),            -- PURCHASE_ORDER | INVOICE | MANUAL
  source_id       INT,
  notes           TEXT,
  moved_by        INT REFERENCES users(id),
  moved_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Valuation method setting per tenant: FIFO | AVERAGE_COST | LIFO
-- Store in application_settings: 'inventory_valuation_method'
```

---

## Backend Implementation

### New Routes — `/api/inventory`

| Method | Path | Action |
|--------|------|--------|
| GET | `/api/products` | List products with current stock levels |
| POST | `/api/products` | Create product |
| PUT | `/api/products/:id` | Update product |
| GET | `/api/products/:id/movements` | Stock movement history |
| GET | `/api/products/low-stock` | Products below reorder point |
| GET | `/api/warehouses` | List warehouses |
| POST | `/api/warehouses` | Create warehouse |
| POST | `/api/inventory/adjustment` | Manual stock adjustment |
| POST | `/api/inventory/transfer` | Move stock between warehouses |
| GET | `/api/inventory/valuation` | Current stock valuation report |
| GET | `/api/inventory/reorder-report` | Products needing reorder |

### Inventory Valuation Service

```typescript
// backend/src/services/inventoryService.ts

// Weighted Average Cost (simplest, recommended default)
// New cost = (existing_qty * existing_avg_cost + new_qty * new_cost) / (existing_qty + new_qty)
async function receiveStock(productId: number, qty: number, unitCost: number): Promise<void>

// COGS calculation when stock goes out
// COGS = qty_sold * average_unit_cost_at_time_of_sale
async function dispatchStock(productId: number, qty: number): Promise<number> // returns COGS amount

// Auto-post GL when stock received (PO receipt):
// DR Inventory / CR Accounts Payable
// Auto-post GL when stock sold (invoice):
// DR COGS / CR Inventory
async function postInventoryGL(movement: StockMovement): Promise<void>
```

### Low Stock Alert (Cron Job)

Daily check: products where `quantity_on_hand <= reorder_point`.
Send notification to configured user (procurement manager).

### Integration with Purchase Orders

When a PO is marked as received:
1. Parse PO line items that have a linked product
2. Create a PURCHASE stock movement per line
3. Update stock level
4. Update product average cost
5. Post to GL: DR Inventory / CR AP

### Integration with Invoices

When an invoice is marked as sent (goods dispatched):
1. Check stock availability per product line
2. Create a SALE stock movement per line
3. Update stock level
4. Calculate COGS
5. Post to GL: DR COGS / CR Inventory

---

## Frontend Implementation

### Products Page (`/inventory/products`)

- Table: SKU | Name | Category | Stock On Hand | Available | Reorder Point | Cost | Selling Price
- Color-coded stock status: Green (healthy) | Yellow (at reorder point) | Red (out of stock)
- Click product → Product detail with movement history

### Inventory Dashboard (`/inventory`)

- Summary cards: Total SKUs | Total Stock Value | Low Stock Items | Out of Stock Items
- Low stock alerts list with "Create PO" quick action
- Recent stock movements feed
- Stock valuation breakdown by category

### Stock Adjustment Form

Used by warehouse staff for:
- Physical count corrections
- Damaged/written-off stock
- Opening stock entry (when going live)

Requires reason + approval for large adjustments.

### Product Form

- SKU, name, category, unit of measure
- GL account mappings (Inventory, COGS, Revenue — pre-filled from COA defaults)
- Reorder point and reorder quantity
- Selling price and cost price
- Toggle: Track inventory (off for services)

---

## Integration Points

| Module | Connection |
|--------|-----------|
| Purchase Orders | PO receipt triggers stock movement |
| Invoices (Feature 03) | Invoice dispatch triggers COGS and stock movement |
| Sales Orders (Feature 09) | Stock reserved on order, released on dispatch |
| GL (Feature 01) | Every movement auto-posts to Inventory and COGS accounts |
| Financial Statements (Feature 06) | Inventory on Balance Sheet; COGS on P&L |
| Tax (Feature 04) | Tax applied on inventory purchases and sales |

---

## Implementation Steps

1. Create `products`, `warehouses`, `stock_levels`, `stock_movements` tables
2. Build `inventoryService.ts` (receive, dispatch, adjust, GL posting)
3. Build products API and inventory routes
4. Add low-stock daily cron job
5. Integrate with Purchase Orders (receipt flow)
6. Integrate with Invoices (dispatch flow)
7. Build products list page with stock status indicators
8. Build inventory dashboard with KPI cards
9. Build stock adjustment form
10. Build product create/edit form with GL account mapping
