import { pool } from '../db'

async function createTimeEntriesTable() {
  try {
    const query = `
      -- Create time_entries table
      CREATE TABLE IF NOT EXISTS time_entries (
        id SERIAL PRIMARY KEY,
        employee_id INT NOT NULL,
        project_id INT NOT NULL,
        contract_id INT,
        date DATE NOT NULL,
        clock_in TIMESTAMP,
        clock_out TIMESTAMP,
        total_hours DECIMAL(10,2),
        break_time_minutes INT DEFAULT 0,
        description TEXT,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        approved_by INT,
        approved_at TIMESTAMP,
        rejection_note TEXT,
        is_timer_based BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT fk_time_entry_employee
          FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
        
        CONSTRAINT fk_time_entry_project
          FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
        
        CONSTRAINT fk_time_entry_contract
          FOREIGN KEY (contract_id) REFERENCES contracts(contract_id) ON DELETE CASCADE,
        
        CONSTRAINT fk_time_entry_approver
          FOREIGN KEY (approved_by) REFERENCES employees(id) ON DELETE SET NULL
      );

      -- Create indexes for better query performance
      CREATE INDEX IF NOT EXISTS idx_time_entries_employee ON time_entries(employee_id);
      CREATE INDEX IF NOT EXISTS idx_time_entries_project ON time_entries(project_id);
      CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(date);
      CREATE INDEX IF NOT EXISTS idx_time_entries_status ON time_entries(status);

      -- Create active_timers table to track currently running timers
      CREATE TABLE IF NOT EXISTS active_timers (
        id SERIAL PRIMARY KEY,
        employee_id INT NOT NULL UNIQUE,
        time_entry_id INT NOT NULL,
        started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        is_on_break BOOLEAN DEFAULT false,
        total_break_time_minutes INT DEFAULT 0,
        last_break_start TIMESTAMP,
        
        CONSTRAINT fk_active_timer_employee
          FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
        
        CONSTRAINT fk_active_timer_entry
          FOREIGN KEY (time_entry_id) REFERENCES time_entries(id) ON DELETE CASCADE
      );

      -- Create index for active timers
      CREATE INDEX IF NOT EXISTS idx_active_timers_employee ON active_timers(employee_id);
    `

    await pool.query(query)
    console.log('✅ Time entries table and active timers table created successfully')
  } catch (error) {
    console.error('❌ Error creating time entries table:', error)
    throw error
  }
}

// Run if executed directly
if (require.main === module) {
  createTimeEntriesTable()
    .then(() => {
      console.log('Migration completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Migration failed:', error)
      process.exit(1)
    })
}

export default createTimeEntriesTable
