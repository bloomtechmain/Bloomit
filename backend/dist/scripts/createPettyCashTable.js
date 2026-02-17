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
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
        console.log('Created petty_cash_account table');
        // Insert default record if not exists
        const res = await db_1.pool.query('SELECT * FROM petty_cash_account LIMIT 1');
        if (res.rows.length === 0) {
            await db_1.pool.query(`
        INSERT INTO petty_cash_account (account_name, current_balance)
        VALUES ('Petty Cash', 0.00)
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
