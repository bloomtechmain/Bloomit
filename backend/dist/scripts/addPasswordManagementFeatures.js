"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
async function main() {
    console.log('🔧 Adding password management features...');
    // Add password_must_change column to users table
    await db_1.pool.query(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='users' AND column_name='password_must_change'
      ) THEN
        ALTER TABLE users ADD COLUMN password_must_change BOOLEAN DEFAULT FALSE;
        COMMENT ON COLUMN users.password_must_change IS 'Flag to force password change on next login';
      END IF;
    END $$;
  `);
    console.log('✅ Added password_must_change column to users table');
    // Create password_history table
    await db_1.pool.query(`
    CREATE TABLE IF NOT EXISTS password_history (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_password_history_user 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS idx_password_history_user_id 
      ON password_history(user_id);
    
    CREATE INDEX IF NOT EXISTS idx_password_history_created_at 
      ON password_history(created_at DESC);
  `);
    console.log('✅ Created password_history table with indexes');
    console.log('🎉 Password management features added successfully!');
}
main()
    .catch((e) => {
    console.error('❌ Error adding password management features:', e);
    process.exitCode = 1;
})
    .finally(() => db_1.pool.end());
