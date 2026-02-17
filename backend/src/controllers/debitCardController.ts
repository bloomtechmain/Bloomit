import { Request, Response } from 'express'
import { pool } from '../db'

type CreateDebitCardPayload = {
  bank_account_id?: number
  card_number_last4?: string
  card_holder_name?: string
  expiry_date?: string
  is_active?: boolean
}

export const createDebitCard = async (req: Request, res: Response) => {
  const { bank_account_id, card_number_last4, card_holder_name, expiry_date, is_active }: CreateDebitCardPayload = req.body ?? {}

  if (!bank_account_id || !card_number_last4 || !card_holder_name || !expiry_date || is_active === undefined) {
    return res.status(400).json({ error: 'missing_fields' })
  }
  if (!/^\d{4}$/.test(String(card_number_last4))) {
    return res.status(400).json({ error: 'invalid_card_last4' })
  }
  const expStr = String(expiry_date)
  const expMonthMatch = expStr.match(/^\d{4}-\d{2}$/)
  const expFullMatch = expStr.match(/^\d{4}-\d{2}-\d{2}$/)
  const expDateStr = expMonthMatch ? `${expStr}-01` : expStr
  const expDateCheck = new Date(expDateStr)
  if (!expFullMatch && !expMonthMatch) {
    return res.status(400).json({ error: 'invalid_expiry_date_format' })
  }
  if (Number.isNaN(expDateCheck.getTime())) {
    return res.status(400).json({ error: 'invalid_expiry_date' })
  }

  try {
    const acc = await pool.query('SELECT id FROM company_bank_accounts WHERE id=$1', [bank_account_id])
    if (!acc.rows.length) {
      return res.status(404).json({ error: 'bank_account_not_found' })
    }
    const r = await pool.query(
      `INSERT INTO debit_cards (bank_account_id, card_number_last4, card_holder_name, expiry_date, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, bank_account_id, card_number_last4, card_holder_name, expiry_date, is_active, created_at`,
      [bank_account_id, String(card_number_last4), String(card_holder_name), expDateStr, Boolean(is_active)]
    )
    return res.status(201).json({ card: r.rows[0] })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}

export const getDebitCards = async (req: Request, res: Response) => {
  try {
    const r = await pool.query(
      `SELECT id, bank_account_id, card_number_last4, card_holder_name, expiry_date, is_active, created_at
       FROM debit_cards
       ORDER BY created_at DESC`
    )
    return res.json({ cards: r.rows })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}
