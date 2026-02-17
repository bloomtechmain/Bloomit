import { pool } from '../db'

async function fixBackendErrors() {
  const client = await pool.connect()
  
  try {
    console.log('🔧 Starting backend error fixes...\n')
    
    // ============================================
    // 1. Fix Petty Cash Tables
    // ============================================
    console.log('📦 Step 1: Fixing petty cash tables...')
    
    await client.query('BEGIN')
    
    // Ensure petty_cash_account table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS petty_cash_account (
        id SERIAL PRIMARY KEY,
        account_name VARCHAR(100) DEFAULT 'Petty Cash',
        current_balance NUMERIC(15, 2) DEFAULT 0.00,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)
    
    // Add missing columns if they don't exist
    await client.query(`
      DO $$ 
      BEGIN
        BEGIN
          ALTER TABLE petty_cash_account ADD COLUMN monthly_float_amount NUMERIC(15, 2) DEFAULT 0.00;
        EXCEPTION
          WHEN duplicate_column THEN NULL;
        END;
        BEGIN
          ALTER TABLE petty_cash_account ADD COLUMN last_replenished_date DATE;
        EXCEPTION
          WHEN duplicate_column THEN NULL;
        END;
      END $$;
    `)
    console.log('  ✅ Petty cash account table created/verified with all columns')

    // Create petty_cash_transactions table with project_id (not contract_id)
    await client.query(`
      CREATE TABLE IF NOT EXISTS petty_cash_transactions (
        id SERIAL PRIMARY KEY,
        petty_cash_account_id INTEGER REFERENCES petty_cash_account(id) ON DELETE CASCADE,
        transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('REPLENISHMENT', 'EXPENSE')),
        amount NUMERIC(15, 2) NOT NULL,
        description TEXT,
        project_id INTEGER,
        source_bank_account_id INTEGER,
        payable_id INTEGER,
        transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)
    console.log('  ✅ Petty cash transactions table created/verified')

    // Create trigger function for balance updates
    await client.query(`
      CREATE OR REPLACE FUNCTION update_petty_cash_balance()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'INSERT' THEN
          IF NEW.transaction_type = 'REPLENISHMENT' THEN
            UPDATE petty_cash_account 
            SET current_balance = current_balance + NEW.amount,
                last_replenished_date = CURRENT_DATE
            WHERE id = NEW.petty_cash_account_id;
          ELSIF NEW.transaction_type = 'EXPENSE' THEN
            UPDATE petty_cash_account 
            SET current_balance = current_balance - NEW.amount
            WHERE id = NEW.petty_cash_account_id;
          END IF;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `)
    console.log('  ✅ Petty cash trigger function created')

    // Create or replace trigger
    await client.query(`
      DROP TRIGGER IF EXISTS trg_update_petty_cash_balance ON petty_cash_transactions;
      CREATE TRIGGER trg_update_petty_cash_balance
      AFTER INSERT ON petty_cash_transactions
      FOR EACH ROW
      EXECUTE FUNCTION update_petty_cash_balance();
    `)
    console.log('  ✅ Petty cash trigger created')

    // Insert default account if doesn't exist
    const accountCheck = await client.query('SELECT * FROM petty_cash_account LIMIT 1')
    if (accountCheck.rows.length === 0) {
      await client.query(`
        INSERT INTO petty_cash_account (account_name, current_balance, monthly_float_amount)
        VALUES ('Petty Cash', 0.00, 0.00)
      `)
      console.log('  ✅ Default petty cash account created')
    }

    await client.query('COMMIT')
    console.log('✅ Petty cash tables fixed!\n')

    // ============================================
    // 2. Grant Subscriptions Permissions
    // ============================================
    console.log('🔐 Step 2: Granting subscriptions permissions...')
    
    const subPermissions = [
      { resource: 'subscriptions', action: 'read' },
      { resource: 'subscriptions', action: 'create' },
      { resource: 'subscriptions', action: 'update' },
      { resource: 'subscriptions', action: 'delete' }
    ]
    
    const subPermissionIds: number[] = []
    
    for (const perm of subPermissions) {
      const result = await client.query(
        `INSERT INTO permissions (resource, action)
         VALUES ($1, $2)
         ON CONFLICT (resource, action) DO UPDATE
         SET resource = EXCLUDED.resource
         RETURNING id`,
        [perm.resource, perm.action]
      )
      subPermissionIds.push(result.rows[0].id)
      console.log(`  ✅ Permission: ${perm.resource}:${perm.action}`)
    }
    
    // Grant to Admin, Super Admin, and Accounting roles
    const rolesResult = await client.query(
      `SELECT id, name FROM roles WHERE name IN ('Admin', 'Super Admin', 'Accounting')`
    )
    
    for (const role of rolesResult.rows) {
      for (const permId of subPermissionIds) {
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id)
           VALUES ($1, $2)
           ON CONFLICT (role_id, permission_id) DO NOTHING`,
          [role.id, permId]
        )
      }
      console.log(`  ✅ Granted subscriptions permissions to ${role.name}`)
    }
    console.log('✅ Subscriptions permissions granted!\n')

    // ============================================
    // 3. Grant Loans Permissions
    // ============================================
    console.log('🔐 Step 3: Granting loans permissions...')
    
    const loanPermissions = [
      { resource: 'loans', action: 'read' },
      { resource: 'loans', action: 'create' },
      { resource: 'loans', action: 'update' },
      { resource: 'loans', action: 'delete' },
      { resource: 'loans', action: 'manage_installments' }
    ]
    
    const loanPermissionIds: number[] = []
    
    for (const perm of loanPermissions) {
      const result = await client.query(
        `INSERT INTO permissions (resource, action)
         VALUES ($1, $2)
         ON CONFLICT (resource, action) DO UPDATE
         SET resource = EXCLUDED.resource
         RETURNING id`,
        [perm.resource, perm.action]
      )
      loanPermissionIds.push(result.rows[0].id)
      console.log(`  ✅ Permission: ${perm.resource}:${perm.action}`)
    }
    
    for (const role of rolesResult.rows) {
      for (const permId of loanPermissionIds) {
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id)
           VALUES ($1, $2)
           ON CONFLICT (role_id, permission_id) DO NOTHING`,
          [role.id, permId]
        )
      }
      console.log(`  ✅ Granted loans permissions to ${role.name}`)
    }
    console.log('✅ Loans permissions granted!\n')

    console.log('🎉 All backend error fixes completed successfully!')
    console.log('\n📋 Summary:')
    console.log('  ✅ Petty cash tables fixed (using project_id)')
    console.log('  ✅ Subscriptions permissions granted')
    console.log('  ✅ Loans permissions granted')
    console.log('\n🔄 Please restart your backend server for changes to take effect.')
    
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('❌ Error during fix:', err)
    throw err
  } finally {
    client.release()
    await pool.end()
  }
}

// Run if executed directly
if (require.main === module) {
  fixBackendErrors()
    .then(() => {
      console.log('\n✅ Script completed successfully')
      process.exit(0)
    })
    .catch((err) => {
      console.error('\n❌ Script failed:', err)
      process.exit(1)
    })
}

export default fixBackendErrors
