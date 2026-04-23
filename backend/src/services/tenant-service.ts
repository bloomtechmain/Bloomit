
import { pool, query } from '../db';
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger';

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
      try {
        await client.query(cleanedStatement);
      } catch (err: any) {
        // Skip "already exists" and "column already exists" — these are safe
        if (['42P07', '42701', '42710', '42P16', '23505'].includes(err.code)) continue;
        // Log unexpected errors but keep going so one bad statement
        // does not abort the entire schema setup
        logger.error(`[createTenantTables] statement failed (${err.code}): ${err.message}`);
      }
    }
  } finally {
    // Always reset before returning this connection to the pool.
    // Without this, subsequent pool.query() calls on this connection
    // would look in the tenant schema instead of public.
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
 * Safe to call multiple times — idempotent.
 */
export const provisionTenantForUser = async (
  userId: number,
  displayName: string
): Promise<{ tenantId: number; schemaName: string }> => {
  const schemaName = `tenant_u${userId}`;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // If the tenant row already exists (from a previous partial attempt), reuse it
    let tenantId: number;
    const existing = await client.query(
      'SELECT id FROM public.tenants WHERE schema_name = $1',
      [schemaName]
    );
    if (existing.rows.length > 0) {
      tenantId = existing.rows[0].id;
    } else {
      const tenantResult = await client.query(
        'INSERT INTO public.tenants (name, schema_name) VALUES ($1, $2) RETURNING id',
        [displayName, schemaName]
      );
      tenantId = tenantResult.rows[0].id;
    }

    // Create schema + tables (runs outside this tx; resilient to partial runs)
    await createTenantSchema(schemaName);
    await createTenantTables(schemaName);

    // Link user to tenant
    await client.query(
      'UPDATE public.users SET tenant_id = $1 WHERE id = $2',
      [tenantId, userId]
    );

    // Upsert Super Admin role — never skip silently
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

    // Ensure all critical permissions exist — Super Admin must always get settings:manage
    // regardless of whether the seed script has run on this deployment.
    const criticalPermissions = [
      { resource: 'settings',  action: 'manage',    description: 'Manage roles, permissions, and system settings' },
      { resource: 'settings',  action: 'view',      description: 'View system settings' },
      { resource: 'settings',  action: 'configure', description: 'Configure application-wide settings' },
    ];
    for (const p of criticalPermissions) {
      await client.query(
        `INSERT INTO public.permissions (resource, action, description)
         VALUES ($1, $2, $3)
         ON CONFLICT (resource, action) DO NOTHING`,
        [p.resource, p.action, p.description]
      );
    }

    // Grant every existing permission to Super Admin
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

/**
 * Provisions tenants for all website-registered users who don't have one yet.
 * Runs at server startup so users are ready before they even log in.
 * Website users are identified by company_type IS NOT NULL (set by the website form).
 */
export const provisionPendingWebsiteUsers = async (): Promise<void> => {
  try {
    const result = await pool.query(`
      SELECT id, name
      FROM public.users
      WHERE tenant_id IS NULL
        AND company_type IS NOT NULL
        AND (account_status IS NULL OR account_status = 'active')
    `);

    if (result.rows.length === 0) {
      logger.system('✅ No pending website users to provision');
      return;
    }

    logger.system(`🏗️  Provisioning ${result.rows.length} pending website user(s)...`);

    for (const user of result.rows) {
      try {
        const { tenantId, schemaName } = await provisionTenantForUser(user.id, user.name);
        logger.system(`✅ Provisioned user ${user.id} (${user.name}) → ${schemaName} (tenant ${tenantId})`);
      } catch (err) {
        logger.error(`❌ Failed to provision user ${user.id} (${user.name}):`, err);
      }
    }
  } catch (err) {
    logger.error('❌ provisionPendingWebsiteUsers failed:', err);
  }
};
