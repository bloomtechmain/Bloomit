import { pool } from '../db'

async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS payables (
      payable_id SERIAL PRIMARY KEY,
      vendor_id INT NOT NULL,
      payable_name VARCHAR(150) NOT NULL,
      description TEXT,
      payable_type VARCHAR(20) CHECK (payable_type IN ('ONE_TIME','RECURRING')),
      amount NUMERIC(12,2) NOT NULL,
      frequency VARCHAR(20) CHECK (frequency IN ('WEEKLY','MONTHLY','YEARLY')),
      start_date DATE,
      end_date DATE,
      project_id INT,
      is_active BOOLEAN DEFAULT TRUE,
      bank_account_id INT REFERENCES company_bank_accounts(id),
      payment_method VARCHAR(50),
      reference_number VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_payables_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id),
      CONSTRAINT fk_payables_project FOREIGN KEY (project_id) REFERENCES projects(project_id)
    );
  `)
  console.log('payables table ensured')
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => pool.end())
