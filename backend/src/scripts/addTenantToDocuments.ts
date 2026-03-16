import { pool } from '../db';

async function addTenantToDocuments() {
  try {
    console.log('Adding tenant_id to documents table...');
    
    await pool.query(`
      ALTER TABLE documents
      ADD COLUMN tenant_id INTEGER,
      ADD CONSTRAINT fk_documents_tenant
      FOREIGN KEY (tenant_id) REFERENCES tenants(id);
    `);
    
    console.log('✅ tenant_id added to documents table successfully');
  } catch (error) {
    console.error('❌ Error adding tenant_id to documents table:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

addTenantToDocuments();
