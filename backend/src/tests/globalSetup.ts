import { Pool, PoolClient } from 'pg'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'
import bcrypt from 'bcryptjs'

dotenv.config({ path: path.join(__dirname, '../../.env.test') })

const TEST_DB = 'bloomtech_test'
const TENANT_SCHEMA = 'tenant_test'

async function globalSetup() {
  // Connect to postgres to create the DB
  const adminPool = new Pool({
    connectionString: 'postgresql://postgres:postgres@localhost:5432/postgres'
  })
  await adminPool.query(`DROP DATABASE IF EXISTS ${TEST_DB}`)
  await adminPool.query(`CREATE DATABASE ${TEST_DB}`)
  await adminPool.end()

  const pool = new Pool({
    connectionString: `postgresql://postgres:postgres@localhost:5432/${TEST_DB}`
  })

  // Use a single dedicated client so SET search_path persists across queries
  const client: PoolClient = await pool.connect()
  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, '../databasse.sql'), 'utf-8')
    const markerIdx = schemaSql.indexOf('-- TENANT SCHEMA TEMPLATE')
    const publicSql = markerIdx >= 0 ? schemaSql.slice(0, markerIdx) : schemaSql
    // Skip to first CREATE TABLE so the comment-fragment before it doesn't corrupt the first statement
    const afterMarker = markerIdx >= 0 ? schemaSql.slice(markerIdx) : ''
    const firstCreate = afterMarker.indexOf('CREATE TABLE')
    const tenantSql = firstCreate >= 0 ? afterMarker.slice(firstCreate) : ''

    // Apply public schema (default search_path = public)
    for (const stmt of publicSql.split(';').map(s => s.trim()).filter(Boolean)) {
      try { await client.query(stmt) } catch (_) {}
    }

    // Create tenant schema and apply tenant tables on same connection
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${TENANT_SCHEMA}"`)
    await client.query(`SET search_path TO "${TENANT_SCHEMA}", public`)

    for (const stmt of tenantSql.split(';').map(s => s.trim()).filter(Boolean)) {
      try { await client.query(stmt) } catch (_) {}
    }

    // Add tenant PKs (ALTER TABLE on same connection = same schema)
    const tenantPkStmts = tenantSql.match(/ALTER TABLE \S+ ADD PRIMARY KEY[^;]+/g) || []
    for (const stmt of tenantPkStmts) {
      try { await client.query(stmt) } catch (_) {}
    }

    // Create generate_quote_number() function in tenant schema
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

    // Reset to public for remaining seed operations
    await client.query(`SET search_path TO public`)

    // Seed permissions (all permissions used across all routes)
    const permissions: [string, string][] = [
      ['vendors','read'],['vendors','create'],['vendors','update'],['vendors','delete'],
      ['employees','read'],['employees','read_sensitive'],['employees','create'],['employees','update'],['employees','delete'],
      ['projects_contracts','read'],['projects_contracts','create'],['projects_contracts','update'],['projects_contracts','delete'],
      ['quotes','read'],['quotes','manage'],['quotes','delete'],['quotes','send'],['quotes','admin'],
      ['payables','read'],['payables','create'],['payables','update'],['payables','delete'],['payables','approve'],
      ['receivables','read'],['receivables','create'],['receivables','update'],['receivables','delete'],
      ['assets','read'],['assets','create'],['assets','update'],['assets','delete'],
      ['petty_cash','read'],['petty_cash','create'],['petty_cash','update'],['petty_cash','delete'],['petty_cash','create_bill'],['petty_cash','replenish'],
      ['loans','read'],['loans','create'],['loans','update'],['loans','delete'],['loans','manage_installments'],
      ['purchase_orders','read'],['purchase_orders','create'],['purchase_orders','update'],['purchase_orders','delete'],['purchase_orders','approve'],['purchase_orders','reject'],['purchase_orders','upload_receipt'],
      ['subscriptions','read'],['subscriptions','create'],['subscriptions','update'],['subscriptions','delete'],
      ['notes','read'],['notes','create'],['notes','update'],['notes','delete'],
      ['todos','read'],['todos','create'],['todos','update'],['todos','delete'],
      ['documents','read'],['documents','upload'],['documents','update'],['documents','delete'],['documents','download'],
      ['time_entries','read_all'],['time_entries','read_own'],['time_entries','manage'],['time_entries','edit_own'],
      ['pto','read_all'],['pto','read_own'],['pto','create'],['pto','approve'],['pto','delete'],
      ['payroll','read'],['payroll','create'],['payroll','update'],['payroll','process'],['payroll','approve'],['payroll','submit'],['payroll','admin_approve'],
      ['payroll','manage_employee_data'],['payroll','view_all'],['payroll','view_own'],['payroll','view_reports'],['payroll','staff_approve'],
      ['analytics','view'],['analytics','read'],['analytics','manage'],
      ['settings','manage'],['settings','view'],['settings','configure'],
      ['accounts','read'],['accounts','create'],['accounts','update'],['accounts','delete'],
      ['debit_cards','read'],['debit_cards','create'],['debit_cards','update'],['debit_cards','delete'],
      ['projects','read'],['projects','create'],['projects','update'],['projects','delete'],
      ['contracts','read'],['contracts','create'],['contracts','update'],['contracts','delete'],
      ['employee_onboarding','manage'],['employee_onboarding','view'],
      ['project_time','read_all'],['project_time','read_own'],['project_time','create'],['project_time','update_own'],['project_time','update_all'],['project_time','delete'],['project_time','approve'],
    ]
    for (const [resource, action] of permissions) {
      await client.query(
        `INSERT INTO public.permissions (resource, action) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [resource, action]
      )
    }

    // Seed tenant
    const tenantResult = await client.query(
      `INSERT INTO public.tenants (name, schema_name) VALUES ('Test Company', $1) RETURNING id`,
      [TENANT_SCHEMA]
    )
    const tenantId = tenantResult.rows[0].id

    // Seed Super Admin role (no tenant_id column on roles table)
    const roleResult = await client.query(
      `INSERT INTO public.roles (name, description, is_system_role) VALUES ('Super Admin', 'Full access', true) RETURNING id`
    )
    const roleId = roleResult.rows[0].id

    // Assign all permissions to Super Admin role
    await client.query(`
      INSERT INTO public.role_permissions (role_id, permission_id)
      SELECT $1, id FROM public.permissions ON CONFLICT DO NOTHING
    `, [roleId])

    // Seed admin user
    const hash = await bcrypt.hash('TestPass123!', 10)
    const userResult = await client.query(
      `INSERT INTO public.users (name, email, password_hash, role, tenant_id, account_status)
       VALUES ('Test Admin', 'admin@test.com', $1, 'admin', $2, 'active') RETURNING id`,
      [hash, tenantId]
    )
    const userId = userResult.rows[0].id

    // Assign role to user
    await client.query(
      `INSERT INTO public.user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [userId, roleId]
    )
  } finally {
    client.release()
  }

  await pool.end()
  console.log(`\n✅ Test database "${TEST_DB}" ready (schema: ${TENANT_SCHEMA})\n`)
}

export default globalSetup
