"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAccounts = exports.openAccount = void 0;
const db_1 = require("../db");
const openAccount = async (req, res) => {
    const { bank_name, branch, account_number, account_name, opening_balance } = req.body;
    if (!bank_name || !account_number || opening_balance === undefined) {
        return res.status(400).json({ error: 'missing_fields' });
    }
    const openingBalanceNum = Number(opening_balance);
    if (Number.isNaN(openingBalanceNum)) {
        return res.status(400).json({ error: 'invalid_opening_balance' });
    }
    try {
        await db_1.pool.query('BEGIN');
        const bankLookup = await db_1.pool.query(`SELECT id, bank_name, branch FROM banks WHERE bank_name = $1 AND COALESCE(branch,'') = COALESCE($2,'') LIMIT 1`, [bank_name, branch ?? null]);
        let bankId;
        if (bankLookup.rows.length > 0) {
            bankId = bankLookup.rows[0].id;
        }
        else {
            const bankInsert = await db_1.pool.query(`INSERT INTO banks(bank_name, branch) VALUES($1, $2) RETURNING id, bank_name, branch, created_at`, [bank_name, branch ?? null]);
            bankId = bankInsert.rows[0].id;
        }
        const accountInsert = await db_1.pool.query(`INSERT INTO company_bank_accounts(bank_id, account_number, account_name, opening_balance, current_balance)
       VALUES($1, $2, $3, $4, $4)
       RETURNING id, bank_id, account_number, account_name, opening_balance, current_balance, created_at`, [bankId, account_number, account_name ?? null, openingBalanceNum]);
        await db_1.pool.query('COMMIT');
        return res.status(201).json({
            bank: { id: bankId, bank_name, branch: branch ?? null },
            account: accountInsert.rows[0],
        });
    }
    catch (err) {
        await db_1.pool.query('ROLLBACK').catch(() => null);
        const message = err instanceof Error ? err.message : 'server_error';
        if (message.includes('company_bank_accounts_account_number_key')) {
            return res.status(409).json({ error: 'account_number_exists' });
        }
        return res.status(500).json({ error: message });
    }
};
exports.openAccount = openAccount;
const getAccounts = async (req, res) => {
    try {
        const r = await db_1.pool.query(`SELECT
         a.id,
         a.bank_id,
         a.account_number,
         a.account_name,
         a.opening_balance,
         a.current_balance,
         a.created_at,
         b.bank_name,
         b.branch
       FROM company_bank_accounts a
       JOIN banks b ON b.id = a.bank_id
       ORDER BY a.created_at DESC`);
        return res.json({ accounts: r.rows });
    }
    catch (e) {
        const message = e instanceof Error ? e.message : 'server_error';
        return res.status(500).json({ error: message });
    }
};
exports.getAccounts = getAccounts;
