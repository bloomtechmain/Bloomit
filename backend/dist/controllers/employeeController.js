"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteEmployee = exports.updateEmployee = exports.createEmployee = exports.getEmployeeById = exports.getAllEmployees = void 0;
const db_1 = require("../db");
const getAllEmployees = async (req, res) => {
    try {
        const query = `
      SELECT id as employee_id, employee_number, first_name, last_name, email, phone, dob, nic, address, role, designation, tax, created_at
      FROM employees
      ORDER BY created_at DESC
    `;
        const result = await db_1.pool.query(query);
        return res.status(200).json({ employees: result.rows });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'server_error';
        return res.status(500).json({ error: message });
    }
};
exports.getAllEmployees = getAllEmployees;
const getEmployeeById = async (req, res) => {
    const { id } = req.params;
    try {
        const query = `
      SELECT id as employee_id, employee_number, first_name, last_name, email, phone, dob, nic, address, role, designation, tax, created_at
      FROM employees
      WHERE id = $1
    `;
        const result = await db_1.pool.query(query, [id]);
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
exports.getEmployeeById = getEmployeeById;
const createEmployee = async (req, res) => {
    const { employee_number, first_name, last_name, email, phone, dob, nic, address, role, designation, tax } = req.body ?? {};
    if (!employee_number || !first_name || !last_name || !email || !phone || !role) {
        return res.status(400).json({ error: 'missing_fields' });
    }
    try {
        const query = `
      INSERT INTO employees (employee_number, first_name, last_name, email, phone, dob, nic, address, role, designation, tax)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id as employee_id, employee_number, first_name, last_name, email, phone, dob, nic, address, role, designation, tax, created_at
    `;
        const values = [employee_number, first_name, last_name, email, phone, dob || null, nic || null, address || null, role, designation || null, tax || null];
        const result = await db_1.pool.query(query, values);
        return res.status(201).json({ employee: result.rows[0] });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'server_error';
        return res.status(500).json({ error: message });
    }
};
exports.createEmployee = createEmployee;
const updateEmployee = async (req, res) => {
    const { id } = req.params;
    const { employee_number, first_name, last_name, email, phone, dob, nic, address, role, designation, tax } = req.body ?? {};
    if (!employee_number || !first_name || !last_name || !email || !phone || !role) {
        return res.status(400).json({ error: 'missing_fields' });
    }
    try {
        const query = `
      UPDATE employees
      SET employee_number = $1, first_name = $2, last_name = $3, email = $4, phone = $5, dob = $6, nic = $7, address = $8, role = $9, designation = $10, tax = $11
      WHERE id = $12
      RETURNING id as employee_id, employee_number, first_name, last_name, email, phone, dob, nic, address, role, designation, tax, created_at
    `;
        const values = [employee_number, first_name, last_name, email, phone, dob || null, nic || null, address || null, role, designation || null, tax || null, id];
        const result = await db_1.pool.query(query, values);
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
exports.updateEmployee = updateEmployee;
const deleteEmployee = async (req, res) => {
    const { id } = req.params;
    try {
        const query = `
      DELETE FROM employees
      WHERE id = $1
      RETURNING id as employee_id
    `;
        const result = await db_1.pool.query(query, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'employee_not_found' });
        }
        return res.status(200).json({ message: 'employee_deleted', employee_id: result.rows[0].employee_id });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'server_error';
        return res.status(500).json({ error: message });
    }
};
exports.deleteEmployee = deleteEmployee;
