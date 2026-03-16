/**
 * freshStart.ts
 * ─────────────
 * Wipes all tenant schemas and public data, then seeds two fresh companies.
 * Each company's first user is created with source = 'marketing_site' and is
 * assigned a per-tenant "Super Admin" role that carries every permission.
 *
 * Run: npm run fresh-start
 */

import { pool } from '../db'
import fs from 'fs'
import path from 'path'
import bcrypt from 'bcryptjs'

// ─── Full permission catalogue ───────────────────────────────────────────────
const ALL_PERMISSIONS = [
  // Projects / Contracts
  { resource: 'projects_contracts', action: 'read',        description: 'View all projects, contracts, and related details' },
  { resource: 'projects_contracts', action: 'create',      description: 'Create new projects and contracts' },
  { resource: 'projects_contracts', action: 'update',      description: 'Edit existing projects and contracts' },
  { resource: 'projects_contracts', action: 'delete',      description: 'Delete projects and contracts' },
  { resource: 'project_time',       action: 'read_all',    description: 'View time entries from all employees' },
  { resource: 'project_time',       action: 'read_own',    description: 'View only your own time entries' },
  { resource: 'project_time',       action: 'create',      description: 'Create new time entries' },
  { resource: 'project_time',       action: 'update_own',  description: 'Edit your own time entries' },
  { resource: 'project_time',       action: 'update_all',  description: 'Edit time entries from any employee' },
  { resource: 'project_time',       action: 'delete',      description: 'Delete time entries' },
  { resource: 'project_time',       action: 'approve',     description: 'Approve/reject time entries for billing' },
  // Quotes
  { resource: 'quotes', action: 'read',   description: 'View all quotes and proposals' },
  { resource: 'quotes', action: 'manage', description: 'Create and edit quotes' },
  { resource: 'quotes', action: 'delete', description: 'Delete quotes' },
  { resource: 'quotes', action: 'send',   description: 'Send quotes to clients via email' },
  // Financials
  { resource: 'payables',    action: 'read',    description: 'View accounts payable records' },
  { resource: 'payables',    action: 'create',  description: 'Create new payable entries' },
  { resource: 'payables',    action: 'update',  description: 'Edit payable records' },
  { resource: 'payables',    action: 'delete',  description: 'Delete payable records' },
  { resource: 'payables',    action: 'approve', description: 'Approve payable payments' },
  { resource: 'receivables', action: 'read',    description: 'View accounts receivable records' },
  { resource: 'receivables', action: 'create',  description: 'Create new receivable entries' },
  { resource: 'receivables', action: 'update',  description: 'Edit receivable records' },
  { resource: 'receivables', action: 'delete',  description: 'Delete receivable records' },
  { resource: 'assets',      action: 'read',    description: 'View company assets and depreciation' },
  { resource: 'assets',      action: 'create',  description: 'Register new assets' },
  { resource: 'assets',      action: 'update',  description: 'Edit asset information' },
  { resource: 'assets',      action: 'delete',  description: 'Delete asset records' },
  { resource: 'petty_cash',  action: 'read',    description: 'View petty cash transactions' },
  { resource: 'petty_cash',  action: 'create',  description: 'Record petty cash transactions' },
  { resource: 'petty_cash',  action: 'update',  description: 'Edit petty cash transactions' },
  { resource: 'petty_cash',  action: 'delete',  description: 'Delete petty cash transactions' },
  { resource: 'debit_cards', action: 'read',    description: 'View debit card transactions' },
  { resource: 'debit_cards', action: 'create',  description: 'Add debit card transactions' },
  { resource: 'debit_cards', action: 'update',  description: 'Edit card transactions' },
  { resource: 'debit_cards', action: 'delete',  description: 'Delete card transactions' },
  { resource: 'accounts',    action: 'read',    description: 'View bank account information' },
  { resource: 'accounts',    action: 'create',  description: 'Add new bank accounts' },
  { resource: 'accounts',    action: 'update',  description: 'Edit bank account details' },
  { resource: 'accounts',    action: 'delete',  description: 'Delete bank accounts' },
  { resource: 'loans',       action: 'read',    description: 'View loan information' },
  { resource: 'loans',       action: 'create',  description: 'Create new loan records' },
  { resource: 'loans',       action: 'update',  description: 'Edit loan information' },
  { resource: 'loans',       action: 'delete',  description: 'Delete loan records' },
  { resource: 'loans',       action: 'manage_installments', description: 'Manage loan installment payments' },
  { resource: 'purchase_orders', action: 'read',    description: 'View purchase orders' },
  { resource: 'purchase_orders', action: 'create',  description: 'Create new purchase orders' },
  { resource: 'purchase_orders', action: 'update',  description: 'Edit purchase orders' },
  { resource: 'purchase_orders', action: 'delete',  description: 'Delete purchase orders' },
  { resource: 'purchase_orders', action: 'approve', description: 'Approve purchase orders' },
  { resource: 'subscriptions', action: 'read',   description: 'View subscription information' },
  { resource: 'subscriptions', action: 'create', description: 'Add new subscriptions' },
  { resource: 'subscriptions', action: 'update', description: 'Edit subscription details' },
  { resource: 'subscriptions', action: 'delete', description: 'Delete subscriptions' },
  // HR
  { resource: 'employees',           action: 'read',           description: 'View basic employee information' },
  { resource: 'employees',           action: 'read_sensitive',  description: 'View salary and other sensitive data' },
  { resource: 'employees',           action: 'create',          description: 'Add new employees' },
  { resource: 'employees',           action: 'update',          description: 'Edit employee information' },
  { resource: 'employees',           action: 'delete',          description: 'Delete employee records' },
  { resource: 'employee_onboarding', action: 'manage',          description: 'Manage employee onboarding process' },
  { resource: 'employee_onboarding', action: 'view',            description: 'View onboarding status and progress' },
  { resource: 'payroll', action: 'read',          description: 'View payroll information' },
  { resource: 'payroll', action: 'create',        description: 'Create payroll entries' },
  { resource: 'payroll', action: 'update',        description: 'Edit payroll information' },
  { resource: 'payroll', action: 'process',       description: 'Process and finalize payroll' },
  { resource: 'payroll', action: 'approve',       description: 'Approve payroll for payment' },
  { resource: 'payroll', action: 'submit',        description: 'Submit payroll for processing' },
  { resource: 'payroll', action: 'admin_approve', description: 'Admin-level payroll approval' },
  { resource: 'pto', action: 'read_all', description: 'View PTO requests from all employees' },
  { resource: 'pto', action: 'read_own', description: 'View own PTO requests and balance' },
  { resource: 'pto', action: 'create',   description: 'Submit PTO requests' },
  { resource: 'pto', action: 'approve',  description: 'Approve or reject PTO requests' },
  { resource: 'pto', action: 'delete',   description: 'Delete PTO requests' },
  { resource: 'time_entries', action: 'read_all',  description: 'View time entries from all employees' },
  { resource: 'time_entries', action: 'read_own',  description: 'View own time entries' },
  { resource: 'time_entries', action: 'manage',    description: 'Full management of time entry system' },
  { resource: 'time_entries', action: 'edit_own',  description: 'Edit your own time entries' },
  // Vendors
  { resource: 'vendors', action: 'read',   description: 'View vendor information' },
  { resource: 'vendors', action: 'create', description: 'Add new vendors' },
  { resource: 'vendors', action: 'update', description: 'Edit vendor information' },
  { resource: 'vendors', action: 'delete', description: 'Delete vendor records' },
  // Collaboration
  { resource: 'notes', action: 'read',   description: 'View notes and comments' },
  { resource: 'notes', action: 'create', description: 'Create new notes' },
  { resource: 'notes', action: 'update', description: 'Edit notes' },
  { resource: 'notes', action: 'delete', description: 'Delete notes' },
  { resource: 'todos', action: 'read',   description: 'View to-do items' },
  { resource: 'todos', action: 'create', description: 'Create new to-do items' },
  { resource: 'todos', action: 'update', description: 'Edit to-do items' },
  { resource: 'todos', action: 'delete', description: 'Delete to-do items' },
  // Analytics
  { resource: 'analytics', action: 'view',   description: 'Access main analytics dashboard' },
  { resource: 'analytics', action: 'read',   description: 'View financial analytics and reports' },
  { resource: 'analytics', action: 'manage', description: 'Full analytics management and configuration' },
  // Documents
  { resource: 'documents', action: 'read',     description: 'View documents in the document bank' },
  { resource: 'documents', action: 'upload',   description: 'Upload new documents' },
  { resource: 'documents', action: 'update',   description: 'Edit document metadata' },
  { resource: 'documents', action: 'delete',   description: 'Delete documents' },
  { resource: 'documents', action: 'download', description: 'Download documents' },
  // Settings / RBAC
  { resource: 'settings', action: 'manage',    description: 'Complete access to all settings and RBAC' },
  { resource: 'settings', action: 'view',      description: 'View settings without modification' },
  { resource: 'settings', action: 'configure', description: 'Configure application-wide settings' },
  // Legacy resource names still used by some routes
  { resource: 'projects',   action: 'read',   description: 'View projects (legacy)' },
  { resource: 'projects',   action: 'create', description: 'Create projects (legacy)' },
  { resource: 'projects',   action: 'update', description: 'Edit projects (legacy)' },
  { resource: 'projects',   action: 'delete', description: 'Delete projects (legacy)' },
  { resource: 'contracts',  action: 'read',   description: 'View contracts (legacy)' },
  { resource: 'contracts',  action: 'create', description: 'Create contracts (legacy)' },
  { resource: 'contracts',  action: 'update', description: 'Edit contracts (legacy)' },
  { resource: 'contracts',  action: 'delete', description: 'Delete contracts (legacy)' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function runTenantSQL(schemaName: string) {
  const sql = fs.readFileSync(path.join(__dirname, '../databasse.sql'), 'utf-8')
  const statements = sql.split(';').filter(s => s.trim().length > 0)
  const client = await pool.connect()
  try {
    await client.query(`SET search_path TO "${schemaName}"`)
    for (const stmt of statements) {
      const clean = stmt.replace(/CONSTRAINT fk_.* REFERENCES .*\(id\)/g, '')
      await client.query(clean)
    }
  } finally {
    client.release()
  }
}

async function createCompany(
  client: any,
  companyName: string,
  schemaName: string,
  adminName: string,
  adminEmail: string,
  adminPassword: string
) {
  // 1. Tenant row
  const tenantResult = await client.query(
    `INSERT INTO public.tenants (name, schema_name) VALUES ($1, $2) RETURNING id`,
    [companyName, schemaName]
  )
  const tenantId: number = tenantResult.rows[0].id

  // 2. Tenant schema + tables (done outside the main transaction — DDL is auto-committed per session in psql, but PostgreSQL supports transactional DDL; the tenant service already handles this separately)
  await client.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`)
  await runTenantSQL(schemaName)
  console.log(`   ✅ Schema "${schemaName}" created with all tables`)

  // 3. Ensure roles.tenant_id column exists
  await client.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='roles' AND column_name='tenant_id'
      ) THEN
        ALTER TABLE public.roles ADD COLUMN tenant_id INTEGER REFERENCES public.tenants(id) ON DELETE CASCADE;
      END IF;
    END $$;
  `)

  // 4. Super Admin role for this tenant
  const roleResult = await client.query(
    `INSERT INTO public.roles (name, description, is_system_role, tenant_id)
     VALUES ('Super Admin', 'Full access to all features and settings', TRUE, $1)
     RETURNING id`,
    [tenantId]
  )
  const roleId: number = roleResult.rows[0].id

  // 5. Assign every permission to Super Admin role
  const allPerms = await client.query('SELECT id FROM public.permissions')
  for (const perm of allPerms.rows) {
    await client.query(
      `INSERT INTO public.role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [roleId, perm.id]
    )
  }
  console.log(`   ✅ Super Admin role created with ${allPerms.rows.length} permissions`)

  // 6. Super user — source = 'marketing_site'
  const passwordHash = await bcrypt.hash(adminPassword, 10)
  const userResult = await client.query(
    `INSERT INTO public.users (name, email, password_hash, tenant_id, source, password_must_change, account_status)
     VALUES ($1, $2, $3, $4, 'marketing_site', FALSE, 'active')
     RETURNING id`,
    [adminName, adminEmail, passwordHash, tenantId]
  )
  const userId: number = userResult.rows[0].id

  // 7. Assign Super Admin role to user
  await client.query(
    `INSERT INTO public.user_roles (user_id, role_id) VALUES ($1, $2)`,
    [userId, roleId]
  )
  console.log(`   ✅ Super user created  email: ${adminEmail}  password: ${adminPassword}  user_id: ${userId}`)

  return { tenantId, schemaName, userId, roleId }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function freshStart() {
  const client = await pool.connect()

  try {
    console.log('\n🚀  Starting fresh database setup...\n')

    // ── STEP 1: Drop all existing tenant schemas ──────────────────────────────
    console.log('🗑️   Step 1: Dropping all tenant schemas...')
    const tenantRows = await client.query(
      'SELECT schema_name FROM public.tenants'
    )
    for (const row of tenantRows.rows) {
      await client.query(`DROP SCHEMA IF EXISTS "${row.schema_name}" CASCADE`)
      console.log(`   Dropped: ${row.schema_name}`)
    }

    // ── STEP 2: Wipe all public data (FK-safe order) ──────────────────────────
    console.log('\n🗑️   Step 2: Clearing all public tables...')
    const tablesToWipe = [
      'public.rbac_audit_log',
      'public.user_roles',
      'public.role_permissions',
      'public.roles',
      'public.permissions',
      'public.users',
      'public.tenants',
    ]
    // Also wipe password_history if it exists
    const pwHistExists = await client.query(
      `SELECT 1 FROM information_schema.tables
       WHERE table_schema='public' AND table_name='password_history'`
    )
    if (pwHistExists.rows.length > 0) {
      await client.query('TRUNCATE public.password_history CASCADE')
      console.log('   Truncated: public.password_history')
    }

    for (const table of tablesToWipe) {
      await client.query(`TRUNCATE ${table} RESTART IDENTITY CASCADE`)
      console.log(`   Truncated: ${table}`)
    }

    // ── STEP 3: Add source column to users ────────────────────────────────────
    console.log('\n➕  Step 3: Ensuring public.users.source column exists...')
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema='public' AND table_name='users' AND column_name='source'
        ) THEN
          ALTER TABLE public.users ADD COLUMN source VARCHAR(50) DEFAULT NULL;
          COMMENT ON COLUMN public.users.source IS 'Sign-up origin: marketing_site | internal | null';
        END IF;
      END $$;
    `)
    console.log('   ✅ source column ready')

    // ── STEP 4: Seed all permissions ─────────────────────────────────────────
    console.log('\n➕  Step 4: Seeding permissions...')
    for (const perm of ALL_PERMISSIONS) {
      await client.query(
        `INSERT INTO public.permissions (resource, action, description)
         VALUES ($1, $2, $3)
         ON CONFLICT (resource, action) DO NOTHING`,
        [perm.resource, perm.action, perm.description]
      )
    }
    console.log(`   ✅ ${ALL_PERMISSIONS.length} permissions inserted`)

    // ── STEP 5: Create Company A ──────────────────────────────────────────────
    console.log('\n🏢  Step 5: Creating Company A...')
    const companyA = await createCompany(
      client,
      'Company A',
      'tenant_company_a',
      'Admin A',
      'admin@companya.com',
      'CompanyA@123'
    )

    // ── STEP 6: Create Company B ──────────────────────────────────────────────
    console.log('\n🏢  Step 6: Creating Company B...')
    const companyB = await createCompany(
      client,
      'Company B',
      'tenant_company_b',
      'Admin B',
      'admin@companyb.com',
      'CompanyB@123'
    )

    // ── Summary ───────────────────────────────────────────────────────────────
    console.log('\n══════════════════════════════════════════════════')
    console.log('✅  Fresh start complete!\n')
    console.log('Company A')
    console.log(`  Schema    : tenant_company_a`)
    console.log(`  Tenant ID : ${companyA.tenantId}`)
    console.log(`  Email     : admin@companya.com`)
    console.log(`  Password  : CompanyA@123`)
    console.log(`  Source    : marketing_site  (Super Admin)`)
    console.log()
    console.log('Company B')
    console.log(`  Schema    : tenant_company_b`)
    console.log(`  Tenant ID : ${companyB.tenantId}`)
    console.log(`  Email     : admin@companyb.com`)
    console.log(`  Password  : CompanyB@123`)
    console.log(`  Source    : marketing_site  (Super Admin)`)
    console.log('══════════════════════════════════════════════════\n')

  } catch (err) {
    console.error('\n❌  Fresh start failed:', err)
    process.exitCode = 1
  } finally {
    client.release()
    await pool.end()
  }
}

freshStart()
