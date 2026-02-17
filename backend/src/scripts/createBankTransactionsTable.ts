import { pool } from '../db'

async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bank_transactions (
      id SERIAL PRIMARY KEY,
      bank_account_id INT NOT NULL,
      transaction_type VARCHAR(10)
          CHECK (transaction_type IN ('DEBIT','CREDIT')),
      amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
      description TEXT,
      transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
      CONSTRAINT fk_bank_transaction_account
          FOREIGN KEY (bank_account_id)
          REFERENCES company_bank_accounts(id)
    );
  `)
  console.log('bank_transactions table ensured')
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => pool.end())
