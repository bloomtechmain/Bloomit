import { Request, Response } from 'express'

type ProjectPayload = {
  project_name?: string
  project_description?: string
  status?: string
}

export const getAllProjects = async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT
        p.project_id,
        p.project_name,
        p.project_description,
        p.status,
        p.created_at,
        COUNT(c.contract_id) AS contract_count,
        COALESCE(SUM(c.initial_cost_budget + c.extra_budget_allocation), 0) AS total_budget
      FROM projects p
      LEFT JOIN contracts c ON p.project_id = c.project_id
      GROUP BY p.project_id, p.project_name, p.project_description, p.status, p.created_at
      ORDER BY p.project_id DESC
    `
    const result = await req.dbClient!.query(query)
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
      SELECT
        p.project_id,
        p.project_name,
        p.project_description,
        p.status,
        p.created_at,
        COUNT(c.contract_id) AS contract_count,
        COALESCE(SUM(c.initial_cost_budget + c.extra_budget_allocation), 0) AS total_budget
      FROM projects p
      LEFT JOIN contracts c ON p.project_id = c.project_id
      WHERE p.project_id = $1
      GROUP BY p.project_id, p.project_name, p.project_description, p.status, p.created_at
    `
    const result = await req.dbClient!.query(query, [id])
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
  const { project_name, project_description, status }: ProjectPayload = req.body ?? {}

  if (!project_name) {
    return res.status(400).json({ error: 'missing_fields' })
  }

  try {
    const query = `
      INSERT INTO projects (project_name, project_description, status)
      VALUES ($1, $2, $3)
      RETURNING project_id, project_name, project_description, status, created_at
    `
    const values = [project_name, project_description ?? null, status ?? 'active']
    const result = await req.dbClient!.query(query, values)
    return res.status(201).json({ project: result.rows[0] })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}

export const updateProject = async (req: Request, res: Response) => {
  const { id } = req.params
  const { project_name, project_description, status }: ProjectPayload = req.body ?? {}

  if (!project_name) {
    return res.status(400).json({ error: 'missing_fields' })
  }

  try {
    const query = `
      UPDATE projects
      SET project_name = $1, project_description = $2, status = $3
      WHERE project_id = $4
      RETURNING project_id, project_name, project_description, status, created_at
    `
    const values = [project_name, project_description ?? null, status ?? 'active', id]
    const result = await req.dbClient!.query(query, values)
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
    const result = await req.dbClient!.query(query, [id])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'project_not_found' })
    }
    return res.status(200).json({ message: 'project_deleted', project_id: result.rows[0].project_id })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}
