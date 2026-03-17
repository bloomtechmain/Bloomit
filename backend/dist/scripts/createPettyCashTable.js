"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
async function main() {
    try {
        await db_1.pool.query(`
      CREATE TABLE IF NOT EXISTS petty_cash_account (
        id SERIAL PRIMARY KEY,
        account_name VARCHAR(100) DEFAULT 'Petty Cash',
        current_balance NUMERIC(15, 2) DEFAULT 0.00,
        monthly_float_amount NUMERIC(15, 2) DEFAULT 0.00,
        last_replenished_date DATE,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
        console.log('Created petty_cash_account table');
        // Create petty_cash_transactions table
        await db_1.pool.query(`
      CREATE TABLE IF NOT EXISTS petty_cash_transactions (
        id SERIAL PRIMARY KEY,
        petty_cash_account_id INTEGER REFERENCES petty_cash_account(id) ON DELETE CASCADE,
        transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('REPLENISHMENT', 'EXPENSE')),
        amount NUMERIC(15, 2) NOT NULL,
        description TEXT,
        project_id INTEGER,
        source_bank_account_id INTEGER,
        payable_id INTEGER,
        transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
        console.log('Created petty_cash_transactions table');
        // Create trigger to update petty_cash_account balance
        await db_1.pool.query(`
      CREATE OR REPLACE FUNCTION update_petty_cash_balance()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'INSERT' THEN
          IF NEW.transaction_type = 'REPLENISHMENT' THEN
            UPDATE petty_cash_account 
            SET current_balance = current_balance + NEW.amount,
                last_replenished_date = CURRENT_DATE
            WHERE id = NEW.petty_cash_account_id;
          ELSIF NEW.transaction_type = 'EXPENSE' THEN
            UPDATE petty_cash_account 
            SET current_balance = current_balance - NEW.amount
            WHERE id = NEW.petty_cash_account_id;
          END IF;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
        console.log('Created petty cash balance trigger function');
        await db_1.pool.query(`
      DROP TRIGGER IF EXISTS trg_update_petty_cash_balance ON petty_cash_transactions;
      CREATE TRIGGER trg_update_petty_cash_balance
      AFTER INSERT ON petty_cash_transactions
      FOR EACH ROW
      EXECUTE FUNCTION update_petty_cash_balance();
    `);
        console.log('Created petty cash balance trigger');
        // Insert default record if not exists
        const res = await db_1.pool.query('SELECT * FROM petty_cash_account LIMIT 1');
        if (res.rows.length === 0) {
            await db_1.pool.query(`
        INSERT INTO petty_cash_account (account_name, current_balance, monthly_float_amount)
        VALUES ('Petty Cash', 0.00, 0.00)
      `);
            console.log('Inserted default Petty Cash record');
        }
    }
    catch (err) {
        console.error('Error creating table:', err);
    }
    finally {
        await db_1.pool.end();
    }
}
main();
