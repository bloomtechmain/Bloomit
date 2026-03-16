
import { pool } from '../db';

const setupMultiTenancy = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Uncomment the following lines to reset the database during development
    // await client.query('DROP TABLE IF EXISTS public.tenants CASCADE;');

    // 1. Create the tenants table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.tenants (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        schema_name VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Table "public.tenants" created or already exists.');

    // 2. Add tenant_id to the users table
    const usersTableInfo = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'tenant_id';
    `);

    if (usersTableInfo.rows.length === 0) {
        await client.query(`
          ALTER TABLE public.users
          ADD COLUMN tenant_id INTEGER;
        `);
        console.log('Column "tenant_id" added to "public.users".');

        await client.query(`
          ALTER TABLE public.users
          ADD CONSTRAINT fk_users_tenant
          FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
        `);
        console.log('Foreign key "fk_users_tenant" added to "public.users".');
    } else {
        console.log('Column "tenant_id" already exists in "public.users".');
    }

    await client.query('COMMIT');
    console.log('Multi-tenancy setup complete.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error setting up multi-tenancy:', error);
  } finally {
    client.release();
  }
};

setupMultiTenancy();
