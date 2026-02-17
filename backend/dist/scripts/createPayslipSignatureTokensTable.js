"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
/**
 * Create Payslip Signature Tokens Table
 * Phase 11 Implementation
 *
 * This table stores secure tokens for email-based payslip signing.
 * Tokens are time-limited (24 hours) and single-use for security.
 */
async function createPayslipSignatureTokensTable() {
    console.log('🔧 Creating payslip_signature_tokens table...');
    try {
        // Create the table
        await db_1.pool.query(`
      CREATE TABLE IF NOT EXISTS payslip_signature_tokens (
        id SERIAL PRIMARY KEY,
        payslip_id INTEGER NOT NULL REFERENCES payslips(payslip_id) ON DELETE CASCADE,
        employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used_at TIMESTAMP,
        is_used BOOLEAN DEFAULT false,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_active_token_per_payslip UNIQUE (payslip_id, employee_id, is_used)
      );
    `);
        console.log('✅ payslip_signature_tokens table created');
        // Create indexes for performance
        await db_1.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_payslip_tokens_token 
        ON payslip_signature_tokens(token);
    `);
        console.log('✅ Index created on token');
        await db_1.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_payslip_tokens_expires 
        ON payslip_signature_tokens(expires_at);
    `);
        console.log('✅ Index created on expires_at');
        await db_1.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_payslip_tokens_payslip_employee 
        ON payslip_signature_tokens(payslip_id, employee_id);
    `);
        console.log('✅ Index created on payslip_id, employee_id');
        // Create cleanup function for expired tokens (optional maintenance)
        await db_1.pool.query(`
      CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
      RETURNS INTEGER AS $$
      DECLARE
        deleted_count INTEGER;
      BEGIN
        DELETE FROM payslip_signature_tokens
        WHERE expires_at < NOW() AND is_used = false;
        
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RETURN deleted_count;
      END;
      $$ LANGUAGE plpgsql;
    `);
        console.log('✅ Cleanup function created');
        console.log('\n✅ Payslip signature tokens table setup complete!');
        console.log('\nTable features:');
        console.log('  - Secure token storage with unique constraint');
        console.log('  - 24-hour expiration enforcement');
        console.log('  - Single-use token tracking');
        console.log('  - Cascading deletes for data integrity');
        console.log('  - Performance indexes on key columns');
        console.log('  - Automatic cleanup function for expired tokens');
    }
    catch (error) {
        console.error('❌ Error creating payslip_signature_tokens table:', error);
        throw error;
    }
    finally {
        await db_1.pool.end();
    }
}
// Run if called directly
if (require.main === module) {
    createPayslipSignatureTokensTable();
}
exports.default = createPayslipSignatureTokensTable;
