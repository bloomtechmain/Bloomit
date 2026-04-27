"use strict";
/**
 * Migration Script: Add Granular Permissions
 * This script adds feature-level granular permissions to the system
 * and intelligently maps existing role permissions to new ones
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.previewMigration = previewMigration;
exports.executeMigration = executeMigration;
exports.checkMigrationStatus = checkMigrationStatus;
const db_1 = require("../db");
// Define all granular permissions to be added
const GRANULAR_PERMISSIONS = [
    // Projects Module
    { resource: 'projects_contracts', action: 'read', description: 'View all projects, contracts, and related details' },
    { resource: 'projects_contracts', action: 'create', description: 'Create new projects and contracts' },
    { resource: 'projects_contracts', action: 'update', description: 'Edit existing projects and contracts' },
    { resource: 'projects_contracts', action: 'delete', description: 'Delete projects and contracts' },
    { resource: 'project_time', action: 'read_all', description: 'View time entries from all employees' },
    { resource: 'project_time', action: 'read_own', description: 'View only your own time entries' },
    { resource: 'project_time', action: 'create', description: 'Create new time entries' },
    { resource: 'project_time', action: 'update_own', description: 'Edit your own time entries' },
    { resource: 'project_time', action: 'update_all', description: 'Edit time entries from any employee' },
    { resource: 'project_time', action: 'delete', description: 'Delete time entries' },
    { resource: 'project_time', action: 'approve', description: 'Approve/reject time entries for billing' },
    { resource: 'quotes', action: 'read', description: 'View all quotes and proposals' },
    { resource: 'quotes', action: 'manage', description: 'Create and edit quotes' },
    { resource: 'quotes', action: 'delete', description: 'Delete quotes' },
    { resource: 'quotes', action: 'send', description: 'Send quotes to clients via email' },
    // Financial Management
    { resource: 'payables', action: 'read', description: 'View accounts payable records' },
    { resource: 'payables', action: 'create', description: 'Create new payable entries' },
    { resource: 'payables', action: 'update', description: 'Edit payable records' },
    { resource: 'payables', action: 'delete', description: 'Delete payable records' },
    { resource: 'payables', action: 'approve', description: 'Approve payable payments' },
    { resource: 'receivables', action: 'read', description: 'View accounts receivable records' },
    { resource: 'receivables', action: 'create', description: 'Create new receivable entries' },
    { resource: 'receivables', action: 'update', description: 'Edit receivable records' },
    { resource: 'receivables', action: 'delete', description: 'Delete receivable records' },
    { resource: 'assets', action: 'read', description: 'View company assets and depreciation' },
    { resource: 'assets', action: 'create', description: 'Register new assets' },
    { resource: 'assets', action: 'update', description: 'Edit asset information' },
    { resource: 'assets', action: 'delete', description: 'Delete asset records' },
    { resource: 'petty_cash', action: 'read', description: 'View petty cash transactions' },
    { resource: 'petty_cash', action: 'create', description: 'Record petty cash transactions' },
    { resource: 'petty_cash', action: 'update', description: 'Edit petty cash transactions' },
    { resource: 'petty_cash', action: 'delete', description: 'Delete petty cash transactions' },
    { resource: 'debit_cards', action: 'read', description: 'View debit card transactions' },
    { resource: 'debit_cards', action: 'create', description: 'Add debit card transactions' },
    { resource: 'debit_cards', action: 'update', description: 'Edit card transactions' },
    { resource: 'debit_cards', action: 'delete', description: 'Delete card transactions' },
    { resource: 'accounts', action: 'read', description: 'View bank account information' },
    { resource: 'accounts', action: 'create', description: 'Add new bank accounts' },
    { resource: 'accounts', action: 'update', description: 'Edit bank account details' },
    { resource: 'accounts', action: 'delete', description: 'Delete bank accounts' },
    { resource: 'loans', action: 'read', description: 'View loan information' },
    { resource: 'loans', action: 'create', description: 'Create new loan records' },
    { resource: 'loans', action: 'update', description: 'Edit loan information' },
    { resource: 'loans', action: 'delete', description: 'Delete loan records' },
    { resource: 'purchase_orders', action: 'read', description: 'View purchase orders' },
    { resource: 'purchase_orders', action: 'create', description: 'Create new purchase orders' },
    { resource: 'purchase_orders', action: 'update', description: 'Edit purchase orders' },
    { resource: 'purchase_orders', action: 'delete', description: 'Delete purchase orders' },
    { resource: 'purchase_orders', action: 'approve', description: 'Approve purchase orders for processing' },
    { resource: 'subscriptions', action: 'read', description: 'View subscription information' },
    { resource: 'subscriptions', action: 'create', description: 'Add new subscriptions' },
    { resource: 'subscriptions', action: 'update', description: 'Edit subscription details' },
    { resource: 'subscriptions', action: 'delete', description: 'Delete subscriptions' },
    // Human Resources
    { resource: 'employees', action: 'read', description: 'View basic employee information' },
    { resource: 'employees', action: 'read_sensitive', description: 'View salary, SSN, and other sensitive data' },
    { resource: 'employees', action: 'create', description: 'Add new employees' },
    { resource: 'employees', action: 'update', description: 'Edit employee information' },
    { resource: 'employees', action: 'delete', description: 'Delete employee records' },
    { resource: 'employee_onboarding', action: 'manage', description: 'Manage employee onboarding process' },
    { resource: 'employee_onboarding', action: 'view', description: 'View onboarding status and progress' },
    { resource: 'payroll', action: 'read', description: 'View payroll information' },
    { resource: 'payroll', action: 'create', description: 'Create payroll entries' },
    { resource: 'payroll', action: 'update', description: 'Edit payroll information' },
    { resource: 'payroll', action: 'process', description: 'Process and finalize payroll' },
    { resource: 'payroll', action: 'approve', description: 'Approve payroll for payment' },
    { resource: 'pto', action: 'read_all', description: 'View PTO requests from all employees' },
    { resource: 'pto', action: 'read_own', description: 'View own PTO requests and balance' },
    { resource: 'pto', action: 'create', description: 'Submit PTO requests' },
    { resource: 'pto', action: 'approve', description: 'Approve or reject PTO requests' },
    { resource: 'pto', action: 'delete', description: 'Delete PTO requests' },
    { resource: 'time_entries', action: 'read_all', description: 'View time entries from all employees' },
    { resource: 'time_entries', action: 'read_own', description: 'View own time entries' },
    { resource: 'time_entries', action: 'manage', description: 'Full management of time entry system' },
    // Vendors
    { resource: 'vendors', action: 'read', description: 'View vendor information' },
    { resource: 'vendors', action: 'create', description: 'Add new vendors' },
    { resource: 'vendors', action: 'update', description: 'Edit vendor information' },
    { resource: 'vendors', action: 'delete', description: 'Delete vendor records' },
    // Collaboration
    { resource: 'notes', action: 'read', description: 'View notes and comments' },
    { resource: 'notes', action: 'create', description: 'Create new notes' },
    { resource: 'notes', action: 'update', description: 'Edit notes' },
    { resource: 'notes', action: 'delete', description: 'Delete notes' },
    { resource: 'todos', action: 'read', description: 'View to-do items' },
    { resource: 'todos', action: 'create', description: 'Create new to-do items' },
    { resource: 'todos', action: 'update', description: 'Edit to-do items' },
    { resource: 'todos', action: 'delete', description: 'Delete to-do items' },
    // Analytics
    { resource: 'analytics', action: 'view', description: 'Access main analytics dashboard' },
    { resource: 'analytics', action: 'read', description: 'View financial analytics and reports' },
    { resource: 'analytics', action: 'manage', description: 'Full analytics management and configuration' },
    // Documents
    { resource: 'documents', action: 'read', description: 'View documents in the document bank' },
    { resource: 'documents', action: 'upload', description: 'Upload new documents' },
    { resource: 'documents', action: 'update', description: 'Edit document metadata' },
    { resource: 'documents', action: 'delete', description: 'Delete documents' },
    { resource: 'documents', action: 'download', description: 'Download documents' },
    // Settings
    { resource: 'settings', action: 'manage', description: 'Complete access to all settings and RBAC' },
    { resource: 'settings', action: 'view', description: 'View settings without modification' },
    { resource: 'settings', action: 'configure', description: 'Configure application-wide settings' },
];
// Mapping rules: How old permissions map to new granular ones
const PERMISSION_MAPPING = {
    // Projects module splits into 3 features
    'projects:read': ['projects_contracts:read', 'project_time:read_all', 'quotes:read'],
    'projects:create': ['projects_contracts:create', 'project_time:create', 'quotes:manage'],
    'projects:update': ['projects_contracts:update', 'project_time:update_all', 'quotes:manage'],
    'projects:delete': ['projects_contracts:delete', 'project_time:delete', 'quotes:delete'],
    // Contracts already exist but keep for backward compat
    'contracts:read': ['projects_contracts:read'],
    'contracts:create': ['projects_contracts:create'],
    'contracts:update': ['projects_contracts:update'],
    'contracts:delete': ['projects_contracts:delete'],
    // Time entries map to both project_time and time_entries
    'time_entries:read': ['project_time:read_all', 'time_entries:read_all'],
    'time_entries:create': ['project_time:create'],
    'time_entries:update': ['project_time:update_all'],
    'time_entries:delete': ['project_time:delete'],
    // Employee permissions get more granular
    'employees:read': ['employees:read', 'employees:read_sensitive'],
    'employees:create': ['employees:create', 'employee_onboarding:manage'],
    'employees:update': ['employees:update'],
    'employees:delete': ['employees:delete'],
};
async function previewMigration() {
    const client = await db_1.pool.connect();
    try {
        // Get existing permissions
        const existingPermsResult = await client.query('SELECT resource, action FROM permissions');
        const existingPerms = new Set(existingPermsResult.rows.map(p => `${p.resource}:${p.action}`));
        // Find which permissions will be added
        const newPermissions = GRANULAR_PERMISSIONS.filter(p => !existingPerms.has(`${p.resource}:${p.action}`));
        // Get all roles with their current permissions
        const rolesResult = await client.query(`
      SELECT 
        r.id, r.name, r.description,
        json_agg(json_build_object(
          'resource', p.resource,
          'action', p.action
        )) as permissions
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      WHERE NOT r.is_system_role
      GROUP BY r.id, r.name, r.description
    `);
        // Calculate what permissions each role will receive
        const roleUpdates = rolesResult.rows.map(role => {
            const currentPerms = role.permissions.filter((p) => p.resource !== null);
            const newPermsForRole = [];
            currentPerms.forEach((perm) => {
                const key = `${perm.resource}:${perm.action}`;
                const mappedPerms = PERMISSION_MAPPING[key];
                if (mappedPerms) {
                    mappedPerms.forEach(newPerm => {
                        if (!newPermsForRole.includes(newPerm)) {
                            newPermsForRole.push(newPerm);
                        }
                    });
                }
            });
            return {
                roleId: role.id,
                roleName: role.name,
                currentPermissionCount: currentPerms.length,
                newPermissions: newPermsForRole,
                newPermissionCount: newPermsForRole.length
            };
        });
        return {
            success: true,
            preview: {
                newPermissionsToAdd: newPermissions,
                newPermissionCount: newPermissions.length,
                roleUpdates,
                totalRolesAffected: roleUpdates.filter(r => r.newPermissionCount > 0).length
            }
        };
    }
    catch (error) {
        console.error('Preview migration error:', error);
        return {
            success: false,
            error: error.message
        };
    }
    finally {
        client.release();
    }
}
async function executeMigration() {
    const client = await db_1.pool.connect();
    try {
        await client.query('BEGIN');
        const report = {
            permissionsAdded: 0,
            permissionsSkipped: 0,
            rolesUpdated: 0,
            permissionIdsAdded: [],
            errors: []
        };
        // Step 1: Add new permissions that don't exist yet
        console.log('Step 1: Adding new granular permissions...');
        const existingPermsResult = await client.query('SELECT resource, action FROM permissions');
        const existingPerms = new Set(existingPermsResult.rows.map(p => `${p.resource}:${p.action}`));
        for (const perm of GRANULAR_PERMISSIONS) {
            const key = `${perm.resource}:${perm.action}`;
            if (!existingPerms.has(key)) {
                try {
                    const result = await client.query('INSERT INTO permissions (resource, action, description) VALUES ($1, $2, $3) RETURNING id', [perm.resource, perm.action, perm.description]);
                    report.permissionsAdded++;
                    report.permissionIdsAdded.push(result.rows[0].id);
                    console.log(`✓ Added: ${key}`);
                }
                catch (error) {
                    report.errors.push(`Failed to add ${key}: ${error.message}`);
                    console.error(`✗ Failed to add ${key}:`, error.message);
                }
            }
            else {
                report.permissionsSkipped++;
            }
        }
        // Step 2: Update role permissions based on mapping
        console.log('\nStep 2: Updating role permissions...');
        const rolesResult = await client.query(`
      SELECT 
        r.id, r.name,
        array_agg(p.id) as permission_ids,
        array_agg(p.resource || ':' || p.action) as permission_keys
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      WHERE NOT r.is_system_role AND p.id IS NOT NULL
      GROUP BY r.id, r.name
    `);
        for (const role of rolesResult.rows) {
            const currentPermKeys = role.permission_keys || [];
            const newPermsToAdd = [];
            // Apply mapping rules
            currentPermKeys.forEach((key) => {
                const mappedPerms = PERMISSION_MAPPING[key];
                if (mappedPerms) {
                    mappedPerms.forEach(newPerm => {
                        if (!newPermsToAdd.includes(newPerm)) {
                            newPermsToAdd.push(newPerm);
                        }
                    });
                }
            });
            if (newPermsToAdd.length > 0) {
                // Get IDs for new permissions
                for (const permKey of newPermsToAdd) {
                    const [resource, action] = permKey.split(':');
                    const permResult = await client.query('SELECT id FROM permissions WHERE resource = $1 AND action = $2', [resource, action]);
                    if (permResult.rows.length > 0) {
                        const permId = permResult.rows[0].id;
                        // Check if already assigned
                        const existingAssignment = await client.query('SELECT 1 FROM role_permissions WHERE role_id = $1 AND permission_id = $2', [role.id, permId]);
                        if (existingAssignment.rows.length === 0) {
                            await client.query('INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)', [role.id, permId]);
                            console.log(`✓ Assigned ${permKey} to role ${role.name}`);
                        }
                    }
                }
                report.rolesUpdated++;
            }
        }
        await client.query('COMMIT');
        console.log('\n✅ Migration completed successfully!');
        console.log(`- Permissions added: ${report.permissionsAdded}`);
        console.log(`- Permissions skipped (already exist): ${report.permissionsSkipped}`);
        console.log(`- Roles updated: ${report.rolesUpdated}`);
        return {
            success: true,
            report
        };
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
    finally {
        client.release();
    }
}
// Check if migration has been run
async function checkMigrationStatus() {
    const client = await db_1.pool.connect();
    try {
        // Check if any of the new granular permissions exist
        const result = await client.query(`
      SELECT COUNT(*) as count
      FROM permissions
      WHERE resource IN ('projects_contracts', 'project_time', 'petty_cash', 'debit_cards')
    `);
        const granularPermsExist = parseInt(result.rows[0].count) > 0;
        // Count total granular permissions that exist
        const allGranularCheck = await client.query(`
      SELECT COUNT(*) as count
      FROM permissions
      WHERE resource IN (
        'projects_contracts', 'project_time', 'quotes',
        'payables', 'receivables', 'assets', 'petty_cash', 'debit_cards',
        'accounts', 'loans', 'purchase_orders', 'subscriptions',
        'employees', 'employee_onboarding', 'payroll', 'pto', 'time_entries',
        'vendors', 'notes', 'todos', 'analytics', 'documents', 'settings'
      )
    `);
        const existingGranularCount = parseInt(allGranularCheck.rows[0].count);
        const totalGranularPermissions = GRANULAR_PERMISSIONS.length;
        return {
            migrationComplete: granularPermsExist && existingGranularCount >= (totalGranularPermissions * 0.9), // 90% threshold
            existingGranularPermissions: existingGranularCount,
            totalGranularPermissions,
            percentComplete: Math.round((existingGranularCount / totalGranularPermissions) * 100)
        };
    }
    catch (error) {
        return {
            migrationComplete: false,
            error: error.message
        };
    }
    finally {
        client.release();
    }
}
