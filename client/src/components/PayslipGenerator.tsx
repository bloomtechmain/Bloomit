import { useState, useEffect } from 'react'
import { Send, AlertCircle, FileText } from 'lucide-react'
import PayslipForm from './PayslipForm'
import { getAllEmployeesWithPayroll, createPayslip, submitForReview, getAllPayslips, updatePayslip } from '../services/payrollService'
import type { EmployeePayrollData, Payslip } from '../types/payroll'
import { useToast } from '../context/ToastContext'

export default function PayslipGenerator() {
  const { toast } = useToast()
  const [employees, setEmployees] = useState<EmployeePayrollData[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeePayrollData | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [searchTerm, setSearchTerm] = useState('')
  const [calculatedData, setCalculatedData] = useState<any>(null)
  const [existingPayslip, setExistingPayslip] = useState<Payslip | null>(null)
  const [checkingExisting, setCheckingExisting] = useState(false)

  useEffect(() => {
    fetchEmployees()
  }, [])

  const fetchEmployees = async () => {
    setLoading(true)
    try {
      const data = await getAllEmployeesWithPayroll()
      setEmployees(data.employees || [])
    } catch (error) {
      console.error('Error fetching employees:', error)
      toast.error('Failed to fetch employees')
    } finally {
      setLoading(false)
    }
  }

  // Check for existing payslip when employee or period changes
  useEffect(() => {
    if (selectedEmployee) {
      checkExistingPayslip()
    } else {
      setExistingPayslip(null)
    }
  }, [selectedEmployee, selectedMonth, selectedYear])

  const checkExistingPayslip = async () => {
    if (!selectedEmployee) return
    
    setCheckingExisting(true)
    try {
      const result = await getAllPayslips({
        employee_id: selectedEmployee.employee_id,
        month: selectedMonth,
        year: selectedYear
      })
      
      if (result.payslips && result.payslips.length > 0) {
        setExistingPayslip(result.payslips[0])
      } else {
        setExistingPayslip(null)
      }
    } catch (error) {
      console.error('Error checking for existing payslip:', error)
      setExistingPayslip(null)
    } finally {
      setCheckingExisting(false)
    }
  }

  const handleSubmitForReview = async () => {
    if (!selectedEmployee || !calculatedData) {
      toast.error('Please select an employee and complete the form')
      return
    }

    // Check if payslip already exists
    if (existingPayslip) {
      const status = existingPayslip.status

      // If it's in DRAFT or REJECTED status, we can update and submit
      if (status === 'DRAFT' || status === 'REJECTED') {
        const confirmUpdate = confirm(
          `A ${status.toLowerCase()} payslip already exists for this employee and period. Do you want to update it and submit for review?`
        )
        if (!confirmUpdate) return
      } else {
        // Payslip exists in a non-editable state
        toast.error(
          `A payslip already exists for this employee and period with status: ${status}. Please view the existing payslip in the Payslips list or select a different period.`
        )
        return
      }
    }

    setSaving(true)
    try {
      let payslipId: number

      if (existingPayslip && (existingPayslip.status === 'DRAFT' || existingPayslip.status === 'REJECTED')) {
        // Update existing payslip
        const result = await updatePayslip(existingPayslip.payslip_id, {
          allowances: calculatedData.allowances,
          other_deductions: calculatedData.otherDeductions,
          epf_employee_rate: calculatedData.epfEmployeeRate
        })
        payslipId = result.payslip.payslip_id
      } else {
        // Create new payslip
        const result = await createPayslip({
          employee_id: selectedEmployee.employee_id,
          payslip_month: selectedMonth,
          payslip_year: selectedYear,
          allowances: calculatedData.allowances,
          other_deductions: calculatedData.otherDeductions,
          epf_employee_rate: calculatedData.epfEmployeeRate
        })
        payslipId = result.payslip.payslip_id
      }
      
      // Then submit it for review
      await submitForReview(payslipId)

      toast.success('Payslip submitted for review successfully!')
      // Reset form
      setSelectedEmployee(null)
      setCalculatedData(null)
      setExistingPayslip(null)
    } catch (error: any) {
      console.error('Error submitting payslip:', error)
      const errorMessage = error.message || 'Failed to submit payslip'

      if (errorMessage.includes('payslip_already_exists')) {
        toast.error('A payslip already exists for this employee and period. Please refresh the page and try again, or select a different period.')
      } else {
        toast.error(errorMessage)
      }
    } finally {
      setSaving(false)
    }
  }

  const filteredEmployees = employees.filter(emp => {
    const searchLower = searchTerm.toLowerCase()
    return (
      (emp.name || '').toLowerCase().includes(searchLower) ||
      (emp.email || '').toLowerCase().includes(searchLower)
    )
  })

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <div>
        <h2 style={{ margin: 0, marginBottom: 8, fontSize: 24 }}>Generate Payslip</h2>
        <p style={{ margin: 0, color: '#666' }}>
          Create payslips for employees. Select an employee, review the details, and submit for approval.
        </p>
      </div>

      {/* Month and Year Selection */}
      <div className="glass-panel" style={{ padding: 20 }}>
        <h3 style={{ margin: 0, marginBottom: 16 }}>Period Selection</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Month</label>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc', fontSize: 15 }}
            >
              {months.map((month, index) => (
                <option key={index} value={index + 1}>{month}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Year</label>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc', fontSize: 15 }}
            >
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Existing Payslip Warning */}
      {existingPayslip && (
        <div 
          className="glass-panel" 
          style={{ 
            padding: 20, 
            background: existingPayslip.status === 'DRAFT' || existingPayslip.status === 'REJECTED' 
              ? 'rgba(255, 193, 7, 0.1)' 
              : 'rgba(244, 67, 54, 0.1)',
            border: existingPayslip.status === 'DRAFT' || existingPayslip.status === 'REJECTED' 
              ? '2px solid rgba(255, 193, 7, 0.5)' 
              : '2px solid rgba(244, 67, 54, 0.5)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <AlertCircle 
              size={24} 
              style={{ 
                color: existingPayslip.status === 'DRAFT' || existingPayslip.status === 'REJECTED' 
                  ? '#ff9800' 
                  : '#f44336',
                flexShrink: 0,
                marginTop: 2
              }} 
            />
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, marginBottom: 8, fontSize: 16 }}>
                {existingPayslip.status === 'DRAFT' || existingPayslip.status === 'REJECTED' 
                  ? 'Existing Payslip Found' 
                  : 'Payslip Already Exists'}
              </h3>
              <p style={{ margin: 0, marginBottom: 12, color: '#666', fontSize: 14 }}>
                A payslip already exists for <strong>{selectedEmployee?.name}</strong> for{' '}
                <strong>{months[selectedMonth - 1]} {selectedYear}</strong> with status:{' '}
                <strong style={{ color: existingPayslip.status === 'COMPLETED' ? '#4caf50' : '#ff9800' }}>
                  {existingPayslip.status.replace(/_/g, ' ')}
                </strong>
              </p>
              {(existingPayslip.status === 'DRAFT' || existingPayslip.status === 'REJECTED') && (
                <p style={{ margin: 0, color: '#666', fontSize: 13 }}>
                  ℹ️ You can update and resubmit this payslip, or select a different period.
                </p>
              )}
              {existingPayslip.status !== 'DRAFT' && existingPayslip.status !== 'REJECTED' && (
                <p style={{ margin: 0, color: '#d32f2f', fontSize: 13, fontWeight: 600 }}>
                  ⚠️ This payslip cannot be modified. Please select a different period.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Employee Selection */}
      <div className="glass-panel" style={{ padding: 20 }}>
        <h3 style={{ margin: 0, marginBottom: 16 }}>Select Employee</h3>
        
        <input
          type="text"
          placeholder="Search employees by name, number, or email..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ 
            width: '100%', 
            padding: '10px 12px', 
            borderRadius: 8, 
            border: '1px solid #ccc', 
            marginBottom: 16,
            fontSize: 15
          }}
        />

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>Loading employees...</div>
        ) : filteredEmployees.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', background: '#f5f5f5', borderRadius: 8 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
            <div>No employees found matching your search</div>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
            gap: 12,
            maxHeight: 400,
            overflowY: 'auto',
            padding: 4
          }}>
            {filteredEmployees.map(emp => (
              <div
                key={emp.employee_id}
                onClick={() => setSelectedEmployee(emp)}
                style={{
                  padding: 16,
                  borderRadius: 10,
                  border: selectedEmployee?.employee_id === emp.employee_id ? '2px solid var(--primary)' : '1px solid #e0e0e0',
                  background: selectedEmployee?.employee_id === emp.employee_id ? 'rgba(0, 97, 255, 0.05)' : '#fff',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: selectedEmployee?.employee_id === emp.employee_id ? '0 4px 12px rgba(0, 97, 255, 0.15)' : '0 2px 4px rgba(0,0,0,0.05)'
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, color: '#1a1a1a' }}>
                  {emp.name}
                </div>
                <div style={{ fontSize: 13, color: '#333', marginBottom: 2 }}>
                  {emp.role}
                </div>
                <div style={{ fontSize: 12, color: '#555' }}>
                  {emp.employee_department || emp.department || 'No Department'}
                </div>
                {emp.base_salary && (
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)', marginTop: 8 }}>
                    Base: LKR {emp.base_salary.toLocaleString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payslip Form */}
      {selectedEmployee && (
        <>
          <PayslipForm
            employee={selectedEmployee}
            onCalculate={setCalculatedData}
          />

          {/* Action Buttons */}
          <div className="glass-panel" style={{ padding: 20 }}>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              {existingPayslip && existingPayslip.status !== 'DRAFT' && existingPayslip.status !== 'REJECTED' && (
                <div style={{ 
                  flex: 1, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 8,
                  color: '#d32f2f',
                  fontSize: 14,
                  fontWeight: 600
                }}>
                  <FileText size={18} />
                  Cannot submit - payslip already exists with status: {existingPayslip.status}
                </div>
              )}
              <button
                onClick={handleSubmitForReview}
                disabled={saving || !calculatedData || checkingExisting || (!!existingPayslip && existingPayslip.status !== 'DRAFT' && existingPayslip.status !== 'REJECTED')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 24px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'var(--primary)',
                  color: '#fff',
                  cursor: (saving || !calculatedData || checkingExisting || (!!existingPayslip && existingPayslip.status !== 'DRAFT' && existingPayslip.status !== 'REJECTED')) ? 'not-allowed' : 'pointer',
                  fontSize: 15,
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(0, 97, 255, 0.25)',
                  opacity: (saving || !calculatedData || checkingExisting || (!!existingPayslip && existingPayslip.status !== 'DRAFT' && existingPayslip.status !== 'REJECTED')) ? 0.5 : 1
                }}
              >
                <Send size={18} />
                {saving ? 'Submitting...' : checkingExisting ? 'Checking...' : existingPayslip && (existingPayslip.status === 'DRAFT' || existingPayslip.status === 'REJECTED') ? 'Update & Submit for Review' : 'Submit for Review'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
