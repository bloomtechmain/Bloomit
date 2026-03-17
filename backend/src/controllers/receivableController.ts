import { Request, Response } from 'express'

export const getReceivables = async (req: Request, res: Response) => {
  try {
    const result = await req.dbClient!.query(`
      SELECT r.*, c.contract_name, bk.bank_name, b.account_number
      FROM receivables r
      LEFT JOIN contracts c ON r.contract_id = c.contract_id
      LEFT JOIN company_bank_accounts b ON r.bank_account_id = b.id
      LEFT JOIN banks bk ON b.bank_id = bk.id
      ORDER BY r.created_at DESC
    `)
    res.json({ receivables: result.rows })
  } catch (error) {
    console.error('Error fetching receivables:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const createReceivable = async (req: Request, res: Response) => {
  const {
    payer_name,
    receivable_name,
    description,
    receivable_type,
    amount,
    frequency,
    start_date,
    end_date,
    contract_id,
    is_active,
    bank_account_id,
    payment_method,
    reference_number
  } = req.body

  const client = req.dbClient!
  try {
    await client.query('BEGIN')

    const result = await client.query(
      `INSERT INTO receivables (
        payer_name, receivable_name, description, receivable_type, amount,
        frequency, start_date, end_date, contract_id, is_active,
        bank_account_id, payment_method, reference_number
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
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
      ]
    )

    // Credit the bank account balance when payment is received into an account
    if (bank_account_id && amount) {
      await client.query(
        `UPDATE company_bank_accounts SET current_balance = current_balance + $1 WHERE id = $2`,
        [amount, bank_account_id]
      )
    }

    await client.query('COMMIT')
    res.status(201).json(result.rows[0])
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error creating receivable:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
