import { Request, Response } from 'express'
import { pool } from '../db'

export const getItemsByProject = async (req: Request, res: Response) => {
  const { id } = req.params
  try {
    const r = await pool.query('SELECT project_id, requirements, service_category, unit_cost, requirement_type FROM project_items WHERE project_id=$1 ORDER BY requirements DESC', [id])
    return res.json({ items: r.rows })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}

export const createItem = async (req: Request, res: Response) => {
  const { id } = req.params
  const { requirements, service_category, unit_cost, requirement_type } = req.body as { requirements?: string; service_category?: string; unit_cost?: number; requirement_type?: string }
  if (!requirements || !service_category || unit_cost === undefined || !requirement_type) return res.status(400).json({ error: 'missing_fields' })
  try {
    await pool.query('BEGIN')
    const insert = await pool.query(
      `INSERT INTO project_items(project_id, requirements, service_category, unit_cost, requirement_type)
       VALUES($1,$2,$3,$4,$5) RETURNING project_id, requirements, service_category, unit_cost, requirement_type`,
      [id, requirements, service_category, unit_cost, requirement_type]
    )
    if (requirement_type === 'Additional Requirement') {
      await pool.query('UPDATE projects SET extra_budget_allocation = extra_budget_allocation + $1 WHERE project_id = $2', [unit_cost, id])
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
  const { projectId, requirements } = req.params
  const { service_category, unit_cost, requirement_type } = req.body as { service_category?: string; unit_cost?: number; requirement_type?: string }
  if (!service_category || unit_cost === undefined || !requirement_type) return res.status(400).json({ error: 'missing_fields' })
  try {
    await pool.query('BEGIN')
    const existing = await pool.query('SELECT unit_cost, requirement_type FROM project_items WHERE project_id=$1 AND requirements=$2', [projectId, requirements])
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
      `UPDATE project_items SET service_category=$1, unit_cost=$2, requirement_type=$3 WHERE project_id=$4 AND requirements=$5 RETURNING project_id, requirements, service_category, unit_cost, requirement_type`,
      [service_category, unit_cost, requirement_type, projectId, requirements]
    )
    if (delta !== 0) {
      await pool.query('UPDATE projects SET extra_budget_allocation = extra_budget_allocation + $1 WHERE project_id = $2', [delta, projectId])
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
  const { projectId, requirements } = req.params
  try {
    await pool.query('BEGIN')
    const existing = await pool.query('SELECT unit_cost, requirement_type FROM project_items WHERE project_id=$1 AND requirements=$2', [projectId, requirements])
    if (!existing.rows.length) {
      await pool.query('ROLLBACK')
      return res.status(404).json({ error: 'item_not_found' })
    }
    const oldCost = Number(existing.rows[0].unit_cost || 0)
    const oldReqType = String(existing.rows[0].requirement_type || '')
    await pool.query('DELETE FROM project_items WHERE project_id=$1 AND requirements=$2', [projectId, requirements])
    if (oldReqType === 'Additional Requirement') {
      await pool.query('UPDATE projects SET extra_budget_allocation = extra_budget_allocation - $1 WHERE project_id = $2', [oldCost, projectId])
    }
    await pool.query('COMMIT')
    return res.json({ deleted: 1 })
  } catch (e) {
    await pool.query('ROLLBACK').catch(() => null)
    const message = e instanceof Error ? e.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}
