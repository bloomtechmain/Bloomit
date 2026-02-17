import { pool } from '../db'

async function main() {
  console.log('🔧 Creating RBAC tables...')

  // Create roles table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS roles (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) UNIQUE NOT NULL,
      description TEXT,
      is_system_role BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `)
  console.log('✅ Roles table created')

  // Create permissions table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS permissions (
      id SERIAL PRIMARY KEY,
      resource VARCHAR(50) NOT NULL,
      action VARCHAR(20) NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(resource, action)
    );
  `)
  console.log('✅ Permissions table created')

  // Create role_permissions mapping table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS role_permissions (
      role_id INT NOT NULL,
      permission_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (role_id, permission_id),
      CONSTRAINT fk_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
      CONSTRAINT fk_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
    );
  `)
  console.log('✅ Role-Permissions mapping table created')

  // Add role_id column to users table if not exists
  await pool.query(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='users' AND column_name='role_id'
      ) THEN
        ALTER TABLE users ADD COLUMN role_id INT REFERENCES roles(id);
      END IF;
    END $$;
  `)
  console.log('✅ Users table updated with role_id')

  // Create audit log table for tracking permission changes
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rbac_audit_log (
      id SERIAL PRIMARY KEY,
      user_id INT,
      action VARCHAR(100) NOT NULL,
      details JSONB,
      ip_address VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `)
  console.log('✅ RBAC audit log table created')

  console.log('🎉 All RBAC tables created successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error creating RBAC tables:', e)
    process.exitCode = 1
  })
  .finally(() => pool.end())
