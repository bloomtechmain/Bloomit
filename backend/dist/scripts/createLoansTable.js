"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
async function createLoansTable() {
    try {
        console.log('🔄 Creating loans table...');
        await db_1.pool.query(`
      CREATE TABLE IF NOT EXISTS loans (
        id SERIAL PRIMARY KEY,
        loan_account_number VARCHAR(100) UNIQUE NOT NULL,
        borrower_name VARCHAR(200) NOT NULL,
        bank_name VARCHAR(150) NOT NULL,
        loan_amount NUMERIC(15,2) NOT NULL CHECK (loan_amount > 0),
        total_installments INTEGER NOT NULL CHECK (total_installments > 0),
        monthly_installment_amount NUMERIC(15,2) NOT NULL CHECK (monthly_installment_amount > 0),
        interest_rate NUMERIC(5,2) NULL CHECK (interest_rate >= 0),
        loan_type VARCHAR(50) NOT NULL DEFAULT 'BUSINESS',
        start_date DATE NOT NULL,
        calculated_end_date DATE NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'PAID_OFF')),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        console.log('✅ Loans table created successfully');
        await db_1.pool.query(`
      CREATE TABLE IF NOT EXISTS loan_installments (
        id SERIAL PRIMARY KEY,
        loan_id INTEGER NOT NULL,
        installment_number INTEGER NOT NULL CHECK (installment_number > 0),
        due_date DATE NOT NULL,
        scheduled_amount NUMERIC(15,2) NOT NULL CHECK (scheduled_amount > 0),
        payment_date DATE NULL,
        amount_paid NUMERIC(15,2) NULL CHECK (amount_paid >= 0),
        paid_bank VARCHAR(150) NULL,
        payment_description TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'OVERDUE', 'PARTIAL')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT fk_loan_installment_loan
          FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE,
        
        CONSTRAINT unique_loan_installment
          UNIQUE (loan_id, installment_number)
      )
    `);
        console.log('✅ Loan installments table created successfully');
        // Create indexes for better query performance
        await db_1.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
      CREATE INDEX IF NOT EXISTS idx_loans_borrower ON loans(borrower_name);
      CREATE INDEX IF NOT EXISTS idx_loan_installments_loan_id ON loan_installments(loan_id);
      CREATE INDEX IF NOT EXISTS idx_loan_installments_status ON loan_installments(status);
      CREATE INDEX IF NOT EXISTS idx_loan_installments_due_date ON loan_installments(due_date);
    `);
        console.log('✅ Indexes created successfully');
        console.log('🎉 Loans tables setup complete!');
    }
    catch (err) {
        console.error('❌ Error creating loans tables:', err);
        throw err;
    }
}
// Run if executed directly
if (require.main === module) {
    createLoansTable()
        .then(() => {
        console.log('✅ Script completed successfully');
        process.exit(0);
    })
        .catch((err) => {
        console.error('❌ Script failed:', err);
        process.exit(1);
    });
}
exports.default = createLoansTable;
