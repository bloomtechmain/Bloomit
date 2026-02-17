import { pool } from '../db'

async function createDocumentsTable() {
  try {
    console.log('📄 Creating documents table...')
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        document_name VARCHAR(255) NOT NULL,
        original_filename VARCHAR(255) NOT NULL,
        file_type VARCHAR(100) NOT NULL,
        file_size INTEGER NOT NULL,
        file_data BYTEA NOT NULL,
        uploaded_by INTEGER NOT NULL,
        upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        description TEXT,
        CONSTRAINT fk_documents_user
          FOREIGN KEY (uploaded_by) REFERENCES users(id)
      )
    `)
    
    console.log('✅ Documents table created successfully')
  } catch (error) {
    console.error('❌ Error creating documents table:', error)
    throw error
  } finally {
    await pool.end()
  }
}

createDocumentsTable()
