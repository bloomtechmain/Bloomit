import { pool } from '../db'

async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS receivables (
      receivable_id SERIAL PRIMARY KEY,
      payer_name VARCHAR(150) NOT NULL,
      receivable_name VARCHAR(150) NOT NULL,
      description TEXT,
      receivable_type VARCHAR(50),
      amount NUMERIC(12,2) NOT NULL,
      frequency VARCHAR(50),
      start_date DATE,
      end_date DATE,
      project_id INT,
      is_active BOOLEAN DEFAULT TRUE,
      bank_account_id INT REFERENCES company_bank_accounts(id),
      payment_method VARCHAR(50),
      reference_number VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_receivables_project FOREIGN KEY (project_id) REFERENCES projects(project_id)
    );
  `)
  console.log('receivables table ensured')
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => pool.end())
