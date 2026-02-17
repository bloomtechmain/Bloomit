export interface Subscription {
  id: number
  description: string
  amount: number | string
  due_date: string
  frequency: 'MONTHLY' | 'YEARLY'
  auto_pay: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  yearly_cost: number | string
}
