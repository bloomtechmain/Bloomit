import { pool } from '../db';

async function restructureForMultiSchema() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Step 1: Creating the public.tenants table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.tenants (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        schem-name VARCHAR(63) NOT NULL UNIQUE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ public.tenants table created.');

    console.log('Step 2: Modifying the public.users table...');
    // First, drop the old tenant_id foreign key if it exists from the previous approach
    try {
      await client.query('ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_tenant_id_fkey;');
    } catch (e) {
        // Ignore error if constraint does not exist
        console.log('users_tenant_id_fkey constraint did not exist, skipping drop.')
    }

    // Add the new tenant_id column, which will link to the new public.tenants table
    const columnCheck = await client.query(
        `SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'tenant_id'`
    );
    if (columnCheck.rows.length === 0) {
        await client.query('ALTER TABLE public.users ADD COLUMN tenant_id INTEGER;');
    }
    await client.query(`
      ALTER TABLE public.users
      ADD CONSTRAINT users_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
    `);
    console.log('✅ public.users table modified with new tenant_id foreign key.');

    console.log("Step 3: Removing redundant tenant_id columns from other public tables...");
    const tablesToClean = [
        'roles', 'company_bank_accounts', 'assets', 'contracts', 'receivables',
        'payables', 'contract_items', 'projects', 'new_projects', 'petty_cash_account',
        'petty_cash_transactions', 'payment_payables', 'debit_cards', 'documents', 'employees'
    ];

    for (const tableName of tablesToClean) {
        try {
            await client.query(`ALTER TABLE public.${tableName} DROP COLUMN IF EXISTS tenant_id;`);
            console.log(`  - Removed tenant_id from public.${tableName}`);
        } catch(e: any) {
            if (e.code === '42703' || e.code === '42P01') { // column does not exist or table does not exist
                console.log(`  - Skipping ${tableName}, it or the tenant_id column does not exist.`);
            } else {
                throw e;
            }
        }
    }
    console.log('✅ Redundant columns removed.');


    await client.query('COMMIT');
    console.log('✨ Database restructuring for multi-schema tenancy complete!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error during database restructuring:', error);
    throw error;
  } finally {
    client.release();
  }
}

restructureForMultiSchema().finally(() => pool.end());
