"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSubscription = exports.updateSubscription = exports.createSubscription = exports.getSubscriptionById = exports.getAllSubscriptions = void 0;
const db_1 = require("../db");
const getAllSubscriptions = async (req, res) => {
    try {
        const query = `
      SELECT 
        id, 
        description, 
        amount, 
        due_date, 
        frequency, 
        auto_pay, 
        is_active, 
        created_at,
        updated_at,
        CASE 
          WHEN frequency = 'MONTHLY' THEN amount * 12
          WHEN frequency = 'YEARLY' THEN amount
          ELSE 0
        END as yearly_cost
      FROM subscriptions
      ORDER BY due_date ASC, created_at DESC
    `;
        const result = await db_1.pool.query(query);
        return res.status(200).json({ subscriptions: result.rows });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'server_error';
        console.error('Error fetching subscriptions:', err);
        return res.status(500).json({ error: message });
    }
};
exports.getAllSubscriptions = getAllSubscriptions;
const getSubscriptionById = async (req, res) => {
    const { id } = req.params;
    try {
        const query = `
      SELECT 
        id, 
        description, 
        amount, 
        due_date, 
        frequency, 
        auto_pay, 
        is_active, 
        created_at,
        updated_at,
        CASE 
          WHEN frequency = 'MONTHLY' THEN amount * 12
          WHEN frequency = 'YEARLY' THEN amount
          ELSE 0
        END as yearly_cost
      FROM subscriptions
      WHERE id = $1
    `;
        const result = await db_1.pool.query(query, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'subscription_not_found' });
        }
        return res.status(200).json({ subscription: result.rows[0] });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'server_error';
        console.error('Error fetching subscription:', err);
        return res.status(500).json({ error: message });
    }
};
exports.getSubscriptionById = getSubscriptionById;
const createSubscription = async (req, res) => {
    const { description, amount, due_date, frequency, auto_pay, is_active } = req.body;
    if (!description || !amount || !due_date || !frequency) {
        return res.status(400).json({ error: 'missing_fields', message: 'Description, amount, due_date, and frequency are required' });
    }
    if (!['MONTHLY', 'YEARLY'].includes(frequency)) {
        return res.status(400).json({ error: 'invalid_frequency', message: 'Frequency must be MONTHLY or YEARLY' });
    }
    try {
        const query = `
      INSERT INTO subscriptions (description, amount, due_date, frequency, auto_pay, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING 
        id, 
        description, 
        amount, 
        due_date, 
        frequency, 
        auto_pay, 
        is_active, 
        created_at,
        updated_at,
        CASE 
          WHEN frequency = 'MONTHLY' THEN amount * 12
          WHEN frequency = 'YEARLY' THEN amount
          ELSE 0
        END as yearly_cost
    `;
        const values = [
            description,
            amount,
            due_date,
            frequency,
            auto_pay ?? false,
            is_active ?? true
        ];
        const result = await db_1.pool.query(query, values);
        return res.status(201).json({ subscription: result.rows[0] });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'server_error';
        console.error('Error creating subscription:', err);
        return res.status(500).json({ error: message });
    }
};
exports.createSubscription = createSubscription;
const updateSubscription = async (req, res) => {
    const { id } = req.params;
    const { description, amount, due_date, frequency, auto_pay, is_active } = req.body;
    if (!description || !amount || !due_date || !frequency) {
        return res.status(400).json({ error: 'missing_fields', message: 'Description, amount, due_date, and frequency are required' });
    }
    if (!['MONTHLY', 'YEARLY'].includes(frequency)) {
        return res.status(400).json({ error: 'invalid_frequency', message: 'Frequency must be MONTHLY or YEARLY' });
    }
    try {
        const query = `
      UPDATE subscriptions
      SET 
        description = $1,
        amount = $2,
        due_date = $3,
        frequency = $4,
        auto_pay = $5,
        is_active = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING 
        id, 
        description, 
        amount, 
        due_date, 
        frequency, 
        auto_pay, 
        is_active, 
        created_at,
        updated_at,
        CASE 
          WHEN frequency = 'MONTHLY' THEN amount * 12
          WHEN frequency = 'YEARLY' THEN amount
          ELSE 0
        END as yearly_cost
    `;
        const values = [description, amount, due_date, frequency, auto_pay, is_active, id];
        const result = await db_1.pool.query(query, values);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'subscription_not_found' });
        }
        return res.status(200).json({ subscription: result.rows[0] });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'server_error';
        console.error('Error updating subscription:', err);
        return res.status(500).json({ error: message });
    }
};
exports.updateSubscription = updateSubscription;
const deleteSubscription = async (req, res) => {
    const { id } = req.params;
    try {
        const query = 'DELETE FROM subscriptions WHERE id = $1 RETURNING id';
        const result = await db_1.pool.query(query, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'subscription_not_found' });
        }
        return res.status(200).json({ message: 'subscription_deleted', id: result.rows[0].id });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'server_error';
        console.error('Error deleting subscription:', err);
        return res.status(500).json({ error: message });
    }
};
exports.deleteSubscription = deleteSubscription;
