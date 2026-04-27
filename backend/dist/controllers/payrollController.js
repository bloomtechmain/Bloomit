"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEmployeePayrollHistory = exports.downloadPayslip = exports.getMonthlyReport = exports.getArchive = exports.rejectPayslip = exports.employeeSign = exports.adminApprove = exports.staffApprove = exports.submitForReview = exports.deletePayslip = exports.updatePayslip = exports.createPayslip = exports.getPayslipById = exports.getAllPayslips = exports.updateEmployeePayrollData = exports.getEmployeePayrollData = exports.getAllEmployeesWithPayroll = void 0;
const crypto_1 = __importDefault(require("crypto"));
const emailService_1 = require("../utils/emailService");
const payslipPdfGenerator_1 = require("../utils/payslipPdfGenerator");
// Helper function to generate signature hash
function generateSignatureHash(userId, payslipId, role) {
    const timestamp = Date.now();
    const salt = crypto_1.default.randomBytes(16).toString('hex');
    const data = `${userId}-${payslipId}-${role}-${timestamp}-${salt}`;
    return crypto_1.default.createHash('sha256').update(data).digest('hex');
}
// Get all employees with payroll data
const getAllEmployeesWithPayroll = async (req, res) => {
    try {
        const query = `
      SELECT
        id as employee_id, CONCAT(first_name, ' ', last_name) as name, email, phone,
        role, employee_department as department, hire_date, base_salary as salary, is_active,
        base_salary, allowances, epf_enabled, epf_contribution_rate, etf_enabled,
        employee_department, created_at, updated_at
      FROM employees
      ORDER BY created_at DESC
    `;
        const result = await req.dbClient.query(query);
        return res.status(200).json({ employees: result.rows });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'server_error';
        return res.status(500).json({ error: message });
    }
};
exports.getAllEmployeesWithPayroll = getAllEmployeesWithPayroll;
// Get specific employee payroll data
const getEmployeePayrollData = async (req, res) => {
    const { id } = req.params;
    try {
        const query = `
      SELECT
        id as employee_id, CONCAT(first_name, ' ', last_name) as name, email, employee_department,
        base_salary, allowances, epf_enabled, epf_contribution_rate, etf_enabled
      FROM employees
      WHERE id = $1
    `;
        const result = await req.dbClient.query(query, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'employee_not_found' });
        }
        return res.status(200).json({ employee: result.rows[0] });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'server_error';
        return res.status(500).json({ error: message });
    }
};
exports.getEmployeePayrollData = getEmployeePayrollData;
// Update employee payroll data
const updateEmployeePayrollData = async (req, res) => {
    const { id } = req.params;
    const { base_salary, allowances, epf_enabled, epf_contribution_rate, etf_enabled, employee_department } = req.body;
    try {
        const query = `
      UPDATE employees
      SET
        base_salary = COALESCE($1, base_salary),
        allowances = COALESCE($2, allowances),
        epf_enabled = COALESCE($3, epf_enabled),
        epf_contribution_rate = COALESCE($4, epf_contribution_rate),
        etf_enabled = COALESCE($5, etf_enabled),
        employee_department = COALESCE($6, employee_department)
      WHERE id = $7
      RETURNING id as employee_id, base_salary, allowances, epf_enabled, epf_contribution_rate, etf_enabled, employee_department
    `;
        const values = [base_salary, allowances, epf_enabled, epf_contribution_rate, etf_enabled, employee_department, id];
        const result = await req.dbClient.query(query, values);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'employee_not_found' });
        }
        return res.status(200).json({ employee: result.rows[0] });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'server_error';
        return res.status(500).json({ error: message });
    }
};
exports.updateEmployeePayrollData = updateEmployeePayrollData;
// Get all payslips with filters (with pagination)
const getAllPayslips = async (req, res) => {
    const { year, month, status, employee_id, page = '1', limit = '50' } = req.query;
    try {
        // Parse pagination params
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 50;
        const offset = (pageNum - 1) * limitNum;
        // Build count query
        let countQuery = `
      SELECT COUNT(*) as total
      FROM payslips p
      WHERE 1=1
    `;
        // Build data query
        let dataQuery = `
      SELECT
        p.*,
        CONCAT(e.first_name, ' ', e.last_name) as employee_name, e.email as employee_email, e.employee_department,
        e.first_name, e.last_name, e.employee_number, e.designation,
        u.name as created_by_name
      FROM payslips p
      JOIN employees e ON p.employee_id = e.id
      JOIN users u ON p.created_by_user_id = u.id
      WHERE 1=1
    `;
        const params = [];
        let paramCount = 1;
        // Apply filters
        if (year) {
            const filter = ` AND p.payslip_year = $${paramCount}`;
            countQuery += filter;
            dataQuery += filter;
            params.push(year);
            paramCount++;
        }
        if (month) {
            const filter = ` AND p.payslip_month = $${paramCount}`;
            countQuery += filter;
            dataQuery += filter;
            params.push(month);
            paramCount++;
        }
        if (status) {
            const filter = ` AND p.status = $${paramCount}`;
            countQuery += filter;
            dataQuery += filter;
            params.push(status);
            paramCount++;
        }
        if (employee_id) {
            const filter = ` AND p.employee_id = $${paramCount}`;
            countQuery += filter;
            dataQuery += filter;
            params.push(employee_id);
            paramCount++;
        }
        // Get total count
        const countResult = await req.dbClient.query(countQuery, params);
        const total = parseInt(countResult.rows[0].total);
        // Add pagination to data query
        dataQuery += ` ORDER BY p.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limitNum, offset);
        const result = await req.dbClient.query(dataQuery, params);
        return res.status(200).json({
            payslips: result.rows,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'server_error';
        console.error('Error fetching payslips:', err);
        return res.status(500).json({ error: message });
    }
};
exports.getAllPayslips = getAllPayslips;
// Get specific payslip with signatures
const getPayslipById = async (req, res) => {
    const { id } = req.params;
    try {
        // Get payslip data
        const payslipQuery = `
      SELECT
        p.*,
        CONCAT(e.first_name, ' ', e.last_name) as employee_name, e.email as employee_email, e.employee_department, e.role,
        e.first_name, e.last_name, e.employee_number, e.designation,
        u.name as created_by_name
      FROM payslips p
      JOIN employees e ON p.employee_id = e.id
      JOIN users u ON p.created_by_user_id = u.id
      WHERE p.payslip_id = $1
    `;
        const payslipResult = await req.dbClient.query(payslipQuery, [id]);
        if (payslipResult.rows.length === 0) {
            return res.status(404).json({ error: 'payslip_not_found' });
        }
        // Get signatures
        const signaturesQuery = `
      SELECT
        s.*,
        u.name as signer_name, u.email as signer_email
      FROM payslip_signatures s
      JOIN users u ON s.signer_user_id = u.id
      WHERE s.payslip_id = $1
      ORDER BY s.signed_at ASC
    `;
        const signaturesResult = await req.dbClient.query(signaturesQuery, [id]);
        return res.status(200).json({
            payslip: payslipResult.rows[0],
            signatures: signaturesResult.rows
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'server_error';
        return res.status(500).json({ error: message });
    }
};
exports.getPayslipById = getPayslipById;
// Create new payslip (auto-generate from employee data)
const createPayslip = async (req, res) => {
    const { employee_id, payslip_month, payslip_year, allowances, other_deductions, epf_employee_rate } = req.body;
    const userId = req.user?.userId;
    if (!employee_id || !payslip_month || !payslip_year || !userId) {
        return res.status(400).json({ error: 'missing_required_fields' });
    }
    try {
        // Get employee data
        const empQuery = `
      SELECT base_salary, allowances as default_allowances, epf_enabled, epf_contribution_rate, etf_enabled
      FROM employees
      WHERE id = $1
    `;
        const empResult = await req.dbClient.query(empQuery, [employee_id]);
        if (empResult.rows.length === 0) {
            return res.status(404).json({ error: 'employee_not_found' });
        }
        const employee = empResult.rows[0];
        if (!employee.base_salary) {
            return res.status(400).json({ error: 'employee_base_salary_not_set' });
        }
        // Calculate salary components
        const basicSalary = parseFloat(employee.base_salary);
        const payslipAllowances = allowances || employee.default_allowances || {};
        const allowancesTotal = Object.values(payslipAllowances).reduce((sum, val) => sum + parseFloat(val || 0), 0);
        const grossSalary = basicSalary + allowancesTotal;
        // Calculate EPF
        const epfRate = epf_employee_rate || employee.epf_contribution_rate || 8.00;
        const epfEmployeeDeduction = employee.epf_enabled ? (grossSalary * parseFloat(epfRate)) / 100 : 0;
        const epfEmployerContribution = employee.epf_enabled ? (grossSalary * 12) / 100 : 0;
        // Calculate ETF
        const etfEmployerContribution = employee.etf_enabled ? (grossSalary * 3) / 100 : 0;
        // Calculate other deductions
        const otherDeductionsTotal = other_deductions
            ? Object.values(other_deductions).reduce((sum, val) => sum + parseFloat(val || 0), 0)
            : 0;
        const totalDeductions = epfEmployeeDeduction + otherDeductionsTotal;
        const netSalary = grossSalary - totalDeductions;
        // Insert payslip
        const insertQuery = `
      INSERT INTO payslips (
        employee_id, payslip_month, payslip_year, basic_salary, allowances,
        gross_salary, epf_employee_deduction, epf_employee_rate, other_deductions,
        total_deductions, epf_employer_contribution, etf_employer_contribution,
        net_salary, status, created_by_user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;
        const values = [
            employee_id, payslip_month, payslip_year, basicSalary, JSON.stringify(payslipAllowances),
            grossSalary, epfEmployeeDeduction, epfRate, JSON.stringify(other_deductions || {}),
            totalDeductions, epfEmployerContribution, etfEmployerContribution,
            netSalary, 'DRAFT', userId
        ];
        const result = await req.dbClient.query(insertQuery, values);
        return res.status(201).json({ payslip: result.rows[0] });
    }
    catch (err) {
        if (err.code === '23505') { // Unique constraint violation
            return res.status(400).json({ error: 'payslip_already_exists_for_this_month' });
        }
        const message = err instanceof Error ? err.message : 'server_error';
        return res.status(500).json({ error: message });
    }
};
exports.createPayslip = createPayslip;
// Update payslip
const updatePayslip = async (req, res) => {
    const { id } = req.params;
    const { allowances, other_deductions, epf_employee_rate } = req.body;
    try {
        // Get current payslip
        const currentQuery = `SELECT * FROM payslips WHERE payslip_id = $1`;
        const currentResult = await req.dbClient.query(currentQuery, [id]);
        if (currentResult.rows.length === 0) {
            return res.status(404).json({ error: 'payslip_not_found' });
        }
        const current = currentResult.rows[0];
        // Only allow updates if status is DRAFT or REJECTED
        if (current.status !== 'DRAFT' && current.status !== 'REJECTED') {
            return res.status(400).json({ error: 'cannot_update_payslip_in_current_status' });
        }
        // Recalculate
        const basicSalary = parseFloat(current.basic_salary);
        const payslipAllowances = allowances || current.allowances || {};
        const allowancesTotal = Object.values(payslipAllowances).reduce((sum, val) => sum + parseFloat(val || 0), 0);
        const grossSalary = basicSalary + allowancesTotal;
        const epfRate = epf_employee_rate || current.epf_employee_rate || 8.00;
        const epfEmployeeDeduction = (grossSalary * parseFloat(epfRate)) / 100;
        const epfEmployerContribution = (grossSalary * 12) / 100;
        const etfEmployerContribution = (grossSalary * 3) / 100;
        const otherDeductionsData = other_deductions || current.other_deductions || {};
        const otherDeductionsTotal = Object.values(otherDeductionsData).reduce((sum, val) => sum + parseFloat(val || 0), 0);
        const totalDeductions = epfEmployeeDeduction + otherDeductionsTotal;
        const netSalary = grossSalary - totalDeductions;
        const updateQuery = `
      UPDATE payslips
      SET
        allowances = $1,
        gross_salary = $2,
        epf_employee_deduction = $3,
        epf_employee_rate = $4,
        other_deductions = $5,
        total_deductions = $6,
        epf_employer_contribution = $7,
        etf_employer_contribution = $8,
        net_salary = $9,
        status = 'DRAFT'
      WHERE payslip_id = $10
      RETURNING *
    `;
        const values = [
            JSON.stringify(payslipAllowances), grossSalary, epfEmployeeDeduction, epfRate,
            JSON.stringify(otherDeductionsData), totalDeductions, epfEmployerContribution,
            etfEmployerContribution, netSalary, id
        ];
        const result = await req.dbClient.query(updateQuery, values);
        return res.status(200).json({ payslip: result.rows[0] });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'server_error';
        return res.status(500).json({ error: message });
    }
};
exports.updatePayslip = updatePayslip;
// Delete payslip (only drafts)
const deletePayslip = async (req, res) => {
    const { id } = req.params;
    try {
        const checkQuery = `SELECT status FROM payslips WHERE payslip_id = $1`;
        const checkResult = await req.dbClient.query(checkQuery, [id]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'payslip_not_found' });
        }
        if (checkResult.rows[0].status !== 'DRAFT') {
            return res.status(400).json({ error: 'can_only_delete_draft_payslips' });
        }
        const deleteQuery = `DELETE FROM payslips WHERE payslip_id = $1 RETURNING payslip_id`;
        const result = await req.dbClient.query(deleteQuery, [id]);
        return res.status(200).json({ message: 'payslip_deleted', payslip_id: result.rows[0].payslip_id });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'server_error';
        return res.status(500).json({ error: message });
    }
};
exports.deletePayslip = deletePayslip;
// Submit for review
const submitForReview = async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.userId;
    if (!userId) {
        return res.status(401).json({ error: 'unauthorized' });
    }
    try {
        const updateQuery = `
      UPDATE payslips
      SET status = 'PENDING_STAFF_REVIEW'
      WHERE payslip_id = $1 AND status = 'DRAFT'
      RETURNING *
    `;
        const result = await req.dbClient.query(updateQuery, [id]);
        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'payslip_not_found_or_not_in_draft_status' });
        }
        // Create junior accountant signature
        const signatureHash = generateSignatureHash(userId, parseInt(id), 'JUNIOR_ACCOUNTANT');
        const ipAddress = req.ip || req.socket.remoteAddress || null;
        await req.dbClient.query(`
      INSERT INTO payslip_signatures (payslip_id, signer_user_id, signer_role, signature_hash, ip_address)
      VALUES ($1, $2, $3, $4, $5)
    `, [id, userId, 'JUNIOR_ACCOUNTANT', signatureHash, ipAddress]);
        return res.status(200).json({ payslip: result.rows[0], signature_hash: signatureHash });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'server_error';
        return res.status(500).json({ error: message });
    }
};
exports.submitForReview = submitForReview;
// Staff accountant approval
const staffApprove = async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.userId;
    if (!userId) {
        return res.status(401).json({ error: 'unauthorized' });
    }
    try {
        const updateQuery = `
      UPDATE payslips
      SET status = 'PENDING_ADMIN_APPROVAL'
      WHERE payslip_id = $1 AND status = 'PENDING_STAFF_REVIEW'
      RETURNING *
    `;
        const result = await req.dbClient.query(updateQuery, [id]);
        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'payslip_not_found_or_not_pending_staff_review' });
        }
        const signatureHash = generateSignatureHash(userId, parseInt(id), 'STAFF_ACCOUNTANT');
        const ipAddress = req.ip || req.socket.remoteAddress || null;
        await req.dbClient.query(`
      INSERT INTO payslip_signatures (payslip_id, signer_user_id, signer_role, signature_hash, ip_address)
      VALUES ($1, $2, $3, $4, $5)
    `, [id, userId, 'STAFF_ACCOUNTANT', signatureHash, ipAddress]);
        return res.status(200).json({ payslip: result.rows[0], signature_hash: signatureHash });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'server_error';
        return res.status(500).json({ error: message });
    }
};
exports.staffApprove = staffApprove;
// Admin approval
const adminApprove = async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.userId;
    if (!userId) {
        return res.status(401).json({ error: 'unauthorized' });
    }
    try {
        const updateQuery = `
      UPDATE payslips
      SET status = 'PENDING_EMPLOYEE_SIGNATURE'
      WHERE payslip_id = $1 AND status = 'PENDING_ADMIN_APPROVAL'
      RETURNING *
    `;
        const result = await req.dbClient.query(updateQuery, [id]);
        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'payslip_not_found_or_not_pending_admin_approval' });
        }
        const signatureHash = generateSignatureHash(userId, parseInt(id), 'ADMIN');
        const ipAddress = req.ip || req.socket.remoteAddress || null;
        await req.dbClient.query(`
      INSERT INTO payslip_signatures (payslip_id, signer_user_id, signer_role, signature_hash, ip_address)
      VALUES ($1, $2, $3, $4, $5)
    `, [id, userId, 'ADMIN', signatureHash, ipAddress]);
        // Send email notification to employee
        try {
            // Get employee and admin details
            const employeeQuery = `
        SELECT e.id as employee_id, CONCAT(e.first_name, ' ', e.last_name) as employee_name, e.email, u.name as admin_name
        FROM payslips p
        JOIN employees e ON p.employee_id = e.id
        JOIN users u ON u.id = $1
        WHERE p.payslip_id = $2
      `;
            const employeeResult = await req.dbClient.query(employeeQuery, [userId, id]);
            if (employeeResult.rows.length > 0) {
                const employee = employeeResult.rows[0];
                const payslip = result.rows[0];
                const employeeName = employee.employee_name;
                const netSalary = new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD'
                }).format(parseFloat(payslip.net_salary));
                const grossSalary = new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD'
                }).format(parseFloat(payslip.gross_salary));
                // Generate signature token for employee
                const { generatePayslipToken } = await Promise.resolve().then(() => __importStar(require('../utils/payslipTokens')));
                const signatureToken = await generatePayslipToken(parseInt(id), employee.employee_id);
                await (0, emailService_1.sendPayslipNotification)({
                    payslipId: parseInt(id),
                    employeeName,
                    employeeEmail: employee.email,
                    month: payslip.payslip_month,
                    year: payslip.payslip_year,
                    netSalary,
                    grossSalary,
                    approvedByName: employee.admin_name
                }, signatureToken);
                console.log(`✅ Payslip notification email sent to ${employee.email}`);
            }
        }
        catch (emailError) {
            // Log email error but don't fail the approval
            console.error('⚠️  Failed to send payslip notification email:', emailError);
        }
        return res.status(200).json({ payslip: result.rows[0], signature_hash: signatureHash });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'server_error';
        return res.status(500).json({ error: message });
    }
};
exports.adminApprove = adminApprove;
// Employee signature
const employeeSign = async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.userId;
    if (!userId) {
        return res.status(401).json({ error: 'unauthorized' });
    }
    try {
        const updateQuery = `
      UPDATE payslips
      SET status = 'COMPLETED'
      WHERE payslip_id = $1 AND status = 'PENDING_EMPLOYEE_SIGNATURE'
      RETURNING *
    `;
        const result = await req.dbClient.query(updateQuery, [id]);
        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'payslip_not_found_or_not_pending_employee_signature' });
        }
        const signatureHash = generateSignatureHash(userId, parseInt(id), 'EMPLOYEE');
        const ipAddress = req.ip || req.socket.remoteAddress || null;
        await req.dbClient.query(`
      INSERT INTO payslip_signatures (payslip_id, signer_user_id, signer_role, signature_hash, ip_address)
      VALUES ($1, $2, $3, $4, $5)
    `, [id, userId, 'EMPLOYEE', signatureHash, ipAddress]);
        return res.status(200).json({ payslip: result.rows[0], signature_hash: signatureHash });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'server_error';
        return res.status(500).json({ error: message });
    }
};
exports.employeeSign = employeeSign;
// Reject payslip
const rejectPayslip = async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    try {
        const updateQuery = `
      UPDATE payslips
      SET status = 'REJECTED', rejection_reason = $1
      WHERE payslip_id = $2 AND status IN ('PENDING_STAFF_REVIEW', 'PENDING_ADMIN_APPROVAL')
      RETURNING *
    `;
        const result = await req.dbClient.query(updateQuery, [reason, id]);
        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'payslip_not_found_or_cannot_reject_in_current_status' });
        }
        return res.status(200).json({ payslip: result.rows[0] });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'server_error';
        return res.status(500).json({ error: message });
    }
};
exports.rejectPayslip = rejectPayslip;
// Get archive (organized by year/month)
const getArchive = async (req, res) => {
    try {
        const query = `
      SELECT
        payslip_year,
        payslip_month,
        COUNT(*) as payslip_count,
        SUM(net_salary) as total_net_salary,
        SUM(gross_salary) as total_gross_salary
      FROM payslips
      WHERE status = 'COMPLETED'
      GROUP BY payslip_year, payslip_month
      ORDER BY payslip_year DESC, payslip_month DESC
    `;
        const result = await req.dbClient.query(query);
        return res.status(200).json({ archive: result.rows });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'server_error';
        return res.status(500).json({ error: message });
    }
};
exports.getArchive = getArchive;
// Get monthly payroll summary
const getMonthlyReport = async (req, res) => {
    const { year, month } = req.query;
    if (!year || !month) {
        return res.status(400).json({ error: 'year_and_month_required' });
    }
    try {
        const query = `
      SELECT
        COUNT(*) as total_employees,
        SUM(basic_salary) as total_basic_salary,
        SUM(gross_salary) as total_gross_salary,
        SUM(total_deductions) as total_deductions,
        SUM(net_salary) as total_net_salary,
        SUM(epf_employer_contribution) as total_epf_employer,
        SUM(etf_employer_contribution) as total_etf_employer,
        SUM(gross_salary + epf_employer_contribution + etf_employer_contribution) as total_payroll_cost
      FROM payslips
      WHERE payslip_year = $1 AND payslip_month = $2 AND status = 'COMPLETED'
    `;
        const result = await req.dbClient.query(query, [year, month]);
        // Department-wise breakdown
        const deptQuery = `
      SELECT
        e.employee_department,
        COUNT(*) as employee_count,
        SUM(p.gross_salary) as total_gross,
        SUM(p.net_salary) as total_net
      FROM payslips p
      JOIN employees e ON p.employee_id = e.id
      WHERE p.payslip_year = $1 AND p.payslip_month = $2 AND p.status = 'COMPLETED'
      GROUP BY e.employee_department
      ORDER BY total_gross DESC
    `;
        const deptResult = await req.dbClient.query(deptQuery, [year, month]);
        return res.status(200).json({
            summary: result.rows[0],
            by_department: deptResult.rows
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'server_error';
        return res.status(500).json({ error: message });
    }
};
exports.getMonthlyReport = getMonthlyReport;
// Download payslip as PDF
const downloadPayslip = async (req, res) => {
    const { id } = req.params;
    try {
        // Get payslip data
        const payslipQuery = `
      SELECT
        p.*,
        CONCAT(e.first_name, ' ', e.last_name) as employee_name, e.email as employee_email, e.employee_department, e.role,
        e.first_name, e.last_name, e.employee_number, e.designation
      FROM payslips p
      JOIN employees e ON p.employee_id = e.id
      WHERE p.payslip_id = $1
    `;
        const payslipResult = await req.dbClient.query(payslipQuery, [id]);
        if (payslipResult.rows.length === 0) {
            return res.status(404).json({ error: 'payslip_not_found' });
        }
        // Get signatures
        const signaturesQuery = `
      SELECT
        s.*,
        u.name as signer_name
      FROM payslip_signatures s
      JOIN users u ON s.signer_user_id = u.id
      WHERE s.payslip_id = $1
      ORDER BY s.signed_at ASC
    `;
        const signaturesResult = await req.dbClient.query(signaturesQuery, [id]);
        // Generate PDF
        await (0, payslipPdfGenerator_1.generatePayslipPdf)(payslipResult.rows[0], signaturesResult.rows, res);
    }
    catch (err) {
        console.error('Error generating PDF:', err);
        const message = err instanceof Error ? err.message : 'server_error';
        return res.status(500).json({ error: message });
    }
};
exports.downloadPayslip = downloadPayslip;
// Get employee payroll history
const getEmployeePayrollHistory = async (req, res) => {
    const { id } = req.params;
    try {
        // Get all payslips for the employee
        const query = `
      SELECT
        p.*,
        CONCAT(e.first_name, ' ', e.last_name) as employee_name, e.email as employee_email, e.employee_department
      FROM payslips p
      JOIN employees e ON p.employee_id = e.id
      WHERE p.employee_id = $1
      ORDER BY p.payslip_year DESC, p.payslip_month DESC
    `;
        const result = await req.dbClient.query(query, [id]);
        // Calculate YTD totals (current year)
        const currentYear = new Date().getFullYear();
        const ytdQuery = `
      SELECT
        SUM(gross_salary) as ytd_gross,
        SUM(net_salary) as ytd_net,
        SUM(total_deductions) as ytd_deductions,
        SUM(epf_employee_deduction) as ytd_epf_employee,
        SUM(epf_employer_contribution) as ytd_epf_employer,
        SUM(etf_employer_contribution) as ytd_etf_employer
      FROM payslips
      WHERE employee_id = $1 AND payslip_year = $2 AND status = 'COMPLETED'
    `;
        const ytdResult = await req.dbClient.query(ytdQuery, [id, currentYear]);
        return res.status(200).json({
            payslips: result.rows,
            ytd_totals: ytdResult.rows[0]
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'server_error';
        return res.status(500).json({ error: message });
    }
};
exports.getEmployeePayrollHistory = getEmployeePayrollHistory;
