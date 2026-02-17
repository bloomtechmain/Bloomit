export type PTORequest = {
  id: number
  employee_id: number
  employee_name?: string
  employee_email?: string
  employee_phone?: string
  manager_id?: number
  manager_name?: string
  absence_type: string
  from_date: string
  to_date: string
  total_hours: number
  project_id?: number
  project_name?: string
  cover_person_id?: number
  cover_employee_name?: string
  cover_person_name?: string
  description?: string
  status: 'pending' | 'approved' | 'denied'
  manager_comments?: string
  approved_at?: string
  created_at: string
  updated_at: string
}

export type PTOStats = {
  approved_count: string
  pending_count: string
  denied_count: string
  total_approved_hours: string
  total_pending_hours: string
}

export const ABSENCE_TYPES = [
  'Sick',
  'Vacation',
  'Bereavement',
  'Time Off Without Pay',
  'Military',
  'Jury Duty',
  'Maternity/Paternity',
  'Other'
] as const

export type AbsenceType = typeof ABSENCE_TYPES[number]
