import { pool } from '../db'

async function main() {
  try {
    await pool.query(`
      ALTER TABLE payables 
      ADD COLUMN IF NOT EXISTS bank_account_id INT REFERENCES company_bank_accounts(id),
      ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
      ADD COLUMN IF NOT EXISTS reference_number VARCHAR(100);
    `)
    console.log('payables table altered successfully')
  } catch (err) {
    console.error('Error altering payables table:', err)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => pool.end())
