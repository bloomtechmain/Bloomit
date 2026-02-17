"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
/**
 * Create employee_documents table for Phase 17
 *
 * This table stores metadata for documents uploaded by employees
 * Actual files are stored in the filesystem
 *
 * Allowed file types: PDF and JPEG only
 * File size limit: 10MB
 * ON DELETE CASCADE: Documents deleted when employee is deleted
 */
async function createEmployeeDocumentsTable() {
    const client = await db_1.pool.connect();
    try {
        console.log('Creating employee_documents table...');
        // Drop table if exists (for development)
        await client.query('DROP TABLE IF EXISTS employee_documents CASCADE');
        // Create employee_documents table
        await client.query(`
      CREATE TABLE employee_documents (
        document_id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        document_type VARCHAR(50) NOT NULL CHECK (document_type IN (
          'resume', 
          'certificate', 
          'tax_form', 
          'training', 
          'personal', 
          'other'
        )),
        document_category VARCHAR(50),
        file_name VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size INTEGER NOT NULL,
        mime_type VARCHAR(100) NOT NULL CHECK (mime_type IN (
          'application/pdf', 
          'image/jpeg'
        )),
        description TEXT,
        uploaded_by INTEGER REFERENCES employees(id),
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        CONSTRAINT valid_file_size CHECK (file_size <= 10485760)
      )
    `);
        console.log('✓ employee_documents table created');
        // Create indexes for performance
        await client.query(`
      CREATE INDEX idx_employee_documents_employee_id 
      ON employee_documents(employee_id)
    `);
        console.log('✓ Index on employee_id created');
        await client.query(`
      CREATE INDEX idx_employee_documents_uploaded_at 
      ON employee_documents(uploaded_at DESC)
    `);
        console.log('✓ Index on uploaded_at created');
        await client.query(`
      CREATE INDEX idx_employee_documents_type 
      ON employee_documents(document_type)
    `);
        console.log('✓ Index on document_type created');
        console.log('\n✅ Employee documents table setup complete!');
        console.log('\nTable structure:');
        console.log('- document_id: Serial primary key');
        console.log('- employee_id: Foreign key to employees (CASCADE DELETE)');
        console.log('- document_type: Type category (resume, certificate, etc.)');
        console.log('- file_name: Unique filename on server');
        console.log('- original_name: Original upload filename');
        console.log('- file_path: Full path to file on filesystem');
        console.log('- file_size: Size in bytes (max 10MB)');
        console.log('- mime_type: PDF or JPEG only');
        console.log('- description: Optional employee-provided description');
        console.log('- uploaded_by: Employee who uploaded the file');
        console.log('- uploaded_at: Timestamp of upload');
        console.log('- expires_at: Optional expiration date');
    }
    catch (error) {
        console.error('Error creating employee_documents table:', error);
        throw error;
    }
    finally {
        client.release();
    }
}
// Run if executed directly
if (require.main === module) {
    createEmployeeDocumentsTable()
        .then(() => {
        console.log('\n✅ Script completed successfully');
        process.exit(0);
    })
        .catch((error) => {
        console.error('\n❌ Script failed:', error);
        process.exit(1);
    });
}
exports.default = createEmployeeDocumentsTable;
