
import { pool, query } from '../db';
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger';

const createTenantSchema = async (schemaName: string) => {
  await query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
};

const createTenantTables = async (schemaName: string) => {
  const databaseSql = fs.readFileSync(path.join(__dirname, '../../src/databasse.sql'), 'utf-8');
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

    // Ensure critical permissions exist and grant all permissions to Super Admin.
    // Uses SELECT-first-then-INSERT to avoid relying on ON CONFLICT (resource, action)
    // which requires a unique constraint that may be absent on older deployments.
    // Grant critical permissions using simple sequential SELECT-then-INSERT
    // (avoids ON CONFLICT on permissions table which needs a unique constraint)
    const criticalPerms = [
      { resource: 'settings', action: 'manage',    description: 'Manage roles, permissions, and system settings' },
      { resource: 'settings', action: 'view',      description: 'View system settings' },
      { resource: 'settings', action: 'configure', description: 'Configure application-wide settings' },
    ];
    for (const p of criticalPerms) {
      const existing = await client.query(
        `SELECT id FROM public.permissions WHERE resource = $1 AND action = $2 LIMIT 1`,
        [p.resource, p.action]
      );
      let permId: number;
      if (existing.rows.length > 0) {
        permId = existing.rows[0].id;
      } else {
        const inserted = await client.query(
          `INSERT INTO public.permissions (resource, action, description) VALUES ($1, $2, $3) RETURNING id`,
          [p.resource, p.action, p.description]
        );
        permId = inserted.rows[0].id;
      }
      await client.query(
        `INSERT INTO public.role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT (role_id, permission_id) DO NOTHING`,
        [superAdminRoleId, permId]
      );
    }

    // Grant every existing permission to Super Admin
    const perms = await client.query('SELECT id FROM public.permissions');
    for (const perm of perms.rows) {
      await client.query(
        `INSERT INTO public.role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT (role_id, permission_id) DO NOTHING`,
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
 * Ensures every website-registered user has the Super Admin role in user_roles.
 * Runs at every server startup — catches users whose tenant was provisioned
 * but whose role assignment was missed (e.g. partial previous runs).
 */
export const ensureWebsiteUsersHaveSuperAdmin = async (): Promise<void> => {
  try {
    // Find website users who have no role assigned at all
    const missing = await pool.query(`
      SELECT u.id, u.name
      FROM public.users u
      LEFT JOIN public.user_roles ur ON ur.user_id = u.id
      WHERE u.company_type IS NOT NULL
        AND ur.user_id IS NULL
    `);

    if (missing.rows.length === 0) {
      logger.system('✅ All website users already have roles assigned');
      return;
    }

    logger.system(`🔑 Assigning Super Admin role to ${missing.rows.length} website user(s) missing a role...`);

    // Upsert Super Admin role
    const roleResult = await pool.query(`
      INSERT INTO public.roles (name, description, is_system_role)
      VALUES ('Super Admin', 'Full unrestricted system access', TRUE)
      ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `);
    const superAdminRoleId: number = roleResult.rows[0].id;

    for (const user of missing.rows) {
      await pool.query(
        `INSERT INTO public.user_roles (user_id, role_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, role_id) DO NOTHING`,
        [user.id, superAdminRoleId]
      );
      logger.system(`✅ Assigned Super Admin to user ${user.id} (${user.name})`);
    }
  } catch (err) {
    logger.error('❌ ensureWebsiteUsersHaveSuperAdmin failed:', err);
  }
};

/**
 * Ensures the Super Admin role has every permission in the permissions table.
 * Also guarantees critical permissions (settings:manage etc.) exist first.
 * Runs at every startup — idempotent. Fixes users who have the role assigned
 * but whose role_permissions were never populated.
 */
export const ensureSuperAdminHasAllPermissions = async (): Promise<void> => {
  try {
    // Use a PL/pgSQL block so we can SELECT-first-then-INSERT for the critical
    // permissions without relying on ON CONFLICT (resource, action), which
    // requires a unique constraint that may be missing on older deployments.
    await pool.query(`
      DO $$
      DECLARE
        v_role_id INTEGER;
        v_perm_id INTEGER;
      BEGIN
        SELECT id INTO v_role_id FROM public.roles WHERE name = 'Super Admin';
        IF v_role_id IS NULL THEN RETURN; END IF;

        -- settings:manage
        SELECT id INTO v_perm_id FROM public.permissions WHERE resource = 'settings' AND action = 'manage' LIMIT 1;
        IF v_perm_id IS NULL THEN
          INSERT INTO public.permissions (resource, action, description)
          VALUES ('settings', 'manage', 'Manage roles, permissions, and system settings')
          RETURNING id INTO v_perm_id;
        END IF;
        INSERT INTO public.role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT (role_id, permission_id) DO NOTHING;

        -- settings:view
        SELECT id INTO v_perm_id FROM public.permissions WHERE resource = 'settings' AND action = 'view' LIMIT 1;
        IF v_perm_id IS NULL THEN
          INSERT INTO public.permissions (resource, action, description)
          VALUES ('settings', 'view', 'View system settings')
          RETURNING id INTO v_perm_id;
        END IF;
        INSERT INTO public.role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT (role_id, permission_id) DO NOTHING;

        -- settings:configure
        SELECT id INTO v_perm_id FROM public.permissions WHERE resource = 'settings' AND action = 'configure' LIMIT 1;
        IF v_perm_id IS NULL THEN
          INSERT INTO public.permissions (resource, action, description)
          VALUES ('settings', 'configure', 'Configure application-wide settings')
          RETURNING id INTO v_perm_id;
        END IF;
        INSERT INTO public.role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT (role_id, permission_id) DO NOTHING;

        -- Bulk-grant every other permission already in the table
        INSERT INTO public.role_permissions (role_id, permission_id)
        SELECT v_role_id, p.id FROM public.permissions p
        ON CONFLICT (role_id, permission_id) DO NOTHING;
      END $$;
    `);

    const count = await pool.query('SELECT COUNT(*) FROM public.role_permissions rp JOIN public.roles r ON r.id = rp.role_id WHERE r.name = $1', ['Super Admin']);
    logger.system(`✅ Super Admin permissions synced (${count.rows[0].count} total)`);
  } catch (err) {
    logger.error('❌ ensureSuperAdminHasAllPermissions failed:', err);
  }
};

/**
 * Creates (or replaces) a PostgreSQL trigger on public.users that immediately
 * assigns the Super Admin role whenever a website-registered user is inserted
 * (company_type IS NOT NULL). Runs at every startup — idempotent.
 */
export const ensureSuperAdminTrigger = async (): Promise<void> => {
  try {
    await pool.query(`
      CREATE OR REPLACE FUNCTION public.assign_super_admin_on_register()
      RETURNS TRIGGER AS $$
      DECLARE
        v_role_id INTEGER;
      BEGIN
        IF NEW.company_type IS NOT NULL THEN
          SELECT id INTO v_role_id FROM public.roles WHERE name = 'Super Admin';
          IF v_role_id IS NOT NULL THEN
            INSERT INTO public.user_roles (user_id, role_id)
            VALUES (NEW.id, v_role_id)
            ON CONFLICT (user_id, role_id) DO NOTHING;
          END IF;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await pool.query(`
      DROP TRIGGER IF EXISTS trg_assign_super_admin ON public.users;
    `);

    await pool.query(`
      CREATE TRIGGER trg_assign_super_admin
        AFTER INSERT ON public.users
        FOR EACH ROW EXECUTE FUNCTION public.assign_super_admin_on_register();
    `);

    logger.system('✅ Super Admin trigger installed on public.users');
  } catch (err) {
    logger.error('❌ ensureSuperAdminTrigger failed:', err);
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
