import { pool } from '../db';

async function addTenantToEmployees() {
  try {
    console.log('Adding tenant_id to employees table...');
    
    await pool.query(`
      ALTER TABLE employees
      ADD COLUMN tenant_id INTEGER,
      ADD CONSTRAINT fk_employees_tenant
      FOREIGN KEY (tenant_id) REFERENCES tenants(id);
    `);
    
    console.log('✅ tenant_id added to employees table successfully');
  } catch (error) {
    console.error('❌ Error adding tenant_id to employees table:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

addTenantToEmployees();
