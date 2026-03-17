import { Request, Response } from 'express'

type ContractPayload = {
  contract_name?: string
  customer_name?: string
  description?: string
  initial_cost_budget?: number
  extra_budget_allocation?: number
  payment_type?: string
  status?: string
}

export const getContractsByProject = async (req: Request, res: Response) => {
  const { projectId } = req.params
  try {
    const query = `
      SELECT
        contract_id,
        project_id,
        contract_name,
        customer_name,
        description,
        initial_cost_budget,
        extra_budget_allocation,
        payment_type,
        status,
        created_at,
        (initial_cost_budget + extra_budget_allocation) AS total_budget
      FROM contracts
      WHERE project_id = $1
      ORDER BY contract_id DESC
    `
    const result = await req.dbClient!.query(query, [projectId])
    return res.status(200).json({ contracts: result.rows })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}

export const getContractById = async (req: Request, res: Response) => {
  const { projectId, contractId } = req.params
  try {
    const query = `
      SELECT
        contract_id,
        project_id,
        contract_name,
        customer_name,
        description,
        initial_cost_budget,
        extra_budget_allocation,
        payment_type,
        status,
        created_at,
        (initial_cost_budget + extra_budget_allocation) AS total_budget
      FROM contracts
      WHERE contract_id = $1 AND project_id = $2
    `
    const result = await req.dbClient!.query(query, [contractId, projectId])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'contract_not_found' })
    }
    return res.status(200).json({ contract: result.rows[0] })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}

export const createContract = async (req: Request, res: Response) => {
  const { projectId } = req.params
  const {
    contract_name,
    customer_name,
    description,
    initial_cost_budget,
    extra_budget_allocation,
    payment_type,
    status
  }: ContractPayload = req.body ?? {}

  if (!contract_name || !customer_name || initial_cost_budget === undefined || extra_budget_allocation === undefined || !payment_type || !status) {
    return res.status(400).json({ error: 'missing_fields' })
  }

  try {
    const query = `
      INSERT INTO contracts (project_id, contract_name, customer_name, description, initial_cost_budget, extra_budget_allocation, payment_type, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING
        contract_id,
        project_id,
        contract_name,
        customer_name,
        description,
        initial_cost_budget,
        extra_budget_allocation,
        payment_type,
        status,
        created_at,
        (initial_cost_budget + extra_budget_allocation) AS total_budget
    `
    const values = [projectId, contract_name, customer_name, description ?? null, initial_cost_budget, extra_budget_allocation, payment_type, status]
    const result = await req.dbClient!.query(query, values)
    return res.status(201).json({ contract: result.rows[0] })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}

export const updateContract = async (req: Request, res: Response) => {
  const { projectId, contractId } = req.params
  const {
    contract_name,
    customer_name,
    description,
    initial_cost_budget,
    extra_budget_allocation,
    payment_type,
    status
  }: ContractPayload = req.body ?? {}

  if (!contract_name || !customer_name || initial_cost_budget === undefined || extra_budget_allocation === undefined || !payment_type || !status) {
    return res.status(400).json({ error: 'missing_fields' })
  }

  try {
    const query = `
      UPDATE contracts
      SET
        contract_name = $1,
        customer_name = $2,
        description = $3,
        initial_cost_budget = $4,
        extra_budget_allocation = $5,
        payment_type = $6,
        status = $7
      WHERE contract_id = $8 AND project_id = $9
      RETURNING
        contract_id,
        project_id,
        contract_name,
        customer_name,
        description,
        initial_cost_budget,
        extra_budget_allocation,
        payment_type,
        status,
        created_at,
        (initial_cost_budget + extra_budget_allocation) AS total_budget
    `
    const values = [contract_name, customer_name, description ?? null, initial_cost_budget, extra_budget_allocation, payment_type, status, contractId, projectId]
    const result = await req.dbClient!.query(query, values)
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'contract_not_found' })
    }
    return res.status(200).json({ contract: result.rows[0] })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}

export const deleteContract = async (req: Request, res: Response) => {
  const { projectId, contractId } = req.params
  try {
    const query = `
      DELETE FROM contracts
      WHERE contract_id = $1 AND project_id = $2
      RETURNING contract_id
    `
    const result = await req.dbClient!.query(query, [contractId, projectId])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'contract_not_found' })
    }
    return res.status(200).json({ message: 'contract_deleted', contract_id: result.rows[0].contract_id })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}
