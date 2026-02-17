"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateInstallment = exports.getInstallments = exports.recordInstallmentPayment = exports.deleteLoan = exports.updateLoan = exports.getLoanSummary = exports.getLoanById = exports.getLoans = exports.createLoan = void 0;
const db_1 = require("../db");
const amortization_1 = require("../utils/amortization");
/**
 * Create a new loan and auto-generate installments
 */
const createLoan = async (req, res) => {
    const { loan_account_number, borrower_name, bank_name, loan_amount, total_installments, monthly_installment_amount, interest_rate, loan_type, start_date, notes } = req.body;
    // Validation
    if (!loan_account_number || !borrower_name || !bank_name || !loan_amount ||
        !total_installments || !monthly_installment_amount || !start_date) {
        return res.status(400).json({ error: 'missing_required_fields' });
    }
    try {
        await db_1.pool.query('BEGIN');
        // Calculate end date
        const startDateObj = new Date(start_date);
        const endDate = new Date(startDateObj);
        endDate.setMonth(endDate.getMonth() + total_installments);
        // Insert loan
        const loanResult = await db_1.pool.query(`INSERT INTO loans (
        loan_account_number, borrower_name, bank_name, loan_amount,
        total_installments, monthly_installment_amount, interest_rate,
        loan_type, start_date, calculated_end_date, notes, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`, [
            loan_account_number,
            borrower_name,
            bank_name,
            loan_amount,
            total_installments,
            monthly_installment_amount,
            interest_rate || null,
            loan_type || 'BUSINESS',
            start_date,
            endDate.toISOString().split('T')[0],
            notes || null,
            'ACTIVE'
        ]);
        const loan = loanResult.rows[0];
        // Auto-generate installments
        const installments = [];
        for (let i = 1; i <= total_installments; i++) {
            const dueDate = new Date(startDateObj);
            dueDate.setMonth(dueDate.getMonth() + i);
            await db_1.pool.query(`INSERT INTO loan_installments (
          loan_id, installment_number, due_date, scheduled_amount, status
        ) VALUES ($1, $2, $3, $4, $5)`, [loan.id, i, dueDate.toISOString().split('T')[0], monthly_installment_amount, 'PENDING']);
            installments.push({
                installment_number: i,
                due_date: dueDate.toISOString().split('T')[0],
                scheduled_amount: monthly_installment_amount,
                status: 'PENDING'
            });
        }
        await db_1.pool.query('COMMIT');
        return res.status(201).json({
            loan,
            installments,
            message: 'Loan created successfully with all installments generated'
        });
    }
    catch (err) {
        await db_1.pool.query('ROLLBACK');
        if (err.code === '23505') { // Unique violation
            return res.status(409).json({ error: 'loan_account_number_exists' });
        }
        console.error('Error creating loan:', err);
        return res.status(500).json({ error: 'server_error', message: err.message });
    }
};
exports.createLoan = createLoan;
/**
 * Get all loans
 */
const getLoans = async (req, res) => {
    try {
        const result = await db_1.pool.query(`
      SELECT 
        l.*,
        COUNT(CASE WHEN li.status = 'PAID' THEN 1 END)::int as installments_paid,
        COUNT(CASE WHEN li.status = 'PENDING' THEN 1 END)::int as installments_pending,
        COALESCE(SUM(CASE WHEN li.status = 'PAID' THEN li.amount_paid ELSE 0 END), 0) as total_paid,
        (l.loan_amount - COALESCE(SUM(CASE WHEN li.status = 'PAID' THEN li.amount_paid ELSE 0 END), 0)) as outstanding_balance
      FROM loans l
      LEFT JOIN loan_installments li ON l.id = li.loan_id
      GROUP BY l.id
      ORDER BY l.created_at DESC
    `);
        return res.json({ loans: result.rows });
    }
    catch (err) {
        console.error('Error fetching loans:', err);
        return res.status(500).json({ error: 'server_error', message: err.message });
    }
};
exports.getLoans = getLoans;
/**
 * Get single loan with details
 */
const getLoanById = async (req, res) => {
    const { id } = req.params;
    try {
        const loanResult = await db_1.pool.query('SELECT * FROM loans WHERE id = $1', [id]);
        if (loanResult.rows.length === 0) {
            return res.status(404).json({ error: 'loan_not_found' });
        }
        const loan = loanResult.rows[0];
        // Get installments
        const installmentsResult = await db_1.pool.query(`SELECT * FROM loan_installments WHERE loan_id = $1 ORDER BY installment_number`, [id]);
        return res.json({
            loan,
            installments: installmentsResult.rows
        });
    }
    catch (err) {
        console.error('Error fetching loan:', err);
        return res.status(500).json({ error: 'server_error', message: err.message });
    }
};
exports.getLoanById = getLoanById;
/**
 * Get loan summary with calculations
 */
