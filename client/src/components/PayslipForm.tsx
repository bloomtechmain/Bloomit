import { useState, useEffect } from 'react'
import { Settings, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import type { EmployeePayrollData } from '../types/payroll'
import EmployeePayrollSettingsModal from './EmployeePayrollSettingsModal'
import { getStoredPreset, getCustomEmployerRates } from '../config/payrollPresets'

type PayslipFormProps = {
  employee: EmployeePayrollData | null
  onCalculate: (data: {
    basicSalary: number
    allowances: Record<string, number>
    epfEmployeeDeduction: number
    epfEmployeeRate: number
    otherDeductions: Record<string, number>
    totalDeductions: number
    epfEmployerContribution: number
    etfEmployerContribution: number
    grossSalary: number
    netSalary: number
  }) => void
}

export default function PayslipForm({ employee, onCalculate }: PayslipFormProps) {
  const [allowances, setAllowances] = useState<Record<string, number>>({})
  const [otherDeductions, setOtherDeductions] = useState<Record<string, number>>({})
  const [epfRate, setEpfRate] = useState<number>(8.0)
  const [settingsModalOpen, setSettingsModalOpen] = useState(false)
  const [allowancesExpanded, setAllowancesExpanded] = useState(true)
  const [deductionsExpanded, setDeductionsExpanded] = useState(true)
  const preset = getStoredPreset()
  const { rate1: customEr1, rate2: customEr2 } = getCustomEmployerRates()
  const scheme1EmployerRate = preset.code === 'custom' ? customEr1 : preset.scheme1.employerRate
  const scheme2EmployerRate = preset.code === 'custom' ? customEr2 : (preset.scheme2?.employerRate ?? 0)
  const currencyLabel = preset.currencySymbol || 'LKR'
  const [newAllowanceName, setNewAllowanceName] = useState('')
  const [newAllowanceAmount, setNewAllowanceAmount] = useState('')
  const [newDeductionName, setNewDeductionName] = useState('')
  const [newDeductionAmount, setNewDeductionAmount] = useState('')

  // Initialize form with employee data
  useEffect(() => {
    if (employee) {
      setAllowances(employee.allowances || {})
      setEpfRate(employee.epf_contribution_rate || 8.0)
      setOtherDeductions({})
    }
  }, [employee])

  // Real-time calculations
  useEffect(() => {
    if (!employee) return

    const basicSalary = Number(employee.base_salary) || 0
    const totalAllowances = Object.values(allowances).reduce((sum, val) => sum + Number(val || 0), 0)
    const grossSalary = basicSalary + totalAllowances

    // EPF Employee Deduction (default 8% or custom rate if EPF enabled)
    const epfEmployeeDeduction = employee.epf_enabled ? (grossSalary * (epfRate / 100)) : 0

    // Other deductions
    const totalOtherDeductions = Object.values(otherDeductions).reduce((sum, val) => sum + Number(val || 0), 0)

    const totalDeductions = epfEmployeeDeduction + totalOtherDeductions

    // Employer contributions — rates from country preset
    const epfEmployerContribution = employee.epf_enabled ? (grossSalary * (scheme1EmployerRate / 100)) : 0
    const etfEmployerContribution = employee.etf_enabled && preset.scheme2 ? (grossSalary * (scheme2EmployerRate / 100)) : 0

    const netSalary = grossSalary - totalDeductions

    onCalculate({
      basicSalary,
      allowances,
      epfEmployeeDeduction,
      epfEmployeeRate: epfRate,
      otherDeductions,
      totalDeductions,
      epfEmployerContribution,
      etfEmployerContribution,
      grossSalary,
      netSalary
    })
  }, [employee, allowances, otherDeductions, epfRate, onCalculate])

  if (!employee) {
    return (
      <div style={{ padding: 40, textAlign: 'center', background: '#f5f5f5', borderRadius: 12 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>👤</div>
        <div style={{ fontSize: 18, fontWeight: 600, color: '#333' }}>Select an employee to generate payslip</div>
      </div>
    )
  }

  const basicSalary = Number(employee.base_salary) || 0
  const totalAllowances = Object.values(allowances).reduce((sum, val) => sum + Number(val || 0), 0)
  const grossSalary = basicSalary + totalAllowances
  const epfEmployeeDeduction = employee.epf_enabled ? (grossSalary * (epfRate / 100)) : 0
  const totalOtherDeductions = Object.values(otherDeductions).reduce((sum, val) => sum + Number(val || 0), 0)
  const totalDeductions = epfEmployeeDeduction + totalOtherDeductions
  const netSalary = grossSalary - totalDeductions
  const epfEmployerAmt = employee.epf_enabled ? grossSalary * (scheme1EmployerRate / 100) : 0
  const etfEmployerAmt = employee.etf_enabled && preset.scheme2 ? grossSalary * (scheme2EmployerRate / 100) : 0

  const handleAddAllowance = () => {
    if (newAllowanceName.trim() && newAllowanceAmount) {
      setAllowances({ ...allowances, [newAllowanceName.trim()]: Number(newAllowanceAmount) })
      setNewAllowanceName('')
      setNewAllowanceAmount('')
    }
  }

  const handleRemoveAllowance = (key: string) => {
    const updated = { ...allowances }
    delete updated[key]
    setAllowances(updated)
  }

  const handleUpdateAllowance = (key: string, value: number) => {
    setAllowances({ ...allowances, [key]: value })
  }

  const handleAddDeduction = () => {
    if (newDeductionName.trim() && newDeductionAmount) {
      setOtherDeductions({ ...otherDeductions, [newDeductionName.trim()]: Number(newDeductionAmount) })
      setNewDeductionName('')
      setNewDeductionAmount('')
    }
  }

  const handleRemoveDeduction = (key: string) => {
    const updated = { ...otherDeductions }
    delete updated[key]
    setOtherDeductions(updated)
  }

  const handleUpdateDeduction = (key: string, value: number) => {
    setOtherDeductions({ ...otherDeductions, [key]: value })
  }

  const handleSettingsSaved = () => {
    // The parent component (PayslipGenerator) will need to refresh the employee data
    // For now, we'll just refresh the page or you can pass a callback from parent
    window.location.reload()
  }

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* Employee Info */}
      <div className="glass-panel" style={{ padding: 20, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#fff', position: 'relative' }}>
        <button
          onClick={() => setSettingsModalOpen(true)}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            borderRadius: 8,
            border: 'none',
            background: 'rgba(255, 255, 255, 0.2)',
            color: '#fff',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            transition: 'background 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
          title="Edit employee payroll settings"
        >
          <Settings size={16} />
          Edit Settings
        </button>
        <h3 style={{ margin: 0, marginBottom: 12 }}>Employee Information</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 14 }}>
          <div><strong>Name:</strong> {employee.name}</div>
          <div><strong>Role:</strong> {employee.role}</div>
          <div><strong>Department:</strong> {employee.employee_department || 'N/A'}</div>
          <div><strong>Email:</strong> {employee.email}</div>
          <div><strong>{preset.scheme1.name} Enabled:</strong> {employee.epf_enabled ? 'Yes' : 'No'}</div>
          {preset.scheme2 && <div><strong>{preset.scheme2.name} Enabled:</strong> {employee.etf_enabled ? 'Yes' : 'No'}</div>}
        </div>
      </div>

      {/* Calculations Summary */}
      <div className="glass-panel" style={{ padding: 20, background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: '#fff' }}>
        <h3 style={{ margin: 0, marginBottom: 16 }}>Calculations Summary</h3>
        <div style={{ display: 'grid', gap: 12, fontSize: 15 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.3)' }}>
            <span>Basic Salary:</span>
            <span style={{ fontWeight: 700 }}>{currencyLabel} {basicSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.3)' }}>
            <span>Total Allowances:</span>
            <span style={{ fontWeight: 700 }}>{currencyLabel} {totalAllowances.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '2px solid rgba(255,255,255,0.5)', fontSize: 17 }}>
            <span style={{ fontWeight: 700 }}>Gross Salary:</span>
            <span style={{ fontWeight: 800 }}>{currencyLabel} {grossSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>

          {employee.epf_enabled && (
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.3)' }}>
              <span>{preset.scheme1.name} Employee ({epfRate}%):</span>
              <span style={{ fontWeight: 700 }}>{currencyLabel} {epfEmployeeDeduction.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.3)' }}>
            <span>Other Deductions:</span>
            <span style={{ fontWeight: 700 }}>{currencyLabel} {totalOtherDeductions.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '2px solid rgba(255,255,255,0.5)' }}>
            <span style={{ fontWeight: 700 }}>Total Deductions:</span>
            <span style={{ fontWeight: 800 }}>{currencyLabel} {totalDeductions.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20, marginTop: 8 }}>
            <span style={{ fontWeight: 800 }}>NET SALARY:</span>
            <span style={{ fontWeight: 900 }}>{currencyLabel} {netSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>

          {(epfEmployerAmt > 0 || etfEmployerAmt > 0) && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed rgba(255,255,255,0.4)' }}>
              <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 6 }}>Employer Contributions:</div>
              {epfEmployerAmt > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                  <span>{preset.scheme1.name} Employer ({scheme1EmployerRate}%):</span>
                  <span style={{ fontWeight: 700 }}>{currencyLabel} {epfEmployerAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {etfEmployerAmt > 0 && preset.scheme2 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                  <span>{preset.scheme2.name} Employer ({scheme2EmployerRate}%):</span>
                  <span style={{ fontWeight: 700 }}>{currencyLabel} {etfEmployerAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Editable Allowances Section */}
      <div className="glass-panel" style={{ padding: 20 }}>
        <div 
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: allowancesExpanded ? 16 : 0,
            cursor: 'pointer',
            userSelect: 'none'
          }}
          onClick={() => setAllowancesExpanded(!allowancesExpanded)}
        >
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            📝 Edit Allowances
          </h3>
          {allowancesExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
        
        {allowancesExpanded && (
          <div style={{ display: 'grid', gap: 12 }}>
            <p style={{ margin: 0, fontSize: 13, color: '#666' }}>
              Modify allowance amounts or add new allowances for this payslip
            </p>

            {/* Existing Allowances */}
            {Object.entries(allowances).length > 0 && (
              <div style={{ display: 'grid', gap: 8 }}>
                {Object.entries(allowances).map(([key, value]) => (
                  <div key={key} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="text"
                      value={key}
                      readOnly
                      style={{ 
                        flex: 1, 
                        padding: '10px 12px', 
                        borderRadius: 6, 
                        border: '1px solid #ccc', 
                        background: '#f8f9fa',
                        fontSize: 14,
                        color: '#333'
                      }}
                    />
                    <input
                      type="number"
                      value={value}
                      onChange={e => handleUpdateAllowance(key, Number(e.target.value))}
                      style={{ 
                        width: 140, 
                        padding: '10px 12px', 
                        borderRadius: 6, 
                        border: '1px solid #ccc',
                        fontSize: 14
                      }}
                      placeholder="Amount"
                    />
                    <button
                      onClick={() => handleRemoveAllowance(key)}
                      style={{ 
                        padding: '10px 12px', 
                        borderRadius: 6, 
                        border: 'none', 
                        background: '#ef4444', 
                        color: '#fff', 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Remove allowance"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Allowance */}
            <div style={{ 
              marginTop: 8, 
              paddingTop: 12, 
              borderTop: '1px dashed #ccc',
              display: 'flex', 
              gap: 8,
              alignItems: 'flex-end'
            }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
                  Allowance Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., Transport, Housing"
                  value={newAllowanceName}
                  onChange={e => setNewAllowanceName(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleAddAllowance()}
                  style={{ 
                    width: '100%',
                    padding: '10px 12px', 
                    borderRadius: 6, 
                    border: '1px solid #ccc',
                    fontSize: 14
                  }}
                />
              </div>
              <div style={{ width: 140 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
                  Amount {currencyLabel ? `(${currencyLabel})` : ''}
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={newAllowanceAmount}
                  onChange={e => setNewAllowanceAmount(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleAddAllowance()}
                  style={{ 
                    width: '100%',
                    padding: '10px 12px', 
                    borderRadius: 6, 
                    border: '1px solid #ccc',
                    fontSize: 14
                  }}
                />
              </div>
              <button
                onClick={handleAddAllowance}
                style={{ 
                  padding: '10px 16px', 
                  borderRadius: 6, 
                  border: 'none', 
                  background: '#10b981', 
                  color: '#fff', 
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  whiteSpace: 'nowrap'
                }}
              >
                <Plus size={16} />
                Add
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Editable Other Deductions Section */}
      <div className="glass-panel" style={{ padding: 20 }}>
        <div 
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: deductionsExpanded ? 16 : 0,
            cursor: 'pointer',
            userSelect: 'none'
          }}
          onClick={() => setDeductionsExpanded(!deductionsExpanded)}
        >
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            📝 Edit Other Deductions
          </h3>
          {deductionsExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
        
        {deductionsExpanded && (
          <div style={{ display: 'grid', gap: 12 }}>
            <p style={{ margin: 0, fontSize: 13, color: '#666' }}>
              Add deductions like loans, advances, or other custom deductions
            </p>

            {/* Existing Deductions */}
            {Object.entries(otherDeductions).length > 0 && (
              <div style={{ display: 'grid', gap: 8 }}>
                {Object.entries(otherDeductions).map(([key, value]) => (
                  <div key={key} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="text"
                      value={key}
                      readOnly
                      style={{ 
                        flex: 1, 
                        padding: '10px 12px', 
                        borderRadius: 6, 
                        border: '1px solid #ccc', 
                        background: '#f8f9fa',
                        fontSize: 14,
                        color: '#333'
                      }}
                    />
                    <input
                      type="number"
                      value={value}
                      onChange={e => handleUpdateDeduction(key, Number(e.target.value))}
                      style={{ 
                        width: 140, 
                        padding: '10px 12px', 
                        borderRadius: 6, 
                        border: '1px solid #ccc',
                        fontSize: 14
                      }}
                      placeholder="Amount"
                    />
                    <button
                      onClick={() => handleRemoveDeduction(key)}
                      style={{ 
                        padding: '10px 12px', 
                        borderRadius: 6, 
                        border: 'none', 
                        background: '#ef4444', 
                        color: '#fff', 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Remove deduction"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Deduction */}
            <div style={{ 
              marginTop: Object.entries(otherDeductions).length > 0 ? 8 : 0,
              paddingTop: Object.entries(otherDeductions).length > 0 ? 12 : 0, 
              borderTop: Object.entries(otherDeductions).length > 0 ? '1px dashed #ccc' : 'none',
              display: 'flex', 
              gap: 8,
              alignItems: 'flex-end'
            }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
                  Deduction Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., Loan, Advance, Other"
                  value={newDeductionName}
                  onChange={e => setNewDeductionName(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleAddDeduction()}
                  style={{ 
                    width: '100%',
                    padding: '10px 12px', 
                    borderRadius: 6, 
                    border: '1px solid #ccc',
                    fontSize: 14
                  }}
                />
              </div>
              <div style={{ width: 140 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
                  Amount {currencyLabel ? `(${currencyLabel})` : ''}
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={newDeductionAmount}
                  onChange={e => setNewDeductionAmount(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleAddDeduction()}
                  style={{ 
                    width: '100%',
                    padding: '10px 12px', 
                    borderRadius: 6, 
                    border: '1px solid #ccc',
                    fontSize: 14
                  }}
                />
              </div>
              <button
                onClick={handleAddDeduction}
                style={{ 
                  padding: '10px 16px', 
                  borderRadius: 6, 
                  border: 'none', 
                  background: '#10b981', 
                  color: '#fff', 
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  whiteSpace: 'nowrap'
                }}
              >
                <Plus size={16} />
                Add
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Employee Payroll Settings Modal */}
      <EmployeePayrollSettingsModal
        employee={employee}
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        onSave={handleSettingsSaved}
      />
    </div>
  )
}
