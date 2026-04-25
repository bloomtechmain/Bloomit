import { pool } from '../db'

async function createQuotesTables() {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')

    // Create quotes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS quotes (
        quote_id SERIAL PRIMARY KEY,
        quote_number VARCHAR(20) UNIQUE NOT NULL,
        template_type VARCHAR(20) CHECK (template_type IN ('SERVICES', 'PRODUCTS', 'CONSULTING', 'CONSTRUCTION', 'CUSTOM')),
        company_name VARCHAR(200) NOT NULL,
        company_address TEXT,
        date_of_issue DATE NOT NULL,
        subtotal NUMERIC(12,2) NOT NULL,
        total_due NUMERIC(12,2) NOT NULL,
        notes TEXT,
        status VARCHAR(20) CHECK (status IN ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'FOLLOW_UP')) DEFAULT 'DRAFT',
        assigned_to INT,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create quote_items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS quote_items (
        item_id SERIAL PRIMARY KEY,
        quote_id INT REFERENCES quotes(quote_id) ON DELETE CASCADE,
        description VARCHAR(200) NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        unit_price NUMERIC(12,2) NOT NULL,
        total NUMERIC(12,2) NOT NULL
      )
    `)

    // Create quote_additional_services table
    await client.query(`
      CREATE TABLE IF NOT EXISTS quote_additional_services (
        service_id SERIAL PRIMARY KEY,
        quote_id INT REFERENCES quotes(quote_id) ON DELETE CASCADE,
        service_name VARCHAR(200) NOT NULL,
        price NUMERIC(12,2) NOT NULL
      )
    `)

    // Create quote_status_history table
    await client.query(`
      CREATE TABLE IF NOT EXISTS quote_status_history (
        history_id SERIAL PRIMARY KEY,
        quote_id INT REFERENCES quotes(quote_id) ON DELETE CASCADE,
        old_status VARCHAR(20),
        new_status VARCHAR(20),
        changed_by INT,
        notes TEXT,
        changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create function to generate next quote number
    await client.query(`
      CREATE OR REPLACE FUNCTION generate_quote_number()
      RETURNS VARCHAR(20) AS $$
      DECLARE
        next_num INT;
        formatted_num VARCHAR(20);
      BEGIN
        SELECT COALESCE(MAX(CAST(SUBSTRING(quote_number FROM '[0-9]+') AS INT)), 0) + 1
        INTO next_num
        FROM quotes;
        
        formatted_num := LPAD(next_num::TEXT, 7, '0');
        RETURN formatted_num;
      END;
      $$ LANGUAGE plpgsql;
    `)

    await client.query('COMMIT')
    console.log('✅ Quotes tables created successfully')
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('❌ Error creating quotes tables:', error)
    throw error
  } finally {
    client.release()
  }
}

createQuotesTables()
  .then(() => {
    console.log('Migration completed')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Migration failed:', err)
    process.exit(1)
  })
