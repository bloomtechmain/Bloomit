// Time Entry Types

export type TimeEntryStatus = 'pending' | 'approved' | 'rejected'

export type TimeEntry = {
  id: number
  employee_id: number
  employee_name?: string
  employee_email?: string
  project_id: number
  project_name?: string
  contract_id?: number | null
  contract_name?: string | null
  date: string
  clock_in?: string | null
  clock_out?: string | null
  total_hours?: number | null
  break_time_minutes: number
  description?: string | null
  status: TimeEntryStatus
  approved_by?: number | null
  approved_by_name?: string | null
  approved_at?: string | null
  rejection_note?: string | null
  is_timer_based: boolean
  created_at: string
  updated_at: string
}

export type ActiveTimer = {
  id: number
  employee_id: number
  time_entry_id: number
  started_at: string
  is_on_break: boolean
  total_break_time_minutes: number
  last_break_start?: string | null
  project_id?: number
  project_name?: string
  contract_id?: number | null
  contract_name?: string | null
  description?: string | null
}

export type TimeSummary = {
  byProject: ProjectTimeSummary[]
  byEmployee: EmployeeTimeSummary[]
  overall: OverallTimeSummary
}

export type ProjectTimeSummary = {
  project_id: number
  project_name: string
  total_hours: string
  total_break_minutes: string
  entry_count: string
}

export type EmployeeTimeSummary = {
  employee_id: number
  employee_name: string
  total_hours: string
  total_break_minutes: string
  entry_count: string
}

export type OverallTimeSummary = {
  total_hours: string
  total_break_minutes: string
  total_entries: string
  avg_hours_per_entry: string
}
