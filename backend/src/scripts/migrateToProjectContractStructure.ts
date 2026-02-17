import { pool } from '../db'

/**
 * Migration script to restructure the database from:
 * Projects → Items (2-level)
 * to:
 * Projects → Contracts → Items (3-level)
 */

async function main() {
  try {
    console.log('Starting migration to Projects → Contracts → Items structure...')
    
    await pool.query('BEGIN')

    // Step 1: Rename current projects table to contracts_temp
    console.log('Step 1: Renaming projects table to contracts_temp...')
    await pool.query(`
      ALTER TABLE projects RENAME TO contracts_temp;
    `)
    await pool.query(`
      ALTER TABLE contracts_temp RENAME COLUMN project_id TO contract_id;
    `)
    await pool.query(`
      ALTER TABLE contracts_temp RENAME COLUMN projects_name TO contract_name;
    `)

    // Step 2: Create new projects table (top-level)
    console.log('Step 2: Creating new projects table...')
    await pool.query(`
      CREATE TABLE IF NOT EXISTS projects (
        project_id SERIAL PRIMARY KEY,
        project_name VARCHAR(200) NOT NULL,
        project_description TEXT,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    // Step 3: Create a default project for all existing contracts
    console.log('Step 3: Creating default project for existing contracts...')
    const defaultProject = await pool.query(`
      INSERT INTO projects (project_name, project_description, status)
      VALUES ('Legacy Project', 'Auto-generated project for existing contracts', 'active')
      RETURNING project_id;
    `)
    const defaultProjectId = defaultProject.rows[0].project_id
    console.log(`Created default project with ID: ${defaultProjectId}`)

    // Step 4: Create contracts table with project_id foreign key
    console.log('Step 4: Creating contracts table...')
    await pool.query(`
      CREATE TABLE contracts (
        contract_id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
        contract_name VARCHAR(200) NOT NULL,
        customer_name VARCHAR(200),
        description TEXT,
        initial_cost_budget NUMERIC(12,2) DEFAULT 0,
        extra_budget_allocation NUMERIC(12,2) DEFAULT 0,
        payment_type VARCHAR(50),
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    // Step 5: Migrate data from contracts_temp to contracts
    console.log('Step 5: Migrating contract data...')
    await pool.query(`
      INSERT INTO contracts (contract_id, project_id, contract_name, customer_name, description, initial_cost_budget, extra_budget_allocation, payment_type, status)
      SELECT contract_id, $1, contract_name, customer_name, description, initial_cost_budget, extra_budget_allocation, payment_type, status
      FROM contracts_temp;
    `, [defaultProjectId])

    // Step 6: Update sequence for contract_id
    console.log('Step 6: Updating contract_id sequence...')
    await pool.query(`
      SELECT setval('contracts_contract_id_seq', (SELECT MAX(contract_id) FROM contracts));
    `)

    // Step 7: Rename project_items table to contract_items
    console.log('Step 7: Renaming project_items to contract_items...')
    await pool.query(`
      ALTER TABLE project_items RENAME TO contract_items;
    `)
    await pool.query(`
      ALTER TABLE contract_items RENAME COLUMN project_id TO contract_id;
    `)

    // Step 8: Update foreign key constraint in contract_items
    console.log('Step 8: Updating foreign key constraint in contract_items...')
    await pool.query(`
      ALTER TABLE contract_items
      DROP CONSTRAINT IF EXISTS project_items_project_id_fkey;
    `)
    await pool.query(`
      ALTER TABLE contract_items
      ADD CONSTRAINT contract_items_contract_id_fkey
      FOREIGN KEY (contract_id) REFERENCES contracts(contract_id) ON DELETE CASCADE;
    `)

    // Step 9: Update payables table foreign key
    console.log('Step 9: Updating payables table foreign key...')
    await pool.query(`
      ALTER TABLE payables RENAME COLUMN project_id TO contract_id;
    `)
    await pool.query(`
      ALTER TABLE payables
      DROP CONSTRAINT IF EXISTS fk_payables_project;
    `)
    await pool.query(`
      ALTER TABLE payables
      ADD CONSTRAINT fk_payables_contract
      FOREIGN KEY (contract_id) REFERENCES contracts(contract_id) ON DELETE SET NULL;
    `)

    // Step 10: Update receivables table foreign key (if exists)
    console.log('Step 10: Updating receivables table foreign key...')
    const receivablesCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'receivables' AND column_name = 'project_id';
    `)
    
    if (receivablesCheck.rows.length > 0) {
      await pool.query(`
        ALTER TABLE receivables RENAME COLUMN project_id TO contract_id;
      `)
      await pool.query(`
        ALTER TABLE receivables
        DROP CONSTRAINT IF EXISTS fk_receivables_project;
      `)
      await pool.query(`
        ALTER TABLE receivables
        ADD CONSTRAINT fk_receivables_contract
        FOREIGN KEY (contract_id) REFERENCES contracts(contract_id) ON DELETE SET NULL;
      `)
    }

    // Step 11: Drop the temporary table
    console.log('Step 11: Dropping temporary table...')
    await pool.query(`
      DROP TABLE contracts_temp CASCADE;
    `)

    await pool.query('COMMIT')
    
    console.log('✅ Migration completed successfully!')
    console.log(`Default project created with ID: ${defaultProjectId}`)
    console.log('All existing contracts have been assigned to this project.')
    
  } catch (error) {
    await pool.query('ROLLBACK')
    console.error('❌ Migration failed:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => pool.end())
