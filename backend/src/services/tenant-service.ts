
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
    // Include public so any cross-schema refs still resolve
    await client.query(`SET search_path TO "${schemaName}", public`);
    for (const statement of statements) {
      const cleanedStatement = statement.replace(/CONSTRAINT fk_.* REFERENCES .*\(id\)/g, '');
      await client.query(cleanedStatement);
    }
  } finally {
    // Always reset before returning this connection to the pool.
    // Without this, subsequent pool.query() calls on this connection
    // would look in the tenant schema instead of public, causing all
    // unqualified queries against roles/user_roles/etc. to silently
    // return wrong results.
    try { await client.query('SET search_path TO DEFAULT') } catch (_) { /* ignore */ }
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

    // 4. Upsert Super Admin role and assign it — never skip silently
    const roleResult = await client.query(`
      INSERT INTO public.roles (name, description, is_system_role)
      VALUES ('Super Admin', 'Full unrestricted system access', TRUE)
      ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `);
    const superAdminRoleId: number = roleResult.rows[0].id;

    await client.query(
      `INSERT INTO public.user_roles (user_id, role_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, role_id) DO NOTHING`,
      [userId, superAdminRoleId]
    );

    // 5. Grant every existing permission to Super Admin so the role is fully powered
    const perms = await client.query('SELECT id FROM public.permissions');
    for (const perm of perms.rows) {
      await client.query(
        `INSERT INTO public.role_permissions (role_id, permission_id)
         VALUES ($1, $2)
         ON CONFLICT (role_id, permission_id) DO NOTHING`,
        [superAdminRoleId, perm.id]
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
