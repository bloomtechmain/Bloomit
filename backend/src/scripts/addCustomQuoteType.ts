import { pool } from '../db'

async function addCustomQuoteType() {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')

    console.log('Adding CUSTOM quote type to database...')

    // Drop existing constraint
    await client.query(`
      ALTER TABLE quotes 
      DROP CONSTRAINT IF EXISTS quotes_template_type_check
    `)

    // Add new constraint with all supported template types
    await client.query(`
      ALTER TABLE quotes
      ADD CONSTRAINT quotes_template_type_check
      CHECK (template_type IN ('SERVICES', 'PRODUCTS', 'CONSULTING', 'CONSTRUCTION', 'CUSTOM'))
    `)

    await client.query('COMMIT')
    console.log('✅ CUSTOM quote type added successfully')
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('❌ Error adding CUSTOM quote type:', error)
    throw error
  } finally {
    client.release()
  }
}

addCustomQuoteType()
  .then(() => {
    console.log('Migration completed')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Migration failed:', err)
    process.exit(1)
  })
