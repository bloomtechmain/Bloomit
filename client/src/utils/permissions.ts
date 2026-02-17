/**
 * Permission utility functions for frontend RBAC
 */

export interface User {
  id: number
  name: string
  email: string
  roleId?: number | null
  roleName?: string | null
  roleNames?: string[]
  permissions: string[]
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(user: User | null, resource: string, action: string): boolean {
  if (!user || !user.permissions) {
    return false
  }
  
  const requiredPermission = `${resource}:${action}`
  return user.permissions.includes(requiredPermission)
}

/**
 * Check if user has ANY of the specified permissions
 */
export function hasAnyPermission(user: User | null, permissions: Array<{resource: string, action: string}>): boolean {
  if (!user || !user.permissions) {
    return false
  }
  
  return permissions.some(perm => 
    user.permissions.includes(`${perm.resource}:${perm.action}`)
  )
}

/**
 * Check if user has ALL of the specified permissions
 */
export function hasAllPermissions(user: User | null, permissions: Array<{resource: string, action: string}>): boolean {
  if (!user || !user.permissions) {
    return false
  }
  
  return permissions.every(perm => 
    user.permissions.includes(`${perm.resource}:${perm.action}`)
  )
}

/**
 * Check if user has a specific role
 */
export function hasRole(user: User | null, roleName: string): boolean {
  if (!user) {
    return false
  }
  
  // Check new roleNames array (multi-role support)
  if (user.roleNames && Array.isArray(user.roleNames)) {
    return user.roleNames.includes(roleName)
  }
  
  // Fallback to old roleName property
  return user.roleName === roleName
}

/**
 * Check if user has ANY of the specified roles
 */
export function hasAnyRole(user: User | null, roleNames: string[]): boolean {
  if (!user) {
    return false
  }
  
  // Check new roleNames array (multi-role support)
  if (user.roleNames && Array.isArray(user.roleNames)) {
    return user.roleNames.some(role => roleNames.includes(role))
  }
  
  // Fallback to old roleName property
  return user.roleName ? roleNames.includes(user.roleName) : false
}

/**
 * Check if user is admin (Super Admin or Admin)
 */
export function isAdmin(user: User | null): boolean {
  return hasAnyRole(user, ['Super Admin', 'Admin'])
}

/**
 * Check if user is Super Admin
 */
export function isSuperAdmin(user: User | null): boolean {
  return hasRole(user, 'Super Admin')
}

/**
 * Get user's display name with role
 */
export function getUserDisplayName(user: User | null): string {
  if (!user) {
    return 'Guest'
  }
  
  const roles = user.roleNames && user.roleNames.length > 0 
    ? user.roleNames.join(', ')
    : (user.roleName || 'No Role')
    
  return `${user.name} (${roles})`
}
