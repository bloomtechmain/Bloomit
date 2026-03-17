import { useState, useEffect } from 'react'
import { API_URL } from '../config/api'
import { fetchWithAuth } from '../utils/apiClient'
import { useToast } from '../context/ToastContext'
import { Shield, Users as UsersIcon, Key, Plus, Edit2, Trash2, Save, X, Copy, CheckCircle, User, RotateCcw } from 'lucide-react'
import PermissionHierarchy from '../components/PermissionHierarchy'
import { 
  getAllEmployeesWithUserStatus,
  generateEmployeeNumber,
  onboardEmployee,
  suspendEmployee,
  reactivateEmployee,
  terminateEmployee,
  type EmployeeOnboardingData,
  type EmployeeWithUserStatus,
  type OnboardingResult
} from '../services/employeeOnboardingApi'

type Role = {
  id: number
  name: string
  description: string | null
  is_system_role: boolean
  permission_count: number
  user_count: number
  created_at: string
}

type Permission = {
  id: number
  resource: string
  action: string
  description: string | null
}

type User = {
  id: number
  name: string
  email: string
  roles: Array<{ id: number; name: string; is_system_role: boolean }>
  created_at: string
}

export default function Settings({ accessToken }: { accessToken: string }) {
  const { toast } = useToast()
  const [subTab, setSubTab] = useState<'roles' | 'permissions' | 'users' | 'profile' | 'app_settings' | 'employee_onboarding'>('roles')
  
  // Roles state
  const [roles, setRoles] = useState<Role[]>([])
  const [rolesLoading, setRolesLoading] = useState(false)
  const [isAddingRole, setIsAddingRole] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [roleName, setRoleName] = useState('')
  const [roleDescription, setRoleDescription] = useState('')
  
  // Permissions state
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [permissionsLoading, setPermissionsLoading] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [rolePermissions, setRolePermissions] = useState<number[]>([])
  const [saving, setSaving] = useState(false)
  
  // Users state
  const [users, setUsers] = useState<User[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [assigningUser, setAssigningUser] = useState<User | null>(null)
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([])
  
  // Create user state
  const [isCreatingUser, setIsCreatingUser] = useState(false)
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserRoleIds, setNewUserRoleIds] = useState<number[]>([])
  const [createdUserPassword, setCreatedUserPassword] = useState<string | null>(null)
  const [emailSentStatus, setEmailSentStatus] = useState<{ sent: boolean; error?: string } | null>(null)
  const [copied, setCopied] = useState(false)
  
  // Reset password state
  const [resettingUser, setResettingUser] = useState<User | null>(null)
  const [resetPasswordResult, setResetPasswordResult] = useState<{password: string; emailSent: boolean; error?: string} | null>(null)
  const [resetCopied, setResetCopied] = useState(false)
  
  // Profile/change password state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordChangeError, setPasswordChangeError] = useState('')

  // Application Settings state
  const [applicationTimezone, setApplicationTimezone] = useState('America/New_York')
  const [timezoneLoading, setTimezoneLoading] = useState(false)
  const [timezoneSaving, setTimezoneSaving] = useState(false)
  
  // Employee Onboarding state
  const [employees, setEmployees] = useState<EmployeeWithUserStatus[]>([])
  const [employeesLoading, setEmployeesLoading] = useState(false)
  const [isOnboardingEmployee, setIsOnboardingEmployee] = useState(false)
  const [onboardingData, setOnboardingData] = useState<Partial<EmployeeOnboardingData>>({
    roleIds: []
  })
  const [generatingNumber, setGeneratingNumber] = useState(false)
  const [onboardingResult, setOnboardingResult] = useState<OnboardingResult | null>(null)
  const [onboardingCopied, setOnboardingCopied] = useState(false)
  
  // Employee status management state
  const [suspendingEmployee, setSuspendingEmployee] = useState<EmployeeWithUserStatus | null>(null)
  const [suspendReason, setSuspendReason] = useState('')
  const [terminatingEmployee, setTerminatingEmployee] = useState<EmployeeWithUserStatus | null>(null)
  const [terminateReason, setTerminateReason] = useState('')
  const [terminateConfirm, setTerminateConfirm] = useState(false)
  const [reactivatingEmployee, setReactivatingEmployee] = useState<EmployeeWithUserStatus | null>(null)
  
  // Employee edit state
  const [editingEmployee, setEditingEmployee] = useState<EmployeeWithUserStatus | null>(null)
  const [editFormData, setEditFormData] = useState<Partial<EmployeeOnboardingData>>({})
  
  // Popular timezone options
  const timezoneOptions = [
    { value: 'America/New_York', label: 'New York (EST/EDT)' },
    { value: 'America/Chicago', label: 'Chicago (CST/CDT)' },
    { value: 'America/Denver', label: 'Denver (MST/MDT)' },
    { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)' },
    { value: 'America/Toronto', label: 'Toronto (EST/EDT)' },
    { value: 'Europe/London', label: 'London (GMT/BST)' },
    { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
    { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
    { value: 'Asia/Dubai', label: 'Dubai (GST)' },
    { value: 'Asia/Kolkata', label: 'Mumbai/Delhi (IST)' },
    { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
    { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)' },
    { value: 'Australia/Sydney', label: 'Sydney (AEDT/AEST)' },
    { value: 'Pacific/Auckland', label: 'Auckland (NZDT/NZST)' }
  ]
  
  // Fetch roles
  const fetchRoles = async () => {
    setRolesLoading(true)
    try {
      const r = await fetchWithAuth(`${API_URL}/rbac/roles`)
      if (r.ok) {
        const data = await r.json()
        setRoles(data.roles || [])
      }
    } catch (e) {
      console.error('Error fetching roles:', e)
    } finally {
      setRolesLoading(false)
    }
  }
  
  // Fetch permissions
  const fetchPermissions = async () => {
    setPermissionsLoading(true)
    try {
      const r = await fetchWithAuth(`${API_URL}/rbac/permissions`)
      if (r.ok) {
        const data = await r.json()
        setPermissions(data.permissions || [])
      }
    } catch (e) {
      console.error('Error fetching permissions:', e)
    } finally {
      setPermissionsLoading(false)
    }
  }
  
  // Fetch role permissions
  const fetchRolePermissions = async (roleId: number) => {
    try {
      const r = await fetchWithAuth(`${API_URL}/rbac/roles/${roleId}/permissions`)
      if (r.ok) {
        const data = await r.json()
        setRolePermissions(data.permissions.map((p: Permission) => p.id))
      }
    } catch (e) {
      console.error('Error fetching role permissions:', e)
    }
  }
  
  // Fetch users
  const fetchUsers = async () => {
    setUsersLoading(true)
    try {
      const r = await fetchWithAuth(`${API_URL}/rbac/users`)
      if (r.ok) {
        const data = await r.json()
        setUsers(data.users || [])
      }
    } catch (e) {
      console.error('Error fetching users:', e)
    } finally {
      setUsersLoading(false)
    }
  }
  
  // Fetch application timezone setting
  const fetchApplicationTimezone = async () => {
    setTimezoneLoading(true)
    try {
      const r = await fetchWithAuth(`${API_URL}/settings/international_timezone`)
      if (r.ok) {
        const data = await r.json()
        if (data.setting && data.setting.setting_value) {
          setApplicationTimezone(data.setting.setting_value)
        }
      }
    } catch (e) {
      console.error('Error fetching timezone:', e)
    } finally {
      setTimezoneLoading(false)
    }
  }
  
  // Save timezone setting
  const handleSaveTimezone = async () => {
    setTimezoneSaving(true)

    try {
      const r = await fetchWithAuth(`${API_URL}/settings/international_timezone`, {
        method: 'PUT',
        body: JSON.stringify({ value: applicationTimezone })
      })

      if (r.ok) {
        toast.success('Timezone updated successfully! Changes will reflect on the home page.')
      } else {
        const data = await r.json()
        toast.error(data.error || 'Failed to update timezone')
      }
    } catch (e) {
      console.error('Error saving timezone:', e)
      toast.error('Error saving timezone')
    } finally {
      setTimezoneSaving(false)
    }
  }
  
  // Fetch employees with user status
  const fetchEmployees = async () => {
    setEmployeesLoading(true)
    try {
      const data = await getAllEmployeesWithUserStatus(accessToken)
      setEmployees(data.employees || [])
    } catch (e) {
      console.error('Error fetching employees:', e)
    } finally {
      setEmployeesLoading(false)
    }
  }
  
  // Generate employee number
  const handleGenerateEmployeeNumber = async () => {
    setGeneratingNumber(true)
    try {
      const data = await generateEmployeeNumber(accessToken)
      setOnboardingData({ ...onboardingData, employee_number: data.employeeNumber })
    } catch (e) {
      console.error('Error generating employee number:', e)
      toast.error('Failed to generate employee number')
    } finally {
      setGeneratingNumber(false)
    }
  }
  
  // Submit onboarding
  const handleOnboardEmployee = async () => {
    // Validation
    if (!onboardingData.first_name || !onboardingData.last_name || !onboardingData.email || !onboardingData.employee_number) {
      toast.error('Please fill in all required fields (First Name, Last Name, Email, Employee Number)')
      return
    }
    if (!onboardingData.roleIds || onboardingData.roleIds.length === 0) {
      toast.error('Please assign at least one role')
      return
    }

    setSaving(true)
    try {
      const result = await onboardEmployee(onboardingData as EmployeeOnboardingData, accessToken)
      setOnboardingResult(result)
      setIsOnboardingEmployee(false)
      setOnboardingData({ roleIds: [] })
      fetchEmployees()
    } catch (e: any) {
      toast.error(e.message || 'Failed to onboard employee')
    } finally {
      setSaving(false)
    }
  }
  
  // Copy onboarding password to clipboard
  const handleCopyOnboardingPassword = () => {
    if (onboardingResult?.temporaryPassword) {
      navigator.clipboard.writeText(onboardingResult.temporaryPassword)
      setOnboardingCopied(true)
      setTimeout(() => setOnboardingCopied(false), 2000)
    }
  }
  
  // Handle suspend employee
  const handleSuspendEmployee = async () => {
    if (!suspendingEmployee || !suspendReason.trim()) return

    setSaving(true)
    try {
      await suspendEmployee(suspendingEmployee.employee_id, suspendReason, accessToken)
      toast.success('Employee suspended successfully')
      setSuspendingEmployee(null)
      setSuspendReason('')
      fetchEmployees()
    } catch (e: any) {
      toast.error(e.message || 'Failed to suspend employee')
    } finally {
      setSaving(false)
    }
  }
  
  // Handle reactivate employee
  const handleReactivateEmployee = async () => {
    if (!reactivatingEmployee) return

    setSaving(true)
    try {
      await reactivateEmployee(reactivatingEmployee.employee_id, accessToken)
      toast.success('Employee reactivated successfully')
      setReactivatingEmployee(null)
      fetchEmployees()
    } catch (e: any) {
      toast.error(e.message || 'Failed to reactivate employee')
    } finally {
      setSaving(false)
    }
  }
  
  // Handle terminate employee
  const handleTerminateEmployee = async () => {
    if (!terminatingEmployee || !terminateReason.trim() || !terminateConfirm) return

    setSaving(true)
    try {
      const result = await terminateEmployee(terminatingEmployee.employee_id, terminateReason, accessToken)
      toast.success(`Employee terminated successfully. Data will be purged on ${new Date(result.scheduledPurgeDate).toLocaleDateString()}`)
      setTerminatingEmployee(null)
      setTerminateReason('')
      setTerminateConfirm(false)
      fetchEmployees()
    } catch (e: any) {
      toast.error(e.message || 'Failed to terminate employee')
    } finally {
      setSaving(false)
    }
  }
  
  // Helper to get account status badge
  const getStatusBadge = (emp: EmployeeWithUserStatus) => {
    if (!emp.has_user_account) {
      return (
        <span style={{ padding: '4px 8px', borderRadius: 4, background: '#ff9800', color: '#fff', fontSize: 12, fontWeight: 600 }}>
          ⚠ No Account
        </span>
      )
    }
    
    switch (emp.account_status) {
      case 'suspended':
        return (
          <span 
            title={`Suspended: ${emp.suspended_reason || 'No reason provided'}`}
            style={{ padding: '4px 8px', borderRadius: 4, background: '#ff9800', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'help' }}
          >
            🟠 Suspended
          </span>
        )
      case 'terminated':
        return (
          <span 
            title={`Terminated: ${emp.terminated_reason || 'No reason provided'}. Purge date: ${emp.scheduled_purge_date ? new Date(emp.scheduled_purge_date).toLocaleDateString() : 'Unknown'}`}
            style={{ padding: '4px 8px', borderRadius: 4, background: '#f44336', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'help' }}
          >
            🔴 Terminated
          </span>
        )
      default:
        return (
          <span style={{ padding: '4px 8px', borderRadius: 4, background: '#4CAF50', color: '#fff', fontSize: 12, fontWeight: 600 }}>
            🟢 Active
          </span>
        )
    }
  }
  
  // Handle open edit employee modal
  const handleOpenEditModal = (emp: EmployeeWithUserStatus) => {
    setEditingEmployee(emp)
    setEditFormData({
      first_name: emp.first_name,
      last_name: emp.last_name,
      email: emp.email,
      phone: emp.phone,
      employee_number: emp.employee_number,
      designation: emp.designation || undefined,
      employee_department: emp.employee_department || undefined,
      hire_date: emp.hire_date,
      base_salary: emp.base_salary ? parseFloat(emp.base_salary) : undefined,
      roleIds: emp.roles.map(r => r.id)
    })
  }
  
  // Handle save edited employee
  const handleSaveEditedEmployee = async () => {
    if (!editingEmployee) return

    // Validation
    if (!editFormData.first_name || !editFormData.last_name || !editFormData.email || !editFormData.employee_number) {
      toast.error('Please fill in all required fields (First Name, Last Name, Email, Employee Number)')
      return
    }
    if (!editFormData.roleIds || editFormData.roleIds.length === 0) {
      toast.error('Please assign at least one role')
      return
    }

    setSaving(true)
    try {
      const { updateEmployeeProfile } = await import('../services/employeeOnboardingApi')
      await updateEmployeeProfile(editingEmployee.employee_id, editFormData as EmployeeOnboardingData, accessToken)
      toast.success('Employee updated successfully')
      setEditingEmployee(null)
      setEditFormData({})
      fetchEmployees()
    } catch (e: any) {
      toast.error(e.message || 'Failed to update employee')
    } finally {
      setSaving(false)
    }
  }
  
  useEffect(() => {
    if (subTab === 'roles') {
      fetchRoles()
    } else if (subTab === 'permissions') {
      fetchRoles()
      fetchPermissions()
    } else if (subTab === 'users') {
      fetchUsers()
      fetchRoles()
    } else if (subTab === 'app_settings') {
      fetchApplicationTimezone()
    } else if (subTab === 'employee_onboarding') {
      fetchEmployees()
      fetchRoles()
    }
  }, [subTab])
  
  // Create role
  const handleCreateRole = async () => {
    if (!roleName) {
      toast.error('Role name is required')
      return
    }

    setSaving(true)
    try {
      const r = await fetchWithAuth(`${API_URL}/rbac/roles`, {
        method: 'POST',
        body: JSON.stringify({ name: roleName, description: roleDescription })
      })

      if (r.ok) {
        toast.success('Role created successfully')
        setIsAddingRole(false)
        setRoleName('')
        setRoleDescription('')
        fetchRoles()
      } else {
        const data = await r.json()
        toast.error(data.message || 'Failed to create role')
      }
    } catch (e) {
      console.error('Error creating role:', e)
      toast.error('Error creating role')
    } finally {
      setSaving(false)
    }
  }
  
  // Update role
  const handleUpdateRole = async () => {
    if (!editingRole || !roleName) return

    setSaving(true)
    try {
      const r = await fetchWithAuth(`${API_URL}/rbac/roles/${editingRole.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: roleName, description: roleDescription })
      })

      if (r.ok) {
        toast.success('Role updated successfully')
        setEditingRole(null)
        setRoleName('')
        setRoleDescription('')
        fetchRoles()
      } else {
        const data = await r.json()
        toast.error(data.message || 'Failed to update role')
      }
    } catch (e) {
      console.error('Error updating role:', e)
      toast.error('Error updating role')
    } finally {
      setSaving(false)
    }
  }

  // Delete role
  const handleDeleteRole = async (role: Role) => {
    if (!confirm(`Delete role "${role.name}"? This cannot be undone.`)) return

    try {
      const r = await fetchWithAuth(`${API_URL}/rbac/roles/${role.id}`, {
        method: 'DELETE'
      })

      if (r.ok) {
        toast.success('Role deleted successfully')
        fetchRoles()
      } else {
        const data = await r.json()
        toast.error(data.message || 'Failed to delete role')
      }
    } catch (e) {
      console.error('Error deleting role:', e)
      toast.error('Error deleting role')
    }
  }

  // Save permissions
  const handleSavePermissions = async () => {
    if (!selectedRole) return

    setSaving(true)
    try {
      const r = await fetchWithAuth(`${API_URL}/rbac/roles/${selectedRole.id}/permissions`, {
        method: 'POST',
        body: JSON.stringify({ permissionIds: rolePermissions })
      })

      if (r.ok) {
        toast.success('Permissions updated successfully')
        fetchRoles()
      } else {
        const data = await r.json()
        toast.error(data.message || 'Failed to update permissions')
      }
    } catch (e) {
      console.error('Error saving permissions:', e)
      toast.error('Error saving permissions')
    } finally {
      setSaving(false)
    }
  }

  // Assign roles to user
  const handleAssignRoles = async () => {
    if (!assigningUser) return

    setSaving(true)
    try {
      const r = await fetchWithAuth(`${API_URL}/rbac/users/${assigningUser.id}/roles`, {
        method: 'PUT',
        body: JSON.stringify({ roleIds: selectedRoleIds })
      })

      if (r.ok) {
        toast.success('Roles assigned successfully')
        setAssigningUser(null)
        setSelectedRoleIds([])
        fetchUsers()
      } else {
        const data = await r.json()
        toast.error(data.message || 'Failed to assign roles')
      }
    } catch (e) {
      console.error('Error assigning roles:', e)
      toast.error('Error assigning roles')
    } finally {
      setSaving(false)
    }
  }

  // Create user
  const handleCreateUser = async () => {
    if (!newUserEmail) {
      toast.error('Email is required')
      return
    }

    if (newUserRoleIds.length === 0) {
      toast.error('At least one role must be selected')
      return
    }
    
    setSaving(true)
    try {
      const r = await fetchWithAuth(`${API_URL}/rbac/users`, {
        method: 'POST',
        body: JSON.stringify({ email: newUserEmail, roleIds: newUserRoleIds })
      })
      
      if (r.ok) {
        const data = await r.json()
        setCreatedUserPassword(data.temporaryPassword)
        setEmailSentStatus({ sent: data.emailSent, error: data.emailError })
        toast.success('User created successfully')
        setIsCreatingUser(false)
        setNewUserEmail('')
        setNewUserRoleIds([])
        fetchUsers()
      } else {
        const data = await r.json()
        toast.error(data.message || 'Failed to create user')
      }
    } catch (e) {
      console.error('Error creating user:', e)
      toast.error('Error creating user')
    } finally {
      setSaving(false)
    }
  }
  
  // Copy password to clipboard
  const handleCopyPassword = () => {
    if (createdUserPassword) {
      navigator.clipboard.writeText(createdUserPassword)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }
  
  // Reset user password (admin)
  const handleResetPassword = async (user: User) => {
    if (!confirm(`Reset password for ${user.email}? A new temporary password will be generated and sent via email.`)) return
    
    setSaving(true)
    try {
      const r = await fetchWithAuth(`${API_URL}/rbac/users/${user.id}/reset-password`, {
        method: 'POST'
      })
      
      if (r.ok) {
        const data = await r.json()
        setResetPasswordResult({
          password: data.temporaryPassword,
          emailSent: data.emailSent,
          error: data.emailError
        })
        setResettingUser(user)
      } else {
        const data = await r.json()
        toast.error(data.message || 'Failed to reset password')
      }
    } catch (e) {
      console.error('Error resetting password:', e)
      toast.error('Error resetting password')
    } finally {
      setSaving(false)
    }
  }
  
  // Copy reset password to clipboard
  const handleCopyResetPassword = () => {
    if (resetPasswordResult?.password) {
      navigator.clipboard.writeText(resetPasswordResult.password)
      setResetCopied(true)
      setTimeout(() => setResetCopied(false), 2000)
    }
  }
  
  // Change own password
  const handleChangeOwnPassword = async () => {
    setPasswordChangeError('')

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPasswordChangeError('All fields are required')
      return
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordChangeError('New passwords do not match')
      return
    }

    if (newPassword.length < 10) {
      setPasswordChangeError('Password must be at least 10 characters')
      return
    }

    setChangingPassword(true)
    try {
      const r = await fetchWithAuth(`${API_URL}/auth/change-password`, {
        method: 'POST',
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      })

      if (r.ok) {
        toast.success('Password changed successfully!')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmNewPassword('')
      } else {
        const data = await r.json()
        setPasswordChangeError(data.message || 'Failed to change password')
      }
    } catch (e) {
      setPasswordChangeError('Error changing password')
    } finally {
      setChangingPassword(false)
    }
  }
  
  const getPasswordStrength = (password: string) => {
    if (!password) return { strength: 0, text: '', color: '#ccc' }
    
    let strength = 0
    if (password.length >= 10) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/[a-z]/.test(password)) strength++
    if (/[0-9]/.test(password)) strength++
    if (/[^A-Za-z0-9]/.test(password)) strength++
    
    if (strength < 3) return { strength, text: 'Weak', color: '#f44336' }
    if (strength < 5) return { strength, text: 'Medium', color: '#ff9800' }
    return { strength, text: 'Strong', color: '#4CAF50' }
  }
  
  const passwordStrength = getPasswordStrength(newPassword)
  
  // Group permissions by resource
  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.resource]) acc[perm.resource] = []
    acc[perm.resource].push(perm)
    return acc
  }, {} as Record<string, Permission[]>)
  
  // Organize resources into logical categories
  const moduleCategories = {
    'Projects & Contracts': ['projects', 'contracts'],
    'Financial Management': ['accounts', 'payables', 'receivables', 'assets', 'petty_cash', 'debit_cards'],
    'Human Resources': ['employees', 'time_entries'],
    'Vendors & Suppliers': ['vendors'],
    'Collaboration': ['notes', 'todos'],
    'Analytics & Reporting': ['analytics'],
    'System Settings': ['settings']
  }
  
  // Helper to get category for a resource
  const getCategoryForResource = (resource: string): string => {
    for (const [category, resources] of Object.entries(moduleCategories)) {
      if (resources.includes(resource)) return category
    }
    return 'Other'
  }
  
  // Group permissions by category
  const categorizedPermissions = Object.entries(groupedPermissions).reduce((acc, [resource, perms]) => {
    const category = getCategoryForResource(resource)
    if (!acc[category]) acc[category] = {}
    acc[category][resource] = perms
    return acc
  }, {} as Record<string, Record<string, Permission[]>>)
  
  // Helper to select/deselect all permissions for a resource
  const toggleResourcePermissions = (resource: string, selected: boolean) => {
    const resourcePerms = groupedPermissions[resource] || []
    const resourcePermIds = resourcePerms.map(p => p.id)
    
    if (selected) {
      // Add all permissions from this resource
      const newPerms = [...new Set([...rolePermissions, ...resourcePermIds])]
      setRolePermissions(newPerms)
    } else {
      // Remove all permissions from this resource
      setRolePermissions(rolePermissions.filter(id => !resourcePermIds.includes(id)))
    }
  }
  
  // Helper to check if all permissions for a resource are selected
  const isResourceFullySelected = (resource: string): boolean => {
    const resourcePerms = groupedPermissions[resource] || []
    return resourcePerms.length > 0 && resourcePerms.every(p => rolePermissions.includes(p.id))
  }
  
  // Helper to format resource name
  const formatResourceName = (resource: string): string => {
    return resource.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }
  
  return (
    <div style={{ width: '100%', display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ marginTop: 0, fontSize: 28, marginBottom: 0 }}>Settings</h1>
      </div>
      
      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 12, borderBottom: '2px solid #e0e0e0', paddingBottom: 8 }}>
        <button
          onClick={() => setSubTab('roles')}
          style={{
            padding: '10px 20px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            background: subTab === 'roles' ? 'var(--primary)' : 'transparent',
            color: subTab === 'roles' ? '#fff' : '#666',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <Shield size={18} />
          Role Management
        </button>
        <button
          onClick={() => setSubTab('permissions')}
          style={{
            padding: '10px 20px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            background: subTab === 'permissions' ? 'var(--primary)' : 'transparent',
            color: subTab === 'permissions' ? '#fff' : '#666',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <Key size={18} />
          Permissions
        </button>
        <button
          onClick={() => setSubTab('users')}
          style={{
            padding: '10px 20px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            background: subTab === 'users' ? 'var(--primary)' : 'transparent',
            color: subTab === 'users' ? '#fff' : '#666',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <UsersIcon size={18} />
          User Roles
        </button>
        <button
          onClick={() => setSubTab('profile')}
          style={{
            padding: '10px 20px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            background: subTab === 'profile' ? 'var(--primary)' : 'transparent',
            color: subTab === 'profile' ? '#fff' : '#666',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <User size={18} />
          My Profile
        </button>
        <button
          onClick={() => setSubTab('app_settings')}
          style={{
            padding: '10px 20px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            background: subTab === 'app_settings' ? 'var(--primary)' : 'transparent',
            color: subTab === 'app_settings' ? '#fff' : '#666',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <Key size={18} />
          Application Settings
        </button>
        <button
          onClick={() => setSubTab('employee_onboarding')}
          style={{
            padding: '10px 20px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            background: subTab === 'employee_onboarding' ? 'var(--primary)' : 'transparent',
            color: subTab === 'employee_onboarding' ? '#fff' : '#666',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <UsersIcon size={18} />
          Employee Onboarding
        </button>
      </div>
      
      {/* Role Management */}
      {subTab === 'roles' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0 }}>Roles</h2>
            <button
              onClick={() => setIsAddingRole(true)}
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                border: 'none',
                background: 'var(--accent)',
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <Plus size={18} />
              Create Role
            </button>
          </div>
          
          {(isAddingRole || editingRole) && (
            <div className="glass-panel" style={{ padding: 24, borderRadius: 12 }}>
              <h3 style={{ marginTop: 0 }}>{editingRole ? 'Edit Role' : 'Create New Role'}</h3>
              <div style={{ display: 'grid', gap: 12 }}>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontWeight: 500 }}>Role Name *</span>
                  <input
                    type="text"
                    value={roleName}
                    onChange={e => setRoleName(e.target.value)}
                    placeholder="e.g., Senior Accountant"
                    style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }}
                  />
                </label>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontWeight: 500 }}>Description</span>
                  <textarea
                    value={roleDescription}
                    onChange={e => setRoleDescription(e.target.value)}
                    placeholder="Describe this role..."
                    rows={3}
                    style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc', resize: 'vertical' }}
                  />
                </label>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
                  <button
                    onClick={() => {
                      setIsAddingRole(false)
                      setEditingRole(null)
                      setRoleName('')
                      setRoleDescription('')
                    }}
                    style={{
                      padding: '10px 20px',
                      borderRadius: 8,
                      border: '1px solid #ccc',
                      background: '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}
                  >
                    <X size={16} />
                    Cancel
                  </button>
                  <button
                    onClick={editingRole ? handleUpdateRole : handleCreateRole}
                    disabled={saving}
                    style={{
                      padding: '10px 20px',
                      borderRadius: 8,
                      border: 'none',
                      background: 'var(--accent)',
                      color: '#fff',
                      fontWeight: 600,
                      cursor: saving ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}
                  >
                    <Save size={16} />
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {rolesLoading ? (
            <div style={{ padding: 48, textAlign: 'center' }}>Loading roles...</div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {roles.map(role => (
                <div
                  key={role.id}
                  className="glass-panel"
                  style={{ padding: 20, borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <h3 style={{ margin: 0, fontSize: 18 }}>{role.name}</h3>
                      {role.is_system_role && (
                        <span style={{ padding: '4px 8px', borderRadius: 4, background: '#e3f2fd', color: '#1565c0', fontSize: 11, fontWeight: 700 }}>
                          SYSTEM
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '4px 0', color: '#666', fontSize: 14 }}>{role.description || 'No description'}</p>
                    <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 13, color: '#888' }}>
                      <span>{role.permission_count} permissions</span>
                      <span>{role.user_count} users</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {!role.is_system_role && (
                      <>
                        <button
                          onClick={() => {
                            setEditingRole(role)
                            setRoleName(role.name)
                            setRoleDescription(role.description || '')
                            setIsAddingRole(false)
                          }}
                          style={{
                            padding: '8px 16px',
                            borderRadius: 6,
                            border: '1px solid #4CAF50',
                            background: '#4CAF50',
                            color: '#fff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                          }}
                        >
                          <Edit2 size={14} />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteRole(role)}
                          style={{
                            padding: '8px 16px',
                            borderRadius: 6,
                            border: '1px solid #f44336',
                            background: '#f44336',
                            color: '#fff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                          }}
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Permission Assignment */}
      {subTab === 'permissions' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div>
            <h2 style={{ margin: 0, marginBottom: 12 }}>Assign Permissions to Role</h2>
            <select
              value={selectedRole?.id || ''}
              onChange={e => {
                const role = roles.find(r => r.id === Number(e.target.value))
                setSelectedRole(role || null)
                if (role) fetchRolePermissions(role.id)
              }}
              style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc', minWidth: 300 }}
            >
              <option value="">Select a role</option>
              {roles.filter(r => !r.is_system_role).map(role => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
          </div>
          
          {selectedRole && (
            <div className="glass-panel" style={{ padding: 24, borderRadius: 12 }}>
              <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 20, color: '#fff' }}>Permissions for {selectedRole.name}</h3>
                <button
                  onClick={handleSavePermissions}
                  disabled={saving}
                  style={{
                    padding: '12px 24px',
                    borderRadius: 8,
                    border: 'none',
                    background: saving ? '#b1b1b1' : 'var(--accent)',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 15
                  }}
                >
                  <Save size={18} />
                  {saving ? 'Saving...' : 'Save Permissions'}
                </button>
              </div>

              <PermissionHierarchy
                selectedPermissions={rolePermissions}
                onPermissionsChange={setRolePermissions}
                allPermissions={permissions}
                loading={permissionsLoading}
              />
            </div>
          )}
        </div>
      )}
      
      {/* User Management */}
      {subTab === 'users' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0 }}>Manage User Roles</h2>
            <button
              onClick={() => setIsCreatingUser(true)}
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                border: 'none',
                background: 'var(--accent)',
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <Plus size={18} />
              Create User
            </button>
          </div>
          
          {usersLoading ? (
            <div style={{ padding: 48, textAlign: 'center' }}>Loading users...</div>
          ) : (
            <div style={{ width: '100%', overflowX: 'auto' }}>
              <table className="glass-panel" style={{ width: '100%', borderCollapse: 'collapse', overflow: 'hidden', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: 'var(--primary)', color: '#fff' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>User</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Email</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Current Role</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, idx) => (
                    <tr key={user.id} style={{ borderBottom: idx < users.length - 1 ? '1px solid #e0e0e0' : 'none' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 500 }}>{user.name}</td>
                      <td style={{ padding: '12px 16px' }}>{user.email}</td>
                      <td style={{ padding: '12px 16px' }}>
                        {user.roles.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {user.roles.map(role => (
                              <span key={role.id} style={{ padding: '4px 8px', borderRadius: 4, background: role.is_system_role ? '#e3f2fd' : '#f5f5f5', color: role.is_system_role ? '#1565c0' : '#666', fontSize: 12, fontWeight: 600 }}>
                                {role.name}
                                {role.is_system_role && ' ●'}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: '#999' }}>No roles assigned</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => {
                              setAssigningUser(user)
                              setSelectedRoleIds(user.roles.map(r => r.id))
                            }}
                            style={{
                              padding: '6px 12px',
                              borderRadius: 6,
                              border: '1px solid #2196F3',
                              background: '#2196F3',
                              color: '#fff',
                              cursor: 'pointer',
                              fontSize: 12,
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                          >
                            Assign Roles
                          </button>
                          <button
                            onClick={() => handleResetPassword(user)}
                            disabled={saving}
                            style={{
                              padding: '6px 12px',
                              borderRadius: 6,
                              border: '1px solid #ff9800',
                              background: '#ff9800',
                              color: '#fff',
                              cursor: saving ? 'not-allowed' : 'pointer',
                              fontSize: 12,
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                          >
                            <RotateCcw size={12} />
                            Reset Password
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Create User Modal */}
          {isCreatingUser && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 1000 }} onClick={() => setIsCreatingUser(false)}>
              <div className="glass-panel" style={{ width: 'min(600px, 92vw)', padding: 24, borderRadius: 16, maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
                <h3 style={{ marginTop: 0 }}>Create New User</h3>
                <div style={{ display: 'grid', gap: 16 }}>
                  <label style={{ display: 'grid', gap: 6 }}>
                    <span style={{ fontWeight: 500 }}>Email Address *</span>
                    <input
                      type="email"
                      value={newUserEmail}
                      onChange={e => setNewUserEmail(e.target.value)}
                      placeholder="user@example.com"
                      style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc', fontSize: 14 }}
                    />
                    <span style={{ fontSize: 12, color: '#666' }}>The user's email address (will also be used as username)</span>
                  </label>
                  
                  <div style={{ display: 'grid', gap: 6 }}>
                    <span style={{ fontWeight: 500, marginBottom: 4 }}>Assign Roles * (select at least one)</span>
                    <div style={{ display: 'grid', gap: 10, maxHeight: 300, overflow: 'auto', padding: 8, border: '1px solid #e0e0e0', borderRadius: 8 }}>
                      {roles.map(role => (
                        <label key={role.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 12px', borderRadius: 6, background: newUserRoleIds.includes(role.id) ? '#e3f2fd' : '#f8f9fa', border: '1px solid ' + (newUserRoleIds.includes(role.id) ? '#2196F3' : '#e0e0e0'), transition: 'all 0.2s' }}>
                          <input
                            type="checkbox"
                            checked={newUserRoleIds.includes(role.id)}
                            onChange={e => {
                              if (e.target.checked) {
                                setNewUserRoleIds([...newUserRoleIds, role.id])
                              } else {
                                setNewUserRoleIds(newUserRoleIds.filter(id => id !== role.id))
                              }
                            }}
                            style={{ width: 18, height: 18, cursor: 'pointer' }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, color: '#333', marginBottom: 2 }}>{role.name}</div>
                            {role.description && <div style={{ fontSize: 12, color: '#666' }}>{role.description}</div>}
                          </div>
                          {role.is_system_role && (
                            <span style={{ padding: '2px 6px', borderRadius: 4, background: '#e3f2fd', color: '#1565c0', fontSize: 10, fontWeight: 700 }}>
                              SYSTEM
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                    <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                      {newUserRoleIds.length} role{newUserRoleIds.length !== 1 ? 's' : ''} selected
                    </div>
                  </div>
                  
                  <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 8, padding: 16 }}>
                    <div style={{ fontWeight: 600, color: '#856404', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                      ℹ️ Password Information
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: '#856404' }}>
                      A secure temporary password will be automatically generated (10+ characters with uppercase, lowercase, numbers, and symbols) and sent to the user's email address.
                    </p>
                  </div>
                  
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
                    <button
                      onClick={() => {
                        setIsCreatingUser(false)
                        setNewUserEmail('')
                        setNewUserRoleIds([])
                      }}
                      style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateUser}
                      disabled={saving || !newUserEmail || newUserRoleIds.length === 0}
                      style={{
                        padding: '10px 20px',
                        borderRadius: 8,
                        border: 'none',
                        background: 'var(--accent)',
                        color: '#fff',
                        fontWeight: 600,
                        cursor: (saving || !newUserEmail || newUserRoleIds.length === 0) ? 'not-allowed' : 'pointer',
                        opacity: (saving || !newUserEmail || newUserRoleIds.length === 0) ? 0.6 : 1
                      }}
                    >
                      {saving ? 'Creating...' : 'Create User'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Success Modal - Show Created Password */}
          {createdUserPassword && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 1001 }} onClick={() => { setCreatedUserPassword(null); setEmailSentStatus(null) }}>
              <div className="glass-panel" style={{ width: 'min(550px, 92vw)', padding: 32, borderRadius: 16 }} onClick={e => e.stopPropagation()}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <div style={{ display: 'inline-block', padding: 16, background: '#4CAF50', borderRadius: '50%', marginBottom: 16 }}>
                    <CheckCircle size={48} color="#fff" />
                  </div>
                  <h3 style={{ margin: '0 0 8px', fontSize: 24, color: '#4CAF50' }}>User Created Successfully!</h3>
                  {emailSentStatus?.sent ? (
                    <p style={{ margin: 0, color: '#666' }}>A welcome email has been sent with login credentials.</p>
                  ) : (
                    <p style={{ margin: 0, color: '#ff9800' }}>⚠️ User created but email could not be sent. {emailSentStatus?.error}</p>
                  )}
                </div>
                
                <div style={{ background: '#f8f9fa', border: '2px solid #4CAF50', borderRadius: 12, padding: 20, marginBottom: 20 }}>
                  <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 15, color: '#333' }}>Temporary Password:</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', padding: 16, borderRadius: 8, border: '1px solid #e0e0e0' }}>
                    <code style={{ flex: 1, fontSize: 16, fontWeight: 600, color: '#1a237e', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      {createdUserPassword}
                    </code>
                    <button
                      onClick={handleCopyPassword}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 6,
                        border: 'none',
                        background: copied ? '#4CAF50' : '#2196F3',
                        color: '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontWeight: 600,
                        fontSize: 13,
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {copied ? <><CheckCircle size={14} /> Copied!</> : <><Copy size={14} /> Copy</>}
                    </button>
                  </div>
                </div>
                
                <div style={{ background: '#fff3cd', borderLeft: '4px solid #ffc107', padding: 16, borderRadius: 4, marginBottom: 20 }}>
                  <div style={{ fontWeight: 600, color: '#856404', marginBottom: 8 }}>⚠️ Important</div>
                  <p style={{ margin: 0, fontSize: 13, color: '#856404', lineHeight: 1.6 }}>
                    Please save this password. For security reasons, it will not be shown again. The user should change this password after their first login.
                  </p>
                </div>
                
                <button
                  onClick={() => {
                    setCreatedUserPassword(null)
                    setEmailSentStatus(null)
                    setCopied(false)
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: 8,
                    border: 'none',
                    background: 'var(--primary)',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: 15
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          )}
          
          {/* Assign Roles Modal */}
          {assigningUser && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 1000 }} onClick={() => setAssigningUser(null)}>
              <div className="glass-panel" style={{ width: 'min(600px, 92vw)', padding: 24, borderRadius: 16, maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
                <h3 style={{ marginTop: 0 }}>Assign Roles to {assigningUser.name}</h3>
                <div style={{ display: 'grid', gap: 16 }}>
                  <div style={{ display: 'grid', gap: 6 }}>
                    <span style={{ fontWeight: 500, marginBottom: 8 }}>Select Roles (you can select multiple)</span>
                    <div style={{ display: 'grid', gap: 10, maxHeight: 400, overflow: 'auto', padding: 8, border: '1px solid #e0e0e0', borderRadius: 8 }}>
                      {roles.map(role => (
                        <label key={role.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 12px', borderRadius: 6, background: selectedRoleIds.includes(role.id) ? '#e3f2fd' : '#f8f9fa', border: '1px solid ' + (selectedRoleIds.includes(role.id) ? '#2196F3' : '#e0e0e0'), transition: 'all 0.2s' }}>
                          <input
                            type="checkbox"
                            checked={selectedRoleIds.includes(role.id)}
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedRoleIds([...selectedRoleIds, role.id])
                              } else {
                                setSelectedRoleIds(selectedRoleIds.filter(id => id !== role.id))
                              }
                            }}
                            style={{ width: 18, height: 18, cursor: 'pointer' }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, color: '#333', marginBottom: 2 }}>{role.name}</div>
                            {role.description && <div style={{ fontSize: 12, color: '#666' }}>{role.description}</div>}
                          </div>
                          {role.is_system_role && (
                            <span style={{ padding: '2px 6px', borderRadius: 4, background: '#e3f2fd', color: '#1565c0', fontSize: 10, fontWeight: 700 }}>
                              SYSTEM
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                    <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                      {selectedRoleIds.length} role{selectedRoleIds.length !== 1 ? 's' : ''} selected
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
                    <button
                      onClick={() => {
                        setAssigningUser(null)
                        setSelectedRoleIds([])
                      }}
                      style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAssignRoles}
                      disabled={saving}
                      style={{
                        padding: '10px 20px',
                        borderRadius: 8,
                        border: 'none',
                        background: 'var(--accent)',
                        color: '#fff',
                        fontWeight: 600,
                        cursor: saving ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {saving ? 'Assigning...' : `Assign ${selectedRoleIds.length} Role${selectedRoleIds.length !== 1 ? 's' : ''}`}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Reset Password Success Modal */}
          {resettingUser && resetPasswordResult && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 1001 }} onClick={() => { setResettingUser(null); setResetPasswordResult(null); setResetCopied(false) }}>
              <div className="glass-panel" style={{ width: 'min(550px, 92vw)', padding: 32, borderRadius: 16 }} onClick={e => e.stopPropagation()}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <div style={{ display: 'inline-block', padding: 16, background: '#ff9800', borderRadius: '50%', marginBottom: 16 }}>
                    <RotateCcw size={48} color="#fff" />
                  </div>
                  <h3 style={{ margin: '0 0 8px', fontSize: 24, color: '#ff9800' }}>Password Reset Successfully!</h3>
                  <p style={{ margin: 0, color: '#666' }}>Password reset for <strong>{resettingUser.email}</strong></p>
                  {resetPasswordResult.emailSent ? (
                    <p style={{ margin: '8px 0 0', color: '#4CAF50', fontSize: 14 }}>✅ Reset email sent successfully</p>
                  ) : (
                    <p style={{ margin: '8px 0 0', color: '#ff9800', fontSize: 14 }}>⚠️ Email could not be sent. {resetPasswordResult.error}</p>
                  )}
                </div>
                
                <div style={{ background: '#fff3cd', border: '2px solid #ff9800', borderRadius: 12, padding: 20, marginBottom: 20 }}>
                  <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 15, color: '#856404' }}>Temporary Password:</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', padding: 16, borderRadius: 8, border: '1px solid #e0e0e0' }}>
                    <code style={{ flex: 1, fontSize: 16, fontWeight: 600, color: '#1a237e', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      {resetPasswordResult.password}
                    </code>
                    <button
                      onClick={handleCopyResetPassword}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 6,
                        border: 'none',
                        background: resetCopied ? '#4CAF50' : '#2196F3',
                        color: '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontWeight: 600,
                        fontSize: 13,
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {resetCopied ? <><CheckCircle size={14} /> Copied!</> : <><Copy size={14} /> Copy</>}
                    </button>
                  </div>
                </div>
                
                <div style={{ background: '#fff3cd', borderLeft: '4px solid #ffc107', padding: 16, borderRadius: 4, marginBottom: 20 }}>
                  <div style={{ fontWeight: 600, color: '#856404', marginBottom: 8 }}>⚠️ Important</div>
                  <p style={{ margin: 0, fontSize: 13, color: '#856404', lineHeight: 1.6 }}>
                    The user will be required to change this password on their next login. Please provide them with this temporary password if the email was not delivered.
                  </p>
                </div>
                
                <button
                  onClick={() => {
                    setResettingUser(null)
                    setResetPasswordResult(null)
                    setResetCopied(false)
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: 8,
                    border: 'none',
                    background: 'var(--primary)',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: 15
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* My Profile Tab */}
      {subTab === 'profile' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <h2 style={{ margin: 0 }}>My Profile</h2>
          
          <div className="glass-panel" style={{ padding: 24, borderRadius: 12 }}>
            <h3 style={{ marginTop: 0, marginBottom: 20 }}>Change Password</h3>
            
            <div style={{ display: 'grid', gap: 16, maxWidth: 500 }}>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontWeight: 500 }}>Current Password *</span>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc', fontSize: 14 }}
                />
              </label>
              
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontWeight: 500 }}>New Password *</span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc', fontSize: 14 }}
                />
                {newPassword && (
                  <div style={{ fontSize: 12, color: passwordStrength.color, fontWeight: 500 }}>
                    Password Strength: {passwordStrength.text}
                  </div>
                )}
              </label>
              
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontWeight: 500 }}>Confirm New Password *</span>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={e => setConfirmNewPassword(e.target.value)}
                  placeholder="Confirm new password"
                  style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc', fontSize: 14 }}
                />
              </label>
              
              <div style={{ background: '#f0f7ff', border: '1px solid #2196F3', borderRadius: 8, padding: 16, fontSize: 13 }}>
                <strong style={{ color: '#1565c0' }}>Password Requirements:</strong>
                <ul style={{ margin: '8px 0 0', paddingLeft: 20, color: '#1976d2' }}>
                  <li>At least 10 characters long</li>
                  <li>Contains uppercase and lowercase letters</li>
                  <li>Contains at least one number</li>
                  <li>Contains at least one special symbol</li>
                  <li>Cannot match your last 3 passwords</li>
                </ul>
              </div>
              
              {passwordChangeError && (
                <div style={{ padding: '12px', background: '#f443364d', border: '1px solid #f44336', borderRadius: 8, color: '#c62828', fontSize: 14 }}>
                  {passwordChangeError}
                </div>
              )}
              
              <button
                onClick={handleChangeOwnPassword}
                disabled={changingPassword || !currentPassword || !newPassword || !confirmNewPassword}
                style={{
                  padding: '12px 20px',
                  borderRadius: 8,
                  border: 'none',
                  background: (changingPassword || !currentPassword || !newPassword || !confirmNewPassword) ? '#b1b1b1' : 'var(--accent)',
                  color: '#fff',
                  fontWeight: 600,
                  cursor: (changingPassword || !currentPassword || !newPassword || !confirmNewPassword) ? 'not-allowed' : 'pointer',
                  fontSize: 15,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}
              >
                <Save size={16} />
                {changingPassword ? 'Changing Password...' : 'Change Password'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Application Settings Tab */}
      {subTab === 'app_settings' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <h2 style={{ margin: 0 }}>Application Settings</h2>
          
          <div className="glass-panel" style={{ padding: 24, borderRadius: 12 }}>
            <h3 style={{ marginTop: 0, marginBottom: 20 }}>International Clock Configuration</h3>
            
            <div style={{ display: 'grid', gap: 16, maxWidth: 600 }}>
              <div style={{ background: '#f0f7ff', border: '1px solid #2196F3', borderRadius: 8, padding: 16, fontSize: 13 }}>
                <strong style={{ color: '#1565c0' }}>ℹ️ About International Clock:</strong>
                <p style={{ margin: '8px 0 0', color: '#1976d2', lineHeight: 1.6 }}>
                  The international clock appears on the home page below the local time clock. 
                  Select the timezone you want to display for international time tracking.
                </p>
              </div>
              
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontWeight: 500, fontSize: 15 }}>Select Timezone</span>
                <select
                  value={applicationTimezone}
                  onChange={e => setApplicationTimezone(e.target.value)}
                  disabled={timezoneLoading}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 8,
                    border: '1px solid #ccc',
                    fontSize: 14,
                    background: timezoneLoading ? '#f5f5f5' : '#fff',
                    cursor: timezoneLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {timezoneOptions.map(tz => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: 12, color: '#666' }}>
                  Currently selected: <strong>{applicationTimezone}</strong>
                </span>
              </label>
              
              <button
                onClick={handleSaveTimezone}
                disabled={timezoneSaving || timezoneLoading}
                style={{
                  padding: '12px 20px',
                  borderRadius: 8,
                  border: 'none',
                  background: (timezoneSaving || timezoneLoading) ? '#b1b1b1' : 'var(--accent)',
                  color: '#fff',
                  fontWeight: 600,
                  cursor: (timezoneSaving || timezoneLoading) ? 'not-allowed' : 'pointer',
                  fontSize: 15,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  width: 'fit-content'
                }}
              >
                <Save size={16} />
                {timezoneSaving ? 'Saving...' : 'Save Timezone'}
              </button>
              
              <div style={{ background: '#fff3cd', borderLeft: '4px solid #ffc107', padding: 16, borderRadius: 4, fontSize: 13 }}>
                <strong style={{ color: '#856404' }}>🔒 Permission Required:</strong>
                <p style={{ margin: '8px 0 0', color: '#856404' }}>
                  Only users with <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 3 }}>settings:manage</code> permission 
                  can modify application settings. This is typically SuperAdmin or Admin roles.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Employee Onboarding Tab */}
      {subTab === 'employee_onboarding' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0 }}>Employee Onboarding</h2>
            <button
              onClick={() => setIsOnboardingEmployee(true)}
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                border: 'none',
                background: 'var(--accent)',
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <Plus size={18} />
              Onboard New Employee
            </button>
          </div>
          
          {employeesLoading ? (
            <div style={{ padding: 48, textAlign: 'center' }}>Loading employees...</div>
          ) : (
            <div style={{ width: '100%', overflowX: 'auto' }}>
              <table className="glass-panel" style={{ width: '100%', borderCollapse: 'collapse', overflow: 'hidden', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: 'var(--primary)', color: '#fff' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Employee #</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Name</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Email</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Designation</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Roles</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp, idx) => (
                    <tr key={emp.employee_id} style={{ borderBottom: idx < employees.length - 1 ? '1px solid #e0e0e0' : 'none' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 500 }}>{emp.employee_number}</td>
                      <td style={{ padding: '12px 16px' }}>{emp.first_name} {emp.last_name}</td>
                      <td style={{ padding: '12px 16px' }}>{emp.email}</td>
                      <td style={{ padding: '12px 16px' }}>{emp.designation || '-'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        {getStatusBadge(emp)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {emp.roles.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {emp.roles.map(role => (
                              <span key={role.id} style={{ padding: '4px 8px', borderRadius: 4, background: '#e3f2fd', color: '#1565c0', fontSize: 12, fontWeight: 600 }}>
                                {role.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: '#999' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {emp.has_user_account && emp.account_status !== 'terminated' && (
                            <button
                              onClick={() => handleOpenEditModal(emp)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: 6,
                                border: '1px solid #2196F3',
                                background: '#2196F3',
                                color: '#fff',
                                cursor: 'pointer',
                                fontSize: 12,
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4
                              }}
                            >
                              <Edit2 size={12} />
                              Edit
                            </button>
                          )}
                          {emp.has_user_account && emp.account_status === 'active' && (
                            <>
                              <button
                                onClick={() => setSuspendingEmployee(emp)}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: 6,
                                  border: '1px solid #ff9800',
                                  background: '#ff9800',
                                  color: '#fff',
                                  cursor: 'pointer',
                                  fontSize: 12,
                                  fontWeight: 600
                                }}
                              >
                                Suspend
                              </button>
                              <button
                                onClick={() => setTerminatingEmployee(emp)}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: 6,
                                  border: '1px solid #f44336',
                                  background: '#f44336',
                                  color: '#fff',
                                  cursor: 'pointer',
                                  fontSize: 12,
                                  fontWeight: 600
                                }}
                              >
                                Terminate
                              </button>
                            </>
                          )}
                          {emp.has_user_account && emp.account_status === 'suspended' && (
                            <>
                              <button
                                onClick={() => setReactivatingEmployee(emp)}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: 6,
                                  border: '1px solid #4CAF50',
                                  background: '#4CAF50',
                                  color: '#fff',
                                  cursor: 'pointer',
                                  fontSize: 12,
                                  fontWeight: 600
                                }}
                              >
                                Reactivate
                              </button>
                              <button
                                onClick={() => setTerminatingEmployee(emp)}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: 6,
                                  border: '1px solid #f44336',
                                  background: '#f44336',
                                  color: '#fff',
                                  cursor: 'pointer',
                                  fontSize: 12,
                                  fontWeight: 600
                                }}
                              >
                                Terminate
                              </button>
                            </>
                          )}
                          {emp.has_user_account && emp.account_status === 'terminated' && (
                            <span style={{ fontSize: 12, color: '#999', fontStyle: 'italic' }}>No actions available</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {employees.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#999' }}>
                        No employees found. Click "Onboard New Employee" to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Onboarding Modal */}
          {isOnboardingEmployee && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 1000, overflowY: 'auto', padding: '20px 0' }} onClick={() => setIsOnboardingEmployee(false)}>
              <div className="glass-panel" style={{ width: 'min(800px, 92vw)', padding: 24, borderRadius: 16, maxHeight: '90vh', overflow: 'auto', margin: 'auto' }} onClick={e => e.stopPropagation()}>
                <h3 style={{ marginTop: 0, marginBottom: 20 }}>Onboard New Employee</h3>
                
                <div style={{ display: 'grid', gap: 24 }}>
                  {/* Personal Information */}
                  <div style={{ background: '#f5f7fa', borderRadius: 12, padding: 20, border: '1px solid #e0e0e0' }}>
                    <h4 style={{ margin: '0 0 16px', fontSize: 16, color: '#1a237e', fontWeight: 700 }}>
                      👤 Personal Information
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
                      <label style={{ display: 'grid', gap: 6 }}>
                        <span style={{ fontWeight: 500, fontSize: 14, color: '#000' }}>First Name *</span>
                        <input
                          type="text"
                          value={onboardingData.first_name || ''}
                          onChange={e => setOnboardingData({ ...onboardingData, first_name: e.target.value })}
                          placeholder="John"
                          style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc', fontSize: 14 }}
                        />
                      </label>
                      <label style={{ display: 'grid', gap: 6 }}>
                        <span style={{ fontWeight: 500, fontSize: 14, color: '#000' }}>Last Name *</span>
                        <input
                          type="text"
                          value={onboardingData.last_name || ''}
                          onChange={e => setOnboardingData({ ...onboardingData, last_name: e.target.value })}
                          placeholder="Doe"
                          style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc', fontSize: 14 }}
                        />
                      </label>
                      <label style={{ display: 'grid', gap: 6 }}>
                        <span style={{ fontWeight: 500, fontSize: 14, color: '#000' }}>Email *</span>
                        <input
                          type="email"
                          value={onboardingData.email || ''}
                          onChange={e => setOnboardingData({ ...onboardingData, email: e.target.value })}
                          placeholder="john.doe@company.com"
                          style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc', fontSize: 14 }}
                        />
                      </label>
                      <label style={{ display: 'grid', gap: 6 }}>
                        <span style={{ fontWeight: 500, fontSize: 14, color: '#000' }}>Phone *</span>
                        <input
                          type="text"
                          value={onboardingData.phone || ''}
                          onChange={e => setOnboardingData({ ...onboardingData, phone: e.target.value })}
                          placeholder="+1234567890"
                          style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc', fontSize: 14 }}
                        />
                      </label>
                      <label style={{ display: 'grid', gap: 6 }}>
                        <span style={{ fontWeight: 500, fontSize: 14, color: '#000' }}>Date of Birth</span>
                        <input
                          type="date"
                          value={onboardingData.dob || ''}
                          onChange={e => setOnboardingData({ ...onboardingData, dob: e.target.value })}
                          style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc', fontSize: 14 }}
                        />
                      </label>
                      <label style={{ display: 'grid', gap: 6 }}>
                        <span style={{ fontWeight: 500, fontSize: 14, color: '#000' }}>NIC/ID Number</span>
                        <input
                          type="text"
                          value={onboardingData.nic || ''}
                          onChange={e => setOnboardingData({ ...onboardingData, nic: e.target.value })}
                          placeholder="ID/NIC Number"
                          style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc', fontSize: 14 }}
                        />
                      </label>
                      <label style={{ display: 'grid', gap: 6, gridColumn: 'span 2' }}>
                        <span style={{ fontWeight: 500, fontSize: 14, color: '#000' }}>Address</span>
                        <input
                          type="text"
                          value={onboardingData.address || ''}
                          onChange={e => setOnboardingData({ ...onboardingData, address: e.target.value })}
                          placeholder="Full address"
                          style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc', fontSize: 14 }}
                        />
                      </label>
                    </div>
                  </div>
                  
                  {/* Employment Details */}
                  <div style={{ background: '#f5f7fa', borderRadius: 12, padding: 20, border: '1px solid #e0e0e0' }}>
                    <h4 style={{ margin: '0 0 16px', fontSize: 16, color: '#1a237e', fontWeight: 700 }}>
                      💼 Employment Details
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
                      <label style={{ display: 'grid', gap: 6 }}>
                        <span style={{ fontWeight: 500, fontSize: 14, color: '#000' }}>Employee Number *</span>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input
                            type="text"
                            value={onboardingData.employee_number || ''}
                            onChange={e => setOnboardingData({ ...onboardingData, employee_number: e.target.value })}
                            placeholder="EMP00001"
                            style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc', fontSize: 14 }}
                          />
                          <button
                            onClick={handleGenerateEmployeeNumber}
                            disabled={generatingNumber}
                            style={{
                              padding: '10px 16px',
                              borderRadius: 8,
                              border: 'none',
                              background: '#2196F3',
                              color: '#fff',
                              fontWeight: 600,
                              cursor: generatingNumber ? 'not-allowed' : 'pointer',
                              fontSize: 13,
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {generatingNumber ? 'Generating...' : 'Generate'}
                          </button>
                        </div>
                      </label>
                      <label style={{ display: 'grid', gap: 6 }}>
                        <span style={{ fontWeight: 500, fontSize: 14, color: '#000' }}>Designation</span>
                        <input
                          type="text"
                          value={onboardingData.designation || ''}
                          onChange={e => setOnboardingData({ ...onboardingData, designation: e.target.value })}
                          placeholder="e.g., Senior Accountant"
                          style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc', fontSize: 14 }}
                        />
                      </label>
                      <label style={{ display: 'grid', gap: 6 }}>
                        <span style={{ fontWeight: 500, fontSize: 14, color: '#000' }}>Department</span>
                        <input
                          type="text"
                          value={onboardingData.employee_department || ''}
                          onChange={e => setOnboardingData({ ...onboardingData, employee_department: e.target.value })}
                          placeholder="e.g., Finance"
                          style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc', fontSize: 14 }}
                        />
                      </label>
                      <label style={{ display: 'grid', gap: 6 }}>
                        <span style={{ fontWeight: 500, fontSize: 14, color: '#000' }}>Hire Date</span>
                        <input
                          type="date"
                          value={onboardingData.hire_date || new Date().toISOString().split('T')[0]}
                          onChange={e => setOnboardingData({ ...onboardingData, hire_date: e.target.value })}
                          style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc', fontSize: 14 }}
                        />
                      </label>
                    </div>
                  </div>
                  
                  {/* Payroll Configuration */}
                  <div style={{ background: '#f5f7fa', borderRadius: 12, padding: 20, border: '1px solid #e0e0e0' }}>
                    <h4 style={{ margin: '0 0 16px', fontSize: 16, color: '#1a237e', fontWeight: 700 }}>
                      💰 Payroll Configuration
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
                      <label style={{ display: 'grid', gap: 6 }}>
                        <span style={{ fontWeight: 500, fontSize: 14, color: '#000' }}>Base Salary</span>
                        <input
                          type="number"
                          value={onboardingData.base_salary || ''}
                          onChange={e => setOnboardingData({ ...onboardingData, base_salary: parseFloat(e.target.value) || undefined })}
                          placeholder="60000"
                          style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc', fontSize: 14 }}
                        />
                      </label>
                      <label style={{ display: 'grid', gap: 6 }}>
                        <span style={{ fontWeight: 500, fontSize: 14, color: '#000' }}>EPF Contribution Rate (%)</span>
                        <input
                          type="number"
                          value={onboardingData.epf_contribution_rate || 8}
                          onChange={e => setOnboardingData({ ...onboardingData, epf_contribution_rate: parseFloat(e.target.value) || 8 })}
                          placeholder="8"
                          style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc', fontSize: 14 }}
                        />
                      </label>
                      <label style={{ display: 'grid', gap: 6 }}>
                        <span style={{ fontWeight: 500, fontSize: 14, color: '#000' }}>PTO Allowance (days)</span>
                        <input
                          type="number"
                          value={onboardingData.pto_allowance || 20}
                          onChange={e => setOnboardingData({ ...onboardingData, pto_allowance: parseInt(e.target.value) || 20 })}
                          placeholder="20"
                          style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc', fontSize: 14 }}
                        />
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, background: '#fff', border: '1px solid #e0e0e0', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={onboardingData.epf_enabled !== false}
                          onChange={e => setOnboardingData({ ...onboardingData, epf_enabled: e.target.checked })}
                          style={{ width: 18, height: 18, cursor: 'pointer' }}
                        />
                        <span style={{ fontWeight: 500, fontSize: 14, color: '#000' }}>EPF Enabled</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, background: '#fff', border: '1px solid #e0e0e0', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={onboardingData.etf_enabled !== false}
                          onChange={e => setOnboardingData({ ...onboardingData, etf_enabled: e.target.checked })}
                          style={{ width: 18, height: 18, cursor: 'pointer' }}
                        />
                        <span style={{ fontWeight: 500, fontSize: 14, color: '#000' }}>ETF Enabled</span>
                      </label>
                    </div>
                  </div>
                  
                  {/* Role Assignment */}
                  <div style={{ background: '#f5f7fa', borderRadius: 12, padding: 20, border: '1px solid #e0e0e0' }}>
                    <h4 style={{ margin: '0 0 12px', fontSize: 16, color: '#1a237e', fontWeight: 700 }}>
                      🔐 Access & Permissions
                    </h4>
                    <span style={{ fontWeight: 500, fontSize: 14, marginBottom: 12, display: 'block', color: '#000' }}>Assign Roles * (select at least one)</span>
                    <div style={{ display: 'grid', gap: 10, maxHeight: 300, overflow: 'auto', padding: 8, border: '1px solid #e0e0e0', borderRadius: 8, background: '#fff' }}>
                      {roles.map(role => (
                        <label key={role.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 12px', borderRadius: 6, background: onboardingData.roleIds?.includes(role.id) ? '#e3f2fd' : '#f8f9fa', border: '1px solid ' + (onboardingData.roleIds?.includes(role.id) ? '#2196F3' : '#e0e0e0'), transition: 'all 0.2s' }}>
                          <input
                            type="checkbox"
                            checked={onboardingData.roleIds?.includes(role.id) || false}
                            onChange={e => {
                              const currentRoles = onboardingData.roleIds || []
                              if (e.target.checked) {
                                setOnboardingData({ ...onboardingData, roleIds: [...currentRoles, role.id] })
                              } else {
                                setOnboardingData({ ...onboardingData, roleIds: currentRoles.filter(id => id !== role.id) })
                              }
                            }}
                            style={{ width: 18, height: 18, cursor: 'pointer' }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, color: '#333', marginBottom: 2 }}>{role.name}</div>
                            {role.description && <div style={{ fontSize: 12, color: '#666' }}>{role.description}</div>}
                          </div>
                          {role.is_system_role && (
                            <span style={{ padding: '2px 6px', borderRadius: 4, background: '#e3f2fd', color: '#1565c0', fontSize: 10, fontWeight: 700 }}>
                              SYSTEM
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                    <div style={{ fontSize: 13, color: '#666', marginTop: 8 }}>
                      {onboardingData.roleIds?.length || 0} role{(onboardingData.roleIds?.length || 0) !== 1 ? 's' : ''} selected
                    </div>
                  </div>
                  
                  {/* Info Box */}
                  <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 8, padding: 16 }}>
                    <div style={{ fontWeight: 600, color: '#856404', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                      ℹ️ What Happens Next?
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#856404', lineHeight: 1.8 }}>
                      <li>Employee record will be created in the system</li>
                      <li>User account will be created with selected roles</li>
                      <li>Temporary password will be generated automatically</li>
                      <li>Welcome email will be sent with login credentials</li>
                      <li>Employee can access the portal immediately</li>
                    </ul>
                  </div>
                  
                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 8, borderTop: '2px solid #e0e0e0' }}>
                    <button
                      onClick={() => {
                        setIsOnboardingEmployee(false)
                        setOnboardingData({ roleIds: [] })
                      }}
                      style={{
                        padding: '12px 24px',
                        borderRadius: 8,
                        border: '1px solid #ccc',
                        background: '#fff',
                        cursor: 'pointer',
                        fontSize: 15,
                        fontWeight: 600
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleOnboardEmployee}
                      disabled={saving}
                      style={{
                        padding: '12px 24px',
                        borderRadius: 8,
                        border: 'none',
                        background: saving ? '#b1b1b1' : 'var(--accent)',
                        color: '#fff',
                        fontWeight: 600,
                        cursor: saving ? 'not-allowed' : 'pointer',
                        fontSize: 15,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                      }}
                    >
                      <CheckCircle size={16} />
                      {saving ? 'Onboarding...' : 'Onboard Employee'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Suspend Employee Modal */}
          {suspendingEmployee && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 1001 }} onClick={() => { setSuspendingEmployee(null); setSuspendReason('') }}>
              <div className="glass-panel" style={{ width: 'min(500px, 92vw)', padding: 32, borderRadius: 16 }} onClick={e => e.stopPropagation()}>
                <h3 style={{ marginTop: 0, color: '#ff9800' }}>⚠️ Suspend Employee Account</h3>
                <p style={{ color: '#666', marginBottom: 20 }}>
                  Suspend <strong>{suspendingEmployee.first_name} {suspendingEmployee.last_name}</strong>? 
                  Their account will be temporarily disabled.
                </p>
                
                <label style={{ display: 'grid', gap: 8, marginBottom: 20 }}>
                  <span style={{ fontWeight: 600 }}>Reason for Suspension *</span>
                  <textarea
                    value={suspendReason}
                    onChange={e => setSuspendReason(e.target.value)}
                    placeholder="Enter reason for suspension..."
                    rows={4}
                    style={{ padding: '12px', borderRadius: 8, border: '1px solid #ccc', fontSize: 14, resize: 'vertical' }}
                  />
                </label>
                
                <div style={{ background: '#fff3cd', border: '1px solid #ff9800', borderRadius: 8, padding: 16, marginBottom: 20 }}>
                  <strong style={{ color: '#856404' }}>ℹ️ Note:</strong>
                  <p style={{ margin: '8px 0 0', fontSize: 13, color: '#856404' }}>
                    This action is reversible. The employee can be reactivated later by an admin.
                  </p>
                </div>
                
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => { setSuspendingEmployee(null); setSuspendReason('') }}
                    style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #ccc', background: '#fff', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSuspendEmployee}
                    disabled={saving || !suspendReason.trim()}
                    style={{
                      padding: '10px 20px',
                      borderRadius: 8,
                      border: 'none',
                      background: (!suspendReason.trim() || saving) ? '#ccc' : '#ff9800',
                      color: '#fff',
                      fontWeight: 600,
                      cursor: (!suspendReason.trim() || saving) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {saving ? 'Suspending...' : 'Suspend Account'}
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Reactivate Employee Modal */}
          {reactivatingEmployee && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 1001 }} onClick={() => setReactivatingEmployee(null)}>
              <div className="glass-panel" style={{ width: 'min(500px, 92vw)', padding: 32, borderRadius: 16 }} onClick={e => e.stopPropagation()}>
                <h3 style={{ marginTop: 0, color: '#4CAF50' }}>✅ Reactivate Employee Account</h3>
                <p style={{ color: '#666', marginBottom: 20 }}>
                  Reactivate <strong>{reactivatingEmployee.first_name} {reactivatingEmployee.last_name}</strong>? 
                  Their account will be restored and they can log in again.
                </p>
                
                <div style={{ background: '#e8f5e9', border: '1px solid #4CAF50', borderRadius: 8, padding: 16, marginBottom: 20 }}>
                  <strong style={{ color: '#2e7d32' }}>ℹ️ Account Status:</strong>
                  <p style={{ margin: '8px 0 0', fontSize: 13, color: '#2e7d32' }}>
                    Currently suspended since: {reactivatingEmployee.suspended_at ? new Date(reactivatingEmployee.suspended_at).toLocaleDateString() : 'Unknown'}
                  </p>
                  {reactivatingEmployee.suspended_reason && (
                    <p style={{ margin: '8px 0 0', fontSize: 13, color: '#2e7d32' }}>
                      Reason: {reactivatingEmployee.suspended_reason}
                    </p>
                  )}
                </div>
                
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setReactivatingEmployee(null)}
                    style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #ccc', background: '#fff', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReactivateEmployee}
                    disabled={saving}
                    style={{
                      padding: '10px 20px',
                      borderRadius: 8,
                      border: 'none',
                      background: saving ? '#ccc' : '#4CAF50',
                      color: '#fff',
                      fontWeight: 600,
                      cursor: saving ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {saving ? 'Reactivating...' : 'Reactivate Account'}
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Terminate Employee Modal */}
          {terminatingEmployee && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 1001 }} onClick={() => { setTerminatingEmployee(null); setTerminateReason(''); setTerminateConfirm(false) }}>
              <div className="glass-panel" style={{ width: 'min(550px, 92vw)', padding: 32, borderRadius: 16 }} onClick={e => e.stopPropagation()}>
                <h3 style={{ marginTop: 0, color: '#f44336' }}>🔴 Terminate Employee Account</h3>
                <p style={{ color: '#666', marginBottom: 20 }}>
                  <strong>WARNING:</strong> Terminate <strong>{terminatingEmployee.first_name} {terminatingEmployee.last_name}</strong>? 
                  This action is permanent and <strong>cannot be undone</strong>.
                </p>
                
                <label style={{ display: 'grid', gap: 8, marginBottom: 20 }}>
                  <span style={{ fontWeight: 600 }}>Reason for Termination *</span>
                  <textarea
                    value={terminateReason}
                    onChange={e => setTerminateReason(e.target.value)}
                    placeholder="Enter detailed reason for termination..."
                    rows={4}
                    style={{ padding: '12px', borderRadius: 8, border: '1px solid #ccc', fontSize: 14, resize: 'vertical' }}
                  />
                </label>
                
                <div style={{ background: '#ffebee', border: '2px solid #f44336', borderRadius: 8, padding: 16, marginBottom: 20 }}>
                  <strong style={{ color: '#c62828' }}>⚠️ Important Information:</strong>
                  <ul style={{ margin: '8px 0 0', paddingLeft: 20, fontSize: 13, color: '#c62828', lineHeight: 1.6 }}>
                    <li>Employee will immediately lose all system access</li>
                    <li>This action <strong>cannot be reversed</strong></li>
                    <li>Employee data will be retained for 2 years</li>
                    <li>Data will be automatically purged after 2 years</li>
                  </ul>
                </div>
                
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px', background: '#fff3cd', borderRadius: 8, marginBottom: 20, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={terminateConfirm}
                    onChange={e => setTerminateConfirm(e.target.checked)}
                    style={{ width: 20, height: 20, cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: 14, fontWeight: 500, color: '#856404' }}>
                    I understand this employee will be permanently terminated and data will be purged in 2 years
                  </span>
                </label>
                
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => { setTerminatingEmployee(null); setTerminateReason(''); setTerminateConfirm(false) }}
                    style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #ccc', background: '#fff', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleTerminateEmployee}
                    disabled={saving || !terminateReason.trim() || !terminateConfirm}
                    style={{
                      padding: '10px 20px',
                      borderRadius: 8,
                      border: 'none',
                      background: (!terminateReason.trim() || !terminateConfirm || saving) ? '#ccc' : '#f44336',
                      color: '#fff',
                      fontWeight: 600,
                      cursor: (!terminateReason.trim() || !terminateConfirm || saving) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {saving ? 'Terminating...' : 'Terminate Employee'}
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Edit Employee Modal */}
          {editingEmployee && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 1000, overflowY: 'auto', padding: '20px 0' }} onClick={() => { setEditingEmployee(null); setEditFormData({}) }}>
              <div className="glass-panel" style={{ width: 'min(800px, 92vw)', padding: 24, borderRadius: 16, maxHeight: '90vh', overflow: 'auto', margin: 'auto' }} onClick={e => e.stopPropagation()}>
                <h3 style={{ marginTop: 0, marginBottom: 20 }}>Edit Employee: {editingEmployee.first_name} {editingEmployee.last_name}</h3>
                
                <div style={{ display: 'grid', gap: 24 }}>
                  {/* Personal Information */}
                  <div style={{ background: '#f5f7fa', borderRadius: 12, padding: 20, border: '1px solid #e0e0e0' }}>
                    <h4 style={{ margin: '0 0 16px', fontSize: 16, color: '#1a237e', fontWeight: 700 }}>
                      👤 Personal Information
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
                      <label style={{ display: 'grid', gap: 6 }}>
                        <span style={{ fontWeight: 500, fontSize: 14, color: '#000' }}>First Name *</span>
                        <input
                          type="text"
                          value={editFormData.first_name || ''}
                          onChange={e => setEditFormData({ ...editFormData, first_name: e.target.value })}
                          placeholder="John"
                          style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc', fontSize: 14 }}
                        />
                      </label>
                      <label style={{ display: 'grid', gap: 6 }}>
                        <span style={{ fontWeight: 500, fontSize: 14, color: '#000' }}>Last Name *</span>
                        <input
                          type="text"
                          value={editFormData.last_name || ''}
                          onChange={e => setEditFormData({ ...editFormData, last_name: e.target.value })}
                          placeholder="Doe"
                          style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc', fontSize: 14 }}
                        />
                      </label>
                      <label style={{ display: 'grid', gap: 6 }}>
                        <span style={{ fontWeight: 500, fontSize: 14, color: '#000' }}>Email *</span>
                        <input
                          type="email"
                          value={editFormData.email || ''}
                          onChange={e => setEditFormData({ ...editFormData, email: e.target.value })}
                          placeholder="john.doe@company.com"
                          style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc', fontSize: 14 }}
                        />
                      </label>
                      <label style={{ display: 'grid', gap: 6 }}>
                        <span style={{ fontWeight: 500, fontSize: 14, color: '#000' }}>Phone *</span>
                        <input
                          type="text"
                          value={editFormData.phone || ''}
                          onChange={e => setEditFormData({ ...editFormData, phone: e.target.value })}
                          placeholder="+1234567890"
                          style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc', fontSize: 14 }}
                        />
                      </label>
                    </div>
                  </div>
                  
                  {/* Employment Details */}
                  <div style={{ background: '#f5f7fa', borderRadius: 12, padding: 20, border: '1px solid #e0e0e0' }}>
                    <h4 style={{ margin: '0 0 16px', fontSize: 16, color: '#1a237e', fontWeight: 700 }}>
                      💼 Employment Details
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
                      <label style={{ display: 'grid', gap: 6 }}>
                        <span style={{ fontWeight: 500, fontSize: 14, color: '#000' }}>Employee Number *</span>
                        <input
                          type="text"
                          value={editFormData.employee_number || ''}
                          onChange={e => setEditFormData({ ...editFormData, employee_number: e.target.value })}
                          placeholder="EMP00001"
                          style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc', fontSize: 14 }}
                        />
                      </label>
                      <label style={{ display: 'grid', gap: 6 }}>
                        <span style={{ fontWeight: 500, fontSize: 14, color: '#000' }}>Designation</span>
                        <input
                          type="text"
                          value={editFormData.designation || ''}
                          onChange={e => setEditFormData({ ...editFormData, designation: e.target.value })}
                          placeholder="e.g., Senior Accountant"
                          style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc', fontSize: 14 }}
                        />
                      </label>
                      <label style={{ display: 'grid', gap: 6 }}>
                        <span style={{ fontWeight: 500, fontSize: 14, color: '#000' }}>Department</span>
                        <input
                          type="text"
                          value={editFormData.employee_department || ''}
                          onChange={e => setEditFormData({ ...editFormData, employee_department: e.target.value })}
                          placeholder="e.g., Finance"
                          style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc', fontSize: 14 }}
                        />
                      </label>
                      <label style={{ display: 'grid', gap: 6 }}>
                        <span style={{ fontWeight: 500, fontSize: 14, color: '#000' }}>Hire Date</span>
                        <input
                          type="date"
                          value={editFormData.hire_date || ''}
                          onChange={e => setEditFormData({ ...editFormData, hire_date: e.target.value })}
                          style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc', fontSize: 14 }}
                        />
                      </label>
                    </div>
                  </div>
                  
                  {/* Payroll Configuration */}
                  <div style={{ background: '#f5f7fa', borderRadius: 12, padding: 20, border: '1px solid #e0e0e0' }}>
                    <h4 style={{ margin: '0 0 16px', fontSize: 16, color: '#1a237e', fontWeight: 700 }}>
                      💰 Payroll Configuration
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
                      <label style={{ display: 'grid', gap: 6 }}>
                        <span style={{ fontWeight: 500, fontSize: 14, color: '#000' }}>Base Salary</span>
                        <input
                          type="number"
                          value={editFormData.base_salary || ''}
                          onChange={e => setEditFormData({ ...editFormData, base_salary: parseFloat(e.target.value) || undefined })}
                          placeholder="60000"
                          style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc', fontSize: 14 }}
                        />
                      </label>
                    </div>
                  </div>
                  
                  {/* Role Assignment */}
                  <div style={{ background: '#f5f7fa', borderRadius: 12, padding: 20, border: '1px solid #e0e0e0' }}>
                    <h4 style={{ margin: '0 0 12px', fontSize: 16, color: '#1a237e', fontWeight: 700 }}>
                      🔐 Access & Permissions
                    </h4>
                    <span style={{ fontWeight: 500, fontSize: 14, marginBottom: 12, display: 'block', color: '#000' }}>Assign Roles * (select at least one)</span>
                    <div style={{ display: 'grid', gap: 10, maxHeight: 300, overflow: 'auto', padding: 8, border: '1px solid #e0e0e0', borderRadius: 8, background: '#fff' }}>
                      {roles.map(role => (
                        <label key={role.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 12px', borderRadius: 6, background: editFormData.roleIds?.includes(role.id) ? '#e3f2fd' : '#f8f9fa', border: '1px solid ' + (editFormData.roleIds?.includes(role.id) ? '#2196F3' : '#e0e0e0'), transition: 'all 0.2s' }}>
                          <input
                            type="checkbox"
                            checked={editFormData.roleIds?.includes(role.id) || false}
                            onChange={e => {
                              const currentRoles = editFormData.roleIds || []
                              if (e.target.checked) {
                                setEditFormData({ ...editFormData, roleIds: [...currentRoles, role.id] })
                              } else {
                                setEditFormData({ ...editFormData, roleIds: currentRoles.filter(id => id !== role.id) })
                              }
                            }}
                            style={{ width: 18, height: 18, cursor: 'pointer' }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, color: '#333', marginBottom: 2 }}>{role.name}</div>
                            {role.description && <div style={{ fontSize: 12, color: '#666' }}>{role.description}</div>}
                          </div>
                          {role.is_system_role && (
                            <span style={{ padding: '2px 6px', borderRadius: 4, background: '#e3f2fd', color: '#1565c0', fontSize: 10, fontWeight: 700 }}>
                              SYSTEM
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                    <div style={{ fontSize: 13, color: '#666', marginTop: 8 }}>
                      {editFormData.roleIds?.length || 0} role{(editFormData.roleIds?.length || 0) !== 1 ? 's' : ''} selected
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 8, borderTop: '2px solid #e0e0e0' }}>
                    <button
                      onClick={() => {
                        setEditingEmployee(null)
                        setEditFormData({})
                      }}
                      style={{
                        padding: '12px 24px',
                        borderRadius: 8,
                        border: '1px solid #ccc',
                        background: '#fff',
                        cursor: 'pointer',
                        fontSize: 15,
                        fontWeight: 600
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEditedEmployee}
                      disabled={saving}
                      style={{
                        padding: '12px 24px',
                        borderRadius: 8,
                        border: 'none',
                        background: saving ? '#b1b1b1' : 'var(--accent)',
                        color: '#fff',
                        fontWeight: 600,
                        cursor: saving ? 'not-allowed' : 'pointer',
                        fontSize: 15,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                      }}
                    >
                      <Save size={16} />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Success Modal */}
          {onboardingResult && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 1001 }} onClick={() => { setOnboardingResult(null); setOnboardingCopied(false) }}>
              <div className="glass-panel" style={{ width: 'min(600px, 92vw)', padding: 32, borderRadius: 16 }} onClick={e => e.stopPropagation()}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <div style={{ display: 'inline-block', padding: 16, background: '#4CAF50', borderRadius: '50%', marginBottom: 16 }}>
                    <CheckCircle size={48} color="#fff" />
                  </div>
                  <h3 style={{ margin: '0 0 8px', fontSize: 24, color: '#4CAF50' }}>Employee Onboarded Successfully!</h3>
                  <p style={{ margin: 0, color: '#666', fontSize: 15 }}>
                    <strong>{onboardingResult.employee.first_name} {onboardingResult.employee.last_name}</strong> ({onboardingResult.employee.employee_number})
                  </p>
                  {onboardingResult.emailSent ? (
                    <p style={{ margin: '8px 0 0', color: '#4CAF50', fontSize: 14 }}>✅ Welcome email sent to {onboardingResult.employee.email}</p>
                  ) : (
                    <p style={{ margin: '8px 0 0', color: '#ff9800', fontSize: 14 }}>⚠️ Email could not be sent. {onboardingResult.emailError}</p>
                  )}
                </div>
                
                <div style={{ background: '#f8f9fa', border: '2px solid #4CAF50', borderRadius: 12, padding: 20, marginBottom: 20 }}>
                  <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 15, color: '#333' }}>Temporary Password:</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', padding: 16, borderRadius: 8, border: '1px solid #e0e0e0' }}>
                    <code style={{ flex: 1, fontSize: 16, fontWeight: 600, color: '#1a237e', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      {onboardingResult.temporaryPassword}
                    </code>
                    <button
                      onClick={handleCopyOnboardingPassword}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 6,
                        border: 'none',
                        background: onboardingCopied ? '#4CAF50' : '#2196F3',
                        color: '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontWeight: 600,
                        fontSize: 13,
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {onboardingCopied ? <><CheckCircle size={14} /> Copied!</> : <><Copy size={14} /> Copy</>}
                    </button>
                  </div>
                </div>
                
                <div style={{ background: '#e8f5e9', borderRadius: 8, padding: 16, marginBottom: 20 }}>
                  <div style={{ fontWeight: 600, color: '#2e7d32', marginBottom: 12, fontSize: 15 }}>✅ What Was Created:</div>
                  <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#2e7d32', lineHeight: 1.8 }}>
                    <li>Employee record created: <strong>{onboardingResult.employee.employee_number}</strong></li>
                    <li>User account created: <strong>{onboardingResult.user.email}</strong></li>
                    <li>Assigned {onboardingResult.roleCount} role{onboardingResult.roleCount !== 1 ? 's' : ''}</li>
                    <li>{onboardingResult.employee.designation && `Designation: ${onboardingResult.employee.designation}`}</li>
                    <li>{onboardingResult.employee.employee_department && `Department: ${onboardingResult.employee.employee_department}`}</li>
                  </ul>
                </div>
                
                <div style={{ background: '#fff3cd', borderLeft: '4px solid #ffc107', padding: 16, borderRadius: 4, marginBottom: 20 }}>
                  <div style={{ fontWeight: 600, color: '#856404', marginBottom: 8 }}>⚠️ Important</div>
                  <p style={{ margin: 0, fontSize: 13, color: '#856404', lineHeight: 1.6 }}>
                    Please save this password. The employee should change this password after their first login. They can access the employee portal immediately.
                  </p>
                </div>
                
                <button
                  onClick={() => {
                    setOnboardingResult(null)
                    setOnboardingCopied(false)
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: 8,
                    border: 'none',
                    background: 'var(--primary)',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: 15
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
