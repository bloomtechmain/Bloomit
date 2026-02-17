import { pool } from '../db'

async function main() {
  // Create todos table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS todos (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
      priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
      due_date DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      
      CONSTRAINT fk_todo_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `)

  // Create todo_shares table for sharing functionality
  await pool.query(`
    CREATE TABLE IF NOT EXISTS todo_shares (
      id SERIAL PRIMARY KEY,
      todo_id INT NOT NULL,
      shared_with_user_id INT NOT NULL,
      permission VARCHAR(10) DEFAULT 'read' CHECK (permission IN ('read', 'write')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      
      CONSTRAINT fk_todo_share_todo
        FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE,
      CONSTRAINT fk_todo_share_user
        FOREIGN KEY (shared_with_user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT unique_todo_share
        UNIQUE (todo_id, shared_with_user_id)
    );
  `)

  console.log('✅ Todos tables created successfully')
}

main()
  .catch((e) => {
    console.error('❌ Error creating todos tables:', e)
    process.exitCode = 1
  })
  .finally(() => pool.end())
