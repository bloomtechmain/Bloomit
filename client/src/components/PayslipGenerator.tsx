import { useState, useEffect } from 'react'
import { Send, AlertCircle, FileText, Users, Calendar, Search, User } from 'lucide-react'
import PayslipForm from './PayslipForm'
import { getAllEmployeesWithPayroll, createPayslip, submitForReview, getAllPayslips, updatePayslip } from '../services/payrollService'
import type { EmployeePayrollData, Payslip } from '../types/payroll'
import { useToast } from '../context/ToastContext'

const card: React.CSSProperties = {
  background: '#fff',
  border: '1.5px solid #e2e8f0',
  borderRadius: 12,
  padding: 24,
  boxShadow: '0 2px 8px rgba(15,23,42,0.06)',
}

const inp: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 10,
  border: '1.5px solid #e2e8f0',
  background: '#f8fafc',
  fontSize: 14,
  color: '#1e293b',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'all 0.2s',
  fontFamily: 'inherit',
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

  useEffect(() => { fetchEmployees() }, [])

  const fetchEmployees = async () => {
    setLoading(true)
    try {
      const data = await getAllEmployeesWithPayroll()
      setEmployees(data.employees || [])
    } catch {
      toast.error('Failed to fetch employees')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedEmployee) checkExistingPayslip()
    else setExistingPayslip(null)
  }, [selectedEmployee, selectedMonth, selectedYear])

  const checkExistingPayslip = async () => {
    if (!selectedEmployee) return
    setCheckingExisting(true)
    try {
      const result = await getAllPayslips({ employee_id: selectedEmployee.employee_id, month: selectedMonth, year: selectedYear })
      setExistingPayslip(result.payslips?.length > 0 ? result.payslips[0] : null)
    } catch {
      setExistingPayslip(null)
    } finally {
      setCheckingExisting(false)
    }
  }

  const handleSubmitForReview = async () => {
    if (!selectedEmployee || !calculatedData) { toast.error('Please select an employee and complete the form'); return }

    if (existingPayslip) {
      const status = existingPayslip.status
      if (status === 'DRAFT' || status === 'REJECTED') {
        if (!confirm(`A ${status.toLowerCase()} payslip already exists for this employee and period. Do you want to update it and submit for review?`)) return
      } else {
        toast.error(`A payslip already exists for this employee and period with status: ${status}. Please select a different period.`)
        return
      }
    }

    setSaving(true)
    try {
      let payslipId: number
      if (existingPayslip && (existingPayslip.status === 'DRAFT' || existingPayslip.status === 'REJECTED')) {
        const result = await updatePayslip(existingPayslip.payslip_id, { allowances: calculatedData.allowances, other_deductions: calculatedData.otherDeductions, epf_employee_rate: calculatedData.epfEmployeeRate })
        payslipId = result.payslip.payslip_id
      } else {
        const result = await createPayslip({ employee_id: selectedEmployee.employee_id, payslip_month: selectedMonth, payslip_year: selectedYear, allowances: calculatedData.allowances, other_deductions: calculatedData.otherDeductions, epf_employee_rate: calculatedData.epfEmployeeRate })
        payslipId = result.payslip.payslip_id
      }
      await submitForReview(payslipId)
      toast.success('Payslip submitted for review successfully!')
      setSelectedEmployee(null)
      setCalculatedData(null)
      setExistingPayslip(null)
    } catch (error: any) {
      const msg = error.message || 'Failed to submit payslip'
      if (msg.includes('payslip_already_exists')) toast.error('A payslip already exists for this period. Please refresh and try again.')
      else toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const filteredEmployees = employees.filter(emp => {
    const s = searchTerm.toLowerCase()
    return (emp.name || '').toLowerCase().includes(s) || (emp.email || '').toLowerCase().includes(s)
  })

  const months = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {/* Page header */}
      <div>
        <h2 style={{ margin: 0, marginBottom: 4, fontSize: 22, fontWeight: 700, color: '#1e293b' }}>Generate Payslip</h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>Select an employee, review details, and submit for approval.</p>
      </div>

      {/* Period Selection */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar size={13} color="#3b82f6" />
          </div>
          <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>Period Selection</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <label style={{ display: 'grid', gap: 5 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Month</span>
            <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} style={{ ...inp, appearance: 'none', cursor: 'pointer' }} onFocus={fo} onBlur={bl}>
              {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 5 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Year</span>
            <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} style={{ ...inp, appearance: 'none', cursor: 'pointer' }} onFocus={fo} onBlur={bl}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>
        </div>
      </div>

      {/* Existing Payslip Warning */}
      {existingPayslip && (
        <div style={{
          padding: 16,
          background: existingPayslip.status === 'DRAFT' || existingPayslip.status === 'REJECTED' ? '#fffbeb' : '#fff1f2',
          border: `1.5px solid ${existingPayslip.status === 'DRAFT' || existingPayslip.status === 'REJECTED' ? '#fcd34d' : '#fecdd3'}`,
          borderRadius: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <AlertCircle size={18} style={{ color: existingPayslip.status === 'DRAFT' || existingPayslip.status === 'REJECTED' ? '#f59e0b' : '#ef4444', flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 13.5, color: existingPayslip.status === 'DRAFT' || existingPayslip.status === 'REJECTED' ? '#92400e' : '#991b1b' }}>
                {existingPayslip.status === 'DRAFT' || existingPayslip.status === 'REJECTED' ? 'Existing Payslip Found' : 'Payslip Already Exists'}
              </p>
              <p style={{ margin: '0 0 4px', fontSize: 13, color: '#64748b' }}>
                A payslip exists for <strong>{selectedEmployee?.name}</strong> — {months[selectedMonth - 1]} {selectedYear} with status:{' '}
                <strong style={{ color: existingPayslip.status === 'COMPLETED' ? '#059669' : '#f59e0b' }}>{existingPayslip.status.replace(/_/g, ' ')}</strong>
              </p>
              {existingPayslip.status !== 'DRAFT' && existingPayslip.status !== 'REJECTED' && (
                <p style={{ margin: 0, fontSize: 12, color: '#ef4444', fontWeight: 600 }}>This payslip cannot be modified. Please select a different period.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Employee Selection */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={13} color="#3b82f6" />
          </div>
          <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>Select Employee</span>
        </div>

        <div style={{ position: 'relative', marginBottom: 16 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ ...inp, paddingLeft: 36 }}
            onFocus={fo}
            onBlur={bl}
          />
        </div>

        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>Loading employees...</div>
        ) : filteredEmployees.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', background: '#f8fafc', borderRadius: 10, border: '1.5px dashed #e2e8f0' }}>
            <Search size={28} style={{ color: '#cbd5e1', marginBottom: 8 }} />
            <div style={{ fontSize: 13.5, color: '#94a3b8' }}>No employees match your search</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10, maxHeight: 380, overflowY: 'auto', padding: 2 }}>
            {filteredEmployees.map(emp => {
              const isSelected = selectedEmployee?.employee_id === emp.employee_id
              const initials = (emp.name || '??').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
              return (
                <div
                  key={emp.employee_id}
                  onClick={() => setSelectedEmployee(emp)}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 10,
                    border: isSelected ? '2px solid #3b82f6' : '1.5px solid #e2e8f0',
                    background: isSelected ? 'rgba(59,130,246,0.04)' : '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: isSelected ? '0 4px 12px rgba(59,130,246,0.15)' : '0 1px 3px rgba(0,0,0,0.04)',
                    display: 'flex',
                    gap: 12,
                    alignItems: 'flex-start',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = '#93c5fd' }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = '#e2e8f0' }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: isSelected ? 'rgba(59,130,246,0.12)' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: isSelected ? '#3b82f6' : '#64748b', flexShrink: 0 }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: '#1e293b', marginBottom: 2 }}>{emp.name}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 1 }}>{emp.role}</div>
                    <div style={{ fontSize: 11.5, color: '#94a3b8' }}>{emp.employee_department || emp.department || 'No Department'}</div>
                    {emp.base_salary && (
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#3b82f6', marginTop: 6 }}>
                        Base: LKR {emp.base_salary.toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Payslip Form */}
      {selectedEmployee && (
        <>
          <PayslipForm employee={selectedEmployee} onCalculate={setCalculatedData} />

          {/* Action Buttons */}
          <div style={{ ...card, padding: '16px 24px' }}>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
              {existingPayslip && existingPayslip.status !== 'DRAFT' && existingPayslip.status !== 'REJECTED' && (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, color: '#ef4444', fontSize: 13, fontWeight: 600 }}>
                  <FileText size={15} />
                  Cannot submit — payslip already exists with status: {existingPayslip.status}
                </div>
              )}
              <button
                onClick={handleSubmitForReview}
                disabled={saving || !calculatedData || checkingExisting || (!!existingPayslip && existingPayslip.status !== 'DRAFT' && existingPayslip.status !== 'REJECTED')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '11px 24px',
                  borderRadius: 10,
                  border: 'none',
                  background: (saving || !calculatedData || checkingExisting || (!!existingPayslip && existingPayslip.status !== 'DRAFT' && existingPayslip.status !== 'REJECTED'))
                    ? '#e2e8f0'
                    : 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
                  color: (saving || !calculatedData || checkingExisting || (!!existingPayslip && existingPayslip.status !== 'DRAFT' && existingPayslip.status !== 'REJECTED'))
                    ? '#94a3b8'
                    : '#fff',
                  cursor: (saving || !calculatedData || checkingExisting || (!!existingPayslip && existingPayslip.status !== 'DRAFT' && existingPayslip.status !== 'REJECTED'))
                    ? 'not-allowed'
                    : 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                  boxShadow: (saving || !calculatedData || checkingExisting) ? 'none' : '0 4px 14px rgba(59,130,246,0.35)',
                  transition: 'all 0.2s',
                }}
              >
                <Send size={15} />
                {saving ? 'Submitting...' : checkingExisting ? 'Checking...' : existingPayslip && (existingPayslip.status === 'DRAFT' || existingPayslip.status === 'REJECTED') ? 'Update & Submit for Review' : 'Submit for Review'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
