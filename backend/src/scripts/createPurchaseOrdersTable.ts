import { pool } from '../db'

async function createPurchaseOrdersTable() {
  const client = await pool.connect()
  
  try {
    console.log('🔄 Creating purchase orders tables...')
    
    await client.query('BEGIN')
    
    // Create purchase_orders table
    await client.query(`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id SERIAL PRIMARY KEY,
        po_number VARCHAR(50) UNIQUE NOT NULL,
        requested_by_user_id INTEGER REFERENCES users(id),
        requested_by_name VARCHAR(255),
        requested_by_title VARCHAR(255),
        vendor_id INTEGER REFERENCES vendors(vendor_id),
        vendor_invoice_number VARCHAR(100),
        project_id INTEGER REFERENCES contracts(contract_id),
        
        -- Financial details
        subtotal DECIMAL(12, 2) DEFAULT 0,
        sales_tax DECIMAL(12, 2) DEFAULT 0,
        shipping_handling DECIMAL(12, 2) DEFAULT 0,
        banking_fee DECIMAL(12, 2) DEFAULT 0,
        total_amount DECIMAL(12, 2) NOT NULL,
        
        -- Payment details
        payment_method VARCHAR(50),
        check_number VARCHAR(100),
        payment_amount DECIMAL(12, 2),
        payment_date DATE,
        
        -- Approval workflow
        status VARCHAR(50) DEFAULT 'PENDING',
        approved_by_user_id INTEGER REFERENCES users(id),
        approved_by_name VARCHAR(255),
        approved_by_title VARCHAR(255),
        approved_at TIMESTAMP,
        rejection_reason TEXT,
        
        -- Document management
        receipt_document_url TEXT,
        receipt_uploaded_at TIMESTAMP,
        
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // Create purchase_order_items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS purchase_order_items (
        id SERIAL PRIMARY KEY,
        purchase_order_id INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL,
        description TEXT NOT NULL,
        unit_price DECIMAL(12, 2) NOT NULL,
        total DECIMAL(12, 2) NOT NULL,
        line_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // Create indexes for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_po_number ON purchase_orders(po_number)
    `)
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status)
    `)
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_po_vendor ON purchase_orders(vendor_id)
    `)
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_po_requested_by ON purchase_orders(requested_by_user_id)
    `)
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_po_items_po_id ON purchase_order_items(purchase_order_id)
    `)
    
    // Create trigger to update updated_at timestamp
    await client.query(`
      CREATE OR REPLACE FUNCTION update_purchase_order_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `)
    
    await client.query(`
      DROP TRIGGER IF EXISTS trigger_update_purchase_order_updated_at ON purchase_orders
    `)
    
    await client.query(`
      CREATE TRIGGER trigger_update_purchase_order_updated_at
      BEFORE UPDATE ON purchase_orders
      FOR EACH ROW
      EXECUTE FUNCTION update_purchase_order_updated_at()
    `)
    
    await client.query('COMMIT')
    
    console.log('✅ Purchase orders tables created successfully')
    console.log('✅ Indexes created successfully')
    console.log('✅ Triggers created successfully')
    
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('❌ Error creating purchase orders tables:', error)
    throw error
  } finally {
    client.release()
  }
}

// Run if executed directly
if (require.main === module) {
  createPurchaseOrdersTable()
    .then(() => {
      console.log('✅ Database setup complete')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Database setup failed:', error)
      process.exit(1)
    })
}

export default createPurchaseOrdersTable
