"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.terminateEmployee = exports.reactivateEmployee = exports.suspendEmployee = exports.generateEmployeeNumber = exports.updateEmployeeProfile = exports.linkEmployeeToUser = exports.getFullEmployeeProfile = exports.getAllEmployeesWithUserStatus = exports.onboardEmployee = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const passwordGenerator_1 = require("../utils/passwordGenerator");
const emailService_1 = require("../utils/emailService");
const passwordHistory_1 = require("../utils/passwordHistory");
/**
 * Employee Onboarding Controller
 * Handles unified creation of employee records + user accounts
 */
// Create complete employee with user account
const onboardEmployee = async (req, res) => {
    const { tenantId } = req.user;
    const { 
    // Personal Information
    first_name, last_name, email, phone, dob, nic, address, 
    // Employment Details
    employee_number, designation, employee_department, hire_date, 
    // Payroll Configuration
    base_salary, epf_enabled, epf_contribution_rate, etf_enabled, allowances, pto_allowance, 
    // Account & Permissions
    roleIds, // Array of role IDs to assign
    // Options
    send_email = true } = req.body;
    // Validation
    if (!first_name || !last_name || !email || !phone) {
        return res.status(400).json({
            error: 'validation_error',
            message: 'First name, last name, email, and phone are required'
        });
    }
    if (!employee_number) {
        return res.status(400).json({
            error: 'validation_error',
            message: 'Employee number is required'
        });
    }
    if (!roleIds || !Array.isArray(roleIds) || roleIds.length === 0) {
        return res.status(400).json({
            error: 'validation_error',
            message: 'At least one role must be assigned'
        });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({
            error: 'validation_error',
            message: 'Invalid email format'
        });
    }
    const client = req.dbClient;
    try {
        await client.query('BEGIN');
        // Check if email already exists in users or employees
        const existingUserCheck = await client.query('SELECT id FROM users WHERE email = $1 AND tenant_id = $2', [email, tenantId]);
        if (existingUserCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({
                error: 'conflict',
                message: 'Email already exists in user accounts'
            });
        }
        const existingEmployeeCheck = await client.query('SELECT id FROM employees WHERE email = $1 AND tenant_id = $2', [email, tenantId]);
        if (existingEmployeeCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({
                error: 'conflict',
                message: 'Email already exists in employee records'
            });
        }
        // Check if employee number already exists
        const existingEmployeeNumberCheck = await client.query('SELECT id FROM employees WHERE employee_number = $1 AND tenant_id = $2', [employee_number, tenantId]);
        if (existingEmployeeNumberCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({
                error: 'conflict',
                message: 'Employee number already exists'
            });
        }
        // Enforce plan user limit
        const planResult = await client.query(`SELECT no_of_users FROM public.users
       WHERE tenant_id = $1 AND no_of_users IS NOT NULL
       LIMIT 1`, [tenantId]);
        if (planResult.rows.length > 0 && planResult.rows[0].no_of_users !== null) {
            const userLimit = planResult.rows[0].no_of_users;
            const countResult = await client.query(`SELECT COUNT(*) AS total FROM public.users
         WHERE tenant_id = $1 AND (account_status IS NULL OR account_status != 'terminated')`, [tenantId]);
            const currentCount = parseInt(countResult.rows[0].total, 10);
            if (currentCount >= userLimit) {
                await client.query('ROLLBACK');
                return res.status(403).json({
                    error: 'user_limit_reached',
                    message: `Your plan allows a maximum of ${userLimit} user${userLimit === 1 ? '' : 's'}. You have reached this limit. Please upgrade your plan to add more users.`,
                    limit: userLimit,
                    current: currentCount
                });
            }
        }
        // Verify all roles exist
        const rolesResult = await client.query('SELECT id, name FROM roles WHERE id = ANY($1::int[]) AND tenant_id = $2', [roleIds, tenantId]);
        if (rolesResult.rows.length !== roleIds.length) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                error: 'not_found',
                message: 'One or more roles not found'
            });
        }
        // Generate secure temporary password
        const temporaryPassword = (0, passwordGenerator_1.generateSecurePassword)(12);
        const passwordHash = await bcryptjs_1.default.hash(temporaryPassword, 10);
        // 1. Create user account
        const userResult = await client.query(`INSERT INTO users (name, email, password_hash, password_must_change, created_at, tenant_id)
       VALUES ($1, $2, $3, TRUE, CURRENT_TIMESTAMP, $4)
       RETURNING id, name, email, created_at`, [`${first_name} ${last_name}`, email, passwordHash, tenantId]);
        const newUser = userResult.rows[0];
        const userId = newUser.id;
        // 2. Assign roles to user
        for (const roleId of roleIds) {
            await client.query(`INSERT INTO user_roles (user_id, role_id) 
         VALUES ($1, $2)`, [userId, roleId]);
        }
        // 3. Create employee record linked to user
        const employeeResult = await client.query(`INSERT INTO employees (
        employee_number, first_name, last_name, email, phone,
        dob, nic, address, designation, employee_department, role,
        hire_date, base_salary, epf_enabled, epf_contribution_rate,
        etf_enabled, allowances, pto_allowance, user_id, is_active, created_at, tenant_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, TRUE, CURRENT_TIMESTAMP, $20)
      RETURNING id, employee_number, first_name, last_name, email, designation, employee_department, created_at`, [
            employee_number,
            first_name,
            last_name,
            email,
            phone,
            dob || null,
            nic || null,
            address || null,
            designation || null,
            employee_department || null,
            'Employee', // Default role for HR purposes
            hire_date || new Date(),
            base_salary || null,
            epf_enabled !== undefined ? epf_enabled : false,
            epf_contribution_rate || 8.00,
            etf_enabled !== undefined ? etf_enabled : false,
            JSON.stringify(allowances || {}),
            pto_allowance || 20,
            userId,
            tenantId
        ]);
        const newEmployee = employeeResult.rows[0];
        // 5. Send welcome email (non-blocking)
        let emailResult = { success: false };
        if (send_email) {
            try {
                emailResult = await (0, emailService_1.sendWelcomeEmail)(email, temporaryPassword);
            }
            catch (emailError) {
                console.error('Email send failed (non-critical):', emailError);
                emailResult = { success: false, error: emailError instanceof Error ? emailError.message : 'Email service error' };
            }
        }
        // 6. Log audit trail
        if (req.user) {
            try {
                await client.query(`INSERT INTO rbac_audit_log (user_id, action, details) 
           VALUES ($1, $2, $3)`, [
                    req.user.userId,
                    'ONBOARD_EMPLOYEE',
                    JSON.stringify({
                        newUserId: userId,
                        newEmployeeId: newEmployee.id,
                        employeeNumber: employee_number,
                        email,
                        roleIds,
                        emailSent: emailResult.success
                    })
                ]);
            }
            catch (auditError) {
                console.warn('Audit log failed (non-critical):', auditError);
            }
        }
        await client.query('COMMIT');
        // 4. Add initial password to history (AFTER commit to avoid FK violations)
        try {
            await (0, passwordHistory_1.addToPasswordHistory)(userId, passwordHash);
        }
        catch (historyError) {
            console.warn('Password history add failed (non-critical):', historyError);
        }
        console.log(`✅ Employee onboarded: ${email} (Employee ID: ${newEmployee.id}, User ID: ${userId})`);
        return res.status(201).json({
            success: true,
            employee: newEmployee,
            user: {
                id: newUser.id,
                email: newUser.email,
                name: newUser.name
            },
            temporaryPassword, // Return so admin can copy it
            emailSent: emailResult.success,
            emailError: emailResult.error,
            roleCount: roleIds.length,
            message: 'Employee onboarded successfully'
        });
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Error onboarding employee:', error);
        return res.status(500).json({
            error: 'server_error',
            message: 'Failed to onboard employee',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.onboardEmployee = onboardEmployee;
// Get all employees with their user account status and roles
const getAllEmployeesWithUserStatus = async (req, res) => {
    const { tenantId } = req.user;
    try {
        const query = `
      SELECT 
        e.id as employee_id,
        e.employee_number,
        e.first_name,
        e.last_name,
        e.email,
        e.phone,
        e.designation,
        e.employee_department,
        e.base_salary,
        e.hire_date,
        e.is_active,
        e.user_id,
        e.created_at,
        e.suspended_at,
        e.suspended_reason,
        e.terminated_at,
        e.terminated_reason,
        e.scheduled_purge_date,
        u.name as user_name,
        u.email as user_email,
        u.account_status,
        CASE WHEN e.user_id IS NOT NULL THEN true ELSE false END as has_user_account,
        COALESCE(
          json_agg(
            json_build_object(
              'id', r.id,
              'name', r.name,
              'is_system_role', r.is_system_role
            ) ORDER BY r.name
          ) FILTER (WHERE r.id IS NOT NULL),
          '[]'
        ) as roles
      FROM employees e
      LEFT JOIN users u ON e.user_id = u.id
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE e.tenant_id = $1
      GROUP BY e.id, u.id, u.name, u.email, u.account_status
      ORDER BY e.created_at DESC
    `;
        const result = await req.dbClient.query(query, [tenantId]);
        return res.json({
            employees: result.rows,
            total: result.rows.length
        });
    }
    catch (error) {
        console.error('Error fetching employees with user status:', error);
        return res.status(500).json({
            error: 'server_error',
            message: 'Failed to fetch employees'
        });
    }
};
exports.getAllEmployeesWithUserStatus = getAllEmployeesWithUserStatus;
// Get full employee profile (employee + user + roles + payroll)
const getFullEmployeeProfile = async (req, res) => {
    const { id } = req.params;
    try {
        // Get employee data
        const employeeResult = await req.dbClient.query(`SELECT
        e.*,
        u.name as user_name,
        u.email as user_email,
        u.created_at as user_created_at
      FROM employees e
      LEFT JOIN users u ON e.user_id = u.id
      WHERE e.id = $1`, [id]);
        if (employeeResult.rows.length === 0) {
            return res.status(404).json({
                error: 'not_found',
                message: 'Employee not found'
            });
        }
        const employee = employeeResult.rows[0];
        // Get roles if user exists
        let roles = [];
        if (employee.user_id) {
            const rolesResult = await req.dbClient.query(`SELECT r.id, r.name, r.description, r.is_system_role
         FROM roles r
         INNER JOIN user_roles ur ON r.id = ur.role_id
         WHERE ur.user_id = $1
         ORDER BY r.name`, [employee.user_id]);
            roles = rolesResult.rows;
        }
        return res.json({
            employee,
            roles,
            hasUserAccount: employee.user_id !== null
        });
    }
    catch (error) {
        console.error('Error fetching full employee profile:', error);
        return res.status(500).json({
            error: 'server_error',
            message: 'Failed to fetch employee profile'
        });
    }
};
exports.getFullEmployeeProfile = getFullEmployeeProfile;
// Link existing employee to existing user
const linkEmployeeToUser = async (req, res) => {
    const { employeeId } = req.params;
    const { userId } = req.body;
    if (!userId) {
        return res.status(400).json({
            error: 'validation_error',
            message: 'User ID is required'
        });
    }
    try {
        // Check if employee exists
        const employeeCheck = await req.dbClient.query('SELECT id, email, user_id FROM employees WHERE id = $1', [employeeId]);
        if (employeeCheck.rows.length === 0) {
            return res.status(404).json({
                error: 'not_found',
                message: 'Employee not found'
            });
        }
        if (employeeCheck.rows[0].user_id) {
            return res.status(409).json({
                error: 'conflict',
                message: 'Employee already linked to a user account'
            });
        }
        // Check if user exists
        const userCheck = await req.dbClient.query('SELECT id, email FROM users WHERE id = $1', [userId]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({
                error: 'not_found',
                message: 'User not found'
            });
        }
        // Link employee to user
        await req.dbClient.query('UPDATE employees SET user_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [userId, employeeId]);
        // Log audit
        if (req.user) {
            await req.dbClient.query(`INSERT INTO rbac_audit_log (user_id, action, details)
         VALUES ($1, $2, $3)`, [
                req.user.userId,
                'LINK_EMPLOYEE_USER',
                JSON.stringify({
                    employeeId,
                    userId,
                    employeeEmail: employeeCheck.rows[0].email,
                    userEmail: userCheck.rows[0].email
                })
            ]);
        }
        return res.json({
            success: true,
            message: 'Employee linked to user successfully',
            employeeId,
            userId
        });
    }
    catch (error) {
        console.error('Error linking employee to user:', error);
        return res.status(500).json({
            error: 'server_error',
            message: 'Failed to link employee to user'
        });
    }
};
exports.linkEmployeeToUser = linkEmployeeToUser;
// Update employee information (including payroll settings)
const updateEmployeeProfile = async (req, res) => {
    const { id } = req.params;
    const { first_name, last_name, email, phone, dob, nic, address, employee_number, designation, employee_department, base_salary, epf_enabled, epf_contribution_rate, etf_enabled, allowances, pto_allowance } = req.body;
    // Validation
    if (!first_name || !last_name || !email || !phone) {
        return res.status(400).json({
            error: 'validation_error',
            message: 'First name, last name, email, and phone are required'
        });
    }
    try {
        const result = await req.dbClient.query(`UPDATE employees
       SET first_name = $1, last_name = $2, email = $3, phone = $4,
           dob = $5, nic = $6, address = $7, employee_number = $8,
           designation = $9, employee_department = $10, base_salary = $11,
           epf_enabled = $12, epf_contribution_rate = $13, etf_enabled = $14,
           allowances = $15, pto_allowance = $16, updated_at = CURRENT_TIMESTAMP
       WHERE id = $17
       RETURNING id, employee_number, first_name, last_name, email, designation, employee_department`, [
            first_name, last_name, email, phone,
            dob || null, nic || null, address || null, employee_number,
            designation || null, employee_department || null, base_salary || null,
            epf_enabled, epf_contribution_rate || 8.00, etf_enabled,
            JSON.stringify(allowances || {}), pto_allowance || 20,
            id
        ]);
        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'not_found',
                message: 'Employee not found'
            });
        }
        return res.json({
            success: true,
            employee: result.rows[0],
            message: 'Employee profile updated successfully'
        });
    }
    catch (error) {
        console.error('Error updating employee profile:', error);
        return res.status(500).json({
            error: 'server_error',
            message: 'Failed to update employee profile'
        });
    }
};
exports.updateEmployeeProfile = updateEmployeeProfile;
// Generate next available employee number
const generateEmployeeNumber = async (req, res) => {
    try {
        const result = await req.dbClient.query(`
      SELECT employee_number
      FROM employees
      WHERE employee_number ~ '^EMP[0-9]+$'
      ORDER BY CAST(SUBSTRING(employee_number FROM 4) AS INTEGER) DESC
      LIMIT 1
    `);
        let nextNumber = 'EMP00001';
        if (result.rows.length > 0) {
            const lastNumber = result.rows[0].employee_number;
            const numPart = parseInt(lastNumber.substring(3)) + 1;
            nextNumber = `EMP${numPart.toString().padStart(5, '0')}`;
        }
        return res.json({
            employeeNumber: nextNumber
        });
    }
    catch (error) {
        console.error('Error generating employee number:', error);
        return res.status(500).json({
            error: 'server_error',
            message: 'Failed to generate employee number'
        });
    }
};
exports.generateEmployeeNumber = generateEmployeeNumber;
// Suspend employee account (reversible)
const suspendEmployee = async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    if (!reason || reason.trim().length === 0) {
        return res.status(400).json({
            error: 'validation_error',
            message: 'Suspension reason is required'
        });
    }
    const client = req.dbClient;
    try {
        await client.query('BEGIN');
        // Check if employee exists and get user_id
        const employeeCheck = await client.query('SELECT id, user_id, first_name, last_name, email FROM employees WHERE id = $1', [id]);
        if (employeeCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                error: 'not_found',
                message: 'Employee not found'
            });
        }
        const employee = employeeCheck.rows[0];
        if (!employee.user_id) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: 'validation_error',
                message: 'Employee does not have a user account to suspend'
            });
        }
        // Check current status
        const statusCheck = await client.query('SELECT account_status FROM users WHERE id = $1', [employee.user_id]);
        if (statusCheck.rows[0].account_status === 'terminated') {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: 'validation_error',
                message: 'Cannot suspend a terminated employee'
            });
        }
        if (statusCheck.rows[0].account_status === 'suspended') {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: 'validation_error',
                message: 'Employee is already suspended'
            });
        }
        const currentUserId = req.user?.userId;
        // Update user account status
        await client.query(`UPDATE users
       SET account_status = 'suspended',
           status_changed_at = CURRENT_TIMESTAMP,
           status_changed_by = $1,
           status_reason = $2
       WHERE id = $3`, [currentUserId, reason, employee.user_id]);
        // Update employee record
        await client.query(`UPDATE employees
       SET is_active = FALSE,
           suspended_at = CURRENT_TIMESTAMP,
           suspended_by = $1,
           suspended_reason = $2
       WHERE id = $3`, [currentUserId, reason, id]);
        // Log audit trail
        if (currentUserId) {
            await client.query(`INSERT INTO rbac_audit_log (user_id, action, details)
         VALUES ($1, $2, $3)`, [
                currentUserId,
                'SUSPEND_EMPLOYEE',
                JSON.stringify({
                    employeeId: id,
                    employeeName: `${employee.first_name} ${employee.last_name}`,
                    employeeEmail: employee.email,
                    userId: employee.user_id,
                    reason
                })
            ]);
        }
        await client.query('COMMIT');
        console.log(`Employee suspended: ${employee.email} (Employee ID: ${id})`);
        return res.json({
            success: true,
            message: 'Employee account suspended successfully',
            employeeId: id
        });
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Error suspending employee:', error);
        return res.status(500).json({
            error: 'server_error',
            message: 'Failed to suspend employee',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.suspendEmployee = suspendEmployee;
// Reactivate suspended employee account
const reactivateEmployee = async (req, res) => {
    const { id } = req.params;
    const client = req.dbClient;
    try {
        await client.query('BEGIN');
        // Check if employee exists and get user_id
        const employeeCheck = await client.query('SELECT id, user_id, first_name, last_name, email FROM employees WHERE id = $1', [id]);
        if (employeeCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                error: 'not_found',
                message: 'Employee not found'
            });
        }
        const employee = employeeCheck.rows[0];
        if (!employee.user_id) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: 'validation_error',
                message: 'Employee does not have a user account'
            });
        }
        // Check current status
        const statusCheck = await client.query('SELECT account_status FROM users WHERE id = $1', [employee.user_id]);
        if (statusCheck.rows[0].account_status === 'terminated') {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: 'validation_error',
                message: 'Cannot reactivate a terminated employee. Terminated accounts are permanent.'
            });
        }
        if (statusCheck.rows[0].account_status === 'active') {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: 'validation_error',
                message: 'Employee account is already active'
            });
        }
        const currentUserId = req.user?.userId;
        // Update user account status
        await client.query(`UPDATE users
       SET account_status = 'active',
           status_changed_at = CURRENT_TIMESTAMP,
           status_changed_by = $1,
           status_reason = 'Account reactivated'
       WHERE id = $2`, [currentUserId, employee.user_id]);
        // Update employee record
        await client.query(`UPDATE employees
       SET is_active = TRUE,
           suspended_at = NULL,
           suspended_by = NULL,
           suspended_reason = NULL
       WHERE id = $1`, [id]);
        // Log audit trail
        if (currentUserId) {
            await client.query(`INSERT INTO rbac_audit_log (user_id, action, details)
         VALUES ($1, $2, $3)`, [
                currentUserId,
                'REACTIVATE_EMPLOYEE',
                JSON.stringify({
                    employeeId: id,
                    employeeName: `${employee.first_name} ${employee.last_name}`,
                    employeeEmail: employee.email,
                    userId: employee.user_id
                })
            ]);
        }
        await client.query('COMMIT');
        console.log(`Employee reactivated: ${employee.email} (Employee ID: ${id})`);
        return res.json({
            success: true,
            message: 'Employee account reactivated successfully',
            employeeId: id
        });
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Error reactivating employee:', error);
        return res.status(500).json({
            error: 'server_error',
            message: 'Failed to reactivate employee',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.reactivateEmployee = reactivateEmployee;
// Terminate employee account (permanent, soft delete with 2-year retention)
const terminateEmployee = async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    if (!reason || reason.trim().length === 0) {
        return res.status(400).json({
            error: 'validation_error',
            message: 'Termination reason is required'
        });
    }
    const client = req.dbClient;
    try {
        await client.query('BEGIN');
        // Check if employee exists and get user_id
        const employeeCheck = await client.query('SELECT id, user_id, first_name, last_name, email FROM employees WHERE id = $1', [id]);
        if (employeeCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                error: 'not_found',
                message: 'Employee not found'
            });
        }
        const employee = employeeCheck.rows[0];
        if (!employee.user_id) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: 'validation_error',
                message: 'Employee does not have a user account to terminate'
            });
        }
        // Check if already terminated
        const statusCheck = await client.query('SELECT account_status FROM users WHERE id = $1', [employee.user_id]);
        if (statusCheck.rows[0].account_status === 'terminated') {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: 'validation_error',
                message: 'Employee is already terminated'
            });
        }
        const currentUserId = req.user?.userId;
        const terminationDate = new Date();
        const purgeDate = new Date();
        purgeDate.setFullYear(purgeDate.getFullYear() + 2); // 2 years from now
        // Update user account status to terminated
        await client.query(`UPDATE users
       SET account_status = 'terminated',
           status_changed_at = CURRENT_TIMESTAMP,
           status_changed_by = $1,
           status_reason = $2
       WHERE id = $3`, [currentUserId, reason, employee.user_id]);
        // Update employee record with termination details
        await client.query(`UPDATE employees
       SET is_active = FALSE,
           terminated_at = $1,
           terminated_by = $2,
           terminated_reason = $3,
           scheduled_purge_date = $4,
           suspended_at = NULL,
           suspended_by = NULL,
           suspended_reason = NULL
       WHERE id = $5`, [terminationDate, currentUserId, reason, purgeDate, id]);
        // Log audit trail
        if (currentUserId) {
            await client.query(`INSERT INTO rbac_audit_log (user_id, action, details)
         VALUES ($1, $2, $3)`, [
                currentUserId,
                'TERMINATE_EMPLOYEE',
                JSON.stringify({
                    employeeId: id,
                    employeeName: `${employee.first_name} ${employee.last_name}`,
                    employeeEmail: employee.email,
                    userId: employee.user_id,
                    reason,
                    terminationDate: terminationDate.toISOString(),
                    scheduledPurgeDate: purgeDate.toISOString()
                })
            ]);
        }
        await client.query('COMMIT');
        console.log(`Employee terminated: ${employee.email} (Employee ID: ${id})`);
        console.log(`Scheduled for purge on: ${purgeDate.toISOString().split('T')[0]}`);
        return res.json({
            success: true,
            message: 'Employee account terminated successfully',
            employeeId: id,
            terminationDate: terminationDate.toISOString(),
            scheduledPurgeDate: purgeDate.toISOString()
        });
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Error terminating employee:', error);
        return res.status(500).json({
            error: 'server_error',
            message: 'Failed to terminate employee',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.terminateEmployee = terminateEmployee;
