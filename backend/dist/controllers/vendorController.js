"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createVendor = exports.getAllVendors = void 0;
const db_1 = require("../db");
const getAllVendors = async (req, res) => {
    try {
        const query = `
      SELECT vendor_id, vendor_name, contact_email, contact_phone, is_active, created_at
      FROM vendors
      ORDER BY created_at DESC
    `;
        const result = await db_1.pool.query(query);
        return res.status(200).json({ vendors: result.rows });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'server_error';
        return res.status(500).json({ error: message });
    }
};
exports.getAllVendors = getAllVendors;
const createVendor = async (req, res) => {
    const { vendor_name, contact_email, contact_phone, is_active } = req.body;
    if (!vendor_name) {
        return res.status(400).json({ error: 'missing_fields' });
    }
    try {
        const query = `
      INSERT INTO vendors (vendor_name, contact_email, contact_phone, is_active)
      VALUES ($1, $2, $3, $4)
      RETURNING vendor_id, vendor_name, contact_email, contact_phone, is_active, created_at
    `;
        const values = [vendor_name, contact_email || null, contact_phone || null, is_active ?? true];
        const result = await db_1.pool.query(query, values);
        return res.status(201).json({ vendor: result.rows[0] });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'server_error';
        return res.status(500).json({ error: message });
    }
};
exports.createVendor = createVendor;
