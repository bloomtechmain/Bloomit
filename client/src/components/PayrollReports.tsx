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

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export default function PayrollReports() {
  const [activeTab, setActiveTab] = useState<'monthly' | 'employee'>('monthly')
  
  // Monthly Report State
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1)
  const [monthlyReport, setMonthlyReport] = useState<MonthlyReport | null>(null)
  const [loadingMonthly, setLoadingMonthly] = useState(false)

  // Employee History State
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null)
  const [employeeHistory, setEmployeeHistory] = useState<EmployeeHistory | null>(null)
  const [loadingEmployees, setLoadingEmployees] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Generate year options (current year and past 5 years)
  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i)

  // Fetch employees on component mount
  useEffect(() => {
    fetchEmployees()
  }, [])

  // Fetch monthly report when year/month changes
  useEffect(() => {
    if (activeTab === 'monthly') {
      fetchMonthlyReport()
    }
  }, [selectedYear, selectedMonth, activeTab])

  // Fetch employee history when employee changes
  useEffect(() => {
    if (selectedEmployee && activeTab === 'employee') {
      fetchEmployeeHistory(selectedEmployee)
    }
  }, [selectedEmployee, activeTab])

  const fetchEmployees = async () => {
    try {
      setLoadingEmployees(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/payroll/employees`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setEmployees(data.employees)
        // Auto-select first employee
        if (data.employees.length > 0) {
          setSelectedEmployee(data.employees[0].employee_id)
        }
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
      const response = await fetch(
        `${API_URL}/payroll/reports/monthly?year=${selectedYear}&month=${selectedMonth}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (response.ok) {
        const data = await response.json()
        setMonthlyReport(data)
      } else {
        setMonthlyReport(null)
      }
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
      const response = await fetch(
        `${API_URL}/payroll/reports/employee/${employeeId}/history`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (response.ok) {
        const data = await response.json()
        setEmployeeHistory(data)
      } else {
        setEmployeeHistory(null)
      }
    } catch (error) {
      console.error('Error fetching employee history:', error)
      setEmployeeHistory(null)
    } finally {
      setLoadingHistory(false)
    }
  }

  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(numAmount || 0)
  }

  const filteredEmployees = employees.filter(emp => {
    const searchLower = searchTerm.toLowerCase()
    return (
      emp.name.toLowerCase().includes(searchLower) ||
      emp.email.toLowerCase().includes(searchLower) ||
      (emp.employee_department && emp.employee_department.toLowerCase().includes(searchLower))
    )
  })

  return (
    <div style={{ width: '100%', display: 'grid', gap: 24 }}>
      {/* Tab Selector */}
      <div className="glass-panel" style={{ padding: 8, display: 'flex', gap: 8 }}>
        <button
          onClick={() => setActiveTab('monthly')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '12px 20px',
            borderRadius: 8,
            border: 'none',
            background: activeTab === 'monthly' ? 'var(--primary)' : 'transparent',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 14,
            transition: 'all 0.2s'
          }}
        >
          <BarChart3 size={18} />
          <span>Monthly Summary</span>
        </button>
        <button
          onClick={() => setActiveTab('employee')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '12px 20px',
            borderRadius: 8,
            border: 'none',
            background: activeTab === 'employee' ? 'var(--primary)' : 'transparent',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 14,
            transition: 'all 0.2s'
          }}
        >
          <Users size={18} />
          <span>Employee History</span>
        </button>
      </div>

      {/* Monthly Summary Tab */}
      {activeTab === 'monthly' && (
        <div style={{ display: 'grid', gap: 24 }}>
          {/* Month/Year Selector */}
          <div className="glass-panel" style={{ padding: 24 }}>
            <h3 style={{ margin: 0, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={20} />
              Select Period
            </h3>
            <div style={{ display: 'flex', gap: 12 }}>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  fontSize: 14,
                  background: '#fff'
                }}
              >
                {MONTHS.map((month, idx) => (
                  <option key={idx} value={idx + 1}>
                    {month}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  fontSize: 14,
                  background: '#fff'
                }}
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loadingMonthly ? (
            <div className="glass-panel" style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 16, color: '#666' }}>Loading report...</div>
            </div>
          ) : !monthlyReport || monthlyReport.summary.total_employees === '0' ? (
            <div className="glass-panel" style={{ padding: 40, textAlign: 'center' }}>
              <BarChart3 size={64} style={{ color: '#ccc', marginBottom: 16 }} />
              <h3 style={{ margin: 0, marginBottom: 8 }}>No Data Available</h3>
              <p style={{ margin: 0, color: '#666' }}>
                No completed payslips found for {MONTHS[selectedMonth - 1]} {selectedYear}
              </p>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <div className="glass-panel" style={{ padding: 20, textAlign: 'center' }}>
                  <Users size={24} style={{ color: '#3b82f6', marginBottom: 8 }} />
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Total Employees</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#3b82f6' }}>
                    {monthlyReport.summary.total_employees}
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: 20, textAlign: 'center' }}>
                  <DollarSign size={24} style={{ color: '#8b5cf6', marginBottom: 8 }} />
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Gross Salary</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#8b5cf6' }}>
                    {formatCurrency(monthlyReport.summary.total_gross_salary)}
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: 20, textAlign: 'center' }}>
                  <TrendingUp size={24} style={{ color: '#10b981', marginBottom: 8 }} />
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Net Salary</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#10b981' }}>
                    {formatCurrency(monthlyReport.summary.total_net_salary)}
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: 20, textAlign: 'center' }}>
                  <BarChart3 size={24} style={{ color: '#f59e0b', marginBottom: 8 }} />
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Total Payroll Cost</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#f59e0b' }}>
                    {formatCurrency(monthlyReport.summary.total_payroll_cost)}
                  </div>
                </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="glass-panel" style={{ padding: 24 }}>
                <h3 style={{ margin: 0, marginBottom: 20 }}>Detailed Breakdown</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                  <div style={{ padding: 16, background: '#f9fafb', borderRadius: 8 }}>
                    <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>Basic Salary</div>
                    <div style={{ fontSize: 20, fontWeight: 600 }}>
                      {formatCurrency(monthlyReport.summary.total_basic_salary)}
                    </div>
                  </div>
                  <div style={{ padding: 16, background: '#f9fafb', borderRadius: 8 }}>
                    <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>Total Deductions</div>
                    <div style={{ fontSize: 20, fontWeight: 600 }}>
                      {formatCurrency(monthlyReport.summary.total_deductions)}
                    </div>
                  </div>
                  <div style={{ padding: 16, background: '#f9fafb', borderRadius: 8 }}>
                    <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>EPF Employer Contribution</div>
                    <div style={{ fontSize: 20, fontWeight: 600 }}>
                      {formatCurrency(monthlyReport.summary.total_epf_employer)}
                    </div>
                  </div>
                  <div style={{ padding: 16, background: '#f9fafb', borderRadius: 8 }}>
                    <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>ETF Employer Contribution</div>
                    <div style={{ fontSize: 20, fontWeight: 600 }}>
                      {formatCurrency(monthlyReport.summary.total_etf_employer)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Department Breakdown */}
              {monthlyReport.by_department.length > 0 && (
                <div className="glass-panel" style={{ padding: 24 }}>
                  <h3 style={{ margin: 0, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Building2 size={20} />
                    Department Breakdown
                  </h3>
                  <div style={{ display: 'grid', gap: 12 }}>
                    {/* Header */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1fr 1fr 1fr',
                        gap: 12,
                        padding: '12px 16px',
                        background: '#f3f4f6',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#666'
                      }}
                    >
                      <div>Department</div>
                      <div style={{ textAlign: 'center' }}>Employees</div>
                      <div style={{ textAlign: 'right' }}>Gross Salary</div>
                      <div style={{ textAlign: 'right' }}>Net Salary</div>
                    </div>

                    {/* Department Rows */}
                    {monthlyReport.by_department.map((dept, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '2fr 1fr 1fr 1fr',
                          gap: 12,
                          padding: '16px',
                          background: '#fff',
                          border: '1px solid #e5e7eb',
                          borderRadius: 8,
                          alignItems: 'center',
                          fontSize: 14
                        }}
                      >
                        <div style={{ fontWeight: 600 }}>{dept.employee_department || 'Unassigned'}</div>
                        <div style={{ textAlign: 'center', color: '#666' }}>{dept.employee_count}</div>
                        <div style={{ textAlign: 'right', fontWeight: 500 }}>
                          {formatCurrency(dept.total_gross)}
                        </div>
                        <div style={{ textAlign: 'right', fontWeight: 600, color: '#10b981' }}>
                          {formatCurrency(dept.total_net)}
                        </div>
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
        <div style={{ display: 'grid', gap: 24 }}>
          {/* Employee Selector */}
          <div className="glass-panel" style={{ padding: 24 }}>
            <h3 style={{ margin: 0, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={20} />
              Select Employee
            </h3>

            {/* Search bar */}
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <Search
                size={18}
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#999' }}
              />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 40px',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  fontSize: 14
                }}
              />
            </div>

            {loadingEmployees ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#666' }}>Loading employees...</div>
            ) : (
              <select
                value={selectedEmployee || ''}
                onChange={(e) => setSelectedEmployee(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  fontSize: 14,
                  background: '#fff'
                }}
              >
                <option value="">Select an employee...</option>
                {filteredEmployees.map((emp) => (
                  <option key={emp.employee_id} value={emp.employee_id}>
                    {emp.name} {emp.employee_department ? `- ${emp.employee_department}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedEmployee && (
            <>
              {loadingHistory ? (
                <div className="glass-panel" style={{ padding: 40, textAlign: 'center' }}>
                  <div style={{ fontSize: 16, color: '#666' }}>Loading history...</div>
                </div>
              ) : !employeeHistory || employeeHistory.payslips.length === 0 ? (
                <div className="glass-panel" style={{ padding: 40, textAlign: 'center' }}>
                  <Users size={64} style={{ color: '#ccc', marginBottom: 16 }} />
                  <h3 style={{ margin: 0, marginBottom: 8 }}>No Payroll History</h3>
                  <p style={{ margin: 0, color: '#666' }}>
                    No payslips found for this employee.
                  </p>
                </div>
              ) : (
                <>
                  {/* YTD Summary */}
                  {employeeHistory.ytd_totals && (
                    <div className="glass-panel" style={{ padding: 24 }}>
                      <h3 style={{ margin: 0, marginBottom: 16 }}>Year-to-Date Totals ({currentYear})</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
                        <div style={{ padding: 16, background: '#f0f9ff', borderRadius: 8, textAlign: 'center' }}>
                          <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>YTD Gross</div>
                          <div style={{ fontSize: 18, fontWeight: 600, color: '#0369a1' }}>
                            {formatCurrency(employeeHistory.ytd_totals.ytd_gross)}
                          </div>
                        </div>
                        <div style={{ padding: 16, background: '#f0fdf4', borderRadius: 8, textAlign: 'center' }}>
                          <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>YTD Net</div>
                          <div style={{ fontSize: 18, fontWeight: 600, color: '#16a34a' }}>
                            {formatCurrency(employeeHistory.ytd_totals.ytd_net)}
                          </div>
                        </div>
                        <div style={{ padding: 16, background: '#fef2f2', borderRadius: 8, textAlign: 'center' }}>
                          <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>YTD Deductions</div>
                          <div style={{ fontSize: 18, fontWeight: 600, color: '#dc2626' }}>
                            {formatCurrency(employeeHistory.ytd_totals.ytd_deductions)}
                          </div>
                        </div>
                        <div style={{ padding: 16, background: '#fefce8', borderRadius: 8, textAlign: 'center' }}>
                          <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>YTD EPF (Employee)</div>
                          <div style={{ fontSize: 18, fontWeight: 600, color: '#ca8a04' }}>
                            {formatCurrency(employeeHistory.ytd_totals.ytd_epf_employee)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Payroll History Table */}
                  <div className="glass-panel" style={{ padding: 24 }}>
                    <h3 style={{ margin: 0, marginBottom: 20 }}>Payroll History</h3>
                    <div style={{ display: 'grid', gap: 12 }}>
                      {/* Header */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr',
                          gap: 12,
                          padding: '12px 16px',
                          background: '#f3f4f6',
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: 600,
                          color: '#666'
                        }}
                      >
                        <div>Period</div>
                        <div style={{ textAlign: 'right' }}>Basic Salary</div>
                        <div style={{ textAlign: 'right' }}>Gross Salary</div>
                        <div style={{ textAlign: 'right' }}>Deductions</div>
                        <div style={{ textAlign: 'right' }}>Net Salary</div>
                      </div>

                      {/* Payslip Rows */}
                      {employeeHistory.payslips.map((payslip) => (
                        <div
                          key={payslip.payslip_id}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr',
                            gap: 12,
                            padding: '16px',
                            background: '#fff',
                            border: '1px solid #e5e7eb',
                            borderRadius: 8,
                            alignItems: 'center',
                            fontSize: 14
                          }}
                        >
                          <div style={{ fontWeight: 600 }}>
                            {MONTHS[payslip.payslip_month - 1]} {payslip.payslip_year}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            {formatCurrency(payslip.basic_salary)}
                          </div>
                          <div style={{ textAlign: 'right', fontWeight: 500 }}>
                            {formatCurrency(payslip.gross_salary)}
                          </div>
                          <div style={{ textAlign: 'right', color: '#dc2626' }}>
                            {formatCurrency(payslip.total_deductions)}
                          </div>
                          <div style={{ textAlign: 'right', fontWeight: 600, color: '#16a34a' }}>
                            {formatCurrency(payslip.net_salary)}
                          </div>
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
