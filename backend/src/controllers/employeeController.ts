import { Request, Response } from 'express'
import { pool } from '../db'

type EmployeePayload = {
  employee_number?: string
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  dob?: string
  nic?: string
  address?: string
  role?: string
  designation?: string
  tax?: string
}

export const getAllEmployees = async (req: Request, res: Response) => {
  const { tenantId } = req.user!;
  try {
    const query = `
      SELECT id as employee_id, employee_number, first_name, last_name, email, phone, dob, nic, address, role, designation, tax, created_at
      FROM employees
      WHERE tenant_id = $1
      ORDER BY created_at DESC
    `
    const result = await pool.query(query, [tenantId])
    return res.status(200).json({ employees: result.rows })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}

export const getEmployeeById = async (req: Request, res: Response) => {
  const { tenantId } = req.user!;
  const { id } = req.params
  try {
    const query = `
      SELECT id as employee_id, employee_number, first_name, last_name, email, phone, dob, nic, address, role, designation, tax, created_at
      FROM employees
      WHERE id = $1 AND tenant_id = $2
    `
    const result = await pool.query(query, [id, tenantId])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'employee_not_found' })
    }
    return res.status(200).json({ employee: result.rows[0] })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}

export const createEmployee = async (req: Request, res: Response) => {
  const { tenantId } = req.user!;
  const { employee_number, first_name, last_name, email, phone, dob, nic, address, role, designation, tax }: EmployeePayload = req.body ?? {}

  if (!employee_number || !first_name || !last_name || !email || !phone || !role) {
    return res.status(400).json({ error: 'missing_fields' })
  }

  try {
    const query = `
      INSERT INTO employees (employee_number, first_name, last_name, email, phone, dob, nic, address, role, designation, tax, tenant_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id as employee_id, employee_number, first_name, last_name, email, phone, dob, nic, address, role, designation, tax, created_at
    `
    const values = [employee_number, first_name, last_name, email, phone, dob || null, nic || null, address || null, role, designation || null, tax || null, tenantId]
    const result = await pool.query(query, values)
    return res.status(201).json({ employee: result.rows[0] })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}

export const updateEmployee = async (req: Request, res: Response) => {
  const { tenantId } = req.user!;
  const { id } = req.params
  const { employee_number, first_name, last_name, email, phone, dob, nic, address, role, designation, tax }: EmployeePayload = req.body ?? {}

  if (!employee_number || !first_name || !last_name || !email || !phone || !role) {
    return res.status(400).json({ error: 'missing_fields' })
  }

  try {
    const query = `
      UPDATE employees
      SET employee_number = $1, first_name = $2, last_name = $3, email = $4, phone = $5, dob = $6, nic = $7, address = $8, role = $9, designation = $10, tax = $11
      WHERE id = $12 AND tenant_id = $13
      RETURNING id as employee_id, employee_number, first_name, last_name, email, phone, dob, nic, address, role, designation, tax, created_at
    `
    const values = [employee_number, first_name, last_name, email, phone, dob || null, nic || null, address || null, role, designation || null, tax || null, id, tenantId]
    const result = await pool.query(query, values)
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'employee_not_found' })
    }
    return res.status(200).json({ employee: result.rows[0] })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}

export const deleteEmployee = async (req: Request, res: Response) => {
  const { tenantId } = req.user!;
  const { id } = req.params
  try {
    const query = `
      DELETE FROM employees
      WHERE id = $1 AND tenant_id = $2
      RETURNING id as employee_id
    `
    const result = await pool.query(query, [id, tenantId])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'employee_not_found' })
    }
    return res.status(200).json({ message: 'employee_deleted', employee_id: result.rows[0].employee_id })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}




