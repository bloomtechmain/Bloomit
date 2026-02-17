import { pool } from '../db'

async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS payment_payables (
      payment_id SERIAL PRIMARY KEY,
      payable_id INT REFERENCES payables(payable_id) ON DELETE CASCADE,
      payment_method VARCHAR(50),
      bank_account_id INT REFERENCES company_bank_accounts(id),
      payment_date DATE DEFAULT CURRENT_DATE,
      amount NUMERIC(12,2) NOT NULL,
      reference_number VARCHAR(100),
      status VARCHAR(50) DEFAULT 'Pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `)
  console.log('payment_payables table ensured')
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => pool.end())
