import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, Users, DollarSign, Building2, Calendar, Search } from 'lucide-react'
import { API_URL } from '../config/api'

interface MonthlySummary {
  total_employees: string
  total_basic_salary: string
  total_gross_salary: string
  total_deductions: string
  total_net_salary: string
  total_epf_employer: string
  total_etf_employer: string
  total_payroll_cost: string
}

interface DepartmentBreakdown {
  employee_department: string
  employee_count: string
  total_gross: string
  total_net: string
}

interface MonthlyReport {
  summary: MonthlySummary
  by_department: DepartmentBreakdown[]
}

interface Employee {
  employee_id: number
  name: string
  email: string
  employee_department: string
}

interface PayrollHistoryItem {
  payslip_id: number
  payslip_month: number
  payslip_year: number
  basic_salary: string
  gross_salary: string
  net_salary: string
  total_deductions: string
  status: string
}

interface YTDTotals {
  ytd_gross: string
  ytd_net: string
  ytd_deductions: string
  ytd_epf_employee: string
  ytd_epf_employer: string
  ytd_etf_employer: string
}

interface EmployeeHistory {
  payslips: PayrollHistoryItem[]
  ytd_totals: YTDTotals
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const card: React.CSSProperties = {
  background: '#fff',
  border: '1.5px solid #e2e8f0',
  borderRadius: 12,
  padding: 24,
  boxShadow: '0 2px 8px rgba(15,23,42,0.06)',
}

const inp: React.CSSProperties = {
  padding: '10px 14px',
  border: '1.5px solid #e2e8f0',
  borderRadius: 10,
  fontSize: 13.5,
  background: '#f8fafc',
  outline: 'none',
  transition: 'all 0.2s',
  fontFamily: 'inherit',
  color: '#1e293b',
}

const fo = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.target.style.borderColor = '#3b82f6'
  e.target.style.background = '#fff'
  e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)'
}
const bl = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.target.style.borderColor = '#e2e8f0'
  e.target.style.background = '#f8fafc'
  e.target.style.boxShadow = 'none'
}

const formatCurrency = (amount: string | number) => {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0)
}

