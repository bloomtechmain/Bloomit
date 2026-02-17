import { Request, Response } from 'express'
import { pool } from '../db'

export const getAllVendors = async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT vendor_id, vendor_name, contact_email, contact_phone, is_active, created_at
      FROM vendors
      ORDER BY created_at DESC
    `
    const result = await pool.query(query)
    return res.status(200).json({ vendors: result.rows })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}

export const createVendor = async (req: Request, res: Response) => {
  const { vendor_name, contact_email, contact_phone, is_active } = req.body

  if (!vendor_name) {
    return res.status(400).json({ error: 'missing_fields' })
  }

  try {
    const query = `
      INSERT INTO vendors (vendor_name, contact_email, contact_phone, is_active)
      VALUES ($1, $2, $3, $4)
      RETURNING vendor_id, vendor_name, contact_email, contact_phone, is_active, created_at
    `
    const values = [vendor_name, contact_email || null, contact_phone || null, is_active ?? true]
    const result = await pool.query(query, values)
    return res.status(201).json({ vendor: result.rows[0] })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}
