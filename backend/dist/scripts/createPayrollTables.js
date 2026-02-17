"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
async function createPayrollTables() {
    try {
        console.log('Creating payroll tables...');
        // Create payslips table
        await db_1.pool.query(`
      CREATE TABLE IF NOT EXISTS payslips (
        payslip_id SERIAL PRIMARY KEY,
        employee_id INT NOT NULL,
        payslip_month INT NOT NULL CHECK (payslip_month >= 1 AND payslip_month <= 12),
        payslip_year INT NOT NULL CHECK (payslip_year >= 2000 AND payslip_year <= 2100),
        basic_salary NUMERIC(15,2) NOT NULL,
        allowances JSONB DEFAULT '{}',
        gross_salary NUMERIC(15,2) NOT NULL,
        epf_employee_deduction NUMERIC(15,2) DEFAULT 0,
        epf_employee_rate NUMERIC(5,2) DEFAULT 8.00,
        other_deductions JSONB DEFAULT '{}',
        total_deductions NUMERIC(15,2) DEFAULT 0,
        epf_employer_contribution NUMERIC(15,2) DEFAULT 0,
        etf_employer_contribution NUMERIC(15,2) DEFAULT 0,
        net_salary NUMERIC(15,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'DRAFT' CHECK (status IN (
          'DRAFT', 
          'PENDING_STAFF_REVIEW', 
          'PENDING_ADMIN_APPROVAL', 
          'PENDING_EMPLOYEE_SIGNATURE', 
          'COMPLETED',
          'REJECTED'
        )),
        rejection_reason TEXT,
        created_by_user_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT fk_payslip_employee
          FOREIGN KEY (employee_id) 
          REFERENCES employees(id) 
          ON DELETE CASCADE,
        
        CONSTRAINT fk_payslip_creator
          FOREIGN KEY (created_by_user_id) 
          REFERENCES users(id) 
          ON DELETE RESTRICT,
        
        CONSTRAINT unique_employee_month_year
          UNIQUE (employee_id, payslip_month, payslip_year)
      )
    `);
        console.log('✅ Created payslips table');
        // Create index for faster queries
        await db_1.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_payslips_employee_id ON payslips(employee_id);
      CREATE INDEX IF NOT EXISTS idx_payslips_status ON payslips(status);
      CREATE INDEX IF NOT EXISTS idx_payslips_month_year ON payslips(payslip_month, payslip_year);
      CREATE INDEX IF NOT EXISTS idx_payslips_created_by ON payslips(created_by_user_id);
    `);
        console.log('✅ Created indexes on payslips table');
        // Create payslip_signatures table
        await db_1.pool.query(`
      CREATE TABLE IF NOT EXISTS payslip_signatures (
        signature_id SERIAL PRIMARY KEY,
        payslip_id INT NOT NULL,
        signer_user_id INT NOT NULL,
        signer_role VARCHAR(50) NOT NULL CHECK (signer_role IN (
          'JUNIOR_ACCOUNTANT',
          'STAFF_ACCOUNTANT',
          'ADMIN',
          'EMPLOYEE'
        )),
        signature_hash VARCHAR(255) NOT NULL UNIQUE,
        signed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address VARCHAR(45),
        
        CONSTRAINT fk_signature_payslip
          FOREIGN KEY (payslip_id) 
          REFERENCES payslips(payslip_id) 
          ON DELETE CASCADE,
        
        CONSTRAINT fk_signature_user
          FOREIGN KEY (signer_user_id) 
          REFERENCES users(id) 
          ON DELETE RESTRICT,
        
        CONSTRAINT unique_payslip_role
          UNIQUE (payslip_id, signer_role)
      )
    `);
        console.log('✅ Created payslip_signatures table');
        // Create index for signatures
        await db_1.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_signatures_payslip_id ON payslip_signatures(payslip_id);
      CREATE INDEX IF NOT EXISTS idx_signatures_user_id ON payslip_signatures(signer_user_id);
    `);
        console.log('✅ Created indexes on payslip_signatures table');
        // Create payslip_documents table
        await db_1.pool.query(`
      CREATE TABLE IF NOT EXISTS payslip_documents (
        document_id SERIAL PRIMARY KEY,
        payslip_id INT NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_type VARCHAR(10) DEFAULT 'PDF',
        file_size BIGINT,
        generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT fk_document_payslip
          FOREIGN KEY (payslip_id) 
          REFERENCES payslips(payslip_id) 
          ON DELETE CASCADE
      )
    `);
        console.log('✅ Created payslip_documents table');
        // Create index for documents
        await db_1.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_payslip_id ON payslip_documents(payslip_id);
    `);
        console.log('✅ Created indexes on payslip_documents table');
        // Create trigger to update updated_at timestamp on payslips
        await db_1.pool.query(`
      CREATE OR REPLACE FUNCTION update_payslips_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
        await db_1.pool.query(`
      DROP TRIGGER IF EXISTS payslips_updated_at_trigger ON payslips;
      
      CREATE TRIGGER payslips_updated_at_trigger
      BEFORE UPDATE ON payslips
      FOR EACH ROW
      EXECUTE FUNCTION update_payslips_updated_at();
    `);
        console.log('✅ Created updated_at trigger for payslips table');
        console.log('✅ All payroll tables created successfully!');
    }
    catch (error) {
        console.error('❌ Error creating payroll tables:', error);
        throw error;
    }
}
// Run if executed directly
if (require.main === module) {
    createPayrollTables()
        .then(() => {
        console.log('Payroll tables migration completed successfully');
        process.exit(0);
    })
        .catch((error) => {
        console.error('Payroll tables migration failed:', error);
        process.exit(1);
    });
}
exports.default = createPayrollTables;
