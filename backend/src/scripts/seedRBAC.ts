import { pool } from '../db'

async function main() {
  console.log('🌱 Seeding RBAC data...')

  // Define all permissions with comprehensive module coverage
  const permissions = [
    // ==================== EMPLOYEES ====================
    { resource: 'employees', action: 'create', description: 'Create new employees' },
    { resource: 'employees', action: 'read', description: 'View employee information' },
    { resource: 'employees', action: 'update', description: 'Update employee details' },
    { resource: 'employees', action: 'delete', description: 'Delete employees' },
    
    // ==================== PROJECTS ====================
    { resource: 'projects', action: 'create', description: 'Create new projects' },
    { resource: 'projects', action: 'read', description: 'View project information' },
    { resource: 'projects', action: 'update', description: 'Update project details' },
    { resource: 'projects', action: 'delete', description: 'Delete projects' },
    { resource: 'projects', action: 'manage_items', description: 'Manage project items and sub-tasks' },
    { resource: 'projects', action: 'manage_budget', description: 'Manage project budgets and financials' },
    
    // ==================== CONTRACTS ====================
    { resource: 'contracts', action: 'create', description: 'Create new contracts' },
    { resource: 'contracts', action: 'read', description: 'View contract information' },
    { resource: 'contracts', action: 'update', description: 'Update contract details' },
    { resource: 'contracts', action: 'delete', description: 'Delete contracts' },
    { resource: 'contracts', action: 'manage_items', description: 'Manage contract line items' },
    
    // ==================== ACCOUNTS ====================
    { resource: 'accounts', action: 'create', description: 'Create bank accounts' },
    { resource: 'accounts', action: 'read', description: 'View account information' },
    { resource: 'accounts', action: 'update', description: 'Update account details' },
    { resource: 'accounts', action: 'delete', description: 'Delete accounts' },
    { resource: 'accounts', action: 'reconcile', description: 'Reconcile bank accounts' },
    
    // ==================== PAYABLES ====================
    { resource: 'payables', action: 'create', description: 'Create payable bills' },
    { resource: 'payables', action: 'read', description: 'View payable information' },
    { resource: 'payables', action: 'update', description: 'Update payable details' },
    { resource: 'payables', action: 'delete', description: 'Delete payables' },
    { resource: 'payables', action: 'approve', description: 'Approve payables for payment' },
    { resource: 'payables', action: 'pay', description: 'Process payments for payables' },
    
    // ==================== RECEIVABLES ====================
    { resource: 'receivables', action: 'create', description: 'Create receivable invoices' },
    { resource: 'receivables', action: 'read', description: 'View receivable information' },
    { resource: 'receivables', action: 'update', description: 'Update receivable details' },
    { resource: 'receivables', action: 'delete', description: 'Delete receivables' },
    { resource: 'receivables', action: 'approve', description: 'Approve receivables' },
    { resource: 'receivables', action: 'collect', description: 'Record payment collections' },
    
    // ==================== ASSETS ====================
    { resource: 'assets', action: 'create', description: 'Create assets' },
    { resource: 'assets', action: 'read', description: 'View asset information' },
    { resource: 'assets', action: 'update', description: 'Update asset details' },
    { resource: 'assets', action: 'delete', description: 'Delete assets' },
    { resource: 'assets', action: 'depreciate', description: 'Calculate and manage asset depreciation' },
    
    // ==================== VENDORS ====================
    { resource: 'vendors', action: 'create', description: 'Create vendors' },
    { resource: 'vendors', action: 'read', description: 'View vendor information' },
    { resource: 'vendors', action: 'update', description: 'Update vendor details' },
    { resource: 'vendors', action: 'delete', description: 'Delete vendors' },
    
    // ==================== TIME ENTRIES ====================
    { resource: 'time_entries', action: 'submit_own', description: 'Submit own time entries' },
    { resource: 'time_entries', action: 'view_own', description: 'View own time entries' },
    { resource: 'time_entries', action: 'edit_own', description: 'Edit own pending time entries' },
    { resource: 'time_entries', action: 'delete_own', description: 'Delete own pending time entries' },
    { resource: 'time_entries', action: 'view_all', description: 'View all employee time entries' },
    { resource: 'time_entries', action: 'approve', description: 'Approve time entries' },
    { resource: 'time_entries', action: 'reject', description: 'Reject time entries' },
    
    // ==================== PETTY CASH ====================
    { resource: 'petty_cash', action: 'create', description: 'Create petty cash transactions' },
    { resource: 'petty_cash', action: 'read', description: 'View petty cash information' },
    { resource: 'petty_cash', action: 'update', description: 'Update petty cash details' },
    { resource: 'petty_cash', action: 'reconcile', description: 'Reconcile petty cash account' },
    
    // ==================== DEBIT CARDS ====================
    { resource: 'debit_cards', action: 'create', description: 'Create debit card records' },
    { resource: 'debit_cards', action: 'read', description: 'View debit card information' },
    { resource: 'debit_cards', action: 'update', description: 'Update debit card details' },
    { resource: 'debit_cards', action: 'delete', description: 'Delete debit cards' },
    
    // ==================== NOTES ====================
    { resource: 'notes', action: 'create', description: 'Create notes' },
    { resource: 'notes', action: 'read', description: 'View notes' },
    { resource: 'notes', action: 'update', description: 'Update notes' },
    { resource: 'notes', action: 'delete', description: 'Delete notes' },
    
    // ==================== TODOS ====================
    { resource: 'todos', action: 'create', description: 'Create todos' },
    { resource: 'todos', action: 'read', description: 'View todos' },
    { resource: 'todos', action: 'update', description: 'Update todos' },
    { resource: 'todos', action: 'delete', description: 'Delete todos' },
    
    // ==================== ANALYTICS ====================
    { resource: 'analytics', action: 'read', description: 'View analytics and reports' },
    { resource: 'analytics', action: 'export', description: 'Export analytics data' },
    
    // ==================== SETTINGS ====================
    { resource: 'settings', action: 'read', description: 'View settings' },
    { resource: 'settings', action: 'manage', description: 'Manage roles and permissions' },
    
    // ==================== QUOTES ====================
    { resource: 'quotes', action: 'create', description: 'Create quotes' },
    { resource: 'quotes', action: 'read', description: 'View quotes' },
    { resource: 'quotes', action: 'update', description: 'Update quotes' },
    { resource: 'quotes', action: 'delete', description: 'Delete quotes' },
    { resource: 'quotes', action: 'manage', description: 'Full quote management (create, edit, status, assign)' },
    { resource: 'quotes', action: 'export', description: 'Export quotes to PDF' },
    
    // ==================== PAYROLL ====================
    { resource: 'payroll', action: 'view_all', description: 'View all payslips' },
    { resource: 'payroll', action: 'create', description: 'Create payslips' },
    { resource: 'payroll', action: 'edit', description: 'Edit draft payslips' },
    { resource: 'payroll', action: 'delete', description: 'Delete draft payslips' },
    { resource: 'payroll', action: 'staff_approve', description: 'Staff Accountant approval' },
    { resource: 'payroll', action: 'admin_approve', description: 'Admin approval' },
    { resource: 'payroll', action: 'view_own', description: 'Employees view their own payslips' },
    { resource: 'payroll', action: 'manage_employee_data', description: 'Update employee salary and allowances' },
    { resource: 'payroll', action: 'view_reports', description: 'Access payroll reports' },
  ]

  // Insert permissions
  console.log('📝 Inserting permissions...')
  for (const perm of permissions) {
    await pool.query(
      `INSERT INTO permissions (resource, action, description) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (resource, action) DO UPDATE 
       SET description = EXCLUDED.description`,
      [perm.resource, perm.action, perm.description]
    )
  }
  console.log(`✅ ${permissions.length} permissions inserted/updated`)

  // Define default roles
  const roles = [
    { name: 'Super Admin', description: 'Full system access with all permissions', is_system_role: true },
    { name: 'Admin', description: 'Administrative access to most resources', is_system_role: false },
    { name: 'Accountant', description: 'Full access to accounting and financial modules', is_system_role: false },
    { name: 'Project Manager', description: 'Manage projects, contracts, and approve time entries', is_system_role: false },
    { name: 'Employee', description: 'Basic access for regular employees (time tracking, own data)', is_system_role: false },
    { name: 'Viewer', description: 'Read-only access to most modules', is_system_role: false },
  ]

  // Insert roles
  console.log('👥 Inserting roles...')
  const roleIds: Record<string, number> = {}
  for (const role of roles) {
    const result = await pool.query(
      `INSERT INTO roles (name, description, is_system_role) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (name) DO UPDATE 
       SET description = EXCLUDED.description, is_system_role = EXCLUDED.is_system_role
       RETURNING id`,
      [role.name, role.description, role.is_system_role]
    )
    roleIds[role.name] = result.rows[0].id
  }
  console.log(`✅ ${roles.length} roles inserted/updated`)

  // Get all permission IDs
  const allPermissions = await pool.query('SELECT id, resource, action FROM permissions')
  const permissionMap: Record<string, number> = {}
  allPermissions.rows.forEach((p: any) => {
    permissionMap[`${p.resource}:${p.action}`] = p.id
  })

  // Helper function to assign permissions
  const assignPermissions = async (roleName: string, permissions: string[]) => {
    // Delete existing permissions for this role
    await pool.query('DELETE FROM role_permissions WHERE role_id = $1', [roleIds[roleName]])
    
    // Insert new permissions
    for (const perm of permissions) {
      if (permissionMap[perm]) {
        await pool.query(
          `INSERT INTO role_permissions (role_id, permission_id) 
           VALUES ($1, $2) 
           ON CONFLICT DO NOTHING`,
          [roleIds[roleName], permissionMap[perm]]
        )
      } else {
        console.warn(`⚠️  Permission not found: ${perm}`)
      }
    }
    console.log(`✅ ${roleName}: ${permissions.length} permissions assigned`)
  }

  // Define role-permission mappings
  console.log('🔗 Assigning permissions to roles...')

  // ==================== SUPER ADMIN ====================
  // Gets ALL permissions
  const superAdminPerms = Object.keys(permissionMap)
  await assignPermissions('Super Admin', superAdminPerms)

  // ==================== ADMIN ====================
  // Gets most permissions except settings:manage
  const adminPerms = [
    // Employees
    'employees:create', 'employees:read', 'employees:update', 'employees:delete',
    // Projects
    'projects:create', 'projects:read', 'projects:update', 'projects:delete', 'projects:manage_items', 'projects:manage_budget',
    // Contracts
    'contracts:create', 'contracts:read', 'contracts:update', 'contracts:delete', 'contracts:manage_items',
    // Vendors
    'vendors:create', 'vendors:read', 'vendors:update', 'vendors:delete',
    // Accounts
    'accounts:create', 'accounts:read', 'accounts:update', 'accounts:delete', 'accounts:reconcile',
    // Payables
    'payables:create', 'payables:read', 'payables:update', 'payables:delete', 'payables:approve', 'payables:pay',
    // Receivables
    'receivables:create', 'receivables:read', 'receivables:update', 'receivables:delete', 'receivables:approve', 'receivables:collect',
    // Assets
    'assets:create', 'assets:read', 'assets:update', 'assets:delete', 'assets:depreciate',
    // Time Entries
    'time_entries:submit_own', 'time_entries:view_own', 'time_entries:edit_own', 'time_entries:delete_own', 
    'time_entries:view_all', 'time_entries:approve', 'time_entries:reject',
    // Petty Cash
    'petty_cash:create', 'petty_cash:read', 'petty_cash:update', 'petty_cash:reconcile',
    // Debit Cards
    'debit_cards:create', 'debit_cards:read', 'debit_cards:update', 'debit_cards:delete',
    // Notes & Todos
    'notes:create', 'notes:read', 'notes:update', 'notes:delete',
    'todos:create', 'todos:read', 'todos:update', 'todos:delete',
    // Analytics
    'analytics:read', 'analytics:export',
    // Settings (read only)
    'settings:read',
    // Quotes
    'quotes:create', 'quotes:read', 'quotes:update', 'quotes:delete', 'quotes:manage', 'quotes:export',
    // Payroll (full access except create - that's for accountants)
    'payroll:view_all', 'payroll:edit', 'payroll:delete', 'payroll:staff_approve', 'payroll:admin_approve', 
    'payroll:manage_employee_data', 'payroll:view_reports',
  ]
  await assignPermissions('Admin', adminPerms)

  // ==================== ACCOUNTANT ====================
  // Full accounting/financial access
  const accountantPerms = [
    // Accounts
    'accounts:create', 'accounts:read', 'accounts:update', 'accounts:delete', 'accounts:reconcile',
    // Payables
    'payables:create', 'payables:read', 'payables:update', 'payables:delete', 'payables:approve', 'payables:pay',
    // Receivables
    'receivables:create', 'receivables:read', 'receivables:update', 'receivables:delete', 'receivables:approve', 'receivables:collect',
    // Assets
    'assets:create', 'assets:read', 'assets:update', 'assets:delete', 'assets:depreciate',
    // Petty Cash
    'petty_cash:create', 'petty_cash:read', 'petty_cash:update', 'petty_cash:reconcile',
    // Debit Cards
    'debit_cards:create', 'debit_cards:read', 'debit_cards:update', 'debit_cards:delete',
    // Vendors (read/create for expense tracking)
    'vendors:create', 'vendors:read', 'vendors:update',
    // Employees (read for payroll context)
    'employees:read',
    // Projects (read for financial reporting)
    'projects:read', 'projects:manage_budget',
    // Contracts (read for financial tracking)
    'contracts:read',
    // Time Entries (view all for payroll)
    'time_entries:view_all',
    // Notes & Todos
    'notes:create', 'notes:read', 'notes:update', 'notes:delete',
    'todos:create', 'todos:read', 'todos:update', 'todos:delete',
    // Analytics
    'analytics:read', 'analytics:export',
    // Quotes (read/create for customer proposals)
    'quotes:create', 'quotes:read', 'quotes:update', 'quotes:manage', 'quotes:export',
    // Payroll (full access including creating and approving)
    'payroll:view_all', 'payroll:create', 'payroll:edit', 'payroll:delete', 'payroll:staff_approve', 
    'payroll:manage_employee_data', 'payroll:view_reports',
  ]
  await assignPermissions('Accountant', accountantPerms)

  // ==================== PROJECT MANAGER ====================
  // Full project management + time approval
  const projectManagerPerms = [
    // Projects
    'projects:create', 'projects:read', 'projects:update', 'projects:delete', 'projects:manage_items', 'projects:manage_budget',
    // Contracts
    'contracts:create', 'contracts:read', 'contracts:update', 'contracts:delete', 'contracts:manage_items',
    // Employees (for assignment)
    'employees:read',
    // Time Entries (full access for team management)
    'time_entries:submit_own', 'time_entries:view_own', 'time_entries:edit_own', 'time_entries:delete_own',
    'time_entries:view_all', 'time_entries:approve', 'time_entries:reject',
    // Vendors (read)
    'vendors:read',
    // Accounts (read for budget tracking)
    'accounts:read',
    // Payables (read for project expenses)
    'payables:read',
    // Receivables (read for project revenue)
    'receivables:read',
    // Notes & Todos
    'notes:create', 'notes:read', 'notes:update', 'notes:delete',
    'todos:create', 'todos:read', 'todos:update', 'todos:delete',
    // Analytics
    'analytics:read', 'analytics:export',
    // Quotes (create and manage for projects)
    'quotes:create', 'quotes:read', 'quotes:update', 'quotes:manage', 'quotes:export',
  ]
  await assignPermissions('Project Manager', projectManagerPerms)

  // ==================== EMPLOYEE ====================
  // Basic employee access (own data + time tracking)
  const employeePerms = [
    // Time Entries (own only)
    'time_entries:submit_own', 'time_entries:view_own', 'time_entries:edit_own', 'time_entries:delete_own',
    // Projects (read for context)
    'projects:read',
    // Notes & Todos (personal productivity)
    'notes:create', 'notes:read', 'notes:update', 'notes:delete',
    'todos:create', 'todos:read', 'todos:update', 'todos:delete',
    // Payroll (view and sign own payslips)
    'payroll:view_own',
  ]
  await assignPermissions('Employee', employeePerms)

  // ==================== VIEWER ====================
  // Read-only access to most modules
  const viewerPerms = [
    'employees:read',
    'projects:read',
    'contracts:read',
    'accounts:read',
    'payables:read',
    'receivables:read',
    'assets:read',
    'vendors:read',
    'time_entries:view_own',
    'petty_cash:read',
    'debit_cards:read',
    'notes:read',
    'todos:read',
    'analytics:read',
    'quotes:read',
  ]
  await assignPermissions('Viewer', viewerPerms)

  // Update existing admin user to have Super Admin role
  console.log('👤 Updating admin user...')
  const adminUpdate = await pool.query(
    `INSERT INTO user_roles (user_id, role_id)
     SELECT u.id, $1
     FROM users u
     WHERE u.email = 'admin@example.com' OR u.name = 'admin'
     ON CONFLICT (user_id, role_id) DO NOTHING
     RETURNING user_id`,
    [roleIds['Super Admin']]
  )
  if (adminUpdate.rows.length > 0) {
    console.log('✅ Admin user updated with Super Admin role')
  } else {
    console.log('ℹ️  Admin user already has Super Admin role or not found')
  }

  console.log('🎉 RBAC seeding completed successfully!')
  console.log(`
📊 Summary:
   - ${permissions.length} permissions created
   - ${roles.length} roles configured
   - Permissions assigned to all roles
   - Module coverage: Complete
  `)
}

main()
  .catch((e) => {
    console.error('❌ Error seeding RBAC:', e)
    process.exitCode = 1
  })
  .finally(() => pool.end())
