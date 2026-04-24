"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
async function main() {
    console.log('🔧 Creating RBAC tables...');
    // Create users table with full schema (must exist before roles FK references it)
    await db_1.pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id                   SERIAL PRIMARY KEY,
      name                 TEXT NOT NULL,
      email                TEXT UNIQUE NOT NULL,
      password_hash        TEXT NOT NULL,
      role                 TEXT DEFAULT 'user',
      role_id              INTEGER,
      tenant_id            INTEGER,
      source               VARCHAR(50) DEFAULT NULL,
      password_must_change BOOLEAN DEFAULT FALSE,
      account_status       VARCHAR(20) DEFAULT 'active',
      company_type         VARCHAR(50),
      plan_type            VARCHAR(50),
      purchase_date        DATE,
      created_at           TIMESTAMP DEFAULT now()
    );
  `);
    // Patch existing users tables that may be missing columns
    await db_1.pool.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS role_id              INTEGER,
      ADD COLUMN IF NOT EXISTS tenant_id            INTEGER,
      ADD COLUMN IF NOT EXISTS source               VARCHAR(50) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS password_must_change BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS account_status       VARCHAR(20) DEFAULT 'active',
      ADD COLUMN IF NOT EXISTS company_type         VARCHAR(50),
      ADD COLUMN IF NOT EXISTS plan_type            VARCHAR(50),
      ADD COLUMN IF NOT EXISTS purchase_date        DATE;
  `);
    console.log('✅ Users table ready');
    // Create tenants table
    await db_1.pool.query(`
    CREATE TABLE IF NOT EXISTS public.tenants (
      id          SERIAL PRIMARY KEY,
      name        VARCHAR(100) NOT NULL,
      schema_name VARCHAR(100) NOT NULL UNIQUE,
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
    console.log('✅ Tenants table created');
    // Create roles table
    await db_1.pool.query(`
    CREATE TABLE IF NOT EXISTS roles (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) UNIQUE NOT NULL,
      description TEXT,
      is_system_role BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
    console.log('✅ Roles table created');
    // Create permissions table
    await db_1.pool.query(`
    CREATE TABLE IF NOT EXISTS permissions (
      id SERIAL PRIMARY KEY,
      resource VARCHAR(50) NOT NULL,
      action VARCHAR(20) NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(resource, action)
    );
  `);
    console.log('✅ Permissions table created');
    // Create role_permissions mapping table
    await db_1.pool.query(`
    CREATE TABLE IF NOT EXISTS role_permissions (
      role_id INT NOT NULL,
      permission_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (role_id, permission_id),
      CONSTRAINT fk_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
      CONSTRAINT fk_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
    );
  `);
    console.log('✅ Role-Permissions mapping table created');
    // Add role_id column to users table if not exists
    await db_1.pool.query(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='users' AND column_name='role_id'
      ) THEN
        ALTER TABLE users ADD COLUMN role_id INT REFERENCES roles(id);
      END IF;
    END $$;
  `);
    console.log('✅ Users table updated with role_id');
    // Create user_roles join table (many-to-many users <-> roles)
    await db_1.pool.query(`
    CREATE TABLE IF NOT EXISTS user_roles (
      user_id  INT NOT NULL,
      role_id  INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, role_id),
      CONSTRAINT fk_ur_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_ur_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
    );
  `);
    console.log('✅ User-Roles mapping table created');
    // Create audit log table for tracking permission changes
    await db_1.pool.query(`
    CREATE TABLE IF NOT EXISTS rbac_audit_log (
      id SERIAL PRIMARY KEY,
      user_id INT,
      action VARCHAR(100) NOT NULL,
      details JSONB,
      ip_address VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `);
    console.log('✅ RBAC audit log table created');
    // Create active_sessions table
    await db_1.pool.query(`
    CREATE TABLE IF NOT EXISTS public.active_sessions (
      id            SERIAL PRIMARY KEY,
      user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      session_token UUID NOT NULL DEFAULT gen_random_uuid(),
      expires_at    TIMESTAMP NOT NULL,
      ip_address    VARCHAR(100),
      user_agent    TEXT,
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
    console.log('✅ Active sessions table created');
    console.log('🎉 All RBAC tables created successfully!');
}
main()
    .catch((e) => {
    console.error('❌ Error creating RBAC tables:', e);
    process.exitCode = 1;
})
    .finally(() => db_1.pool.end());
