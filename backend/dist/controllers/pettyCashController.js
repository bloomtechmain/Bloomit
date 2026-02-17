"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPettyCashTransactions = exports.addPettyCashBill = exports.replenishPettyCash = exports.getPettyCashBalance = void 0;
const db_1 = require("../db");
const getPettyCashBalance = async (req, res) => {
    try {
        const result = await db_1.pool.query('SELECT * FROM petty_cash_account LIMIT 1');
        if (result.rows.length === 0) {
            // Return a default structure if no account exists yet
            return res.json({
                id: null,
                current_balance: 0,
                monthly_float_amount: 0,
                last_replenished_date: null
            });
        }
        res.json(result.rows[0]);
    }
    catch (err) {
        console.error('Error fetching petty cash balance:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getPettyCashBalance = getPettyCashBalance;
const replenishPettyCash = async (req, res) => {
    const { amount, source_account_id, reference } = req.body;
    if (!amount || isNaN(Number(amount))) {
        return res.status(400).json({ error: 'Invalid amount' });
    }
    const client = await db_1.pool.connect();
    try {
        await client.query('BEGIN');
        // 1. Deduct from source account if provided
        if (source_account_id) {
            // Log transaction (Trigger will update bank account balance automatically)
            await client.query(`
        INSERT INTO bank_transactions (bank_account_id, transaction_type, amount, description, transaction_date)
        VALUES ($1, 'DEBIT', $2, $3, CURRENT_TIMESTAMP)
      `, [source_account_id, amount, reference || 'Petty Cash Replenishment']);
        }
        // 2. Ensure petty cash account exists
        const checkRes = await client.query('SELECT * FROM petty_cash_account LIMIT 1');
        let accountId;
        if (checkRes.rows.length === 0) {
            const newAcc = await client.query(`
        INSERT INTO petty_cash_account (account_name, monthly_float_amount, current_balance, last_replenished_date)
        VALUES ('Petty Cash', 0, 0, CURRENT_DATE)
        RETURNING id
      `);
            accountId = newAcc.rows[0].id;
        }
        else {
            accountId = checkRes.rows[0].id;
        }
        // 3. Insert into petty_cash_transactions (Trigger will update petty_cash_account balance)
        await client.query(`
      INSERT INTO petty_cash_transactions (
        transaction_type, amount, description, source_bank_account_id, transaction_date, petty_cash_account_id
      )
      VALUES ('REPLENISHMENT', $1, $2, $3, CURRENT_TIMESTAMP, $4)
    `, [amount, reference || 'Petty Cash Replenishment', source_account_id || null, accountId]);
        await client.query('COMMIT');
        res.json({ message: 'Petty cash replenished successfully' });
    }
    catch (err) {
        await client.query('ROLLBACK');
        console.error('Error replenishing petty cash:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
    finally {
        client.release();
    }
};
exports.replenishPettyCash = replenishPettyCash;
const addPettyCashBill = async (req, res) => {
    const { amount, description, contract_id, transaction_date } = req.body;
    if (!amount || isNaN(Number(amount))) {
        return res.status(400).json({ error: 'Invalid amount' });
    }
    const client = await db_1.pool.connect();
    try {
        await client.query('BEGIN');
        // 1. Ensure petty cash account exists
        const checkRes = await client.query('SELECT id FROM petty_cash_account LIMIT 1');
        let accountId;
        if (checkRes.rows.length === 0) {
            const newAcc = await client.query(`
        INSERT INTO petty_cash_account (account_name, monthly_float_amount, current_balance, last_replenished_date)
        VALUES ('Petty Cash', 0, 0, CURRENT_DATE)
        RETURNING id
      `);
            accountId = newAcc.rows[0].id;
        }
        else {
            accountId = checkRes.rows[0].id;
        }
        // 2. Insert into petty_cash_transactions
        await client.query(`
      INSERT INTO petty_cash_transactions (
        transaction_type, amount, description, contract_id, transaction_date, petty_cash_account_id
      )
      VALUES ('EXPENSE', $1, $2, $3, $4, $5)
    `, [amount, description || 'Petty Cash Expense', contract_id || null, transaction_date || new Date(), accountId]);
        await client.query('COMMIT');
        res.json({ message: 'Petty cash bill added successfully' });
    }
    catch (err) {
        await client.query('ROLLBACK');
        console.error('Error adding petty cash bill:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
    finally {
        client.release();
    }
};
exports.addPettyCashBill = addPettyCashBill;
const getPettyCashTransactions = async (req, res) => {
    try {
        const query = `
      SELECT t.*, c.contract_name
      FROM petty_cash_transactions t
      LEFT JOIN contracts c ON t.contract_id = c.contract_id
      ORDER BY t.transaction_date DESC, t.created_at DESC
    `;
        const result = await db_1.pool.query(query);
        res.json(result.rows);
    }
    catch (err) {
        console.error('Error fetching petty cash transactions:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getPettyCashTransactions = getPettyCashTransactions;
