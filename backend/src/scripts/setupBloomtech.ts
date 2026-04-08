/**
 * setupBloomtech.ts
 * ─────────────────
 * Complete one-shot database setup for Bloomtech ERP on Railway.
 * Safe to run on a fully empty database.
 * Creates: public schema tables → Bloomtech tenant → tenant schema → admin user.
 *
 * Run: npm run setup:bloomtech
 */

import { pool } from '../db'
import fs from 'fs'
import path from 'path'
import bcrypt from 'bcryptjs'

const COMPANY_NAME  = 'Bloomtech'
const SCHEMA_NAME   = 'bloomtech'
const ADMIN_NAME    = 'Dilantha'
const ADMIN_EMAIL   = 'dilantha@bloomtech.lk'
const ADMIN_PASS    = '729297Dmk@'

const ALL_PERMISSIONS = [
  { resource: 'projects_contracts', action: 'read'    },
  { resource: 'projects_contracts', action: 'create'  },
  { resource: 'projects_contracts', action: 'update'  },
  { resource: 'projects_contracts', action: 'delete'  },
  { resource: 'project_time',       action: 'read_all'   },
  { resource: 'project_time',       action: 'read_own'   },
  { resource: 'project_time',       action: 'create'     },
  { resource: 'project_time',       action: 'update_own' },
  { resource: 'project_time',       action: 'update_all' },
  { resource: 'project_time',       action: 'delete'     },
  { resource: 'project_time',       action: 'approve'    },
  { resource: 'quotes',       action: 'read'   },
  { resource: 'quotes',       action: 'manage' },
  { resource: 'quotes',       action: 'delete' },
  { resource: 'quotes',       action: 'send'   },
  { resource: 'payables',     action: 'read'    },
  { resource: 'payables',     action: 'create'  },
  { resource: 'payables',     action: 'update'  },
  { resource: 'payables',     action: 'delete'  },
  { resource: 'payables',     action: 'approve' },
  { resource: 'receivables',  action: 'read'    },
  { resource: 'receivables',  action: 'create'  },
  { resource: 'receivables',  action: 'update'  },
  { resource: 'receivables',  action: 'delete'  },
  { resource: 'assets',       action: 'read'    },
  { resource: 'assets',       action: 'create'  },
  { resource: 'assets',       action: 'update'  },
  { resource: 'assets',       action: 'delete'  },
  { resource: 'petty_cash',   action: 'read'    },
  { resource: 'petty_cash',   action: 'create'  },
  { resource: 'petty_cash',   action: 'update'  },
  { resource: 'petty_cash',   action: 'delete'  },
  { resource: 'debit_cards',  action: 'read'    },
  { resource: 'debit_cards',  action: 'create'  },
  { resource: 'debit_cards',  action: 'update'  },
  { resource: 'debit_cards',  action: 'delete'  },
  { resource: 'accounts',     action: 'read'    },
  { resource: 'accounts',     action: 'create'  },
  { resource: 'accounts',     action: 'update'  },
  { resource: 'accounts',     action: 'delete'  },
  { resource: 'loans',        action: 'read'    },
  { resource: 'loans',        action: 'create'  },
  { resource: 'loans',        action: 'update'  },
  { resource: 'loans',        action: 'delete'  },
  { resource: 'loans',        action: 'manage_installments' },
  { resource: 'purchase_orders', action: 'read'    },
  { resource: 'purchase_orders', action: 'create'  },
  { resource: 'purchase_orders', action: 'update'  },
  { resource: 'purchase_orders', action: 'delete'  },
  { resource: 'purchase_orders', action: 'approve' },
  { resource: 'subscriptions', action: 'read'   },
  { resource: 'subscriptions', action: 'create' },
  { resource: 'subscriptions', action: 'update' },
  { resource: 'subscriptions', action: 'delete' },
  { resource: 'employees',           action: 'read'           },
  { resource: 'employees',           action: 'read_sensitive'  },
  { resource: 'employees',           action: 'create'          },
  { resource: 'employees',           action: 'update'          },
  { resource: 'employees',           action: 'delete'          },
  { resource: 'employee_onboarding', action: 'manage' },
  { resource: 'employee_onboarding', action: 'view'   },
  { resource: 'payroll', action: 'read'          },
  { resource: 'payroll', action: 'create'        },
  { resource: 'payroll', action: 'update'        },
  { resource: 'payroll', action: 'process'       },
  { resource: 'payroll', action: 'approve'       },
  { resource: 'payroll', action: 'submit'        },
  { resource: 'payroll', action: 'admin_approve' },
  { resource: 'pto', action: 'read_all' },
  { resource: 'pto', action: 'read_own' },
  { resource: 'pto', action: 'create'   },
  { resource: 'pto', action: 'approve'  },
  { resource: 'pto', action: 'delete'   },
  { resource: 'time_entries', action: 'read_all' },
  { resource: 'time_entries', action: 'read_own' },
  { resource: 'time_entries', action: 'manage'   },
  { resource: 'time_entries', action: 'edit_own' },
  { resource: 'vendors', action: 'read'   },
  { resource: 'vendors', action: 'create' },
  { resource: 'vendors', action: 'update' },
  { resource: 'vendors', action: 'delete' },
  { resource: 'notes', action: 'read'   },
  { resource: 'notes', action: 'create' },
  { resource: 'notes', action: 'update' },
  { resource: 'notes', action: 'delete' },
  { resource: 'todos', action: 'read'   },
  { resource: 'todos', action: 'create' },
  { resource: 'todos', action: 'update' },
  { resource: 'todos', action: 'delete' },
  { resource: 'analytics', action: 'view'   },
  { resource: 'analytics', action: 'read'   },
  { resource: 'analytics', action: 'manage' },
  { resource: 'documents', action: 'read'     },
  { resource: 'documents', action: 'upload'   },
  { resource: 'documents', action: 'update'   },
  { resource: 'documents', action: 'delete'   },
  { resource: 'documents', action: 'download' },
  { resource: 'settings', action: 'manage'    },
  { resource: 'settings', action: 'view'      },
  { resource: 'settings', action: 'configure' },
  { resource: 'projects',  action: 'read'   },
  { resource: 'projects',  action: 'create' },
  { resource: 'projects',  action: 'update' },
  { resource: 'projects',  action: 'delete' },
  { resource: 'contracts', action: 'read'   },
  { resource: 'contracts', action: 'create' },
  { resource: 'contracts', action: 'update' },
  { resource: 'contracts', action: 'delete' },
]

