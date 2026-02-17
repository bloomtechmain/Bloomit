// Project Types
export type Project = {
  project_id: number
  project_name: string
  project_description: string
  status: 'active' | 'completed' | 'on-hold'
  contract_count?: number
  total_budget?: number
  created_at: string
  updated_at?: string
}

export type Contract = {
  contract_id: number
  project_id: number
  contract_name: string
  customer_name: string
  description?: string
  initial_cost_budget: number
  extra_budget_allocation: number
  total_budget?: number
  payment_type: 'Pending' | 'Partial' | 'Complete'
  status: 'ongoing' | 'completed' | 'paused'
  created_at: string
  updated_at?: string
}

export type ContractItem = {
  item_id?: number
  contract_id: number
  requirements: string
  service_category: string
  unit_cost: number
  requirement_type: 'Initial Requirement' | 'Additional Requirement'
  created_at?: string
}

export type BudgetInfo = {
  initial_cost_budget: number
  extra_budget_allocation: number
  total_items_cost: number
  total_budget: number
  remaining_budget: number
  budget_percentage: number
}