export default function PayrollReports() {
  const [activeTab, setActiveTab] = useState<'monthly' | 'employee'>('monthly')

  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1)
  const [monthlyReport, setMonthlyReport] = useState<MonthlyReport | null>(null)
  const [loadingMonthly, setLoadingMonthly] = useState(false)

  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null)
  const [employeeHistory, setEmployeeHistory] = useState<EmployeeHistory | null>(null)
  const [loadingEmployees, setLoadingEmployees] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i)

  useEffect(() => { fetchEmployees() }, [])
  useEffect(() => { if (activeTab === 'monthly') fetchMonthlyReport() }, [selectedYear, selectedMonth, activeTab])
  useEffect(() => { if (selectedEmployee && activeTab === 'employee') fetchEmployeeHistory(selectedEmployee) }, [selectedEmployee, activeTab])

  const fetchEmployees = async () => {
    try {
      setLoadingEmployees(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/payroll/employees`, { headers: { Authorization: `Bearer ${token}` } })
      if (response.ok) {
        const data = await response.json()
        setEmployees(data.employees)
        if (data.employees.length > 0) setSelectedEmployee(data.employees[0].employee_id)
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
    } finally {
      setLoadingEmployees(false)
    }
  }

  const fetchMonthlyReport = async () => {
    try {
      setLoadingMonthly(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/payroll/reports/monthly?year=${selectedYear}&month=${selectedMonth}`, { headers: { Authorization: `Bearer ${token}` } })
      setMonthlyReport(response.ok ? (await response.json()) : null)
    } catch (error) {
      console.error('Error fetching monthly report:', error)
      setMonthlyReport(null)
    } finally {
      setLoadingMonthly(false)
    }
  }

  const fetchEmployeeHistory = async (employeeId: number) => {
    try {
      setLoadingHistory(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/payroll/reports/employee/${employeeId}/history`, { headers: { Authorization: `Bearer ${token}` } })
      setEmployeeHistory(response.ok ? (await response.json()) : null)
    } catch (error) {
      console.error('Error fetching employee history:', error)
      setEmployeeHistory(null)
    } finally {
      setLoadingHistory(false)
    }
  }

  const filteredEmployees = employees.filter(emp => {
    const s = searchTerm.toLowerCase()
    return emp.name.toLowerCase().includes(s) || emp.email.toLowerCase().includes(s) || (emp.employee_department && emp.employee_department.toLowerCase().includes(s))
  })

  return (
    <div style={{ width: '100%', display: 'grid', gap: 20 }}>
      {/* Tab Selector */}
      <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: 8, display: 'flex', gap: 6, boxShadow: '0 2px 8px rgba(15,23,42,0.06)' }}>
        {([
          { key: 'monthly', label: 'Monthly Summary', icon: <BarChart3 size={15} /> },
          { key: 'employee', label: 'Employee History', icon: <Users size={15} /> },
        ] as { key: 'monthly' | 'employee'; label: string; icon: React.ReactNode }[]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px 16px', borderRadius: 9, border: 'none', background: activeTab === tab.key ? '#3b82f6' : '#f1f5f9', color: activeTab === tab.key ? '#fff' : '#64748b', cursor: 'pointer', fontWeight: 600, fontSize: 13.5, transition: 'all 0.2s', boxShadow: activeTab === tab.key ? '0 2px 8px rgba(59,130,246,0.3)' : 'none' }}
            onMouseEnter={e => { if (activeTab !== tab.key) e.currentTarget.style.background = '#e2e8f0' }}
            onMouseLeave={e => { if (activeTab !== tab.key) e.currentTarget.style.background = '#f1f5f9' }}
          >
            {tab.icon}<span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Monthly Summary Tab */}
      {activeTab === 'monthly' && (
        <div style={{ display: 'grid', gap: 20 }}>
          {/* Period Selector */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Calendar size={13} color="#3b82f6" />
              </div>
              <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>Select Period</span>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} style={{ ...inp, flex: 1, appearance: 'none', cursor: 'pointer' }} onFocus={fo} onBlur={bl}>
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
              <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} style={{ ...inp, flex: 1, appearance: 'none', cursor: 'pointer' }} onFocus={fo} onBlur={bl}>
                {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {loadingMonthly ? (
            <div style={{ ...card, padding: 40, textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: 14 }}>Loading report...</p>
            </div>
          ) : !monthlyReport || monthlyReport.summary.total_employees === '0' ? (
            <div style={{ ...card, padding: 40, textAlign: 'center' }}>
              <BarChart3 size={48} style={{ color: '#cbd5e1', marginBottom: 12 }} />
              <h3 style={{ margin: '0 0 6px', color: '#475569' }}>No Data Available</h3>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: 13.5 }}>No completed payslips found for {MONTHS[selectedMonth - 1]} {selectedYear}</p>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                {[
                  { icon: <Users size={22} color="#3b82f6" />, label: 'Total Employees', value: monthlyReport.summary.total_employees, color: '#3b82f6', bg: 'rgba(59,130,246,0.06)', isCurrency: false },
                  { icon: <DollarSign size={22} color="#8b5cf6" />, label: 'Gross Salary', value: monthlyReport.summary.total_gross_salary, color: '#8b5cf6', bg: 'rgba(139,92,246,0.06)', isCurrency: true },
                  { icon: <TrendingUp size={22} color="#10b981" />, label: 'Net Salary', value: monthlyReport.summary.total_net_salary, color: '#10b981', bg: 'rgba(16,185,129,0.06)', isCurrency: true },
                  { icon: <BarChart3 size={22} color="#f59e0b" />, label: 'Total Payroll Cost', value: monthlyReport.summary.total_payroll_cost, color: '#f59e0b', bg: 'rgba(245,158,11,0.06)', isCurrency: true },
                ].map(stat => (
                  <div key={stat.label} style={{ background: stat.bg, border: '1.5px solid #e2e8f0', borderRadius: 12, padding: 20, textAlign: 'center' }}>
                    <div style={{ marginBottom: 8 }}>{stat.icon}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4, fontWeight: 500 }}>{stat.label}</div>
                    <div style={{ fontSize: stat.isCurrency ? 20 : 28, fontWeight: 700, color: stat.color }}>
                      {stat.isCurrency ? formatCurrency(stat.value) : stat.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Detailed Breakdown */}
              <div style={card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BarChart3 size={13} color="#3b82f6" />
                  </div>
                  <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>Detailed Breakdown</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                  {[
                    { label: 'Basic Salary', value: monthlyReport.summary.total_basic_salary },
                    { label: 'Total Deductions', value: monthlyReport.summary.total_deductions },
                    { label: 'EPF Employer Contribution', value: monthlyReport.summary.total_epf_employer },
                    { label: 'ETF Employer Contribution', value: monthlyReport.summary.total_etf_employer },
                  ].map(item => (
                    <div key={item.label} style={{ padding: 14, background: '#f8fafc', borderRadius: 10, border: '1px solid #f1f5f9' }}>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>{item.label}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>{formatCurrency(item.value)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Department Breakdown */}
              {monthlyReport.by_department.length > 0 && (
                <div style={card}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Building2 size={13} color="#6366f1" />
                    </div>
                    <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>Department Breakdown</span>
                  </div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 12, padding: '10px 16px', background: '#f8fafc', borderRadius: 8, fontSize: 11.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <div>Department</div>
                      <div style={{ textAlign: 'center' }}>Employees</div>
                      <div style={{ textAlign: 'right' }}>Gross</div>
                      <div style={{ textAlign: 'right' }}>Net</div>
                    </div>
                    {monthlyReport.by_department.map((dept, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 12, padding: '13px 16px', background: '#fff', border: '1.5px solid #f1f5f9', borderRadius: 9, alignItems: 'center', fontSize: 13.5, transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fafcff' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#f1f5f9'; e.currentTarget.style.background = '#fff' }}
                      >
                        <div style={{ fontWeight: 700, color: '#1e293b' }}>{dept.employee_department || 'Unassigned'}</div>
                        <div style={{ textAlign: 'center', color: '#64748b', fontWeight: 600 }}>{dept.employee_count}</div>
                        <div style={{ textAlign: 'right', fontWeight: 500, color: '#374151' }}>{formatCurrency(dept.total_gross)}</div>
                        <div style={{ textAlign: 'right', fontWeight: 700, color: '#059669' }}>{formatCurrency(dept.total_net)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Employee History Tab */}
      {activeTab === 'employee' && (
        <div style={{ display: 'grid', gap: 20 }}>
          {/* Employee Selector */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={13} color="#3b82f6" />
              </div>
              <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>Select Employee</span>
            </div>

            <div style={{ position: 'relative', marginBottom: 10 }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ ...inp, width: '100%', paddingLeft: 34, boxSizing: 'border-box' as const }}
                onFocus={fo}
                onBlur={bl}
              />
            </div>

            {loadingEmployees ? (
              <div style={{ padding: 16, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>Loading employees...</div>
            ) : (
              <select
                value={selectedEmployee || ''}
                onChange={e => setSelectedEmployee(parseInt(e.target.value))}
                style={{ ...inp, width: '100%', appearance: 'none', cursor: 'pointer', boxSizing: 'border-box' as const }}
                onFocus={fo}
                onBlur={bl}
              >
                <option value="">Select an employee...</option>
                {filteredEmployees.map(emp => (
                  <option key={emp.employee_id} value={emp.employee_id}>
                    {emp.name}{emp.employee_department ? ` — ${emp.employee_department}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedEmployee && (
            <>
              {loadingHistory ? (
                <div style={{ ...card, padding: 40, textAlign: 'center' }}>
                  <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: 14 }}>Loading history...</p>
                </div>
              ) : !employeeHistory || employeeHistory.payslips.length === 0 ? (
                <div style={{ ...card, padding: 40, textAlign: 'center' }}>
                  <Users size={48} style={{ color: '#cbd5e1', marginBottom: 12 }} />
                  <h3 style={{ margin: '0 0 6px', color: '#475569' }}>No Payroll History</h3>
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: 13.5 }}>No payslips found for this employee.</p>
                </div>
              ) : (
                <>
                  {/* YTD Summary */}
                  {employeeHistory.ytd_totals && (
                    <div style={card}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                        <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <TrendingUp size={13} color="#f59e0b" />
                        </div>
                        <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>Year-to-Date Totals ({currentYear})</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                        {[
                          { label: 'YTD Gross', value: employeeHistory.ytd_totals.ytd_gross, bg: '#f0f9ff', color: '#0369a1' },
                          { label: 'YTD Net', value: employeeHistory.ytd_totals.ytd_net, bg: '#f0fdf4', color: '#16a34a' },
                          { label: 'YTD Deductions', value: employeeHistory.ytd_totals.ytd_deductions, bg: '#fff1f2', color: '#dc2626' },
                          { label: 'YTD EPF (Employee)', value: employeeHistory.ytd_totals.ytd_epf_employee, bg: '#fefce8', color: '#ca8a04' },
                        ].map(item => (
                          <div key={item.label} style={{ padding: 14, background: item.bg, borderRadius: 10, textAlign: 'center', border: '1px solid #f1f5f9' }}>
                            <div style={{ fontSize: 11.5, color: '#64748b', marginBottom: 4, fontWeight: 500 }}>{item.label}</div>
                            <div style={{ fontSize: 17, fontWeight: 700, color: item.color }}>{formatCurrency(item.value)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Payroll History Table */}
                  <div style={card}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                      <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <BarChart3 size={13} color="#3b82f6" />
                      </div>
                      <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>Payroll History</span>
                    </div>
                    <div style={{ display: 'grid', gap: 8 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 12, padding: '10px 16px', background: '#f8fafc', borderRadius: 8, fontSize: 11.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <div>Period</div>
                        <div style={{ textAlign: 'right' }}>Basic</div>
                        <div style={{ textAlign: 'right' }}>Gross</div>
                        <div style={{ textAlign: 'right' }}>Deductions</div>
                        <div style={{ textAlign: 'right' }}>Net</div>
                      </div>
                      {employeeHistory.payslips.map(payslip => (
                        <div
                          key={payslip.payslip_id}
                          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 12, padding: '13px 16px', background: '#fff', border: '1.5px solid #f1f5f9', borderRadius: 9, alignItems: 'center', fontSize: 13.5, transition: 'all 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fafcff' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = '#f1f5f9'; e.currentTarget.style.background = '#fff' }}
                        >
                          <div style={{ fontWeight: 700, color: '#1e293b' }}>{MONTHS[payslip.payslip_month - 1]} {payslip.payslip_year}</div>
                          <div style={{ textAlign: 'right', color: '#374151' }}>{formatCurrency(payslip.basic_salary)}</div>
                          <div style={{ textAlign: 'right', fontWeight: 500, color: '#374151' }}>{formatCurrency(payslip.gross_salary)}</div>
                          <div style={{ textAlign: 'right', color: '#dc2626', fontWeight: 500 }}>{formatCurrency(payslip.total_deductions)}</div>
                          <div style={{ textAlign: 'right', fontWeight: 700, color: '#059669' }}>{formatCurrency(payslip.net_salary)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
