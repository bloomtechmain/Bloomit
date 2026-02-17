/**
 * Granular Permission Hierarchy Configuration
 * This defines all feature-level permissions across the entire system
 */

export type PermissionAction = 'read' | 'create' | 'update' | 'delete' | 'approve' | 'manage' | 'send' | 'process' | 'view' | 'upload' | 'download' | 'configure' | 'read_own' | 'update_own' | 'read_all' | 'update_all' | 'read_sensitive' | 'edit_own' | 'view_all'

export interface Permission {
  resource: string
  action: PermissionAction
  label: string
  description?: string
}

export interface Feature {
  name: string
  key: string
  icon: string
  permissions: Permission[]
}

export interface PermissionModule {
  name: string
  key: string
  icon: string
  color: string
  features: Feature[]
}

export const PERMISSION_HIERARCHY: PermissionModule[] = [
  // ========================================
  // PROJECTS MODULE
  // ========================================
  {
    name: 'Projects Module',
    key: 'projects_module',
    icon: '📊',
    color: '#8884D8',
    features: [
      {
        name: 'Projects Management',
        key: 'projects',
        icon: '📋',
        permissions: [
          { resource: 'projects', action: 'read', label: 'View Projects', description: 'View all projects and related details' },
          { resource: 'projects', action: 'create', label: 'Create Projects', description: 'Create new projects' },
          { resource: 'projects', action: 'update', label: 'Edit Projects', description: 'Edit existing projects' },
          { resource: 'projects', action: 'delete', label: 'Delete Projects', description: 'Delete projects' },
        ]
      },
      {
        name: 'Contracts Management',
        key: 'contracts',
        icon: '📄',
        permissions: [
          { resource: 'contracts', action: 'read', label: 'View Contracts', description: 'View all contracts' },
          { resource: 'contracts', action: 'create', label: 'Create Contracts', description: 'Create new contracts' },
          { resource: 'contracts', action: 'update', label: 'Edit Contracts', description: 'Edit existing contracts' },
          { resource: 'contracts', action: 'delete', label: 'Delete Contracts', description: 'Delete contracts' },
        ]
      },
      {
        name: 'Time Tracking',
        key: 'time_entries',
        icon: '⏱️',
        permissions: [
          { resource: 'time_entries', action: 'read', label: 'View Time Entries', description: 'View time entries' },
          { resource: 'time_entries', action: 'create', label: 'Log Time', description: 'Create new time entries' },
          { resource: 'time_entries', action: 'update', label: 'Edit Time Entries', description: 'Edit time entries' },
          { resource: 'time_entries', action: 'delete', label: 'Delete Time Entries', description: 'Delete time entries' },
          { resource: 'time_entries', action: 'edit_own', label: 'Edit Own Time', description: 'Edit your own time entries only' },
          { resource: 'time_entries', action: 'view_all', label: 'View All Time', description: 'View time entries from all employees' },
        ]
      },
      {
        name: 'Quotes & Proposals',
        key: 'quotes',
        icon: '📝',
        permissions: [
          { resource: 'quotes', action: 'read', label: 'View Quotes', description: 'View all quotes and proposals' },
          { resource: 'quotes', action: 'create', label: 'Create Quotes', description: 'Create new quotes' },
          { resource: 'quotes', action: 'update', label: 'Edit Quotes', description: 'Edit quotes' },
          { resource: 'quotes', action: 'delete', label: 'Delete Quotes', description: 'Delete quotes' },
          { resource: 'quotes', action: 'send', label: 'Send Quotes', description: 'Send quotes to clients via email' },
        ]
      },
    ]
  },

  // ========================================
  // FINANCIAL MANAGEMENT MODULE
  // ========================================
  {
    name: 'Financial Management',
    key: 'financial_module',
    icon: '💰',
    color: '#82CA9D',
    features: [
      {
        name: 'Accounts Payable',
        key: 'payables',
        icon: '📤',
        permissions: [
          { resource: 'payables', action: 'read', label: 'View Payables', description: 'View accounts payable records' },
          { resource: 'payables', action: 'create', label: 'Create Payables', description: 'Create new payable entries' },
          { resource: 'payables', action: 'update', label: 'Edit Payables', description: 'Edit payable records' },
          { resource: 'payables', action: 'delete', label: 'Delete Payables', description: 'Delete payable records' },
          { resource: 'payables', action: 'approve', label: 'Approve Payments', description: 'Approve payable payments' },
        ]
      },
      {
        name: 'Accounts Receivable',
        key: 'receivables',
        icon: '📥',
        permissions: [
          { resource: 'receivables', action: 'read', label: 'View Receivables', description: 'View accounts receivable records' },
          { resource: 'receivables', action: 'create', label: 'Create Receivables', description: 'Create new receivable entries' },
          { resource: 'receivables', action: 'update', label: 'Edit Receivables', description: 'Edit receivable records' },
          { resource: 'receivables', action: 'delete', label: 'Delete Receivables', description: 'Delete receivable records' },
        ]
      },
      {
        name: 'Assets Management',
        key: 'assets',
        icon: '🏢',
        permissions: [
          { resource: 'assets', action: 'read', label: 'View Assets', description: 'View company assets and depreciation' },
          { resource: 'assets', action: 'create', label: 'Register Assets', description: 'Register new assets' },
          { resource: 'assets', action: 'update', label: 'Edit Assets', description: 'Edit asset information' },
          { resource: 'assets', action: 'delete', label: 'Delete Assets', description: 'Delete asset records' },
        ]
      },
      {
        name: 'Petty Cash',
        key: 'petty_cash',
        icon: '💵',
        permissions: [
          { resource: 'petty_cash', action: 'read', label: 'View Petty Cash', description: 'View petty cash transactions' },
          { resource: 'petty_cash', action: 'create', label: 'Record Transactions', description: 'Record petty cash transactions' },
          { resource: 'petty_cash', action: 'update', label: 'Edit Transactions', description: 'Edit petty cash transactions' },
          { resource: 'petty_cash', action: 'delete', label: 'Delete Transactions', description: 'Delete petty cash transactions' },
        ]
      },
      {
        name: 'Debit Cards',
        key: 'debit_cards',
        icon: '💳',
        permissions: [
          { resource: 'debit_cards', action: 'read', label: 'View Card Transactions', description: 'View debit card transactions' },
          { resource: 'debit_cards', action: 'create', label: 'Add Transactions', description: 'Add debit card transactions' },
          { resource: 'debit_cards', action: 'update', label: 'Edit Transactions', description: 'Edit card transactions' },
          { resource: 'debit_cards', action: 'delete', label: 'Delete Transactions', description: 'Delete card transactions' },
        ]
      },
      {
        name: 'Bank Accounts',
        key: 'accounts',
        icon: '🏦',
        permissions: [
          { resource: 'accounts', action: 'read', label: 'View Bank Accounts', description: 'View bank account information' },
          { resource: 'accounts', action: 'create', label: 'Add Bank Accounts', description: 'Add new bank accounts' },
          { resource: 'accounts', action: 'update', label: 'Edit Bank Accounts', description: 'Edit bank account details' },
          { resource: 'accounts', action: 'delete', label: 'Delete Bank Accounts', description: 'Delete bank accounts' },
        ]
      },
      {
        name: 'Loans Management',
        key: 'loans',
        icon: '🏦',
        permissions: [
          { resource: 'loans', action: 'read', label: 'View Loans', description: 'View loan information' },
          { resource: 'loans', action: 'create', label: 'Create Loans', description: 'Create new loan records' },
          { resource: 'loans', action: 'update', label: 'Edit Loans', description: 'Edit loan information' },
          { resource: 'loans', action: 'delete', label: 'Delete Loans', description: 'Delete loan records' },
        ]
      },
      {
        name: 'Purchase Orders',
        key: 'purchase_orders',
        icon: '📦',
        permissions: [
          { resource: 'purchase_orders', action: 'read', label: 'View Purchase Orders', description: 'View purchase orders' },
          { resource: 'purchase_orders', action: 'create', label: 'Create Purchase Orders', description: 'Create new purchase orders' },
          { resource: 'purchase_orders', action: 'update', label: 'Edit Purchase Orders', description: 'Edit purchase orders' },
          { resource: 'purchase_orders', action: 'delete', label: 'Delete Purchase Orders', description: 'Delete purchase orders' },
          { resource: 'purchase_orders', action: 'approve', label: 'Approve Purchase Orders', description: 'Approve purchase orders for processing' },
        ]
      },
      {
        name: 'Subscriptions',
        key: 'subscriptions',
        icon: '🔄',
        permissions: [
          { resource: 'subscriptions', action: 'read', label: 'View Subscriptions', description: 'View subscription information' },
          { resource: 'subscriptions', action: 'create', label: 'Add Subscriptions', description: 'Add new subscriptions' },
          { resource: 'subscriptions', action: 'update', label: 'Edit Subscriptions', description: 'Edit subscription details' },
          { resource: 'subscriptions', action: 'delete', label: 'Delete Subscriptions', description: 'Delete subscriptions' },
        ]
      },
    ]
  },

  // ========================================
  // HUMAN RESOURCES MODULE
  // ========================================
  {
    name: 'Human Resources',
    key: 'hr_module',
    icon: '👥',
    color: '#FFA726',
    features: [
      {
        name: 'Employee Directory',
        key: 'employees',
        icon: '👤',
        permissions: [
          { resource: 'employees', action: 'read', label: 'View Employee Directory', description: 'View basic employee information' },
          { resource: 'employees', action: 'read_sensitive', label: 'View Sensitive Info', description: 'View salary, SSN, and other sensitive data' },
          { resource: 'employees', action: 'create', label: 'Add Employees', description: 'Add new employees' },
          { resource: 'employees', action: 'update', label: 'Edit Employee Info', description: 'Edit employee information' },
          { resource: 'employees', action: 'delete', label: 'Delete Employees', description: 'Delete employee records' },
        ]
      },
      {
        name: 'Employee Onboarding',
        key: 'employee_onboarding',
        icon: '🎯',
        permissions: [
          { resource: 'employee_onboarding', action: 'manage', label: 'Manage Onboarding', description: 'Manage employee onboarding process' },
          { resource: 'employee_onboarding', action: 'view', label: 'View Onboarding Status', description: 'View onboarding status and progress' },
        ]
      },
      {
        name: 'Payroll Management',
        key: 'payroll',
        icon: '💼',
        permissions: [
          { resource: 'payroll', action: 'read', label: 'View Payroll', description: 'View payroll information' },
          { resource: 'payroll', action: 'create', label: 'Create Payroll', description: 'Create payroll entries' },
          { resource: 'payroll', action: 'update', label: 'Edit Payroll', description: 'Edit payroll information' },
          { resource: 'payroll', action: 'process', label: 'Process Payroll', description: 'Process and finalize payroll' },
          { resource: 'payroll', action: 'approve', label: 'Approve Payroll', description: 'Approve payroll for payment' },
        ]
      },
      {
        name: 'PTO Management',
        key: 'pto',
        icon: '🏖️',
        permissions: [
          { resource: 'pto', action: 'read_all', label: 'View All PTO Requests', description: 'View PTO requests from all employees' },
          { resource: 'pto', action: 'read_own', label: 'View Own PTO', description: 'View own PTO requests and balance' },
          { resource: 'pto', action: 'create', label: 'Request PTO', description: 'Submit PTO requests' },
          { resource: 'pto', action: 'approve', label: 'Approve PTO Requests', description: 'Approve or reject PTO requests' },
          { resource: 'pto', action: 'delete', label: 'Delete PTO Requests', description: 'Delete PTO requests' },
        ]
      },
      {
        name: 'Time Entries (HR View)',
        key: 'time_entries',
        icon: '⏰',
        permissions: [
          { resource: 'time_entries', action: 'read_all', label: 'View All Time Entries', description: 'View time entries from all employees' },
          { resource: 'time_entries', action: 'read_own', label: 'View Own Entries', description: 'View own time entries' },
          { resource: 'time_entries', action: 'manage', label: 'Manage Time Entries', description: 'Full management of time entry system' },
        ]
      },
    ]
  },

  // ========================================
  // VENDORS MODULE
  // ========================================
  {
    name: 'Vendors & Suppliers',
    key: 'vendors_module',
    icon: '🏢',
    color: '#AB47BC',
    features: [
      {
        name: 'Vendor Management',
        key: 'vendors',
        icon: '📇',
        permissions: [
          { resource: 'vendors', action: 'read', label: 'View Vendors', description: 'View vendor information' },
          { resource: 'vendors', action: 'create', label: 'Add Vendors', description: 'Add new vendors' },
          { resource: 'vendors', action: 'update', label: 'Edit Vendors', description: 'Edit vendor information' },
          { resource: 'vendors', action: 'delete', label: 'Delete Vendors', description: 'Delete vendor records' },
        ]
      },
    ]
  },

  // ========================================
  // COLLABORATION MODULE
  // ========================================
  {
    name: 'Collaboration Tools',
    key: 'collaboration_module',
    icon: '📝',
    color: '#29B6F6',
    features: [
      {
        name: 'Notes',
        key: 'notes',
        icon: '📌',
        permissions: [
          { resource: 'notes', action: 'read', label: 'View Notes', description: 'View notes and comments' },
          { resource: 'notes', action: 'create', label: 'Create Notes', description: 'Create new notes' },
          { resource: 'notes', action: 'update', label: 'Edit Notes', description: 'Edit notes' },
          { resource: 'notes', action: 'delete', label: 'Delete Notes', description: 'Delete notes' },
        ]
      },
      {
        name: 'To-Do Lists',
        key: 'todos',
        icon: '✅',
        permissions: [
          { resource: 'todos', action: 'read', label: 'View Todos', description: 'View to-do items' },
          { resource: 'todos', action: 'create', label: 'Create Todos', description: 'Create new to-do items' },
          { resource: 'todos', action: 'update', label: 'Edit Todos', description: 'Edit to-do items' },
          { resource: 'todos', action: 'delete', label: 'Delete Todos', description: 'Delete to-do items' },
        ]
      },
    ]
  },

  // ========================================
  // ANALYTICS MODULE
  // ========================================
  {
    name: 'Analytics & Reporting',
    key: 'analytics_module',
    icon: '📈',
    color: '#66BB6A',
    features: [
      {
        name: 'Analytics Dashboard',
        key: 'analytics',
        icon: '📊',
        permissions: [
          { resource: 'analytics', action: 'view', label: 'View Analytics Dashboard', description: 'Access main analytics dashboard' },
          { resource: 'analytics', action: 'read', label: 'View Financial Reports', description: 'View financial analytics and reports' },
          { resource: 'analytics', action: 'manage', label: 'Manage Analytics', description: 'Full analytics management and configuration' },
        ]
      },
    ]
  },

  // ========================================
  // DOCUMENTS MODULE
  // ========================================
  {
    name: 'Document Management',
    key: 'documents_module',
    icon: '📄',
    color: '#EF5350',
    features: [
      {
        name: 'Document Bank',
        key: 'documents',
        icon: '🗂️',
        permissions: [
          { resource: 'documents', action: 'read', label: 'View Documents', description: 'View documents in the document bank' },
          { resource: 'documents', action: 'upload', label: 'Upload Documents', description: 'Upload new documents' },
          { resource: 'documents', action: 'update', label: 'Edit Documents', description: 'Edit document metadata' },
          { resource: 'documents', action: 'delete', label: 'Delete Documents', description: 'Delete documents' },
          { resource: 'documents', action: 'download', label: 'Download Documents', description: 'Download documents' },
        ]
      },
    ]
  },

  // ========================================
  // SETTINGS MODULE
  // ========================================
  {
    name: 'System Settings',
    key: 'settings_module',
    icon: '⚙️',
    color: '#78909C',
    features: [
      {
        name: 'RBAC & User Management',
        key: 'settings',
        icon: '🔐',
        permissions: [
          { resource: 'settings', action: 'manage', label: 'Full Settings Access', description: 'Complete access to all settings and RBAC' },
          { resource: 'settings', action: 'view', label: 'View Settings', description: 'View settings without modification' },
        ]
      },
      {
        name: 'Application Configuration',
        key: 'app_settings',
        icon: '🔧',
        permissions: [
          { resource: 'settings', action: 'configure', label: 'Configure App Settings', description: 'Configure application-wide settings' },
        ]
      },
    ]
  },
]

/**
 * Get all permissions as a flat array
 */
export function getAllPermissions(): Permission[] {
  const permissions: Permission[] = []
  PERMISSION_HIERARCHY.forEach(module => {
    module.features.forEach(feature => {
      permissions.push(...feature.permissions)
    })
  })
  return permissions
}

/**
 * Get permission label by resource and action
 */
export function getPermissionLabel(resource: string, action: string): string {
  const allPermissions = getAllPermissions()
  const permission = allPermissions.find(p => p.resource === resource && p.action === action)
  return permission?.label || `${resource}:${action}`
}

/**
 * Get module by key
 */
export function getModuleByKey(key: string): PermissionModule | undefined {
  return PERMISSION_HIERARCHY.find(m => m.key === key)
}

/**
 * Get feature by key
 */
export function getFeatureByKey(featureKey: string): { module: PermissionModule; feature: Feature } | undefined {
  for (const module of PERMISSION_HIERARCHY) {
    const feature = module.features.find(f => f.key === featureKey)
    if (feature) {
      return { module, feature }
    }
  }
  return undefined
}

/**
 * Count total permissions
 */
export function getTotalPermissionCount(): number {
  return getAllPermissions().length
}
