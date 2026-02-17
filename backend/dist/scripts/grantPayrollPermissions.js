"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
async function grantPayrollPermissions() {
    try {
        console.log('🔐 Granting payroll permissions...');
        // Define payroll permissions
        const payrollPermissions = [
            { resource: 'payroll', action: 'read', description: 'View payroll data' },
            { resource: 'payroll', action: 'create', description: 'Create payslips' },
            { resource: 'payroll', action: 'update', description: 'Update payslips' },
            { resource: 'payroll', action: 'delete', description: 'Delete payslips' },
            { resource: 'payroll', action: 'approve', description: 'Approve payslips' },
            { resource: 'payroll', action: 'submit', description: 'Submit payslips for review' },
            { resource: 'payroll', action: 'sign', description: 'Sign payslips' },
            { resource: 'payroll', action: 'reject', description: 'Reject payslips' },
            { resource: 'payroll', action: 'download', description: 'Download payslip PDFs' },
            { resource: 'payroll', action: 'view_reports', description: 'View payroll reports' }
        ];
        // Insert permissions if they don't exist
        for (const perm of payrollPermissions) {
            await db_1.pool.query(`
        INSERT INTO permissions (resource, action, description)
        VALUES ($1, $2, $3)
        ON CONFLICT (resource, action) DO NOTHING
      `, [perm.resource, perm.action, perm.description]);
        }
        console.log('✅ Payroll permissions created');
        // Grant all payroll permissions to Admin role
        const adminRoleResult = await db_1.pool.query(`
      SELECT id FROM roles WHERE name = 'Admin'
    `);
        if (adminRoleResult.rows.length > 0) {
            const adminRoleId = adminRoleResult.rows[0].id;
            for (const perm of payrollPermissions) {
                const permResult = await db_1.pool.query(`
          SELECT id FROM permissions WHERE resource = $1 AND action = $2
        `, [perm.resource, perm.action]);
                if (permResult.rows.length > 0) {
                    await db_1.pool.query(`
            INSERT INTO role_permissions (role_id, permission_id)
            VALUES ($1, $2)
            ON CONFLICT (role_id, permission_id) DO NOTHING
          `, [adminRoleId, permResult.rows[0].id]);
                }
            }
            console.log('✅ Granted all payroll permissions to Admin role');
        }
        // Grant all payroll permissions to Super Admin role
        const superAdminRoleResult = await db_1.pool.query(`
      SELECT id FROM roles WHERE name = 'Super Admin'
    `);
        if (superAdminRoleResult.rows.length > 0) {
            const superAdminRoleId = superAdminRoleResult.rows[0].id;
            for (const perm of payrollPermissions) {
                const permResult = await db_1.pool.query(`
          SELECT id FROM permissions WHERE resource = $1 AND action = $2
        `, [perm.resource, perm.action]);
                if (permResult.rows.length > 0) {
                    await db_1.pool.query(`
            INSERT INTO role_permissions (role_id, permission_id)
            VALUES ($1, $2)
            ON CONFLICT (role_id, permission_id) DO NOTHING
          `, [superAdminRoleId, permResult.rows[0].id]);
                }
            }
            console.log('✅ Granted all payroll permissions to Super Admin role');
        }
        console.log('\n✅ Payroll permissions granted successfully!');
    }
    catch (error) {
        console.error('❌ Error granting payroll permissions:', error);
        throw error;
    }
}
// Run if executed directly
if (require.main === module) {
    grantPayrollPermissions()
        .then(() => {
        console.log('Payroll permissions script completed successfully');
        process.exit(0);
    })
        .catch((error) => {
        console.error('Payroll permissions script failed:', error);
        process.exit(1);
    });
}
exports.default = grantPayrollPermissions;
