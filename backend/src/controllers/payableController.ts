import { Request, Response } from 'express'

export const getAllPayables = async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT p.*, v.vendor_name, c.contract_name
      FROM payables p
      LEFT JOIN vendors v ON p.vendor_id = v.vendor_id
      LEFT JOIN contracts c ON p.contract_id = c.contract_id
      ORDER BY p.created_at DESC
    `
    const result = await req.dbClient!.query(query)
    return res.status(200).json({ payables: result.rows })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}

export const createPayable = async (req: Request, res: Response) => {
  const {
    vendor_id,
    payable_name,
    description,
    payable_type,
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

  // For PETTY_CASH, vendor_id is optional. payable_name defaults if missing.
  if ((!vendor_id && payable_type !== 'PETTY_CASH') || (!payable_name && payable_type !== 'PETTY_CASH') || !payable_type || !amount) {
    return res.status(400).json({ error: 'missing_fields' })
  }

  const finalPayableName = payable_name || (payable_type === 'PETTY_CASH' ? 'Petty Cash Expense' : '')

  const client = req.dbClient!
  try {
    await client.query('BEGIN')

    const query = `
      INSERT INTO payables (
        vendor_id, payable_name, description, payable_type, amount, frequency, start_date, end_date, contract_id, is_active,
        bank_account_id, payment_method, reference_number
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `
    const values = [
      vendor_id || null,
      finalPayableName,
      description || null,
      payable_type,
      amount,
      frequency || null,
      start_date || null,
      end_date || null,
      contract_id || null,
      is_active ?? true,
      bank_account_id || null,
      payment_method || null,
      reference_number || null
    ]
    const result = await client.query(query, values)
    const newPayable = result.rows[0]

    // Handle Petty Cash deduction
    if (payable_type === 'PETTY_CASH') {
      // Ensure account exists for trigger
      const pcCheck = await client.query('SELECT id FROM petty_cash_account LIMIT 1')
      let accountId;
      if (pcCheck.rows.length === 0) {
        const newAcc = await client.query("INSERT INTO petty_cash_account (account_name, current_balance) VALUES ('Petty Cash', 0) RETURNING id")
        accountId = newAcc.rows[0].id
      } else {
        accountId = pcCheck.rows[0].id
      }

      // Insert transaction (Trigger will reduce balance)
      await client.query(`
        INSERT INTO petty_cash_transactions (
          transaction_type, amount, description, payable_id, contract_id, transaction_date, petty_cash_account_id
        )
        VALUES ('EXPENSE', $1, $2, $3, $4, CURRENT_TIMESTAMP, $5)
      `, [amount, description || finalPayableName, newPayable.payable_id, contract_id || null, accountId])
    }

    // If payment details are provided, record in payable_payments and deduct from bank account
    if (bank_account_id || payment_method || reference_number) {
      const status = reference_number ? 'Paid' : 'Pending'

      await client.query(`
        INSERT INTO payment_payables (
          payable_id, payment_method, bank_account_id, payment_date, amount, reference_number, status
        )
        VALUES ($1, $2, $3, CURRENT_DATE, $4, $5, $6)
      `, [
        newPayable.payable_id,
        payment_method || null,
        bank_account_id || null,
        amount,
        reference_number || null,
        status
      ])

      // Deduct from bank account balance when a bank account is used
      if (bank_account_id) {
        await client.query(
          `UPDATE company_bank_accounts SET current_balance = current_balance - $1 WHERE id = $2`,
          [amount, bank_account_id]
        )
      }
    }

    await client.query('COMMIT')
    return res.status(201).json({ payable: newPayable })
  } catch (err: unknown) {
    await client.query('ROLLBACK')
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}
