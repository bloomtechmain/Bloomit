import { Request, Response } from 'express'
import { pool } from '../db'

type ProjectPayload = {
  project_name?: string
  customer_name?: string
  description?: string
  initial_cost_budget?: number
  extra_budget_allocation?: number
  payment_type?: string
  status?: string
}

export const getAllProjects = async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT project_id, projects_name AS project_name, customer_name, description, initial_cost_budget, extra_budget_allocation, payment_type, status AS status
      FROM projects
      ORDER BY project_id DESC
    `
    const result = await pool.query(query)
    return res.status(200).json({ projects: result.rows })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}

export const getProjectById = async (req: Request, res: Response) => {
  const { id } = req.params
  try {
    const query = `
      SELECT project_id, projects_name AS project_name, customer_name, description, initial_cost_budget, extra_budget_allocation, payment_type, status
      FROM projects
      WHERE project_id = $1
    `
    const result = await pool.query(query, [id])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'project_not_found' })
    }
    return res.status(200).json({ project: result.rows[0] })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}

export const createProject = async (req: Request, res: Response) => {
  const { project_name, customer_name, description, initial_cost_budget, extra_budget_allocation, payment_type, status }: ProjectPayload = req.body ?? {}

  if (!project_name || !customer_name || initial_cost_budget === undefined || extra_budget_allocation === undefined || !payment_type || !status) {
    return res.status(400).json({ error: 'missing_fields' })
  }

  try {
    const query = `
      INSERT INTO projects (projects_name, customer_name, description, initial_cost_budget, extra_budget_allocation, payment_type, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING project_id, projects_name AS project_name, customer_name, description, initial_cost_budget, extra_budget_allocation, payment_type, status AS status
    `
    const values = [project_name, customer_name, description ?? null, initial_cost_budget, extra_budget_allocation, payment_type, status]
    const result = await pool.query(query, values)
    return res.status(201).json({ project: result.rows[0] })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}

export const updateProject = async (req: Request, res: Response) => {
  const { id } = req.params
  const { project_name, customer_name, description, initial_cost_budget, extra_budget_allocation, payment_type, status }: ProjectPayload = req.body ?? {}

  if (!project_name || !customer_name || initial_cost_budget === undefined || extra_budget_allocation === undefined || !payment_type || !status) {
    return res.status(400).json({ error: 'missing_fields' })
  }

  try {
    const query = `
      UPDATE projects
      SET projects_name = $1, customer_name = $2, description = $3, initial_cost_budget = $4, extra_budget_allocation = $5, payment_type = $6, status = $7
      WHERE project_id = $8
      RETURNING project_id, projects_name AS project_name, customer_name, description, initial_cost_budget, extra_budget_allocation, payment_type, status
    `
    const values = [project_name, customer_name, description ?? null, initial_cost_budget, extra_budget_allocation, payment_type, status, id]
    const result = await pool.query(query, values)
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'project_not_found' })
    }
    return res.status(200).json({ project: result.rows[0] })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}

export const deleteProject = async (req: Request, res: Response) => {
  const { id } = req.params
  try {
    const query = `
      DELETE FROM projects
      WHERE project_id = $1
      RETURNING project_id
    `
    const result = await pool.query(query, [id])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'project_not_found' })
    }
    return res.status(200).json({ message: 'project_deleted', project_id: result.rows[0].project_id })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}


