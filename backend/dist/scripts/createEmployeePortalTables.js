"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
/**
 * Create Employee Portal Tables
 *
 * This script creates all necessary database tables for the employee portal:
 * 1. employee_portal_settings - Employee preferences and settings
 * 2. announcements - Company-wide announcements
 * 3. employee_documents - Personal employee documents
 * 4. employee_notifications - In-app notification system
 * 5. employee_audit_log - Security audit trail
 */
async function createEmployeePortalTables() {
    const client = await db_1.pool.connect();
    try {
        console.log('🏗️  Creating Employee Portal tables...\n');
        // ==================== TABLE 1: Employee Portal Settings ====================
        console.log('📝 Creating employee_portal_settings table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS employee_portal_settings (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER UNIQUE NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        theme VARCHAR(20) DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
        dashboard_layout JSONB DEFAULT '{"widgets": ["stats", "notes", "calendar", "announcements"]}',
        email_notifications BOOLEAN DEFAULT true,
        push_notifications BOOLEAN DEFAULT false,
        language VARCHAR(10) DEFAULT 'en',
        timezone VARCHAR(50) DEFAULT 'UTC',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
        await client.query(`
      CREATE INDEX IF NOT EXISTS idx_employee_portal_settings_employee_id 
      ON employee_portal_settings(employee_id);
    `);
        console.log('✅ employee_portal_settings table created\n');
        // ==================== TABLE 2: Announcements ====================
        console.log('📝 Creating announcements table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        author_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
        priority VARCHAR(20) DEFAULT 'normal' 
          CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
        category VARCHAR(50),
        start_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        end_date TIMESTAMP,
        target_audience JSONB DEFAULT '{"type": "all"}',
        is_active BOOLEAN DEFAULT true,
        views_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
        await client.query(`
      CREATE INDEX IF NOT EXISTS idx_announcements_active 
      ON announcements(is_active);
      
      CREATE INDEX IF NOT EXISTS idx_announcements_dates 
      ON announcements(start_date, end_date);
      
      CREATE INDEX IF NOT EXISTS idx_announcements_priority 
      ON announcements(priority);
    `);
        console.log('✅ announcements table created\n');
        // ==================== TABLE 3: Employee Documents ====================
        console.log('📝 Creating employee_documents table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS employee_documents (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        document_type VARCHAR(100) NOT NULL,
        document_category VARCHAR(50),
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size INTEGER,
        mime_type VARCHAR(100),
        description TEXT,
        is_public BOOLEAN DEFAULT false,
        uploaded_by INTEGER REFERENCES employees(id),
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP
      );
    `);
        await client.query(`
      CREATE INDEX IF NOT EXISTS idx_employee_documents_employee_id 
      ON employee_documents(employee_id);
      
      CREATE INDEX IF NOT EXISTS idx_employee_documents_category 
      ON employee_documents(document_category);
      
      CREATE INDEX IF NOT EXISTS idx_employee_documents_type 
      ON employee_documents(document_type);
    `);
        console.log('✅ employee_documents table created\n');
        // ==================== TABLE 4: Employee Notifications ====================
        console.log('📝 Creating employee_notifications table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS employee_notifications (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        notification_type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT,
        link VARCHAR(500),
        priority VARCHAR(20) DEFAULT 'normal'
          CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
        is_read BOOLEAN DEFAULT false,
        is_archived BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        read_at TIMESTAMP,
        expires_at TIMESTAMP
      );
    `);
        await client.query(`
      CREATE INDEX IF NOT EXISTS idx_employee_notifications_employee_id 
      ON employee_notifications(employee_id);
      
      CREATE INDEX IF NOT EXISTS idx_employee_notifications_read 
      ON employee_notifications(employee_id, is_read);
      
      CREATE INDEX IF NOT EXISTS idx_employee_notifications_type 
      ON employee_notifications(notification_type);
      
      CREATE INDEX IF NOT EXISTS idx_employee_notifications_created 
      ON employee_notifications(created_at DESC);
    `);
        console.log('✅ employee_notifications table created\n');
        // ==================== TABLE 5: Employee Audit Log ====================
        console.log('📝 Creating employee_audit_log table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS employee_audit_log (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(50),
        resource_id INTEGER,
        old_value JSONB,
        new_value JSONB,
        ip_address VARCHAR(45),
        user_agent TEXT,
        session_id VARCHAR(255),
        status VARCHAR(20) DEFAULT 'success',
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
        await client.query(`
      CREATE INDEX IF NOT EXISTS idx_employee_audit_log_employee_id 
      ON employee_audit_log(employee_id);
      
      CREATE INDEX IF NOT EXISTS idx_employee_audit_log_created_at 
      ON employee_audit_log(created_at DESC);
      
      CREATE INDEX IF NOT EXISTS idx_employee_audit_log_action 
      ON employee_audit_log(action);
      
      CREATE INDEX IF NOT EXISTS idx_employee_audit_log_resource 
      ON employee_audit_log(resource_type, resource_id);
    `);
        console.log('✅ employee_audit_log table created\n');
        // ==================== SUMMARY ====================
        console.log('📊 Summary of created tables:');
        console.log('   1. employee_portal_settings - Employee preferences');
        console.log('   2. announcements - Company announcements');
        console.log('   3. employee_documents - Personal documents');
        console.log('   4. employee_notifications - Notification system');
        console.log('   5. employee_audit_log - Security audit trail');
        console.log('');
        console.log('✅ All Employee Portal tables created successfully!');
    }
    catch (error) {
        console.error('❌ Error creating employee portal tables:', error);
        throw error;
    }
    finally {
        client.release();
    }
}
// Run if executed directly
if (require.main === module) {
    createEmployeePortalTables()
        .then(() => {
        console.log('\n🎉 Migration completed!');
        process.exit(0);
    })
        .catch((error) => {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    });
}
exports.default = createEmployeePortalTables;
