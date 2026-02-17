"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReceivable = exports.getReceivables = void 0;
const db_1 = require("../db");
const getReceivables = async (req, res) => {
    try {
        const result = await db_1.pool.query(`
      SELECT r.*, c.contract_name, bk.bank_name, b.account_number 
      FROM receivables r
      LEFT JOIN contracts c ON r.contract_id = c.contract_id
      LEFT JOIN company_bank_accounts b ON r.bank_account_id = b.id
      LEFT JOIN banks bk ON b.bank_id = bk.id
      ORDER BY r.created_at DESC
    `);
        res.json({ receivables: result.rows });
    }
    catch (error) {
        console.error('Error fetching receivables:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getReceivables = getReceivables;
const createReceivable = async (req, res) => {
    const { payer_name, receivable_name, description, receivable_type, amount, frequency, start_date, end_date, contract_id, is_active, bank_account_id, payment_method, reference_number } = req.body;
    try {
        const result = await db_1.pool.query(`INSERT INTO receivables (
        payer_name, receivable_name, description, receivable_type, amount, 
        frequency, start_date, end_date, contract_id, is_active, 
        bank_account_id, payment_method, reference_number
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) 
      RETURNING *`, [
            payer_name,
            receivable_name,
            description || null,
            receivable_type || null,
            amount,
            frequency || null,
            start_date || null,
            end_date || null,
            contract_id || null,
            is_active,
            bank_account_id || null,
            payment_method || null,
            reference_number || null
        ]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error('Error creating receivable:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.createReceivable = createReceivable;
