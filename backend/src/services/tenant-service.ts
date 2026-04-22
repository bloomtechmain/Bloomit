
import { pool, query } from '../db';
import fs from 'fs';
import path from 'path';

const createTenantSchema = async (schemaName: string) => {
  await query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
};

const createTenantTables = async (schemaName: string) => {
  const databaseSql = fs.readFileSync(path.join(__dirname, '../databasse.sql'), 'utf-8');
  const statements = databaseSql.split(';').filter(s => s.trim().length > 0);

  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO "${schemaName}"`);
    for (const statement of statements) {
      // We need to remove foreign key constraints to public tables from this script
      const cleanedStatement = statement.replace(/CONSTRAINT fk_.* REFERENCES .*\(id\)/g, '');
      await client.query(cleanedStatement);
    }
  } finally {
    client.release();
  }
};

export const createTenant = async (tenantName: string) => {
  const schemaName = `tenant_${tenantName.toLowerCase().replace(/\s+/g, '_')}`;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      'INSERT INTO public.tenants (name, schema_name) VALUES ($1, $2) RETURNING id',
      [tenantName, schemaName]
    );
    const tenantId = result.rows[0].id;

    await createTenantSchema(schemaName);
    await createTenantTables(schemaName);

    await client.query('COMMIT');

    return { tenantId, schemaName };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Provisions a fresh tenant schema for a user who registered via the website.
 * Schema name is keyed to the user ID so it is always unique.
 * Assigns the "Super Admin" role so the user has full ERP access.
 * Updates users.tenant_id in the same transaction.
 */
export const provisionTenantForUser = async (
  userId: number,
  displayName: string
): Promise<{ tenantId: number; schemaName: string }> => {
  // Use user ID in schema name to guarantee uniqueness across tenants
  const schemaName = `tenant_u${userId}`;
  const tenantName = displayName;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Create tenants row
    const tenantResult = await client.query(
      'INSERT INTO public.tenants (name, schema_name) VALUES ($1, $2) RETURNING id',
      [tenantName, schemaName]
    );
    const tenantId: number = tenantResult.rows[0].id;

    // 2. Create schema and tables (uses pool internally — runs outside this tx)
    await createTenantSchema(schemaName);
    await createTenantTables(schemaName);

    // 3. Link user to tenant
    await client.query(
      'UPDATE public.users SET tenant_id = $1 WHERE id = $2',
      [tenantId, userId]
    );

    // 4. Assign Super Admin role
    const roleResult = await client.query(
      "SELECT id FROM public.roles WHERE name = 'Super Admin' LIMIT 1"
    );
    if (roleResult.rows.length > 0) {
      const superAdminRoleId: number = roleResult.rows[0].id;
      await client.query(
        `INSERT INTO public.user_roles (user_id, role_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, role_id) DO NOTHING`,
        [userId, superAdminRoleId]
      );
    }

    await client.query('COMMIT');
    return { tenantId, schemaName };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
