import { pool } from '../db'

async function createPTORequestsTable() {
  try {
    console.log('Creating pto_requests table...')
    
    const query = `
      CREATE TABLE IF NOT EXISTS pto_requests (
        id SERIAL PRIMARY KEY,
        employee_id INT NOT NULL,
        manager_id INT,
        absence_type VARCHAR(50) NOT NULL,
        from_date DATE NOT NULL,
        to_date DATE NOT NULL,
        total_hours NUMERIC(6,2) NOT NULL,
        project_id INT,
        cover_person_id INT,
        cover_person_name VARCHAR(200),
        description TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        manager_comments TEXT,
        approved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT fk_pto_employee FOREIGN KEY (employee_id) 
          REFERENCES employees(id) ON DELETE CASCADE,
        CONSTRAINT fk_pto_manager FOREIGN KEY (manager_id) 
          REFERENCES employees(id) ON DELETE SET NULL,
        CONSTRAINT fk_pto_project FOREIGN KEY (project_id) 
          REFERENCES projects(project_id) ON DELETE SET NULL,
        CONSTRAINT fk_pto_cover FOREIGN KEY (cover_person_id) 
          REFERENCES employees(id) ON DELETE SET NULL,
        CONSTRAINT check_status CHECK (status IN ('pending', 'approved', 'denied')),
        CONSTRAINT check_dates CHECK (to_date >= from_date)
      );
      
      CREATE INDEX IF NOT EXISTS idx_pto_employee ON pto_requests(employee_id);
      CREATE INDEX IF NOT EXISTS idx_pto_status ON pto_requests(status);
      CREATE INDEX IF NOT EXISTS idx_pto_manager ON pto_requests(manager_id);
      CREATE INDEX IF NOT EXISTS idx_pto_dates ON pto_requests(from_date, to_date);
    `
    
    await pool.query(query)
    console.log('✅ pto_requests table created successfully')
    
    // Check if table exists
    const checkQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'pto_requests'
      );
    `
    const result = await pool.query(checkQuery)
    console.log('Table exists:', result.rows[0].exists)
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error creating pto_requests table:', error)
    process.exit(1)
  }
}

createPTORequestsTable()
