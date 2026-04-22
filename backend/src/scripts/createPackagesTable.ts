import { pool } from '../db'

async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS packages (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) UNIQUE NOT NULL,
      display_name VARCHAR(100) NOT NULL,
      price_monthly NUMERIC(10,2) DEFAULT 0,
      price_yearly NUMERIC(10,2) DEFAULT 0,
      max_users INTEGER,
      description TEXT,
      features JSONB NOT NULL DEFAULT '{}',
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE packages
      ADD COLUMN IF NOT EXISTS max_users   INTEGER,
      ADD COLUMN IF NOT EXISTS description TEXT;
  `)
  console.log('✅ packages table created successfully')

  await pool.query(`
    INSERT INTO packages (name, display_name, price_monthly, price_yearly, features) VALUES
    (
      'free',
      'Free',
      0,
      0,
      '{
        "max_users": 1,
        "api_access": false,
        "priority_support": false,
        "custom_branding": false,
        "modules": ["todos", "notes", "notifications"]
      }'
    ),
    (
      'basic',
      'Basic',
      29,
      290,
      '{
        "max_users": 5,
        "api_access": false,
        "priority_support": false,
        "custom_branding": false,
        "modules": ["todos", "notes", "notifications", "documents", "vendors", "receivables", "payables", "time_entries"]
      }'
    ),
    (
      'pro',
      'Pro',
      79,
      790,
      '{
        "max_users": 20,
        "api_access": false,
        "priority_support": false,
        "custom_branding": false,
        "modules": ["todos", "notes", "notifications", "documents", "vendors", "receivables", "payables", "time_entries", "purchase_orders", "quotes", "payroll", "pto", "assets", "loans", "petty_cash", "bank_transactions", "subscriptions"]
      }'
    ),
    (
      'enterprise',
      'Enterprise',
      199,
      1990,
      '{
        "max_users": -1,
        "api_access": true,
        "priority_support": true,
        "custom_branding": true,
        "modules": ["todos", "notes", "notifications", "documents", "vendors", "receivables", "payables", "time_entries", "purchase_orders", "quotes", "payroll", "pto", "assets", "loans", "petty_cash", "bank_transactions", "subscriptions", "employee_portal"]
      }'
    )
    ON CONFLICT (name) DO NOTHING;
  `)
  console.log('✅ 4 packages seeded (Free, Basic, Pro, Enterprise)')
}

main()
  .catch((e) => {
    console.error('❌ Error creating packages table:', e)
    process.exitCode = 1
  })
  .finally(() => pool.end())
