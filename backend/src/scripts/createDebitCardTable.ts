import { pool } from '../db'

async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS debit_card (
      id SERIAL PRIMARY KEY,
      bank_account_id INT NOT NULL REFERENCES company_bank_accounts(id) ON DELETE CASCADE,
      card_number_last4 VARCHAR(4) NOT NULL,
      card_holder_name VARCHAR(100) NOT NULL,
      expiry_date DATE NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS debit_cards (
      id SERIAL PRIMARY KEY,
      bank_account_id INT NOT NULL REFERENCES company_bank_accounts(id) ON DELETE CASCADE,
      card_number_last4 VARCHAR(4) NOT NULL,
      card_holder_name VARCHAR(100) NOT NULL,
      expiry_date DATE NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `)
  console.log('debit_card and debit_cards tables ensured')
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => pool.end())