async function runTenantSQL(client: any, schemaName: string) {
  const sqlPath = path.join(__dirname, '../databasse.sql')
  const sql = fs.readFileSync(sqlPath, 'utf-8')
  const statements = sql.split(';').filter(s => s.trim().length > 0)
  await client.query(`SET search_path TO "${schemaName}"`)
  for (const stmt of statements) {
    try {
      await client.query(stmt)
    } catch (e: any) {
      if (e.code !== '42P07' && e.code !== '42701') {
        // ignore "already exists" errors only
        console.warn(`   ⚠️  Skipped: ${e.message.split('\n')[0]}`)
      }
    }
  }
  await client.query(`SET search_path TO public`)
}

async function setup() {
  const client = await pool.connect()

  try {
    console.log('\n🚀  Bloomtech Database Setup\n')

    // ── 1. Public schema: users ───────────────────────────────────────────────
    console.log('📋 Step 1: Creating public.users...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.users (
        id                  SERIAL PRIMARY KEY,
        name                TEXT NOT NULL,
        email               TEXT UNIQUE NOT NULL,
        password_hash       TEXT NOT NULL,
        role                TEXT DEFAULT 'user',
        role_id             INTEGER,
        tenant_id           INTEGER,
        source              VARCHAR(50) DEFAULT NULL,
        password_must_change BOOLEAN DEFAULT FALSE,
        account_status      VARCHAR(20) DEFAULT 'active',
        created_at          TIMESTAMP DEFAULT now()
      );
    `)
    console.log('   ✅ public.users ready')

    // ── 2. Tenants ────────────────────────────────────────────────────────────
    console.log('📋 Step 2: Creating public.tenants...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.tenants (
        id          SERIAL PRIMARY KEY,
        name        VARCHAR(100) NOT NULL,
        schema_name VARCHAR(100) NOT NULL UNIQUE,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)
    // Add FK if missing
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'fk_users_tenant'
        ) THEN
          ALTER TABLE public.users
            ADD CONSTRAINT fk_users_tenant
            FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
        END IF;
      END $$;
    `)
    console.log('   ✅ public.tenants ready')

    // ── 3. RBAC tables ────────────────────────────────────────────────────────
    console.log('📋 Step 3: Creating RBAC tables...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.roles (
        id            SERIAL PRIMARY KEY,
        name          VARCHAR(50) NOT NULL,
        description   TEXT,
        is_system_role BOOLEAN DEFAULT FALSE,
        tenant_id     INTEGER REFERENCES public.tenants(id) ON DELETE CASCADE,
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (name, tenant_id)
      );
    `)
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.permissions (
        id          SERIAL PRIMARY KEY,
        resource    VARCHAR(50) NOT NULL,
        action      VARCHAR(50) NOT NULL,
        description TEXT,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(resource, action)
      );
    `)
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.user_roles (
        user_id  INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        role_id  INTEGER NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
        PRIMARY KEY (user_id, role_id)
      );
    `)
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.role_permissions (
        role_id       INTEGER NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
        permission_id INTEGER NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (role_id, permission_id)
      );
    `)
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.rbac_audit_log (
        id         SERIAL PRIMARY KEY,
        user_id    INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
        action     VARCHAR(100) NOT NULL,
        details    JSONB,
        ip_address VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)
    console.log('   ✅ RBAC tables ready')

    // ── 4. Seed permissions ───────────────────────────────────────────────────
    console.log('📋 Step 4: Seeding permissions...')
    for (const p of ALL_PERMISSIONS) {
      await client.query(
        `INSERT INTO public.permissions (resource, action) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [p.resource, p.action]
      )
    }
    console.log(`   ✅ ${ALL_PERMISSIONS.length} permissions seeded`)

    // ── 5. Bloomtech tenant ───────────────────────────────────────────────────
    console.log(`📋 Step 5: Creating tenant "${COMPANY_NAME}"...`)
    const existingTenant = await client.query(
      `SELECT id FROM public.tenants WHERE schema_name = $1`, [SCHEMA_NAME]
    )
    let tenantId: number
    if (existingTenant.rows.length > 0) {
      tenantId = existingTenant.rows[0].id
      console.log(`   ✅ Tenant already exists (ID: ${tenantId})`)
    } else {
      const tenantResult = await client.query(
        `INSERT INTO public.tenants (name, schema_name) VALUES ($1, $2) RETURNING id`,
        [COMPANY_NAME, SCHEMA_NAME]
      )
      tenantId = tenantResult.rows[0].id
      console.log(`   ✅ Tenant created (ID: ${tenantId})`)
    }

    // ── 6. Tenant schema + business tables ───────────────────────────────────
    console.log(`📋 Step 6: Creating schema "${SCHEMA_NAME}" with business tables...`)
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${SCHEMA_NAME}"`)
    await runTenantSQL(client, SCHEMA_NAME)
    console.log(`   ✅ Schema "${SCHEMA_NAME}" ready`)

    // ── 7. Super Admin role for Bloomtech ─────────────────────────────────────
    console.log('📋 Step 7: Creating Super Admin role...')
    const existingRole = await client.query(
      `SELECT id FROM public.roles WHERE name = 'Super Admin' AND tenant_id = $1`, [tenantId]
    )
    let roleId: number
    if (existingRole.rows.length > 0) {
      roleId = existingRole.rows[0].id
      console.log(`   ✅ Role already exists (ID: ${roleId})`)
    } else {
      const roleResult = await client.query(
        `INSERT INTO public.roles (name, description, is_system_role, tenant_id)
         VALUES ('Super Admin', 'Full access to all features', TRUE, $1) RETURNING id`,
        [tenantId]
      )
      roleId = roleResult.rows[0].id
      console.log(`   ✅ Super Admin role created (ID: ${roleId})`)
    }

    // Assign all permissions to role
    const allPerms = await client.query('SELECT id FROM public.permissions')
    for (const perm of allPerms.rows) {
      await client.query(
        `INSERT INTO public.role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [roleId, perm.id]
      )
    }
    console.log(`   ✅ ${allPerms.rows.length} permissions assigned to Super Admin`)

    // ── 8. Admin user ─────────────────────────────────────────────────────────
    console.log('📋 Step 8: Creating admin user...')
    const existingUser = await client.query(
      `SELECT id FROM public.users WHERE email = $1`, [ADMIN_EMAIL]
    )
    if (existingUser.rows.length > 0) {
      console.log(`   ✅ Admin user already exists`)
    } else {
      const passwordHash = await bcrypt.hash(ADMIN_PASS, 10)
      const userResult = await client.query(
        `INSERT INTO public.users (name, email, password_hash, tenant_id, source, password_must_change, account_status)
         VALUES ($1, $2, $3, $4, 'marketing_site', FALSE, 'active') RETURNING id`,
        [ADMIN_NAME, ADMIN_EMAIL, passwordHash, tenantId]
      )
      const userId: number = userResult.rows[0].id
      await client.query(
        `INSERT INTO public.user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [userId, roleId]
      )
      console.log(`   ✅ Admin user created (ID: ${userId})`)
    }

    // ── Done ──────────────────────────────────────────────────────────────────
    console.log('\n══════════════════════════════════════════════════')
    console.log('✅  Bloomtech setup complete!')
    console.log('══════════════════════════════════════════════════')
    console.log(`  Company   : ${COMPANY_NAME}`)
    console.log(`  Schema    : ${SCHEMA_NAME}`)
    console.log(`  Email     : ${ADMIN_EMAIL}`)
    console.log(`  Password  : ${ADMIN_PASS}`)
    console.log('══════════════════════════════════════════════════\n')

  } catch (err) {
    console.error('\n❌  Setup failed:', err)
    process.exitCode = 1
  } finally {
    client.release()
    await pool.end()
  }
}

setup()
