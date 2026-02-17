import { pool } from '../db'

async function completePettyCashTable() {
  const client = await pool.connect()
  
  try {
    console.log('🔧 Completing petty_cash_transactions table structure...\n')
    
    // Add all missing columns
    await client.query(`
      DO $$ 
      BEGIN
        -- Add transaction_date column
        BEGIN
          ALTER TABLE petty_cash_transactions ADD COLUMN transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
          RAISE NOTICE 'Added transaction_date column';
        EXCEPTION
          WHEN duplicate_column THEN 
            RAISE NOTICE 'transaction_date column already exists';
        END;
        
        -- Add petty_cash_account_id column with foreign key
        BEGIN
          ALTER TABLE petty_cash_transactions ADD COLUMN petty_cash_account_id INTEGER;
          RAISE NOTICE 'Added petty_cash_account_id column';
        EXCEPTION
          WHEN duplicate_column THEN 
            RAISE NOTICE 'petty_cash_account_id column already exists';
        END;
        
        -- Add source_bank_account_id column
        BEGIN
          ALTER TABLE petty_cash_transactions ADD COLUMN source_bank_account_id INTEGER;
          RAISE NOTICE 'Added source_bank_account_id column';
        EXCEPTION
          WHEN duplicate_column THEN 
            RAISE NOTICE 'source_bank_account_id column already exists';
        END;
        
        -- Add payable_id column
        BEGIN
          ALTER TABLE petty_cash_transactions ADD COLUMN payable_id INTEGER;
          RAISE NOTICE 'Added payable_id column';
        EXCEPTION
          WHEN duplicate_column THEN 
            RAISE NOTICE 'payable_id column already exists';
        END;
      END $$;
    `)
    console.log('✅ All columns verified/added')
    
    // Set default petty_cash_account_id for existing records
    const accountCheck = await client.query('SELECT id FROM petty_cash_account LIMIT 1')
    if (accountCheck.rows.length > 0) {
      const accountId = accountCheck.rows[0].id
      await client.query(`
        UPDATE petty_cash_transactions 
        SET petty_cash_account_id = $1 
        WHERE petty_cash_account_id IS NULL
      `, [accountId])
      console.log('✅ Set default petty_cash_account_id for existing records')
    }
    
    // Add foreign key constraint if not exists
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'fk_petty_cash_account' 
          AND table_name = 'petty_cash_transactions'
        ) THEN
          ALTER TABLE petty_cash_transactions 
          ADD CONSTRAINT fk_petty_cash_account 
          FOREIGN KEY (petty_cash_account_id) 
          REFERENCES petty_cash_account(id) 
          ON DELETE CASCADE;
          RAISE NOTICE 'Added foreign key constraint';
        END IF;
      END $$;
    `)
    console.log('✅ Foreign key constraint verified')
    
    // Verify the final structure
    const finalStructure = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'petty_cash_transactions' 
      ORDER BY ordinal_position
    `)
    
    console.log('\n📋 Final table structure:')
    console.table(finalStructure.rows)
    
    console.log('\n🎉 Petty cash transactions table is now complete!')
    console.log('✅ All required columns are present')
    console.log('🔄 The backend will pick up changes automatically - no restart needed')
    
  } catch (err) {
    console.error('❌ Error during fix:', err)
    throw err
  } finally {
    client.release()
    await pool.end()
  }
}

// Run if executed directly
if (require.main === module) {
  completePettyCashTable()
    .then(() => {
      console.log('\n✅ Script completed successfully')
      process.exit(0)
    })
    .catch((err) => {
      console.error('\n❌ Script failed:', err)
      process.exit(1)
    })
}

export default completePettyCashTable
