"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
async function main() {
    await db_1.pool.query(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id SERIAL PRIMARY KEY,
      description VARCHAR(200) NOT NULL,
      amount NUMERIC(12,2) NOT NULL,
      due_date DATE NOT NULL,
      frequency VARCHAR(20) CHECK (frequency IN ('MONTHLY', 'YEARLY')),
      auto_pay BOOLEAN DEFAULT FALSE,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
    console.log('✅ subscriptions table created successfully');
}
main()
    .catch((e) => {
    console.error('❌ Error creating subscriptions table:', e);
    process.exitCode = 1;
})
    .finally(() => db_1.pool.end());
