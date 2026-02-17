"use strict";
/**
 * Script to assign permissions to roles based on logical access requirements
 * This creates a secure permission matrix for the ERP system
 */
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
const rolePermissionMatrix = [
    {
        roleName: 'Super Admin',
        permissions: [
            // Full system access - all permissions
            'employees:view', 'employees:create', 'employees:edit', 'employees:delete',
            'projects:view', 'projects:create', 'projects:edit', 'projects:delete',
            'accounts:view', 'accounts:create', 'accounts:manage_cards',
            'vendors:view', 'vendors:create',
            'payables:view', 'payables:create',
            'receivables:view', 'receivables:create',
            'assets:view', 'assets:create',
            'petty_cash:view', 'petty_cash:replenish', 'petty_cash:create_bill',
            'notes:view', 'notes:create', 'notes:edit', 'notes:delete', 'notes:share',
            'todos:view', 'todos:create', 'todos:edit', 'todos:delete', 'todos:share',
            'subscriptions:view', 'subscriptions:create', 'subscriptions:edit', 'subscriptions:delete',
            'analytics:view',
            'quotes:read', 'quotes:manage', 'quotes:admin',
            'purchase_orders:view', 'purchase_orders:create', 'purchase_orders:edit',
            'purchase_orders:upload_receipt', 'purchase_orders:approve', 'purchase_orders:reject',
            'payroll:view_all', 'payroll:create', 'payroll:edit', 'payroll:delete',
            'payroll:manage_employee_data', 'payroll:staff_approve', 'payroll:admin_approve',
            'payroll:view_reports', 'payroll:view_own',
            'loans:view', 'loans:create', 'loans:update', 'loans:delete', 'loans:manage_installments',
            'settings:manage',
        ]
    },
    {
        roleName: 'Admin',
        permissions: [
            // Administrative access - most permissions except system-critical ones
            'employees:view', 'employees:create', 'employees:edit',
            'projects:view', 'projects:create', 'projects:edit', 'projects:delete',
            'accounts:view', 'accounts:create', 'accounts:manage_cards',
            'vendors:view', 'vendors:create',
            'payables:view', 'payables:create',
            'receivables:view', 'receivables:create',
            'assets:view', 'assets:create',
            'petty_cash:view', 'petty_cash:replenish', 'petty_cash:create_bill',
            'notes:view', 'notes:create', 'notes:edit', 'notes:delete', 'notes:share',
            'todos:view', 'todos:create', 'todos:edit', 'todos:delete', 'todos:share',
            'subscriptions:view', 'subscriptions:create', 'subscriptions:edit', 'subscriptions:delete',
            'analytics:view',
            'quotes:read', 'quotes:manage', 'quotes:admin',
            'purchase_orders:view', 'purchase_orders:create', 'purchase_orders:edit',
            'purchase_orders:upload_receipt', 'purchase_orders:approve', 'purchase_orders:reject',
            'payroll:view_all', 'payroll:create', 'payroll:edit', 'payroll:delete',
            'payroll:manage_employee_data', 'payroll:admin_approve', 'payroll:view_reports',
            'loans:view', 'loans:create', 'loans:update', 'loans:delete', 'loans:manage_installments',
            'settings:manage',
        ]
    },
    {
        roleName: 'Accountant',
        permissions: [
            // Full accounting access, limited other areas
            'accounts:view', 'accounts:create', 'accounts:manage_cards',
            'vendors:view', 'vendors:create',
            'payables:view', 'payables:create',
            'receivables:view', 'receivables:create',
            'assets:view', 'assets:create',
            'petty_cash:view', 'petty_cash:replenish', 'petty_cash:create_bill',
            'subscriptions:view', 'subscriptions:create', 'subscriptions:edit', 'subscriptions:delete',
            'analytics:view',
            'purchase_orders:view', 'purchase_orders:create', 'purchase_orders:edit',
            'purchase_orders:upload_receipt',
            'payroll:view_all', 'payroll:create', 'payroll:edit', 'payroll:staff_approve',
            'payroll:manage_employee_data', 'payroll:view_reports',
            'loans:view', 'loans:create', 'loans:update', 'loans:manage_installments',
            'projects:view', // Read-only access to projects
            'notes:view', 'notes:create', 'notes:edit', 'notes:delete', 'notes:share',
            'todos:view', 'todos:create', 'todos:edit', 'todos:delete', 'todos:share',
        ]
    },
    {
        roleName: 'Project Manager',
        permissions: [
            // Project management focus
            'projects:view', 'projects:create', 'projects:edit', 'projects:delete',
            'employees:view', // View employees for assignment
            'vendors:view',
            'quotes:read', 'quotes:manage',
            'purchase_orders:view', 'purchase_orders:create', 'purchase_orders:edit',
            'purchase_orders:upload_receipt',
            'notes:view', 'notes:create', 'notes:edit', 'notes:delete', 'notes:share',
            'todos:view', 'todos:create', 'todos:edit', 'todos:delete', 'todos:share',
            'analytics:view', // View project analytics
            'receivables:view', // View project receivables
            'payables:view', // View project expenses
        ]
    },
    {
        roleName: 'Employee',
        permissions: [
            // Basic employee access - own data only
            'notes:view', 'notes:create', 'notes:edit', 'notes:delete', 'notes:share',
            'todos:view', 'todos:create', 'todos:edit', 'todos:delete', 'todos:share',
            'payroll:view_own', // Own payslips only
            'projects:view', // View assigned projects
        ]
    },
    {
        roleName: 'Viewer',
        permissions: [
            // Read-only access to most modules
            'employees:view',
            'projects:view',
            'accounts:view',
            'vendors:view',
            'payables:view',
            'receivables:view',
            'assets:view',
            'petty_cash:view',
            'notes:view',
            'todos:view',
            'subscriptions:view',
            'analytics:view',
            'quotes:read',
            'purchase_orders:view',
            'loans:view',
        ]
    },
    {
        roleName: 'Senior Developer',
        permissions: [
            // Custom role - technical staff with limited access
            'projects:view',
            'notes:view', 'notes:create', 'notes:edit', 'notes:delete', 'notes:share',
            'todos:view', 'todos:create', 'todos:edit', 'todos:delete', 'todos:share',
            'payroll:view_own',
        ]
    },
];
async function assignRolePermissions() {
    const client = await db_1.pool.connect();
    try {
        console.log('🔄 Starting role permission assignment...');
        await client.query('BEGIN');
        for (const config of rolePermissionMatrix) {
            console.log(`\n📋 Processing role: ${config.roleName}`);
            // Get role ID
            const roleResult = await client.query('SELECT id FROM roles WHERE name = $1', [config.roleName]);
            if (roleResult.rows.length === 0) {
                console.log(`⚠️  Role "${config.roleName}" not found, skipping...`);
                continue;
            }
            const roleId = roleResult.rows[0].id;
            let assignedCount = 0;
            let skippedCount = 0;
            for (const permStr of config.permissions) {
                const [resource, action] = permStr.split(':');
                // Get permission ID
                const permResult = await client.query('SELECT id FROM permissions WHERE resource = $1 AND action = $2', [resource, action]);
                if (permResult.rows.length === 0) {
                    console.log(`⚠️  Permission "${permStr}" not found, skipping...`);
                    continue;
                }
                const permissionId = permResult.rows[0].id;
                // Check if already assigned
                const existingResult = await client.query('SELECT id FROM role_permissions WHERE role_id = $1 AND permission_id = $2', [roleId, permissionId]);
                if (existingResult.rows.length === 0) {
                    await client.query('INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)', [roleId, permissionId]);
                    assignedCount++;
                }
                else {
                    skippedCount++;
                }
            }
            console.log(`✅ ${config.roleName}: Assigned ${assignedCount}, Skipped ${skippedCount}`);
        }
        await client.query('COMMIT');
        console.log('\n✅ Role permission assignment completed!');
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error assigning role permissions:', error);
        throw error;
    }
    finally {
        client.release();
    }
}
// Run if executed directly
if (require.main === module) {
    assignRolePermissions()
        .then(() => {
        console.log('✅ Done!');
        process.exit(0);
    })
        .catch((error) => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    });
}
exports.default = assignRolePermissions;
