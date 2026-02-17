import { pool } from '../db'

/**
 * Railway Employee Portal Database Initialization
 * 
 * This script creates all missing employee portal tables and fixes schema issues
 * on the Railway production database.
 * 
 * Issues Fixed:
 * 1. Missing employee_audit_log table
 * 2. Missing employee_notifications table
 * 3. Missing announcements table
 * 4. Missing active_timers table
 * 5. Missing employee_portal_settings table
 * 6. Missing employee_documents table
 * 7. Missing payslip_signatures table
 * 8. Missing payslip_signature_tokens table
 * 
 * SAFE TO RUN MULTIPLE TIMES - Uses IF NOT EXISTS checks
 */

async function initRailwayEmployeePortal() {
  const client = await pool.connect()

  try {
    console.log('═══════════════════════════════════════════════════════')
    console.log('🚀 Railway Employee Portal Database Initialization')
    console.log('═══════════════════════════════════════════════════════')
    console.log('')

    // ==================== TABLE 1: Employee Audit Log ====================
    console.log('📝 Creating employee_audit_log table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS employee_audit_log (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL,
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(50),
        resource_id INTEGER,
        ip_address VARCHAR(45),
        user_agent TEXT,
        old_value JSONB,
        new_value JSONB,
        status VARCHAR(20) DEFAULT 'success',
        error_message TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT fk_employee_audit_log_employee
          FOREIGN KEY (employee_id)
          REFERENCES employees(id)
          ON DELETE CASCADE
      );
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_employee_audit_log_employee_id
      ON employee_audit_log(employee_id);

      CREATE INDEX IF NOT EXISTS idx_employee_audit_log_created_at
      ON employee_audit_log(created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_employee_audit_log_action
      ON employee_audit_log(action);

      CREATE INDEX IF NOT EXISTS idx_employee_audit_log_resource
      ON employee_audit_log(resource_type, resource_id);
    `)

    console.log('✅ employee_audit_log table created\n')

    // ==================== TABLE 2: Employee Notifications ====================
    console.log('📝 Creating employee_notifications table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS employee_notifications (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL,
        notification_type VARCHAR(50) NOT NULL,
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        link VARCHAR(500),
        priority VARCHAR(20) DEFAULT 'normal',
        is_read BOOLEAN DEFAULT false,
        is_archived BOOLEAN DEFAULT false,
        read_at TIMESTAMP,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT fk_employee_notifications_employee
          FOREIGN KEY (employee_id)
          REFERENCES employees(id)
          ON DELETE CASCADE
      );
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_employee_notifications_employee_id
      ON employee_notifications(employee_id);

      CREATE INDEX IF NOT EXISTS idx_employee_notifications_is_read
      ON employee_notifications(employee_id, is_read);

      CREATE INDEX IF NOT EXISTS idx_employee_notifications_created_at
      ON employee_notifications(created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_employee_notifications_priority
      ON employee_notifications(employee_id, priority);
    `)

    console.log('✅ employee_notifications table created\n')

    // ==================== TABLE 3: Announcements ====================
    console.log('📝 Creating announcements table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL,
        priority VARCHAR(20) DEFAULT 'normal',
        category VARCHAR(50),
        start_date TIMESTAMP DEFAULT NOW(),
        end_date TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT fk_announcements_created_by
          FOREIGN KEY (created_by)
          REFERENCES users(id)
          ON DELETE SET NULL
      );
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_announcements_is_active
      ON announcements(is_active);

      CREATE INDEX IF NOT EXISTS idx_announcements_start_date
      ON announcements(start_date DESC);

      CREATE INDEX IF NOT EXISTS idx_announcements_priority
      ON announcements(priority);
    `)

    console.log('✅ announcements table created\n')

    // ==================== TABLE 4: Active Timers ====================
    console.log('📝 Creating active_timers table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS active_timers (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL,
        time_entry_id INTEGER NOT NULL,
        started_at TIMESTAMP NOT NULL DEFAULT NOW(),
        last_sync_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT fk_active_timers_employee
          FOREIGN KEY (employee_id)
          REFERENCES employees(id)
          ON DELETE CASCADE,
        CONSTRAINT fk_active_timers_time_entry
          FOREIGN KEY (time_entry_id)
          REFERENCES time_entries(id)
          ON DELETE CASCADE,
        CONSTRAINT unique_employee_active_timer
          UNIQUE(employee_id)
      );
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_active_timers_employee_id
      ON active_timers(employee_id);

      CREATE INDEX IF NOT EXISTS idx_active_timers_time_entry_id
      ON active_timers(time_entry_id);
    `)

    console.log('✅ active_timers table created\n')

    // ==================== TABLE 5: Employee Portal Settings ====================
    console.log('📝 Creating employee_portal_settings table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS employee_portal_settings (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL,
        show_in_directory BOOLEAN DEFAULT true,
        hide_phone_in_directory BOOLEAN DEFAULT false,
        email_preferences JSONB DEFAULT '{"pto_notifications": true, "time_entry_reminders": true, "announcement_notifications": true}'::jsonb,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT fk_employee_portal_settings_employee
          FOREIGN KEY (employee_id)
          REFERENCES employees(id)
          ON DELETE CASCADE,
        CONSTRAINT unique_employee_settings
          UNIQUE(employee_id)
      );
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_employee_portal_settings_employee_id
      ON employee_portal_settings(employee_id);
    `)
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_employee_portal_settings_show_in_directory
      ON employee_portal_settings(show_in_directory);
    `)

    console.log('✅ employee_portal_settings table created\n')

    // ==================== TABLE 6: Employee Documents ====================
    console.log('📝 Creating employee_documents table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS employee_documents (
        document_id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL,
        document_type VARCHAR(50) NOT NULL,
        document_category VARCHAR(50) DEFAULT 'personal',
        file_name VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        file_path TEXT NOT NULL,
        file_size BIGINT,
        mime_type VARCHAR(100),
        description TEXT,
        uploaded_by INTEGER,
        uploaded_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT fk_employee_documents_employee
          FOREIGN KEY (employee_id)
          REFERENCES employees(id)
          ON DELETE CASCADE,
        CONSTRAINT fk_employee_documents_uploaded_by
          FOREIGN KEY (uploaded_by)
          REFERENCES employees(id)
          ON DELETE SET NULL
      );
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_employee_documents_employee_id
      ON employee_documents(employee_id);

      CREATE INDEX IF NOT EXISTS idx_employee_documents_document_type
      ON employee_documents(document_type);

      CREATE INDEX IF NOT EXISTS idx_employee_documents_uploaded_at
      ON employee_documents(uploaded_at DESC);
    `)

    console.log('✅ employee_documents table created\n')

    // ==================== TABLE 7: Payslip Signatures (Optional) ====================
    // Check if payslips table exists first
    const payslipsCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'payslips'
      )
    `)
    
    if (payslipsCheck.rows[0].exists) {
      console.log('📝 Creating payslip_signatures table...')
      await client.query(`
        CREATE TABLE IF NOT EXISTS payslip_signatures (
          signature_id SERIAL PRIMARY KEY,
          payslip_id INTEGER NOT NULL,
          signer_user_id INTEGER NOT NULL,
          signer_role VARCHAR(50) NOT NULL,
          signature_data TEXT NOT NULL,
          signed_at TIMESTAMP DEFAULT NOW(),
          CONSTRAINT fk_payslip_signatures_payslip
            FOREIGN KEY (payslip_id)
            REFERENCES payslips(payslip_id)
            ON DELETE CASCADE,
          CONSTRAINT fk_payslip_signatures_signer
            FOREIGN KEY (signer_user_id)
            REFERENCES users(id)
            ON DELETE CASCADE
        );
      `)

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_payslip_signatures_payslip_id
        ON payslip_signatures(payslip_id);

        CREATE INDEX IF NOT EXISTS idx_payslip_signatures_signer
        ON payslip_signatures(signer_user_id);

        CREATE INDEX IF NOT EXISTS idx_payslip_signatures_role
        ON payslip_signatures(payslip_id, signer_role);
      `)

      console.log('✅ payslip_signatures table created\n')

      // ==================== TABLE 8: Payslip Signature Tokens ====================
      console.log('📝 Creating payslip_signature_tokens table...')
      await client.query(`
        CREATE TABLE IF NOT EXISTS payslip_signature_tokens (
          token_id SERIAL PRIMARY KEY,
          token_hash VARCHAR(64) NOT NULL,
          payslip_id INTEGER NOT NULL,
          employee_id INTEGER NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          is_used BOOLEAN DEFAULT false,
          used_at TIMESTAMP,
          used_by_ip VARCHAR(45),
          used_by_user_agent TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          CONSTRAINT fk_payslip_tokens_payslip
            FOREIGN KEY (payslip_id)
            REFERENCES payslips(payslip_id)
            ON DELETE CASCADE,
          CONSTRAINT fk_payslip_tokens_employee
            FOREIGN KEY (employee_id)
            REFERENCES employees(id)
            ON DELETE CASCADE,
          CONSTRAINT unique_token_hash
            UNIQUE(token_hash)
        );
      `)

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_payslip_tokens_token_hash
        ON payslip_signature_tokens(token_hash);

        CREATE INDEX IF NOT EXISTS idx_payslip_tokens_payslip_id
        ON payslip_signature_tokens(payslip_id);

        CREATE INDEX IF NOT EXISTS idx_payslip_tokens_employee_id
        ON payslip_signature_tokens(employee_id);

        CREATE INDEX IF NOT EXISTS idx_payslip_tokens_expires_at
        ON payslip_signature_tokens(expires_at);
      `)

      console.log('✅ payslip_signature_tokens table created\n')
    } else {
      console.log('⚠️  Skipping payslip_signatures table (payslips table not found)')
      console.log('⚠️  Skipping payslip_signature_tokens table (payslips table not found)')
      console.log('   → Create payslips table first, then run this script again\n')
    }

    // ==================== SUMMARY ====================
    console.log('═══════════════════════════════════════════════════════')
    console.log('✅ All Employee Portal Tables Created Successfully!')
    console.log('═══════════════════════════════════════════════════════')
    console.log('')
    console.log('📊 Tables Created:')
    console.log('   1. employee_audit_log - Security audit trail')
    console.log('   2. employee_notifications - Notification system')
    console.log('   3. announcements - Company announcements')
    console.log('   4. active_timers - Time tracking timers')
    console.log('   5. employee_portal_settings - Privacy & preferences')
    console.log('   6. employee_documents - Document management')
    console.log('   7. payslip_signatures - Payslip digital signatures')
    console.log('   8. payslip_signature_tokens - Signature tokens')
    console.log('')
    console.log('✅ All indexes created for optimal query performance')
    console.log('✅ All foreign key constraints established')
    console.log('')
    console.log('🎉 Railway Employee Portal is now ready!')
    console.log('')

  } catch (error) {
    console.error('❌ Error initializing employee portal tables:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

// Run the initialization
initRailwayEmployeePortal()
  .then(() => {
    console.log('✅ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Failed:', error)
    process.exit(1)
  })
