"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
async function main() {
    console.log('🔧 Altering RBAC schema for multiple roles per user...');
    // Create user_roles junction table
    await db_1.pool.query(`
    CREATE TABLE IF NOT EXISTS user_roles (
      user_id INT NOT NULL,
      role_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, role_id),
      CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
    );
  `);
    console.log('✅ user_roles junction table created');
    // Migrate existing role_id data to user_roles table
    await db_1.pool.query(`
    INSERT INTO user_roles (user_id, role_id)
    SELECT id, role_id 
    FROM users 
    WHERE role_id IS NOT NULL
    ON CONFLICT DO NOTHING;
  `);
    console.log('✅ Migrated existing role assignments to user_roles table');
    // Drop role_id column from users table
    await db_1.pool.query(`
    DO $$ 
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='users' AND column_name='role_id'
      ) THEN
        ALTER TABLE users DROP COLUMN role_id;
      END IF;
    END $$;
  `);
    console.log('✅ Removed role_id column from users table');
    console.log('🎉 RBAC schema updated successfully for multiple roles!');
}
main()
    .catch((e) => {
    console.error('❌ Error altering RBAC schema:', e);
    process.exitCode = 1;
})
    .finally(() => db_1.pool.end());
