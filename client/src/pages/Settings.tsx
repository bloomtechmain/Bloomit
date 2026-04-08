import { useState, useEffect } from 'react'
import { API_URL } from '../config/api'
import { fetchWithAuth } from '../utils/apiClient'
import { useToast } from '../context/ToastContext'
import { decodeToken, formatTimeUntilExpiry } from '../utils/tokenManager'
import { Shield, Users as UsersIcon, Key, Plus, Edit2, Trash2, Save, X, Copy, CheckCircle, User, RotateCcw, Settings as SettingsIcon2, Lock, AlertTriangle, Globe, Clock, Eye, EyeOff } from 'lucide-react'

/* ── Slate theme constants ── */
const SL      = '#334155'   // slate-700
const SL_DARK = '#1e293b'   // slate-800

const SETTINGS_INPUT: React.CSSProperties = {
  padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0',
  background: '#f8fafc', fontSize: 13.5, color: '#1e293b', outline: 'none',
  width: '100%', boxSizing: 'border-box', transition: 'all 0.2s',
}
function sFocusIn(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  e.target.style.borderColor = SL; e.target.style.background = '#fff'
  e.target.style.boxShadow = '0 0 0 3px rgba(51,65,85,0.1)'
}
function sFocusOut(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'
  e.target.style.boxShadow = 'none'
}
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
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)

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
      return <span style={{ padding: '3px 10px', borderRadius: 99, background: 'rgba(245,158,11,0.12)', color: '#b45309', border: '1px solid rgba(245,158,11,0.3)', fontSize: 11.5, fontWeight: 700 }}>No Account</span>
    }
    switch (emp.account_status) {
      case 'suspended':
        return <span title={`Suspended: ${emp.suspended_reason || 'No reason provided'}`} style={{ padding: '3px 10px', borderRadius: 99, background: 'rgba(234,88,12,0.1)', color: '#c2410c', border: '1px solid rgba(234,88,12,0.25)', fontSize: 11.5, fontWeight: 700, cursor: 'help' }}>Suspended</span>
      case 'terminated':
        return <span title={`Terminated: ${emp.terminated_reason || 'No reason provided'}. Purge: ${emp.scheduled_purge_date ? new Date(emp.scheduled_purge_date).toLocaleDateString() : 'Unknown'}`} style={{ padding: '3px 10px', borderRadius: 99, background: 'rgba(220,38,38,0.1)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.25)', fontSize: 11.5, fontWeight: 700, cursor: 'help' }}>Terminated</span>
      default:
        return <span style={{ padding: '3px 10px', borderRadius: 99, background: 'rgba(22,163,74,0.1)', color: '#16a34a', border: '1px solid rgba(22,163,74,0.25)', fontSize: 11.5, fontWeight: 700 }}>Active</span>
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
    <div style={{ width: '100%', display: 'grid', gap: 16, position: 'relative' }}>
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: -1 }}>
        <Shield size={520} strokeWidth={0.7} style={{ position: 'absolute', right: -120, top: -80, opacity: 0.13, color: 'var(--primary)', transform: 'rotate(-12deg)' }} />
        <Key size={380} strokeWidth={0.7} style={{ position: 'absolute', left: -60, bottom: -40, opacity: 0.11, color: 'var(--primary)', transform: 'rotate(10deg)' }} />
        <Lock size={300} strokeWidth={0.7} style={{ position: 'absolute', left: '38%', top: '30%', opacity: 0.07, color: 'var(--primary)', transform: 'translateX(-50%)' }} />
        <UsersIcon size={200} strokeWidth={0.7} style={{ position: 'absolute', left: '5%', top: '5%', opacity: 0.09, color: 'var(--primary)', transform: 'rotate(-6deg)' }} />
        <SettingsIcon2 size={220} strokeWidth={0.7} style={{ position: 'absolute', right: '4%', top: '35%', opacity: 0.08, color: 'var(--primary)', transform: 'rotate(-8deg)' }} />
        <User size={240} strokeWidth={0.7} style={{ position: 'absolute', right: '6%', bottom: '8%', opacity: 0.09, color: 'var(--primary)', transform: 'rotate(6deg)' }} />
        <Shield size={180} strokeWidth={0.7} style={{ position: 'absolute', left: '2%', top: '45%', opacity: 0.07, color: 'var(--primary)' }} />
      </div>
      {/* Sub-tabs */}
      <div style={{ background: '#fff', borderRadius: 14, padding: '10px 14px', display: 'flex', gap: 6, flexWrap: 'wrap', boxShadow: '0 1px 6px rgba(0,0,0,0.07)', border: '1px solid rgba(0,0,0,0.05)', marginBottom: 4 }}>
        {([
          { key: 'roles',               label: 'Roles',               icon: <Shield size={13} />      },
          { key: 'permissions',         label: 'Permissions',         icon: <Key size={13} />         },
          { key: 'users',               label: 'User Management',     icon: <UsersIcon size={13} />   },
          { key: 'profile',             label: 'My Profile',          icon: <User size={13} />        },
          { key: 'app_settings',        label: 'App Settings',        icon: <SettingsIcon2 size={13} /> },
          { key: 'employee_onboarding', label: 'Employee Onboarding', icon: <UsersIcon size={13} />   },
        ] as { key: typeof subTab; label: string; icon: React.ReactNode }[]).map(t => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '7px 16px', borderRadius: 99, fontSize: 12.5, fontWeight: 600,
              cursor: 'pointer', border: 'none', transition: 'all 0.15s',
              background: subTab === t.key ? `linear-gradient(135deg, ${SL_DARK} 0%, ${SL} 100%)` : 'rgba(51,65,85,0.07)',
              color: subTab === t.key ? '#fff' : SL,
            }}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>
      
      {/* Role Management */}
      {subTab === 'roles' && (
        <div style={{ display: 'grid', gap: 16 }}>

          {/* Inline add/edit form */}
          {(isAddingRole || editingRole) && (
            <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(30,41,59,0.1)', border: '1px solid rgba(0,0,0,0.05)' }}>
              <div style={{ background: `linear-gradient(135deg, ${SL_DARK} 0%, ${SL} 100%)`, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <Shield size={15} color="rgba(255,255,255,0.8)" />
                  <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{editingRole ? 'Edit Role' : 'Create New Role'}</span>
                </div>
                <button onClick={() => { setIsAddingRole(false); setEditingRole(null); setRoleName(''); setRoleDescription('') }} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={14} />
                </button>
              </div>
              <div style={{ padding: '20px 20px 16px', display: 'grid', gap: 14 }}>
                <label style={{ display: 'grid', gap: 5 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>Role Name <span style={{ color: '#ef4444' }}>*</span></span>
                  <input type="text" value={roleName} onChange={e => setRoleName(e.target.value)} placeholder="e.g., Senior Accountant" style={SETTINGS_INPUT} onFocus={sFocusIn} onBlur={sFocusOut} />
                </label>
                <label style={{ display: 'grid', gap: 5 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>Description <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span></span>
                  <textarea value={roleDescription} onChange={e => setRoleDescription(e.target.value)} placeholder="Describe this role…" rows={3} style={{ ...SETTINGS_INPUT, resize: 'vertical', lineHeight: 1.5 }} onFocus={sFocusIn} onBlur={sFocusOut} />
                </label>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button onClick={() => { setIsAddingRole(false); setEditingRole(null); setRoleName(''); setRoleDescription('') }} style={{ padding: '9px 18px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                  <button onClick={editingRole ? handleUpdateRole : handleCreateRole} disabled={saving} style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: saving ? '#94a3b8' : `linear-gradient(135deg, ${SL_DARK} 0%, ${SL} 100%)`, color: '#fff', fontWeight: 700, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
                    <Save size={13} />{saving ? 'Saving…' : 'Save Role'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Roles container */}
          <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.07)', border: '1px solid rgba(0,0,0,0.05)' }}>
            {/* Container header */}
            <div style={{ background: `linear-gradient(90deg, ${SL_DARK} 0%, #475569 55%, ${SL} 100%)`, padding: '13px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <Shield size={15} color="rgba(255,255,255,0.85)" />
                <span style={{ color: '#fff', fontWeight: 700, fontSize: 13.5 }}>Role Management</span>
                <span style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 99 }}>
                  {rolesLoading ? '…' : roles.length}
                </span>
              </div>
              <button
                onClick={() => { setIsAddingRole(true); setEditingRole(null); setRoleName(''); setRoleDescription('') }}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 15px', borderRadius: 9, border: 'none', background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.25)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
              >
                <Plus size={13} />Create Role
              </button>
            </div>

            {/* Roles list */}
            {rolesLoading ? (
              <div style={{ padding: 52, textAlign: 'center', color: '#94a3b8', fontSize: 13.5 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', border: `3px solid #f1f5f9`, borderTop: `3px solid ${SL}`, animation: 'ql-spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                Loading roles…
              </div>
            ) : roles.length === 0 ? (
              <div style={{ padding: 52, textAlign: 'center' }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(51,65,85,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', color: '#94a3b8' }}>
                  <Shield size={24} />
                </div>
                <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 14, marginBottom: 6 }}>No roles yet</div>
                <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 20 }}>Create your first custom role to get started.</div>
                <button onClick={() => setIsAddingRole(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 20px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${SL_DARK} 0%, ${SL} 100%)`, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  <Plus size={13} />Create Role
                </button>
              </div>
            ) : (
              <div>
                {roles.map((role, idx) => (
                  <div
                    key={role.id}
                    style={{
                      padding: '15px 20px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: idx < roles.length - 1 ? '1px solid #f1f5f9' : 'none',
                      borderLeft: `3px solid ${role.is_system_role ? '#2563eb' : SL}`,
                      transition: 'background 0.12s',
                      cursor: 'default',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    {/* Left: icon + info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: role.is_system_role ? 'rgba(37,99,235,0.1)' : 'rgba(51,65,85,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: role.is_system_role ? '#2563eb' : SL, flexShrink: 0 }}>
                        <Shield size={17} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        {/* Name row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>{role.name}</span>
                          {role.is_system_role && (
                            <span style={{ padding: '2px 8px', borderRadius: 99, background: 'rgba(37,99,235,0.1)', color: '#2563eb', fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>System</span>
                          )}
                        </div>
                        {/* Description */}
                        <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 480 }}>
                          {role.description || <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>No description</span>}
                        </div>
                        {/* Stats chips */}
                        <div style={{ display: 'flex', gap: 8, marginTop: 7 }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: SL, background: 'rgba(51,65,85,0.07)', padding: '3px 9px', borderRadius: 99, fontWeight: 600 }}>
                            <Key size={10} />{role.permission_count} permission{role.permission_count !== 1 ? 's' : ''}
                          </span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: '#475569', background: '#f1f5f9', padding: '3px 9px', borderRadius: 99, fontWeight: 600 }}>
                            <UsersIcon size={10} />{role.user_count} user{role.user_count !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: action buttons */}
                    {!role.is_system_role ? (
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 16 }}>
                        <button
                          onClick={() => { setEditingRole(role); setRoleName(role.name); setRoleDescription(role.description || ''); setIsAddingRole(false) }}
                          style={{ width: 34, height: 34, borderRadius: 9, border: 'none', background: 'rgba(22,163,74,0.1)', color: '#16a34a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#16a34a'; (e.currentTarget as HTMLButtonElement).style.color = '#fff' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(22,163,74,0.1)'; (e.currentTarget as HTMLButtonElement).style.color = '#16a34a' }}
                          title="Edit role"
                        ><Edit2 size={14} /></button>
                        <button
                          onClick={() => handleDeleteRole(role)}
                          style={{ width: 34, height: 34, borderRadius: 9, border: 'none', background: 'rgba(220,38,38,0.1)', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#dc2626'; (e.currentTarget as HTMLButtonElement).style.color = '#fff' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(220,38,38,0.1)'; (e.currentTarget as HTMLButtonElement).style.color = '#dc2626' }}
                          title="Delete role"
                        ><Trash2 size={14} /></button>
                      </div>
                    ) : (
                      <span style={{ fontSize: 11.5, color: '#cbd5e1', fontStyle: 'italic', flexShrink: 0, marginLeft: 16 }}>Protected</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Permission Assignment */}
      {subTab === 'permissions' && (
        <div style={{ display: 'grid', gap: 16 }}>
          {/* Header bar with role selector */}
          <div style={{ background: '#fff', borderRadius: 14, padding: '13px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.07)', border: '1px solid rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(51,65,85,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: SL }}>
                <Key size={17} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>Permission Assignment</div>
                <div style={{ fontSize: 11.5, color: '#64748b' }}>Assign permissions to a custom role</div>
              </div>
            </div>
            <select
              value={selectedRole?.id || ''}
              onChange={e => {
                const role = roles.find(r => r.id === Number(e.target.value))
                setSelectedRole(role || null)
                if (role) fetchRolePermissions(role.id)
              }}
              style={{ ...SETTINGS_INPUT, width: 'auto', minWidth: 220 }}
              onFocus={sFocusIn} onBlur={sFocusOut}
            >
              <option value="">Select a role…</option>
              {roles.filter(r => !r.is_system_role).map(role => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
          </div>

          {selectedRole && (
            <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.09)', border: '1px solid rgba(0,0,0,0.05)' }}>
              <div style={{ background: `linear-gradient(135deg, ${SL_DARK} 0%, ${SL} 100%)`, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <Key size={15} color="rgba(255,255,255,0.8)" />
                  <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Permissions for {selectedRole.name}</span>
                </div>
                <button
                  onClick={handleSavePermissions}
                  disabled={saving}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 18px', borderRadius: 9, border: 'none', background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
                >
                  <Save size={13} />{saving ? 'Saving…' : 'Save Permissions'}
                </button>
              </div>
              <div style={{ padding: 20 }}>
                <PermissionHierarchy
                  selectedPermissions={rolePermissions}
                  onPermissionsChange={setRolePermissions}
                  allPermissions={permissions}
                  loading={permissionsLoading}
                />
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* User Management */}
      {subTab === 'users' && (
        <div style={{ display: 'grid', gap: 16 }}>
          {/* Header bar */}
          <div style={{ background: '#fff', borderRadius: 14, padding: '13px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 6px rgba(0,0,0,0.07)', border: '1px solid rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(51,65,85,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: SL }}>
                <UsersIcon size={17} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>User Management</div>
                <div style={{ fontSize: 11.5, color: '#64748b' }}>{users.length} user{users.length !== 1 ? 's' : ''} registered</div>
              </div>
            </div>
            <button onClick={() => setIsCreatingUser(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${SL_DARK} 0%, ${SL} 100%)`, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(30,41,59,0.3)' }}>
              <Plus size={14} />Create User
            </button>
          </div>

          {usersLoading ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', border: `3px solid #f1f5f9`, borderTop: `3px solid ${SL}`, animation: 'ql-spin 0.8s linear infinite', margin: '0 auto 12px' }} />Loading users…
            </div>
          ) : (
            <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.07)', border: '1px solid rgba(0,0,0,0.05)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
                <thead>
                  <tr style={{ background: `linear-gradient(90deg, ${SL_DARK} 0%, #475569 55%, ${SL} 100%)` }}>
                    <th style={{ padding: '11px 16px', textAlign: 'left', fontWeight: 700, color: '#fff', fontSize: 12 }}>User</th>
                    <th style={{ padding: '11px 16px', textAlign: 'left', fontWeight: 700, color: '#fff', fontSize: 12 }}>Email</th>
                    <th style={{ padding: '11px 16px', textAlign: 'left', fontWeight: 700, color: '#fff', fontSize: 12 }}>Roles</th>
                    <th style={{ padding: '11px 16px', textAlign: 'left', fontWeight: 700, color: '#fff', fontSize: 12 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, idx) => (
                    <tr key={user.id}
                      style={{ borderBottom: idx < users.length - 1 ? '1px solid #f1f5f9' : 'none', transition: 'background 0.12s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}
                    >
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: `linear-gradient(135deg, ${SL_DARK}, ${SL})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                            {(user.name || user.email).slice(0, 1).toUpperCase()}
                          </div>
                          {user.name || '—'}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#475569' }}>{user.email}</td>
                      <td style={{ padding: '12px 16px' }}>
                        {user.roles.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                            {user.roles.map(role => (
                              <span key={role.id} style={{ padding: '3px 9px', borderRadius: 99, background: role.is_system_role ? 'rgba(37,99,235,0.1)' : 'rgba(51,65,85,0.08)', color: role.is_system_role ? '#2563eb' : SL, fontSize: 11.5, fontWeight: 700 }}>
                                {role.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: 12 }}>No roles assigned</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => { setAssigningUser(user); setSelectedRoleIds(user.roles.map(r => r.id)) }}
                            style={{ width: 34, height: 34, borderRadius: 9, border: 'none', background: 'rgba(51,65,85,0.08)', color: SL, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = SL; (e.currentTarget as HTMLButtonElement).style.color = '#fff' }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(51,65,85,0.08)'; (e.currentTarget as HTMLButtonElement).style.color = SL }}
                            title="Assign Roles"><Key size={14} />
                          </button>
                          <button
                            onClick={() => handleResetPassword(user)}
                            disabled={saving}
                            style={{ width: 34, height: 34, borderRadius: 9, border: 'none', background: 'rgba(234,88,12,0.1)', color: '#c2410c', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                            onMouseEnter={e => { if (!saving) { (e.currentTarget as HTMLButtonElement).style.background = '#ea580c'; (e.currentTarget as HTMLButtonElement).style.color = '#fff' } }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(234,88,12,0.1)'; (e.currentTarget as HTMLButtonElement).style.color = '#c2410c' }}
                            title="Reset Password"><RotateCcw size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr><td colSpan={4} style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No users found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Create User Modal */}
          {isCreatingUser && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'grid', placeItems: 'center', zIndex: 1000 }} onClick={() => setIsCreatingUser(false)}>
              <div style={{ width: 'min(580px, 92vw)', background: '#fff', borderRadius: 18, overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.18)', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                <div style={{ background: `linear-gradient(135deg, ${SL_DARK} 0%, ${SL} 100%)`, padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <UsersIcon size={16} color="rgba(255,255,255,0.85)" />
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Create New User</span>
                  </div>
                  <button onClick={() => { setIsCreatingUser(false); setNewUserEmail(''); setNewUserRoleIds([]) }} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
                </div>
                <div style={{ padding: '22px', overflow: 'auto', display: 'grid', gap: 16 }}>
                  <label style={{ display: 'grid', gap: 5 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>Email Address <span style={{ color: '#ef4444' }}>*</span></span>
                    <input type="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} placeholder="user@example.com" style={SETTINGS_INPUT} onFocus={sFocusIn} onBlur={sFocusOut} />
                    <span style={{ fontSize: 11.5, color: '#94a3b8' }}>Will also be used as the login username</span>
                  </label>

                  <div style={{ display: 'grid', gap: 6 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>Assign Roles <span style={{ color: '#ef4444' }}>*</span></span>
                    <div style={{ display: 'grid', gap: 8, maxHeight: 260, overflow: 'auto', padding: 8, border: '1.5px solid #e2e8f0', borderRadius: 10, background: '#f8fafc' }}>
                      {roles.map(role => (
                        <label key={role.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '9px 12px', borderRadius: 8, background: newUserRoleIds.includes(role.id) ? 'rgba(51,65,85,0.07)' : '#fff', border: '1.5px solid ' + (newUserRoleIds.includes(role.id) ? SL : '#e2e8f0'), transition: 'all 0.15s' }}>
                          <input type="checkbox" checked={newUserRoleIds.includes(role.id)} onChange={e => { if (e.target.checked) setNewUserRoleIds([...newUserRoleIds, role.id]); else setNewUserRoleIds(newUserRoleIds.filter(id => id !== role.id)) }} style={{ width: 16, height: 16, cursor: 'pointer', accentColor: SL }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 13 }}>{role.name}</div>
                            {role.description && <div style={{ fontSize: 11.5, color: '#64748b' }}>{role.description}</div>}
                          </div>
                          {role.is_system_role && <span style={{ padding: '2px 8px', borderRadius: 99, background: 'rgba(37,99,235,0.1)', color: '#2563eb', fontSize: 10, fontWeight: 700 }}>SYSTEM</span>}
                        </label>
                      ))}
                    </div>
                    <div style={{ fontSize: 11.5, color: '#64748b' }}>{newUserRoleIds.length} role{newUserRoleIds.length !== 1 ? 's' : ''} selected</div>
                  </div>

                  <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: 14, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <Lock size={14} style={{ color: '#64748b', marginTop: 2, flexShrink: 0 }} />
                    <p style={{ margin: 0, fontSize: 12.5, color: '#475569', lineHeight: 1.6 }}>A secure temporary password will be auto-generated and sent to the user's email address.</p>
                  </div>

                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button onClick={() => { setIsCreatingUser(false); setNewUserEmail(''); setNewUserRoleIds([]) }} style={{ padding: '9px 18px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                    <button onClick={handleCreateUser} disabled={saving || !newUserEmail || newUserRoleIds.length === 0} style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: (saving || !newUserEmail || newUserRoleIds.length === 0) ? '#94a3b8' : `linear-gradient(135deg, ${SL_DARK} 0%, ${SL} 100%)`, color: '#fff', fontWeight: 700, fontSize: 13, cursor: (saving || !newUserEmail || newUserRoleIds.length === 0) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
                      <Plus size={13} />{saving ? 'Creating…' : 'Create User'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Success Modal - Show Created Password */}
          {createdUserPassword && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'grid', placeItems: 'center', zIndex: 1001 }} onClick={() => { setCreatedUserPassword(null); setEmailSentStatus(null) }}>
              <div style={{ width: 'min(520px, 92vw)', background: '#fff', borderRadius: 18, overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }} onClick={e => e.stopPropagation()}>
                <div style={{ background: 'linear-gradient(135deg, #14532d 0%, #16a34a 100%)', padding: '24px 24px 20px', textAlign: 'center' }}>
                  <div style={{ display: 'inline-flex', width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                    <CheckCircle size={26} color="#fff" />
                  </div>
                  <h3 style={{ margin: '0 0 6px', fontSize: 18, color: '#fff', fontWeight: 700 }}>User Created Successfully!</h3>
                  {emailSentStatus?.sent ? (
                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>Welcome email sent with login credentials.</p>
                  ) : (
                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>User created — email delivery failed. {emailSentStatus?.error}</p>
                  )}
                </div>
                <div style={{ padding: '20px 22px' }}>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', marginBottom: 8 }}>TEMPORARY PASSWORD</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
                    <code style={{ flex: 1, fontSize: 15, fontWeight: 700, color: SL_DARK, fontFamily: 'monospace', wordBreak: 'break-all' }}>{createdUserPassword}</code>
                    <button onClick={handleCopyPassword} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: copied ? '#16a34a' : SL, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {copied ? <><CheckCircle size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
                    </button>
                  </div>
                  <div style={{ background: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: 12.5, color: '#92400e' }}>
                    Save this password — it will not be shown again. The user should change it after first login.
                  </div>
                  <button onClick={() => { setCreatedUserPassword(null); setEmailSentStatus(null); setCopied(false) }} style={{ width: '100%', padding: '11px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${SL_DARK} 0%, ${SL} 100%)`, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>Done</button>
                </div>
              </div>
            </div>
          )}
          
          {/* Assign Roles Modal */}
          {assigningUser && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'grid', placeItems: 'center', zIndex: 1000 }} onClick={() => setAssigningUser(null)}>
              <div style={{ width: 'min(560px, 92vw)', background: '#fff', borderRadius: 18, overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.18)', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                <div style={{ background: `linear-gradient(135deg, ${SL_DARK} 0%, ${SL} 100%)`, padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Key size={16} color="rgba(255,255,255,0.85)" />
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Assign Roles — {assigningUser.name || assigningUser.email}</span>
                  </div>
                  <button onClick={() => { setAssigningUser(null); setSelectedRoleIds([]) }} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
                </div>
                <div style={{ padding: '20px 22px', overflow: 'auto', display: 'grid', gap: 14 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>Select roles to assign (multiple allowed)</span>
                  <div style={{ display: 'grid', gap: 8, maxHeight: 340, overflow: 'auto', padding: 8, border: '1.5px solid #e2e8f0', borderRadius: 10, background: '#f8fafc' }}>
                    {roles.map(role => (
                      <label key={role.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '9px 12px', borderRadius: 8, background: selectedRoleIds.includes(role.id) ? 'rgba(51,65,85,0.07)' : '#fff', border: '1.5px solid ' + (selectedRoleIds.includes(role.id) ? SL : '#e2e8f0'), transition: 'all 0.15s' }}>
                        <input type="checkbox" checked={selectedRoleIds.includes(role.id)} onChange={e => { if (e.target.checked) setSelectedRoleIds([...selectedRoleIds, role.id]); else setSelectedRoleIds(selectedRoleIds.filter(id => id !== role.id)) }} style={{ width: 16, height: 16, cursor: 'pointer', accentColor: SL }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 13 }}>{role.name}</div>
                          {role.description && <div style={{ fontSize: 11.5, color: '#64748b' }}>{role.description}</div>}
                        </div>
                        {role.is_system_role && <span style={{ padding: '2px 8px', borderRadius: 99, background: 'rgba(37,99,235,0.1)', color: '#2563eb', fontSize: 10, fontWeight: 700 }}>SYSTEM</span>}
                      </label>
                    ))}
                  </div>
                  <div style={{ fontSize: 11.5, color: '#64748b' }}>{selectedRoleIds.length} role{selectedRoleIds.length !== 1 ? 's' : ''} selected</div>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button onClick={() => { setAssigningUser(null); setSelectedRoleIds([]) }} style={{ padding: '9px 18px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                    <button onClick={handleAssignRoles} disabled={saving} style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: saving ? '#94a3b8' : `linear-gradient(135deg, ${SL_DARK} 0%, ${SL} 100%)`, color: '#fff', fontWeight: 700, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
                      <Save size={13} />{saving ? 'Saving…' : `Assign ${selectedRoleIds.length} Role${selectedRoleIds.length !== 1 ? 's' : ''}`}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Reset Password Success Modal */}
          {resettingUser && resetPasswordResult && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'grid', placeItems: 'center', zIndex: 1001 }} onClick={() => { setResettingUser(null); setResetPasswordResult(null); setResetCopied(false) }}>
              <div style={{ width: 'min(500px, 92vw)', background: '#fff', borderRadius: 18, overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }} onClick={e => e.stopPropagation()}>
                <div style={{ background: 'linear-gradient(135deg, #9a3412 0%, #ea580c 100%)', padding: '24px 24px 20px', textAlign: 'center' }}>
                  <div style={{ display: 'inline-flex', width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                    <RotateCcw size={24} color="#fff" />
                  </div>
                  <h3 style={{ margin: '0 0 4px', fontSize: 17, color: '#fff', fontWeight: 700 }}>Password Reset</h3>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>{resettingUser.email}</p>
                  {resetPasswordResult.emailSent
                    ? <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>Reset email sent successfully.</p>
                    : <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Email delivery failed. {resetPasswordResult.error}</p>}
                </div>
                <div style={{ padding: '20px 22px' }}>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', marginBottom: 8 }}>TEMPORARY PASSWORD</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
                    <code style={{ flex: 1, fontSize: 15, fontWeight: 700, color: SL_DARK, fontFamily: 'monospace', wordBreak: 'break-all' }}>{resetPasswordResult.password}</code>
                    <button onClick={handleCopyResetPassword} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: resetCopied ? '#16a34a' : SL, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {resetCopied ? <><CheckCircle size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
                    </button>
                  </div>
                  <div style={{ background: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: 12.5, color: '#92400e' }}>
                    The user must change this password on next login. Share it directly if email was not delivered.
                  </div>
                  <button onClick={() => { setResettingUser(null); setResetPasswordResult(null); setResetCopied(false) }} style={{ width: '100%', padding: '11px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${SL_DARK} 0%, ${SL} 100%)`, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>Done</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* My Profile Tab */}
      {subTab === 'profile' && (() => {
        const decoded = decodeToken(accessToken)
        const email = decoded?.email ?? '—'
        const roleNames = decoded?.roleNames ?? []
        const userId = decoded?.userId
        const sessionExpiry = formatTimeUntilExpiry(accessToken)
        const avatarLetter = email.slice(0, 1).toUpperCase()
        return (
          <div style={{ display: 'grid', gap: 16 }}>

            {/* ── Account Overview ── */}
            <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.07)', border: '1px solid rgba(0,0,0,0.05)' }}>
              <div style={{ background: `linear-gradient(90deg, ${SL_DARK} 0%, #475569 55%, ${SL} 100%)`, padding: '13px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <User size={15} color="rgba(255,255,255,0.85)" />
                <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>My Account</span>
              </div>
              <div style={{ padding: '26px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap' }}>
                  {/* Avatar */}
                  <div style={{ width: 68, height: 68, borderRadius: '50%', background: `linear-gradient(135deg, ${SL_DARK} 0%, ${SL} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 26, fontWeight: 800, flexShrink: 0, boxShadow: '0 4px 14px rgba(30,41,59,0.25)' }}>
                    {avatarLetter}
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 17, fontWeight: 700, color: '#1e293b', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</div>
                    {/* Role pills */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                      {roleNames.length > 0 ? roleNames.map((r, i) => (
                        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 99, background: 'rgba(51,65,85,0.08)', color: SL, fontSize: 11.5, fontWeight: 700 }}>
                          <Shield size={10} />{r}
                        </span>
                      )) : (
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>No roles assigned</span>
                      )}
                    </div>
                    {/* Info chips */}
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 99, background: '#f1f5f9', border: '1px solid #e2e8f0' }}>
                        <Clock size={11} style={{ color: '#64748b' }} />
                        <span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>Session expires in <strong style={{ color: SL }}>{sessionExpiry}</strong></span>
                      </div>
                      {userId && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 99, background: '#f1f5f9', border: '1px solid #e2e8f0' }}>
                          <User size={11} style={{ color: '#64748b' }} />
                          <span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>User <strong style={{ color: SL }}>#{userId}</strong></span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Change Password ── */}
            <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.07)', border: '1px solid rgba(0,0,0,0.05)' }}>
              <div style={{ background: `linear-gradient(90deg, ${SL_DARK} 0%, #475569 55%, ${SL} 100%)`, padding: '13px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Lock size={15} color="rgba(255,255,255,0.85)" />
                <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Change Password</span>
              </div>
              <div style={{ padding: '24px 26px' }}>
                <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>

                  {/* Left — form fields */}
                  <div style={{ flex: '1 1 280px', display: 'grid', gap: 16 }}>

                    {/* Current password */}
                    <label style={{ display: 'grid', gap: 5 }}>
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>Current Password <span style={{ color: '#ef4444' }}>*</span></span>
                      <div style={{ position: 'relative' }}>
                        <input type={showCurrentPw ? 'text' : 'password'} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Enter current password" style={{ ...SETTINGS_INPUT, paddingRight: 40 }} onFocus={sFocusIn} onBlur={sFocusOut} />
                        <button type="button" onClick={() => setShowCurrentPw(v => !v)} style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', padding: 0 }}>
                          {showCurrentPw ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </label>

                    {/* New password + strength */}
                    <label style={{ display: 'grid', gap: 5 }}>
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>New Password <span style={{ color: '#ef4444' }}>*</span></span>
                      <div style={{ position: 'relative' }}>
                        <input type={showNewPw ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Enter new password" style={{ ...SETTINGS_INPUT, paddingRight: 40 }} onFocus={sFocusIn} onBlur={sFocusOut} />
                        <button type="button" onClick={() => setShowNewPw(v => !v)} style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', padding: 0 }}>
                          {showNewPw ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                      {newPassword && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                          <div style={{ display: 'flex', gap: 3, flex: 1 }}>
                            {[1,2,3,4,5].map(i => (
                              <div key={i} style={{ flex: 1, height: 4, borderRadius: 99, background: i <= passwordStrength.strength ? passwordStrength.color : '#e2e8f0', transition: 'background 0.2s' }} />
                            ))}
                          </div>
                          <span style={{ fontSize: 11, color: passwordStrength.color, fontWeight: 700, whiteSpace: 'nowrap', minWidth: 52, textAlign: 'right' }}>{passwordStrength.text}</span>
                        </div>
                      )}
                    </label>

                    {/* Confirm password */}
                    <label style={{ display: 'grid', gap: 5 }}>
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>Confirm New Password <span style={{ color: '#ef4444' }}>*</span></span>
                      <div style={{ position: 'relative' }}>
                        <input type={showConfirmPw ? 'text' : 'password'} value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} placeholder="Confirm new password" style={{ ...SETTINGS_INPUT, paddingRight: 40 }} onFocus={sFocusIn} onBlur={sFocusOut} />
                        <button type="button" onClick={() => setShowConfirmPw(v => !v)} style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', padding: 0 }}>
                          {showConfirmPw ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                      {confirmNewPassword && newPassword !== confirmNewPassword && (
                        <span style={{ fontSize: 11.5, color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <X size={12} />Passwords do not match
                        </span>
                      )}
                      {confirmNewPassword && newPassword === confirmNewPassword && (
                        <span style={{ fontSize: 11.5, color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle size={12} />Passwords match
                        </span>
                      )}
                    </label>

                    {passwordChangeError && (
                      <div style={{ padding: '10px 13px', background: 'rgba(220,38,38,0.07)', border: '1.5px solid rgba(220,38,38,0.25)', borderRadius: 10, color: '#dc2626', fontSize: 12.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7 }}>
                        <AlertTriangle size={13} style={{ flexShrink: 0 }} />{passwordChangeError}
                      </div>
                    )}

                    <button
                      onClick={handleChangeOwnPassword}
                      disabled={changingPassword || !currentPassword || !newPassword || !confirmNewPassword}
                      style={{ padding: '11px 0', borderRadius: 10, border: 'none', background: (changingPassword || !currentPassword || !newPassword || !confirmNewPassword) ? '#94a3b8' : `linear-gradient(135deg, ${SL_DARK} 0%, ${SL} 100%)`, color: '#fff', fontWeight: 700, cursor: (changingPassword || !currentPassword || !newPassword || !confirmNewPassword) ? 'not-allowed' : 'pointer', fontSize: 13.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', boxShadow: (changingPassword || !currentPassword || !newPassword || !confirmNewPassword) ? 'none' : '0 2px 8px rgba(30,41,59,0.25)' }}
                    >
                      <Save size={14} />{changingPassword ? 'Changing Password…' : 'Change Password'}
                    </button>

                  </div>

                  {/* Right — live requirements */}
                  <div style={{ flex: '0 0 200px', minWidth: 180 }}>
                    <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '16px 16px', height: '100%', boxSizing: 'border-box' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: SL, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 12 }}>Requirements</div>
                      <div style={{ display: 'grid', gap: 9 }}>
                        {[
                          { text: 'At least 10 characters', met: newPassword.length >= 10 },
                          { text: 'Uppercase letter', met: /[A-Z]/.test(newPassword) },
                          { text: 'Lowercase letter', met: /[a-z]/.test(newPassword) },
                          { text: 'One number', met: /\d/.test(newPassword) },
                          { text: 'One symbol', met: /[^A-Za-z0-9]/.test(newPassword) },
                          { text: 'Not a recent password', met: false },
                        ].map((req, i) => {
                          const active = newPassword.length > 0
                          const met = active && req.met
                          const unmet = active && !req.met
                          return (
                            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5, color: met ? '#16a34a' : unmet ? '#ef4444' : '#94a3b8', transition: 'color 0.2s' }}>
                              <div style={{ width: 16, height: 16, borderRadius: '50%', background: met ? '#dcfce7' : unmet ? '#fee2e2' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1, transition: 'background 0.2s' }}>
                                {met
                                  ? <CheckCircle size={10} style={{ color: '#16a34a' }} />
                                  : unmet
                                    ? <X size={9} style={{ color: '#ef4444' }} />
                                    : <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#cbd5e1' }} />
                                }
                              </div>
                              <span style={{ lineHeight: 1.4 }}>{req.text}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>

          </div>
        )
      })()}
      
      {/* Application Settings Tab */}
      {subTab === 'app_settings' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.09)', border: '1px solid rgba(0,0,0,0.05)' }}>
            <div style={{ background: `linear-gradient(135deg, ${SL_DARK} 0%, ${SL} 100%)`, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Globe size={16} color="rgba(255,255,255,0.85)" />
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>International Clock Configuration</span>
            </div>
            <div style={{ padding: '22px 24px' }}>
              <div style={{ display: 'grid', gap: 16, maxWidth: 560 }}>
                <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '13px 15px', fontSize: 12.5, color: '#475569', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <Globe size={14} style={{ color: '#64748b', marginTop: 1, flexShrink: 0 }} />
                  <p style={{ margin: 0, lineHeight: 1.6 }}>The international clock appears on the home page below the local time. Select the timezone for international time tracking.</p>
                </div>

                <label style={{ display: 'grid', gap: 5 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>Select Timezone</span>
                  <select value={applicationTimezone} onChange={e => setApplicationTimezone(e.target.value)} disabled={timezoneLoading} style={{ ...SETTINGS_INPUT, cursor: timezoneLoading ? 'not-allowed' : 'pointer', opacity: timezoneLoading ? 0.6 : 1 }} onFocus={sFocusIn} onBlur={sFocusOut}>
                    {timezoneOptions.map(tz => (
                      <option key={tz.value} value={tz.value}>{tz.label}</option>
                    ))}
                  </select>
                  <span style={{ fontSize: 11.5, color: '#94a3b8' }}>Selected: <strong style={{ color: '#475569' }}>{applicationTimezone}</strong></span>
                </label>

                <button onClick={handleSaveTimezone} disabled={timezoneSaving || timezoneLoading} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: (timezoneSaving || timezoneLoading) ? '#94a3b8' : `linear-gradient(135deg, ${SL_DARK} 0%, ${SL} 100%)`, color: '#fff', fontWeight: 700, cursor: (timezoneSaving || timezoneLoading) ? 'not-allowed' : 'pointer', fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 8, width: 'fit-content' }}>
                  <Save size={14} />{timezoneSaving ? 'Saving…' : 'Save Timezone'}
                </button>

                <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '12px 14px', fontSize: 12.5, color: '#475569', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <Lock size={13} style={{ color: '#94a3b8', marginTop: 1, flexShrink: 0 }} />
                  <p style={{ margin: 0 }}>Requires <code style={{ background: '#e2e8f0', padding: '1px 5px', borderRadius: 4, fontSize: 11.5, color: SL }}>settings:manage</code> permission — typically SuperAdmin or Admin roles.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Employee Onboarding Tab */}
      {subTab === 'employee_onboarding' && (
        <div style={{ display: 'grid', gap: 16 }}>
          {/* Header bar */}
          <div style={{ background: '#fff', borderRadius: 14, padding: '13px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 6px rgba(0,0,0,0.07)', border: '1px solid rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(51,65,85,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: SL }}>
                <UsersIcon size={17} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>Employee Onboarding</div>
                <div style={{ fontSize: 11.5, color: '#64748b' }}>{employees.length} employee{employees.length !== 1 ? 's' : ''} on record</div>
              </div>
            </div>
            <button onClick={() => setIsOnboardingEmployee(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${SL_DARK} 0%, ${SL} 100%)`, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(30,41,59,0.3)' }}>
              <Plus size={14} />Onboard Employee
            </button>
          </div>

          {employeesLoading ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', border: `3px solid #f1f5f9`, borderTop: `3px solid ${SL}`, animation: 'ql-spin 0.8s linear infinite', margin: '0 auto 12px' }} />Loading employees…
            </div>
          ) : (
            <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.07)', border: '1px solid rgba(0,0,0,0.05)', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: `linear-gradient(90deg, ${SL_DARK} 0%, #475569 55%, ${SL} 100%)` }}>
                    <th style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 700, color: '#fff', fontSize: 11.5, whiteSpace: 'nowrap' }}>Employee #</th>
                    <th style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 700, color: '#fff', fontSize: 11.5 }}>Name</th>
                    <th style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 700, color: '#fff', fontSize: 11.5 }}>Email</th>
                    <th style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 700, color: '#fff', fontSize: 11.5 }}>Designation</th>
                    <th style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 700, color: '#fff', fontSize: 11.5 }}>Status</th>
                    <th style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 700, color: '#fff', fontSize: 11.5 }}>Roles</th>
                    <th style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 700, color: '#fff', fontSize: 11.5 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp, idx) => (
                    <tr key={emp.employee_id}
                      style={{ borderBottom: idx < employees.length - 1 ? '1px solid #f1f5f9' : 'none', transition: 'background 0.12s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}
                    >
                      <td style={{ padding: '11px 14px', fontWeight: 700, color: SL, fontSize: 12 }}>{emp.employee_number}</td>
                      <td style={{ padding: '11px 14px', fontWeight: 600, color: '#1e293b' }}>{emp.first_name} {emp.last_name}</td>
                      <td style={{ padding: '11px 14px', color: '#475569' }}>{emp.email}</td>
                      <td style={{ padding: '11px 14px', color: '#64748b' }}>{emp.designation || <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                      <td style={{ padding: '11px 14px' }}>{getStatusBadge(emp)}</td>
                      <td style={{ padding: '11px 14px' }}>
                        {emp.roles.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                            {emp.roles.map(role => (
                              <span key={role.id} style={{ padding: '3px 9px', borderRadius: 99, background: 'rgba(51,65,85,0.08)', color: SL, fontSize: 11, fontWeight: 700 }}>{role.name}</span>
                            ))}
                          </div>
                        ) : <span style={{ color: '#cbd5e1' }}>—</span>}
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        <div style={{ display: 'flex', gap: 5 }}>
                          {emp.has_user_account && emp.account_status !== 'terminated' && (
                            <button onClick={() => handleOpenEditModal(emp)}
                              style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'rgba(22,163,74,0.1)', color: '#16a34a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#16a34a'; (e.currentTarget as HTMLButtonElement).style.color = '#fff' }}
                              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(22,163,74,0.1)'; (e.currentTarget as HTMLButtonElement).style.color = '#16a34a' }}
                              title="Edit"><Edit2 size={13} /></button>
                          )}
                          {emp.has_user_account && emp.account_status === 'active' && (
                            <>
                              <button onClick={() => setSuspendingEmployee(emp)}
                                style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'rgba(234,88,12,0.1)', color: '#c2410c', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#ea580c'; (e.currentTarget as HTMLButtonElement).style.color = '#fff' }}
                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(234,88,12,0.1)'; (e.currentTarget as HTMLButtonElement).style.color = '#c2410c' }}
                                title="Suspend"><Lock size={13} /></button>
                              <button onClick={() => setTerminatingEmployee(emp)}
                                style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'rgba(220,38,38,0.1)', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#dc2626'; (e.currentTarget as HTMLButtonElement).style.color = '#fff' }}
                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(220,38,38,0.1)'; (e.currentTarget as HTMLButtonElement).style.color = '#dc2626' }}
                                title="Terminate"><AlertTriangle size={13} /></button>
                            </>
                          )}
                          {emp.has_user_account && emp.account_status === 'suspended' && (
                            <>
                              <button onClick={() => setReactivatingEmployee(emp)}
                                style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'rgba(22,163,74,0.1)', color: '#16a34a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#16a34a'; (e.currentTarget as HTMLButtonElement).style.color = '#fff' }}
                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(22,163,74,0.1)'; (e.currentTarget as HTMLButtonElement).style.color = '#16a34a' }}
                                title="Reactivate"><RotateCcw size={13} /></button>
                              <button onClick={() => setTerminatingEmployee(emp)}
                                style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'rgba(220,38,38,0.1)', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#dc2626'; (e.currentTarget as HTMLButtonElement).style.color = '#fff' }}
                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(220,38,38,0.1)'; (e.currentTarget as HTMLButtonElement).style.color = '#dc2626' }}
                                title="Terminate"><AlertTriangle size={13} /></button>
                            </>
                          )}
                          {emp.has_user_account && emp.account_status === 'terminated' && (
                            <span style={{ fontSize: 11.5, color: '#94a3b8', fontStyle: 'italic' }}>Terminated</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {employees.length === 0 && (
                    <tr><td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No employees found. Click "Onboard Employee" to get started.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Onboarding Drawer */}
          {isOnboardingEmployee && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 1000 }} onClick={() => { setIsOnboardingEmployee(false); setOnboardingData({ roleIds: [] }) }}>
              <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 'min(580px, 100vw)', background: '#fff', display: 'flex', flexDirection: 'column', boxShadow: '-6px 0 40px rgba(0,0,0,0.18)' }} onClick={e => e.stopPropagation()}>

                {/* Drawer header */}
                <div style={{ background: `linear-gradient(135deg, ${SL_DARK} 0%, ${SL} 100%)`, padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <UsersIcon size={17} color="#fff" />
                    </div>
                    <div>
                      <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>Onboard New Employee</div>
                      <div style={{ color: 'rgba(255,255,255,0.62)', fontSize: 11.5, marginTop: 2 }}>Fill in details to create employee account</div>
                    </div>
                  </div>
                  <button onClick={() => { setIsOnboardingEmployee(false); setOnboardingData({ roleIds: [] }) }} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <X size={15} />
                  </button>
                </div>

                {/* Scrollable body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px', display: 'grid', gap: 18, alignContent: 'start' }}>

                  {/* Personal Information */}
                  <div style={{ background: '#f8fafc', borderRadius: 12, padding: '16px 18px', border: '1.5px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 700, fontSize: 11.5, color: SL, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 14 }}>Personal Information</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                      <label style={{ display: 'grid', gap: 5 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>First Name <span style={{ color: '#ef4444' }}>*</span></span>
                        <input type="text" value={onboardingData.first_name || ''} onChange={e => setOnboardingData({ ...onboardingData, first_name: e.target.value })} placeholder="John" style={SETTINGS_INPUT} onFocus={sFocusIn} onBlur={sFocusOut} />
                      </label>
                      <label style={{ display: 'grid', gap: 5 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>Last Name <span style={{ color: '#ef4444' }}>*</span></span>
                        <input type="text" value={onboardingData.last_name || ''} onChange={e => setOnboardingData({ ...onboardingData, last_name: e.target.value })} placeholder="Doe" style={SETTINGS_INPUT} onFocus={sFocusIn} onBlur={sFocusOut} />
                      </label>
                      <label style={{ display: 'grid', gap: 5 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>Email <span style={{ color: '#ef4444' }}>*</span></span>
                        <input type="email" value={onboardingData.email || ''} onChange={e => setOnboardingData({ ...onboardingData, email: e.target.value })} placeholder="john.doe@company.com" style={SETTINGS_INPUT} onFocus={sFocusIn} onBlur={sFocusOut} />
                      </label>
                      <label style={{ display: 'grid', gap: 5 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>Phone <span style={{ color: '#ef4444' }}>*</span></span>
                        <input type="text" value={onboardingData.phone || ''} onChange={e => setOnboardingData({ ...onboardingData, phone: e.target.value })} placeholder="+1234567890" style={SETTINGS_INPUT} onFocus={sFocusIn} onBlur={sFocusOut} />
                      </label>
                      <label style={{ display: 'grid', gap: 5 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>Date of Birth</span>
                        <input type="date" value={onboardingData.dob || ''} onChange={e => setOnboardingData({ ...onboardingData, dob: e.target.value })} style={SETTINGS_INPUT} onFocus={sFocusIn} onBlur={sFocusOut} />
                      </label>
                      <label style={{ display: 'grid', gap: 5 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>NIC / ID Number</span>
                        <input type="text" value={onboardingData.nic || ''} onChange={e => setOnboardingData({ ...onboardingData, nic: e.target.value })} placeholder="ID/NIC Number" style={SETTINGS_INPUT} onFocus={sFocusIn} onBlur={sFocusOut} />
                      </label>
                      <label style={{ display: 'grid', gap: 5, gridColumn: '1 / -1' }}>
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>Address</span>
                        <input type="text" value={onboardingData.address || ''} onChange={e => setOnboardingData({ ...onboardingData, address: e.target.value })} placeholder="Full address" style={SETTINGS_INPUT} onFocus={sFocusIn} onBlur={sFocusOut} />
                      </label>
                    </div>
                  </div>

                  {/* Employment Details */}
                  <div style={{ background: '#f8fafc', borderRadius: 12, padding: '16px 18px', border: '1.5px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 700, fontSize: 11.5, color: SL, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 14 }}>Employment Details</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                      <label style={{ display: 'grid', gap: 5, gridColumn: '1 / -1' }}>
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>Employee Number <span style={{ color: '#ef4444' }}>*</span></span>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input type="text" value={onboardingData.employee_number || ''} onChange={e => setOnboardingData({ ...onboardingData, employee_number: e.target.value })} placeholder="EMP00001" style={{ ...SETTINGS_INPUT, flex: 1, width: 'auto' }} onFocus={sFocusIn} onBlur={sFocusOut} />
                          <button onClick={handleGenerateEmployeeNumber} disabled={generatingNumber} style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: generatingNumber ? '#94a3b8' : `linear-gradient(135deg, ${SL_DARK} 0%, ${SL} 100%)`, color: '#fff', fontWeight: 700, cursor: generatingNumber ? 'not-allowed' : 'pointer', fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0 }}>
                            {generatingNumber ? '…' : 'Generate'}
                          </button>
                        </div>
                      </label>
                      <label style={{ display: 'grid', gap: 5 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>Designation</span>
                        <input type="text" value={onboardingData.designation || ''} onChange={e => setOnboardingData({ ...onboardingData, designation: e.target.value })} placeholder="e.g., Senior Accountant" style={SETTINGS_INPUT} onFocus={sFocusIn} onBlur={sFocusOut} />
                      </label>
                      <label style={{ display: 'grid', gap: 5 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>Department</span>
                        <input type="text" value={onboardingData.employee_department || ''} onChange={e => setOnboardingData({ ...onboardingData, employee_department: e.target.value })} placeholder="e.g., Finance" style={SETTINGS_INPUT} onFocus={sFocusIn} onBlur={sFocusOut} />
                      </label>
                      <label style={{ display: 'grid', gap: 5 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>Hire Date</span>
                        <input type="date" value={onboardingData.hire_date || new Date().toISOString().split('T')[0]} onChange={e => setOnboardingData({ ...onboardingData, hire_date: e.target.value })} style={SETTINGS_INPUT} onFocus={sFocusIn} onBlur={sFocusOut} />
                      </label>
                    </div>
                  </div>

                  {/* Payroll Configuration */}
                  <div style={{ background: '#f8fafc', borderRadius: 12, padding: '16px 18px', border: '1.5px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 700, fontSize: 11.5, color: SL, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 14 }}>Payroll Configuration</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                      <label style={{ display: 'grid', gap: 5 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>Base Salary</span>
                        <input type="number" value={onboardingData.base_salary || ''} onChange={e => setOnboardingData({ ...onboardingData, base_salary: parseFloat(e.target.value) || undefined })} placeholder="60000" style={SETTINGS_INPUT} onFocus={sFocusIn} onBlur={sFocusOut} />
                      </label>
                      <label style={{ display: 'grid', gap: 5 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>EPF Contribution Rate (%)</span>
                        <input type="number" value={onboardingData.epf_contribution_rate || 8} onChange={e => setOnboardingData({ ...onboardingData, epf_contribution_rate: parseFloat(e.target.value) || 8 })} placeholder="8" style={SETTINGS_INPUT} onFocus={sFocusIn} onBlur={sFocusOut} />
                      </label>
                      <label style={{ display: 'grid', gap: 5 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>PTO Allowance (days)</span>
                        <input type="number" value={onboardingData.pto_allowance || 20} onChange={e => setOnboardingData({ ...onboardingData, pto_allowance: parseInt(e.target.value) || 20 })} placeholder="20" style={SETTINGS_INPUT} onFocus={sFocusIn} onBlur={sFocusOut} />
                      </label>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, padding: '10px 12px', borderRadius: 10, background: '#fff', border: '1.5px solid #e2e8f0', cursor: 'pointer' }}>
                          <input type="checkbox" checked={onboardingData.epf_enabled !== false} onChange={e => setOnboardingData({ ...onboardingData, epf_enabled: e.target.checked })} style={{ width: 15, height: 15, cursor: 'pointer', accentColor: SL }} />
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: '#1e293b' }}>EPF</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, padding: '10px 12px', borderRadius: 10, background: '#fff', border: '1.5px solid #e2e8f0', cursor: 'pointer' }}>
                          <input type="checkbox" checked={onboardingData.etf_enabled !== false} onChange={e => setOnboardingData({ ...onboardingData, etf_enabled: e.target.checked })} style={{ width: 15, height: 15, cursor: 'pointer', accentColor: SL }} />
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: '#1e293b' }}>ETF</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Role Assignment */}
                  <div style={{ background: '#f8fafc', borderRadius: 12, padding: '16px 18px', border: '1.5px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 700, fontSize: 11.5, color: SL, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 4 }}>Access & Permissions</div>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', marginBottom: 10 }}>Assign Roles <span style={{ color: '#ef4444' }}>*</span> — select at least one</div>
                    <div style={{ display: 'grid', gap: 7, maxHeight: 200, overflowY: 'auto', padding: '2px 0' }}>
                      {roles.map(role => (
                        <label key={role.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '9px 12px', borderRadius: 9, background: onboardingData.roleIds?.includes(role.id) ? 'rgba(51,65,85,0.07)' : '#fff', border: '1.5px solid ' + (onboardingData.roleIds?.includes(role.id) ? SL : '#e2e8f0'), transition: 'all 0.15s' }}>
                          <input type="checkbox" checked={onboardingData.roleIds?.includes(role.id) || false} onChange={e => { const cur = onboardingData.roleIds || []; if (e.target.checked) setOnboardingData({ ...onboardingData, roleIds: [...cur, role.id] }); else setOnboardingData({ ...onboardingData, roleIds: cur.filter(id => id !== role.id) }) }} style={{ width: 15, height: 15, cursor: 'pointer', accentColor: SL, flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 13 }}>{role.name}</div>
                            {role.description && <div style={{ fontSize: 11.5, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{role.description}</div>}
                          </div>
                          {role.is_system_role && <span style={{ padding: '2px 8px', borderRadius: 99, background: 'rgba(37,99,235,0.1)', color: '#2563eb', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>SYSTEM</span>}
                        </label>
                      ))}
                    </div>
                    <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 8 }}>{onboardingData.roleIds?.length || 0} role{(onboardingData.roleIds?.length || 0) !== 1 ? 's' : ''} selected</div>
                  </div>

                  {/* Info box */}
                  <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 12, padding: '13px 15px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <CheckCircle size={14} style={{ color: '#16a34a', marginTop: 2, flexShrink: 0 }} />
                    <div style={{ fontSize: 12.5, color: '#166534', lineHeight: 1.7 }}>
                      <div style={{ fontWeight: 700, marginBottom: 3 }}>What happens next?</div>
                      Employee record + user account created, roles assigned, temporary password generated, and welcome email sent.
                    </div>
                  </div>

                </div>

                {/* Sticky footer */}
                <div style={{ padding: '14px 22px', borderTop: '1.5px solid #f1f5f9', background: '#fff', display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0 }}>
                  <button onClick={() => { setIsOnboardingEmployee(false); setOnboardingData({ roleIds: [] }) }} style={{ padding: '10px 20px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                  <button onClick={handleOnboardEmployee} disabled={saving} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: saving ? '#94a3b8' : `linear-gradient(135deg, ${SL_DARK} 0%, ${SL} 100%)`, color: '#fff', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, boxShadow: saving ? 'none' : '0 2px 8px rgba(30,41,59,0.25)' }}>
                    <CheckCircle size={14} />{saving ? 'Onboarding…' : 'Onboard Employee'}
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* Suspend Employee Modal */}
          {suspendingEmployee && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'grid', placeItems: 'center', zIndex: 1001 }} onClick={() => { setSuspendingEmployee(null); setSuspendReason('') }}>
              <div style={{ width: 'min(480px, 92vw)', background: '#fff', borderRadius: 18, overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }} onClick={e => e.stopPropagation()}>
                <div style={{ background: 'linear-gradient(135deg, #9a3412 0%, #ea580c 100%)', padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <Lock size={15} color="rgba(255,255,255,0.85)" />
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Suspend Account</span>
                  </div>
                  <button onClick={() => { setSuspendingEmployee(null); setSuspendReason('') }} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={13} /></button>
                </div>
                <div style={{ padding: '18px 22px', display: 'grid', gap: 14 }}>
                  <p style={{ margin: 0, color: '#475569', fontSize: 13 }}>Suspend <strong style={{ color: '#1e293b' }}>{suspendingEmployee.first_name} {suspendingEmployee.last_name}</strong>? Their account will be temporarily disabled.</p>
                  <label style={{ display: 'grid', gap: 5 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>Reason for Suspension <span style={{ color: '#ef4444' }}>*</span></span>
                    <textarea value={suspendReason} onChange={e => setSuspendReason(e.target.value)} placeholder="Enter reason for suspension…" rows={3} style={{ ...SETTINGS_INPUT, resize: 'vertical', lineHeight: 1.5 }} onFocus={sFocusIn} onBlur={sFocusOut} />
                  </label>
                  <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '11px 13px', fontSize: 12.5, color: '#475569' }}>This action is reversible — the employee can be reactivated by an admin.</div>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button onClick={() => { setSuspendingEmployee(null); setSuspendReason('') }} style={{ padding: '9px 18px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                    <button onClick={handleSuspendEmployee} disabled={saving || !suspendReason.trim()} style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: (!suspendReason.trim() || saving) ? '#94a3b8' : '#ea580c', color: '#fff', fontWeight: 700, fontSize: 13, cursor: (!suspendReason.trim() || saving) ? 'not-allowed' : 'pointer' }}>
                      {saving ? 'Suspending…' : 'Suspend Account'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Reactivate Employee Modal */}
          {reactivatingEmployee && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'grid', placeItems: 'center', zIndex: 1001 }} onClick={() => setReactivatingEmployee(null)}>
              <div style={{ width: 'min(460px, 92vw)', background: '#fff', borderRadius: 18, overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }} onClick={e => e.stopPropagation()}>
                <div style={{ background: 'linear-gradient(135deg, #14532d 0%, #16a34a 100%)', padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <RotateCcw size={15} color="rgba(255,255,255,0.85)" />
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Reactivate Account</span>
                  </div>
                  <button onClick={() => setReactivatingEmployee(null)} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={13} /></button>
                </div>
                <div style={{ padding: '18px 22px', display: 'grid', gap: 14 }}>
                  <p style={{ margin: 0, color: '#475569', fontSize: 13 }}>Reactivate <strong style={{ color: '#1e293b' }}>{reactivatingEmployee.first_name} {reactivatingEmployee.last_name}</strong>? Their account will be restored and they can log in again.</p>
                  <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 10, padding: '12px 14px', fontSize: 12.5, color: '#166534' }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>Account Status</div>
                    <div>Suspended since: {reactivatingEmployee.suspended_at ? new Date(reactivatingEmployee.suspended_at).toLocaleDateString() : 'Unknown'}</div>
                    {reactivatingEmployee.suspended_reason && <div style={{ marginTop: 4 }}>Reason: {reactivatingEmployee.suspended_reason}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button onClick={() => setReactivatingEmployee(null)} style={{ padding: '9px 18px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                    <button onClick={handleReactivateEmployee} disabled={saving} style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: saving ? '#94a3b8' : '#16a34a', color: '#fff', fontWeight: 700, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer' }}>
                      {saving ? 'Reactivating…' : 'Reactivate Account'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Terminate Employee Modal */}
          {terminatingEmployee && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'grid', placeItems: 'center', zIndex: 1001 }} onClick={() => { setTerminatingEmployee(null); setTerminateReason(''); setTerminateConfirm(false) }}>
              <div style={{ width: 'min(520px, 92vw)', background: '#fff', borderRadius: 18, overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }} onClick={e => e.stopPropagation()}>
                <div style={{ background: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)', padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <AlertTriangle size={15} color="rgba(255,255,255,0.85)" />
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Terminate Account</span>
                  </div>
                  <button onClick={() => { setTerminatingEmployee(null); setTerminateReason(''); setTerminateConfirm(false) }} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={13} /></button>
                </div>
                <div style={{ padding: '18px 22px', display: 'grid', gap: 14 }}>
                  <p style={{ margin: 0, color: '#475569', fontSize: 13 }}>You are about to terminate <strong style={{ color: '#1e293b' }}>{terminatingEmployee.first_name} {terminatingEmployee.last_name}</strong>. This action is <strong style={{ color: '#dc2626' }}>permanent and cannot be undone</strong>.</p>
                  <label style={{ display: 'grid', gap: 5 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>Reason for Termination <span style={{ color: '#ef4444' }}>*</span></span>
                    <textarea value={terminateReason} onChange={e => setTerminateReason(e.target.value)} placeholder="Enter detailed reason for termination…" rows={3} style={{ ...SETTINGS_INPUT, resize: 'vertical', lineHeight: 1.5 }} onFocus={sFocusIn} onBlur={sFocusOut} />
                  </label>
                  <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 10, padding: '12px 14px', fontSize: 12.5, color: '#991b1b' }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>What happens</div>
                    Employee immediately loses all access. Data retained for 2 years, then auto-purged.
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', background: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: 10, cursor: 'pointer' }}>
                    <input type="checkbox" checked={terminateConfirm} onChange={e => setTerminateConfirm(e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#dc2626' }} />
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: '#92400e' }}>I understand this employee will be permanently terminated and data purged in 2 years</span>
                  </label>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button onClick={() => { setTerminatingEmployee(null); setTerminateReason(''); setTerminateConfirm(false) }} style={{ padding: '9px 18px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                    <button onClick={handleTerminateEmployee} disabled={saving || !terminateReason.trim() || !terminateConfirm} style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: (!terminateReason.trim() || !terminateConfirm || saving) ? '#94a3b8' : '#dc2626', color: '#fff', fontWeight: 700, fontSize: 13, cursor: (!terminateReason.trim() || !terminateConfirm || saving) ? 'not-allowed' : 'pointer' }}>
                      {saving ? 'Terminating…' : 'Terminate Employee'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Edit Employee Modal */}
          {editingEmployee && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'grid', placeItems: 'center', zIndex: 1000, overflowY: 'auto', padding: '20px 0' }} onClick={() => { setEditingEmployee(null); setEditFormData({}) }}>
              <div style={{ width: 'min(800px, 92vw)', background: '#fff', borderRadius: 18, overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.18)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', margin: 'auto' }} onClick={e => e.stopPropagation()}>
                <div style={{ background: `linear-gradient(135deg, ${SL_DARK} 0%, ${SL} 100%)`, padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Edit2 size={15} color="rgba(255,255,255,0.85)" />
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Edit Employee: {editingEmployee.first_name} {editingEmployee.last_name}</span>
                  </div>
                  <button onClick={() => { setEditingEmployee(null); setEditFormData({}) }} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
                </div>
                <div style={{ padding: '20px 22px', overflow: 'auto' }}>
                  <div style={{ display: 'grid', gap: 18 }}>
                    {/* Personal Information */}
                    <div style={{ background: '#f8fafc', borderRadius: 12, padding: '16px 18px', border: '1.5px solid #e2e8f0' }}>
                      <div style={{ fontWeight: 700, fontSize: 12, color: SL, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14 }}>Personal Information</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                        <label style={{ display: 'grid', gap: 5 }}>
                          <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>First Name <span style={{ color: '#ef4444' }}>*</span></span>
                          <input type="text" value={editFormData.first_name || ''} onChange={e => setEditFormData({ ...editFormData, first_name: e.target.value })} placeholder="John" style={SETTINGS_INPUT} onFocus={sFocusIn} onBlur={sFocusOut} />
                        </label>
                        <label style={{ display: 'grid', gap: 5 }}>
                          <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>Last Name <span style={{ color: '#ef4444' }}>*</span></span>
                          <input type="text" value={editFormData.last_name || ''} onChange={e => setEditFormData({ ...editFormData, last_name: e.target.value })} placeholder="Doe" style={SETTINGS_INPUT} onFocus={sFocusIn} onBlur={sFocusOut} />
                        </label>
                        <label style={{ display: 'grid', gap: 5 }}>
                          <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>Email <span style={{ color: '#ef4444' }}>*</span></span>
                          <input type="email" value={editFormData.email || ''} onChange={e => setEditFormData({ ...editFormData, email: e.target.value })} placeholder="john.doe@company.com" style={SETTINGS_INPUT} onFocus={sFocusIn} onBlur={sFocusOut} />
                        </label>
                        <label style={{ display: 'grid', gap: 5 }}>
                          <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>Phone <span style={{ color: '#ef4444' }}>*</span></span>
                          <input type="text" value={editFormData.phone || ''} onChange={e => setEditFormData({ ...editFormData, phone: e.target.value })} placeholder="+1234567890" style={SETTINGS_INPUT} onFocus={sFocusIn} onBlur={sFocusOut} />
                        </label>
                      </div>
                    </div>

                    {/* Employment Details */}
                    <div style={{ background: '#f8fafc', borderRadius: 12, padding: '16px 18px', border: '1.5px solid #e2e8f0' }}>
                      <div style={{ fontWeight: 700, fontSize: 12, color: SL, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14 }}>Employment Details</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                        <label style={{ display: 'grid', gap: 5 }}>
                          <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>Employee Number <span style={{ color: '#ef4444' }}>*</span></span>
                          <input type="text" value={editFormData.employee_number || ''} onChange={e => setEditFormData({ ...editFormData, employee_number: e.target.value })} placeholder="EMP00001" style={SETTINGS_INPUT} onFocus={sFocusIn} onBlur={sFocusOut} />
                        </label>
                        <label style={{ display: 'grid', gap: 5 }}>
                          <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>Designation</span>
                          <input type="text" value={editFormData.designation || ''} onChange={e => setEditFormData({ ...editFormData, designation: e.target.value })} placeholder="e.g., Senior Accountant" style={SETTINGS_INPUT} onFocus={sFocusIn} onBlur={sFocusOut} />
                        </label>
                        <label style={{ display: 'grid', gap: 5 }}>
                          <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>Department</span>
                          <input type="text" value={editFormData.employee_department || ''} onChange={e => setEditFormData({ ...editFormData, employee_department: e.target.value })} placeholder="e.g., Finance" style={SETTINGS_INPUT} onFocus={sFocusIn} onBlur={sFocusOut} />
                        </label>
                        <label style={{ display: 'grid', gap: 5 }}>
                          <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>Hire Date</span>
                          <input type="date" value={editFormData.hire_date || ''} onChange={e => setEditFormData({ ...editFormData, hire_date: e.target.value })} style={SETTINGS_INPUT} onFocus={sFocusIn} onBlur={sFocusOut} />
                        </label>
                      </div>
                    </div>

                    {/* Payroll Configuration */}
                    <div style={{ background: '#f8fafc', borderRadius: 12, padding: '16px 18px', border: '1.5px solid #e2e8f0' }}>
                      <div style={{ fontWeight: 700, fontSize: 12, color: SL, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14 }}>Payroll Configuration</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                        <label style={{ display: 'grid', gap: 5 }}>
                          <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>Base Salary</span>
                          <input type="number" value={editFormData.base_salary || ''} onChange={e => setEditFormData({ ...editFormData, base_salary: parseFloat(e.target.value) || undefined })} placeholder="60000" style={SETTINGS_INPUT} onFocus={sFocusIn} onBlur={sFocusOut} />
                        </label>
                      </div>
                    </div>

                    {/* Role Assignment */}
                    <div style={{ background: '#f8fafc', borderRadius: 12, padding: '16px 18px', border: '1.5px solid #e2e8f0' }}>
                      <div style={{ fontWeight: 700, fontSize: 12, color: SL, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>Access & Permissions</div>
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', marginBottom: 10, display: 'block' }}>Assign Roles <span style={{ color: '#ef4444' }}>*</span></span>
                      <div style={{ display: 'grid', gap: 8, maxHeight: 240, overflow: 'auto', padding: 8, border: '1.5px solid #e2e8f0', borderRadius: 10, background: '#fff' }}>
                        {roles.map(role => (
                          <label key={role.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '9px 12px', borderRadius: 8, background: editFormData.roleIds?.includes(role.id) ? 'rgba(51,65,85,0.07)' : '#fff', border: '1.5px solid ' + (editFormData.roleIds?.includes(role.id) ? SL : '#e2e8f0'), transition: 'all 0.15s' }}>
                            <input type="checkbox" checked={editFormData.roleIds?.includes(role.id) || false} onChange={e => { const cur = editFormData.roleIds || []; if (e.target.checked) setEditFormData({ ...editFormData, roleIds: [...cur, role.id] }); else setEditFormData({ ...editFormData, roleIds: cur.filter(id => id !== role.id) }) }} style={{ width: 16, height: 16, cursor: 'pointer', accentColor: SL }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 13 }}>{role.name}</div>
                              {role.description && <div style={{ fontSize: 11.5, color: '#64748b' }}>{role.description}</div>}
                            </div>
                            {role.is_system_role && <span style={{ padding: '2px 8px', borderRadius: 99, background: 'rgba(37,99,235,0.1)', color: '#2563eb', fontSize: 10, fontWeight: 700 }}>SYSTEM</span>}
                          </label>
                        ))}
                      </div>
                      <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 8 }}>{editFormData.roleIds?.length || 0} role{(editFormData.roleIds?.length || 0) !== 1 ? 's' : ''} selected</div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 6, borderTop: '1.5px solid #f1f5f9' }}>
                      <button onClick={() => { setEditingEmployee(null); setEditFormData({}) }} style={{ padding: '10px 20px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                      <button onClick={handleSaveEditedEmployee} disabled={saving} style={{ padding: '10px 22px', borderRadius: 10, border: 'none', background: saving ? '#94a3b8' : `linear-gradient(135deg, ${SL_DARK} 0%, ${SL} 100%)`, color: '#fff', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Save size={14} />{saving ? 'Saving…' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Onboarding Success Modal */}
          {onboardingResult && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'grid', placeItems: 'center', zIndex: 1001 }} onClick={() => { setOnboardingResult(null); setOnboardingCopied(false) }}>
              <div style={{ width: 'min(560px, 92vw)', background: '#fff', borderRadius: 18, overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }} onClick={e => e.stopPropagation()}>
                <div style={{ background: 'linear-gradient(135deg, #14532d 0%, #16a34a 100%)', padding: '24px 24px 20px', textAlign: 'center' }}>
                  <div style={{ display: 'inline-flex', width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                    <CheckCircle size={26} color="#fff" />
                  </div>
                  <h3 style={{ margin: '0 0 4px', fontSize: 17, color: '#fff', fontWeight: 700 }}>Employee Onboarded!</h3>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>
                    {onboardingResult.employee.first_name} {onboardingResult.employee.last_name} ({onboardingResult.employee.employee_number})
                  </p>
                  {onboardingResult.emailSent
                    ? <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>Welcome email sent to {onboardingResult.employee.email}</p>
                    : <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Email delivery failed. {onboardingResult.emailError}</p>}
                </div>
                <div style={{ padding: '20px 22px', display: 'grid', gap: 14 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>TEMPORARY PASSWORD</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '12px 14px' }}>
                    <code style={{ flex: 1, fontSize: 15, fontWeight: 700, color: SL_DARK, fontFamily: 'monospace', wordBreak: 'break-all' }}>{onboardingResult.temporaryPassword}</code>
                    <button onClick={handleCopyOnboardingPassword} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: onboardingCopied ? '#16a34a' : SL, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {onboardingCopied ? <><CheckCircle size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
                    </button>
                  </div>
                  <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 10, padding: '12px 14px', fontSize: 12.5, color: '#166534' }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>Created</div>
                    Employee #{onboardingResult.employee.employee_number} · Account: {onboardingResult.user.email} · {onboardingResult.roleCount} role{onboardingResult.roleCount !== 1 ? 's' : ''}
                    {onboardingResult.employee.designation && ` · ${onboardingResult.employee.designation}`}
                  </div>
                  <div style={{ background: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: 10, padding: '11px 13px', fontSize: 12.5, color: '#92400e' }}>
                    Save this password — it will not be shown again. The employee should change it after first login.
                  </div>
                  <button onClick={() => { setOnboardingResult(null); setOnboardingCopied(false) }} style={{ width: '100%', padding: '11px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${SL_DARK} 0%, ${SL} 100%)`, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>Done</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