const getLoanSummary = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db_1.pool.query(`
      SELECT 
        l.*,
        COUNT(li.id)::int as total_installments_count,
        COUNT(CASE WHEN li.status = 'PAID' THEN 1 END)::int as installments_paid,
        COUNT(CASE WHEN li.status = 'PENDING' THEN 1 END)::int as installments_remaining,
        COALESCE(SUM(CASE WHEN li.status = 'PAID' THEN li.amount_paid ELSE 0 END), 0) as total_amount_paid,
        (l.loan_amount - COALESCE(SUM(CASE WHEN li.status = 'PAID' THEN li.amount_paid ELSE 0 END), 0)) as outstanding_balance
      FROM loans l
      LEFT JOIN loan_installments li ON l.id = li.loan_id
      WHERE l.id = $1
      GROUP BY l.id
    `, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'loan_not_found' });
        }
        const summary = result.rows[0];
        // If interest rate exists, calculate amortization details
        if (summary.interest_rate) {
            const amortizationSchedule = (0, amortization_1.generateAmortizationSchedule)(parseFloat(summary.loan_amount), parseFloat(summary.interest_rate), summary.total_installments, new Date(summary.start_date), parseFloat(summary.monthly_installment_amount));
            const totalInterest = (0, amortization_1.calculateTotalInterest)(parseFloat(summary.loan_amount), parseFloat(summary.monthly_installment_amount), summary.total_installments);
            const remainingInterest = (0, amortization_1.calculateRemainingInterest)(amortizationSchedule, summary.installments_paid);
            summary.amortization = {
                total_interest: totalInterest,
                interest_paid: totalInterest - remainingInterest,
                interest_remaining: remainingInterest,
                schedule: amortizationSchedule
            };
        }
        return res.json({ summary });
    }
    catch (err) {
        console.error('Error fetching loan summary:', err);
        return res.status(500).json({ error: 'server_error', message: err.message });
    }
};
exports.getLoanSummary = getLoanSummary;
/**
 * Update loan details
 */
const updateLoan = async (req, res) => {
    const { id } = req.params;
    const { borrower_name, bank_name, loan_type, notes, status } = req.body;
    try {
        const result = await db_1.pool.query(`UPDATE loans 
       SET borrower_name = COALESCE($1, borrower_name),
           bank_name = COALESCE($2, bank_name),
           loan_type = COALESCE($3, loan_type),
           notes = COALESCE($4, notes),
           status = COALESCE($5, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`, [borrower_name, bank_name, loan_type, notes, status, id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'loan_not_found' });
        }
        return res.json({ loan: result.rows[0] });
    }
    catch (err) {
        console.error('Error updating loan:', err);
        return res.status(500).json({ error: 'server_error', message: err.message });
    }
};
exports.updateLoan = updateLoan;
/**
 * Delete loan (and cascade installments)
 */
const deleteLoan = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db_1.pool.query('DELETE FROM loans WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'loan_not_found' });
        }
        return res.json({ message: 'Loan deleted successfully' });
    }
    catch (err) {
        console.error('Error deleting loan:', err);
        return res.status(500).json({ error: 'server_error', message: err.message });
    }
};
exports.deleteLoan = deleteLoan;
/**
 * Record installment payment
 */
const recordInstallmentPayment = async (req, res) => {
    const { id } = req.params; // loan id
    const { installment_number, payment_date, amount_paid, paid_bank, payment_description } = req.body;
    if (!installment_number || !payment_date || !amount_paid) {
        return res.status(400).json({ error: 'missing_required_fields' });
    }
    try {
        await db_1.pool.query('BEGIN');
        // Update installment
        const result = await db_1.pool.query(`UPDATE loan_installments
       SET payment_date = $1,
           amount_paid = $2,
           paid_bank = $3,
           payment_description = $4,
           status = 'PAID'
       WHERE loan_id = $5 AND installment_number = $6
       RETURNING *`, [payment_date, amount_paid, paid_bank, payment_description, id, installment_number]);
        if (result.rows.length === 0) {
            await db_1.pool.query('ROLLBACK');
            return res.status(404).json({ error: 'installment_not_found' });
        }
        // Check if all installments are paid to update loan status
        const unpaidCount = await db_1.pool.query(`SELECT COUNT(*) as count FROM loan_installments 
       WHERE loan_id = $1 AND status != 'PAID'`, [id]);
        if (parseInt(unpaidCount.rows[0].count) === 0) {
            await db_1.pool.query(`UPDATE loans SET status = 'PAID_OFF', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [id]);
        }
        await db_1.pool.query('COMMIT');
        return res.json({
            installment: result.rows[0],
            message: 'Payment recorded successfully'
        });
    }
    catch (err) {
        await db_1.pool.query('ROLLBACK');
        console.error('Error recording payment:', err);
        return res.status(500).json({ error: 'server_error', message: err.message });
    }
};
exports.recordInstallmentPayment = recordInstallmentPayment;
/**
 * Get installments for a loan
 */
const getInstallments = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db_1.pool.query(`SELECT * FROM loan_installments WHERE loan_id = $1 ORDER BY installment_number`, [id]);
        return res.json({ installments: result.rows });
    }
    catch (err) {
        console.error('Error fetching installments:', err);
        return res.status(500).json({ error: 'server_error', message: err.message });
    }
};
exports.getInstallments = getInstallments;
/**
 * Update an installment
 */
const updateInstallment = async (req, res) => {
    const { id, installmentId } = req.params;
    const { payment_date, amount_paid, paid_bank, payment_description, status } = req.body;
    try {
        const result = await db_1.pool.query(`UPDATE loan_installments
       SET payment_date = COALESCE($1, payment_date),
           amount_paid = COALESCE($2, amount_paid),
           paid_bank = COALESCE($3, paid_bank),
           payment_description = COALESCE($4, payment_description),
           status = COALESCE($5, status)
       WHERE id = $6 AND loan_id = $7
       RETURNING *`, [payment_date, amount_paid, paid_bank, payment_description, status, installmentId, id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'installment_not_found' });
        }
        return res.json({ installment: result.rows[0] });
    }
    catch (err) {
        console.error('Error updating installment:', err);
        return res.status(500).json({ error: 'server_error', message: err.message });
    }
};
exports.updateInstallment = updateInstallment;
