"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startPurgeTerminatedEmployeesJob = startPurgeTerminatedEmployeesJob;
const node_cron_1 = __importDefault(require("node-cron"));
const db_1 = require("../db");
/**
 * Purge Terminated Employees Job
 * Runs daily at 2:00 AM to hard delete employee and user records
 * that have passed their 2-year retention period
 */
function startPurgeTerminatedEmployeesJob() {
    // Run daily at 2:00 AM
    node_cron_1.default.schedule('0 2 * * *', async () => {
        console.log('🗑️ Running purge terminated employees job...');
        const client = await db_1.pool.connect();
        try {
            await client.query('BEGIN');
            // Find employees scheduled for purge
            const employeesToPurge = await client.query(`
        SELECT 
          e.id as employee_id,
          e.user_id,
          e.employee_number,
          e.first_name,
          e.last_name,
          e.email,
          e.terminated_at,
          e.scheduled_purge_date
        FROM employees e
        WHERE e.scheduled_purge_date IS NOT NULL
          AND e.scheduled_purge_date <= CURRENT_DATE
      `);
            if (employeesToPurge.rows.length === 0) {
                console.log('   No employees scheduled for purge today.');
                await client.query('ROLLBACK');
                return;
            }
            console.log(`   Found ${employeesToPurge.rows.length} employee(s) to purge:`);
            for (const employee of employeesToPurge.rows) {
                console.log(`   - Purging: ${employee.first_name} ${employee.last_name} (${employee.email})`);
                console.log(`     Employee ID: ${employee.employee_id}, User ID: ${employee.user_id}`);
                console.log(`     Terminated: ${employee.terminated_at}`);
                console.log(`     Scheduled Purge: ${employee.scheduled_purge_date}`);
                // Log the purge action before deletion
                await client.query(`INSERT INTO rbac_audit_log (user_id, action, details) 
           VALUES (NULL, $1, $2)`, [
                    'PURGE_TERMINATED_EMPLOYEE',
                    JSON.stringify({
                        employeeId: employee.employee_id,
                        userId: employee.user_id,
                        employeeNumber: employee.employee_number,
                        employeeName: `${employee.first_name} ${employee.last_name}`,
                        employeeEmail: employee.email,
                        terminatedAt: employee.terminated_at,
                        scheduledPurgeDate: employee.scheduled_purge_date,
                        purgedAt: new Date().toISOString()
                    })
                ]);
                // Delete employee record (this will cascade to related records if configured)
                await client.query('DELETE FROM employees WHERE id = $1', [employee.employee_id]);
                // Delete user account and related records
                if (employee.user_id) {
                    // Delete user_roles associations
                    await client.query('DELETE FROM user_roles WHERE user_id = $1', [employee.user_id]);
                    // Delete password history
                    await client.query('DELETE FROM password_history WHERE user_id = $1', [employee.user_id]);
                    // Delete user account
                    await client.query('DELETE FROM users WHERE id = $1', [employee.user_id]);
                }
                console.log(`   ✅ Purged successfully`);
            }
            await client.query('COMMIT');
            console.log(`✅ Purge job completed. Purged ${employeesToPurge.rows.length} employee(s).`);
        }
        catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Error in purge terminated employees job:', error);
        }
        finally {
            client.release();
        }
    });
    console.log('✅ Purge terminated employees job scheduled (daily at 2:00 AM)');
}
