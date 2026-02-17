import { pool } from '../db'

async function main() {
  // Create notes table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notes (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL,
      title VARCHAR(200) NOT NULL,
      content TEXT,
      color VARCHAR(20) DEFAULT '#ffffff',
      is_pinned BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      
      CONSTRAINT fk_note_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `)

  // Create note_shares table for sharing functionality
  await pool.query(`
    CREATE TABLE IF NOT EXISTS note_shares (
      id SERIAL PRIMARY KEY,
      note_id INT NOT NULL,
      shared_with_user_id INT NOT NULL,
      permission VARCHAR(10) DEFAULT 'read' CHECK (permission IN ('read', 'write')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      
      CONSTRAINT fk_note_share_note
        FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
      CONSTRAINT fk_note_share_user
        FOREIGN KEY (shared_with_user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT unique_note_share
        UNIQUE (note_id, shared_with_user_id)
    );
  `)

  console.log('✅ Notes tables created successfully')
}

main()
  .catch((e) => {
    console.error('❌ Error creating notes tables:', e)
    process.exitCode = 1
  })
  .finally(() => pool.end())
