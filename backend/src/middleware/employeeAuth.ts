import { Request, Response, NextFunction } from 'express'
import { pool } from '../db'

/**
 * Employee Portal Authorization Middleware
 * 
 * Provides security functions to ensure employees can only access their own data.
 * Admins and managers can access any employee data for management purposes.
 */

/**
 * Get employee ID from user ID
 * Helper function to convert authenticated user ID to employee ID
 * 
 * @param userId - User ID from JWT token
 * @returns Promise<number | null> - Employee ID or null if not found
 */
export async function getEmployeeIdFromUserId(userId: number): Promise<number | null> {
  try {
    const result = await pool.query(
      'SELECT id FROM employees WHERE user_id = $1',
      [userId]
    )
    
    if (result.rows.length === 0) {
      return null
    }
    
    return result.rows[0].id
  } catch (error) {
    return null
  }
}

/**
 * Validate Employee Access Middleware
 * 
 * CRITICAL SECURITY: Ensures employees can ONLY access their own data.
 * - Employees can only access their own employeeId
 * - Admins and managers can access any employee data
 * 
 * Usage: Apply to routes with :employeeId parameter
 * Example: /api/employee-portal/dashboard/:employeeId
 */
export function validateEmployeeAccess(req: Request, res: Response, next: NextFunction) {
  // Ensure user is authenticated
  if (!req.user) {
    return res.status(401).json({ 
      error: 'unauthorized', 
      message: 'Authentication required' 
    })
  }

  const requestedEmployeeId = parseInt(req.params.employeeId)
  
  if (isNaN(requestedEmployeeId)) {
    return res.status(400).json({ 
      error: 'invalid_employee_id', 
      message: 'Invalid employee ID format' 
    })
  }

  // Check if user is admin or manager (can access any employee data)
  const hasAdminAccess = req.user.roleNames.some(role => 
    ['Super Admin', 'Admin', 'Manager'].includes(role)
  )

  if (hasAdminAccess) {
    // Admin/Manager can access any employee
    return next()
  }

  // For regular employees, verify they're accessing their own data
  // We need to check if the user's employee record matches the requested employeeId
  getEmployeeIdFromUserId(req.user.userId)
    .then(employeeId => {
      if (!employeeId) {
        return res.status(403).json({ 
          error: 'forbidden', 
          message: 'User is not associated with an employee record' 
        })
      }

      if (employeeId !== requestedEmployeeId) {
        return res.status(403).json({ 
          error: 'forbidden', 
          message: 'You can only access your own employee data',
          hint: 'Employees can only view their own information'
        })
      }

      // Employee is accessing their own data - allow
      next()
    })
    .catch(error => {
      return res.status(500).json({
        error: 'server_error', 
        message: 'Failed to validate access' 
      })
    })
}

/**
 * Require Employee Role Middleware
 * 
 * Ensures the authenticated user has an Employee, Manager, or Admin role.
 * This is the base requirement for accessing any employee portal feature.
 * 
 * Must be used AFTER requireAuth middleware.
 */
export function requireEmployeeRole(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'unauthorized', 
      message: 'Authentication required' 
    })
  }

  // Check if user has Employee, Manager, or Admin role
  const hasEmployeeRole = req.user.roleNames.some(role => 
    ['Employee', 'Manager', 'Admin', 'Super Admin'].includes(role)
  )

  if (!hasEmployeeRole) {
    return res.status(403).json({ 
      error: 'forbidden', 
      message: 'Employee portal access requires Employee, Manager, or Admin role',
      currentRoles: req.user.roleNames
    })
  }

  next()
}

/**
 * Attach Employee ID to Request
 * 
 * Convenience middleware that attaches the employee ID to the request object.
 * This saves having to look it up in every controller.
 * 
 * Adds req.employeeId property.
 */
export function attachEmployeeId(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'unauthorized', 
      message: 'Authentication required' 
    })
  }

  getEmployeeIdFromUserId(req.user.userId)
    .then(employeeId => {
      if (!employeeId) {
        return res.status(403).json({ 
          error: 'forbidden', 
          message: 'User is not associated with an employee record' 
        })
      }

      // Attach employee ID to request for use in controllers
      (req as any).employeeId = employeeId
      next()
    })
    .catch(error => {
      return res.status(500).json({
        error: 'server_error', 
        message: 'Failed to retrieve employee information' 
      })
    })
}

/**
 * Check Employee Portal Permission
 * 
 * Verifies user has the required employee portal permission.
 * Uses the existing RBAC permission system.
 * 
 * @param action - The action to check (e.g., 'access', 'view-own', 'view-all')
 */
export function requireEmployeePortalPermission(action: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'unauthorized', 
        message: 'Authentication required' 
      })
    }

    const requiredPermission = `employee-portal:${action}`

    // Check if user has the required permission
    if (!req.user.permissions || !req.user.permissions.includes(requiredPermission)) {
      return res.status(403).json({ 
        error: 'forbidden', 
        message: `You don't have permission to ${action} employee portal`,
        required: requiredPermission
      })
    }

    next()
  }
}

/**
 * Get Employee Data from Request
 * 
 * Helper function to get employee data for the authenticated user.
 * Useful in controllers to fetch employee information.
 * 
 * @param req - Express request object
 * @returns Promise with employee data or null
 */
export async function getEmployeeFromRequest(req: Request): Promise<any | null> {
  if (!req.user) {
    return null
  }

  try {
    const employeeId = await getEmployeeIdFromUserId(req.user.userId)
    
    if (!employeeId) {
      return null
    }

    const result = await pool.query(
      `SELECT 
        id,
        employee_number,
        first_name,
        last_name,
        email,
        phone,
        dob,
        nic,
        address,
        role,
        designation,
        employee_department,
        base_salary,
        epf_enabled,
        etf_enabled,
        created_at
      FROM employees 
      WHERE id = $1`,
      [employeeId]
    )

    if (result.rows.length === 0) {
      return null
    }

    return result.rows[0]
  } catch (error) {
    return null
  }
}
