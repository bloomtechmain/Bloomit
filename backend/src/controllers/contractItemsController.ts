import { Request, Response } from 'express'
import { pool } from '../db'

export const getItemsByContract = async (req: Request, res: Response) => {
  const { contractId } = req.params
  try {
    const query = `
      SELECT 
        contract_id, 
        requirements, 
        service_category, 
        unit_cost, 
        requirement_type 
      FROM contract_items 
      WHERE contract_id = $1 
      ORDER BY requirements DESC
    `
    const result = await pool.query(query, [contractId])
    
    // Also get the contract budget info
    const budgetQuery = `
      SELECT 
        initial_cost_budget, 
        extra_budget_allocation,
        (initial_cost_budget + extra_budget_allocation) AS total_budget
      FROM contracts 
      WHERE contract_id = $1
    `
    const budgetResult = await pool.query(budgetQuery, [contractId])
    
    // Calculate total items cost
    const totalItemsCost = result.rows.reduce((sum, item) => sum + Number(item.unit_cost || 0), 0)
    
    return res.json({ 
      items: result.rows,
      budget: budgetResult.rows[0] || null,
      total_items_cost: totalItemsCost
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}

export const createItem = async (req: Request, res: Response) => {
  const { contractId } = req.params
  const { requirements, service_category, unit_cost, requirement_type } = req.body as { 
    requirements?: string
    service_category?: string
    unit_cost?: number
    requirement_type?: string 
  }
  
  if (!requirements || !service_category || unit_cost === undefined || !requirement_type) {
    return res.status(400).json({ error: 'missing_fields' })
  }
  
  try {
    await pool.query('BEGIN')
    
    const insert = await pool.query(
      `INSERT INTO contract_items(contract_id, requirements, service_category, unit_cost, requirement_type)
       VALUES($1, $2, $3, $4, $5) 
       RETURNING contract_id, requirements, service_category, unit_cost, requirement_type`,
      [contractId, requirements, service_category, unit_cost, requirement_type]
    )
    
    if (requirement_type === 'Additional Requirement') {
      await pool.query(
        'UPDATE contracts SET extra_budget_allocation = extra_budget_allocation + $1 WHERE contract_id = $2', 
        [unit_cost, contractId]
      )
    }
    
    await pool.query('COMMIT')
    return res.status(201).json({ item: insert.rows[0] })
  } catch (e) {
    await pool.query('ROLLBACK').catch(() => null)
    const message = e instanceof Error ? e.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}

export const updateItem = async (req: Request, res: Response) => {
  const { contractId, requirements } = req.params
  const { service_category, unit_cost, requirement_type } = req.body as { 
    service_category?: string
    unit_cost?: number
    requirement_type?: string 
  }
  
  if (!service_category || unit_cost === undefined || !requirement_type) {
    return res.status(400).json({ error: 'missing_fields' })
  }
  
  try {
    await pool.query('BEGIN')
    
    const existing = await pool.query(
      'SELECT unit_cost, requirement_type FROM contract_items WHERE contract_id=$1 AND requirements=$2', 
      [contractId, requirements]
    )
    
    if (!existing.rows.length) {
      await pool.query('ROLLBACK')
      return res.status(404).json({ error: 'item_not_found' })
    }
    
    const oldCost = Number(existing.rows[0].unit_cost || 0)
    const oldReqType = String(existing.rows[0].requirement_type || '')
    const newCost = Number(unit_cost)
    
    const oldContribution = oldReqType === 'Additional Requirement' ? oldCost : 0
    const newContribution = requirement_type === 'Additional Requirement' ? newCost : 0
    const delta = newContribution - oldContribution
    
    const updated = await pool.query(
      `UPDATE contract_items 
       SET service_category=$1, unit_cost=$2, requirement_type=$3 
       WHERE contract_id=$4 AND requirements=$5 
       RETURNING contract_id, requirements, service_category, unit_cost, requirement_type`,
      [service_category, unit_cost, requirement_type, contractId, requirements]
    )
    
    if (delta !== 0) {
      await pool.query(
        'UPDATE contracts SET extra_budget_allocation = extra_budget_allocation + $1 WHERE contract_id = $2', 
        [delta, contractId]
      )
    }
    
    await pool.query('COMMIT')
    return res.json({ item: updated.rows[0] })
  } catch (e) {
    await pool.query('ROLLBACK').catch(() => null)
    const message = e instanceof Error ? e.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}

export const deleteItem = async (req: Request, res: Response) => {
  const { contractId, requirements } = req.params
  
  try {
    await pool.query('BEGIN')
    
    const existing = await pool.query(
      'SELECT unit_cost, requirement_type FROM contract_items WHERE contract_id=$1 AND requirements=$2', 
      [contractId, requirements]
    )
    
    if (!existing.rows.length) {
      await pool.query('ROLLBACK')
      return res.status(404).json({ error: 'item_not_found' })
    }
    
    const oldCost = Number(existing.rows[0].unit_cost || 0)
    const oldReqType = String(existing.rows[0].requirement_type || '')
    
    await pool.query(
      'DELETE FROM contract_items WHERE contract_id=$1 AND requirements=$2', 
      [contractId, requirements]
    )
    
    if (oldReqType === 'Additional Requirement') {
      await pool.query(
        'UPDATE contracts SET extra_budget_allocation = extra_budget_allocation - $1 WHERE contract_id = $2', 
        [oldCost, contractId]
      )
    }
    
    await pool.query('COMMIT')
    return res.json({ deleted: 1 })
  } catch (e) {
    await pool.query('ROLLBACK').catch(() => null)
    const message = e instanceof Error ? e.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}
