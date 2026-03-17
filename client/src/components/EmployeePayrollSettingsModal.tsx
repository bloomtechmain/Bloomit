import { useState, useEffect } from 'react'
import { Save, X } from 'lucide-react'
import { updateEmployeePayrollData } from '../services/payrollService'
import type { EmployeePayrollData } from '../types/payroll'
import { useToast } from '../context/ToastContext'

type EmployeePayrollSettingsModalProps = {
  employee: EmployeePayrollData
  isOpen: boolean
  onClose: () => void
  onSave: () => void
}

export default function EmployeePayrollSettingsModal({ 
  employee, 
  isOpen, 
  onClose, 
  onSave 
}: EmployeePayrollSettingsModalProps) {
  const [baseSalary, setBaseSalary] = useState<string>('')
  const [department, setDepartment] = useState<string>('')
  const [epfEnabled, setEpfEnabled] = useState<boolean>(false)
  const [epfRate, setEpfRate] = useState<string>('8.00')
  const [etfEnabled, setEtfEnabled] = useState<boolean>(false)
  const [allowances, setAllowances] = useState<Record<string, number>>({})
  const [newAllowanceName, setNewAllowanceName] = useState('')
  const [newAllowanceAmount, setNewAllowanceAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  // Initialize form with employee data
  useEffect(() => {
    if (employee && isOpen) {
      setBaseSalary(employee.base_salary?.toString() || '')
      setDepartment(employee.employee_department || '')
      setEpfEnabled(employee.epf_enabled || false)
      setEpfRate(employee.epf_contribution_rate?.toString() || '8.00')
      setEtfEnabled(employee.etf_enabled || false)
      setAllowances(employee.allowances || {})
    }
  }, [employee, isOpen])

  const handleAddAllowance = () => {
    if (newAllowanceName && newAllowanceAmount) {
      setAllowances({ ...allowances, [newAllowanceName]: Number(newAllowanceAmount) })
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

  const handleSave = async () => {
    if (!baseSalary || Number(baseSalary) <= 0) {
      toast.error('Please enter a valid base salary')
      return
    }

    if (epfEnabled && (Number(epfRate) < 8 || Number(epfRate) > 100)) {
      toast.error('EPF rate must be between 8% and 100%')
      return
    }

    setSaving(true)
    try {
      await updateEmployeePayrollData(employee.employee_id, {
        base_salary: Number(baseSalary),
        allowances: allowances,
        epf_enabled: epfEnabled,
        epf_contribution_rate: Number(epfRate),
        etf_enabled: etfEnabled,
        employee_department: department
      })

      toast.success('Employee payroll settings updated successfully!')
      onSave()
      onClose()
    } catch (error: any) {
      console.error('Error updating employee payroll data:', error)
      toast.error(error.message || 'Failed to update employee payroll settings')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div 
      style={{ 
        position: 'fixed', 
        inset: 0, 
        background: 'rgba(0,0,0,0.5)', 
        display: 'grid', 
        placeItems: 'center', 
        zIndex: 1000,
        overflowY: 'auto',
        padding: '20px'
      }} 
      onClick={onClose}
    >
      <div 
        className="glass-panel" 
        style={{ 
          width: 'min(700px, 96vw)', 
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: 24, 
          borderRadius: 16 
        }} 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 24 }}>Employee Payroll Settings</h2>
            <p style={{ margin: '4px 0 0', color: '#666', fontSize: 14 }}>
              {employee.name} - These settings will apply to all future payslips
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              transition: 'background 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#f0f0f0'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <div style={{ display: 'grid', gap: 20 }}>
          {/* Basic Information */}
          <div style={{ background: '#f8f9fa', padding: 16, borderRadius: 8 }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 16 }}>Basic Information</h3>
            
            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
                  Base Salary (Monthly) *
                </label>
                <input
                  type="number"
                  value={baseSalary}
                  onChange={e => setBaseSalary(e.target.value)}
                  placeholder="e.g., 50000"
                  style={{ 
                    width: '100%', 
                    padding: '10px 12px', 
                    borderRadius: 8, 
                    border: '1px solid #ccc',
                    fontSize: 15
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
                  Department
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                  placeholder="e.g., IT, Accounting, Marketing"
                  style={{ 
                    width: '100%', 
                    padding: '10px 12px', 
                    borderRadius: 8, 
                    border: '1px solid #ccc',
                    fontSize: 15
                  }}
                />
              </div>
            </div>
          </div>

          {/* Default Allowances */}
          <div style={{ background: '#f8f9fa', padding: 16, borderRadius: 8 }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 16 }}>Default Allowances</h3>
            <p style={{ margin: '0 0 12px 0', fontSize: 13, color: '#666' }}>
              These allowances will be automatically included in every payslip
            </p>
            
            {/* Existing Allowances */}
            <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
              {Object.entries(allowances).map(([key, value]) => (
                <div key={key} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="text"
                    value={key}
                    readOnly
                    style={{ 
                      flex: 1, 
                      padding: '8px 12px', 
                      borderRadius: 6, 
                      border: '1px solid #ccc', 
                      background: '#fff',
                      fontSize: 14
                    }}
                  />
                  <input
                    type="number"
                    value={value}
                    onChange={e => handleUpdateAllowance(key, Number(e.target.value))}
                    style={{ 
                      width: 120, 
                      padding: '8px 12px', 
                      borderRadius: 6, 
                      border: '1px solid #ccc',
                      fontSize: 14
                    }}
                  />
                  <button
                    onClick={() => handleRemoveAllowance(key)}
                    style={{ 
                      padding: '8px 12px', 
                      borderRadius: 6, 
                      border: 'none', 
                      background: '#ef4444', 
                      color: '#fff', 
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 600
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            
            {/* Add New Allowance */}
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="Allowance name (e.g., Housing)"
                value={newAllowanceName}
                onChange={e => setNewAllowanceName(e.target.value)}
                style={{ 
                  flex: 1, 
                  padding: '8px 12px', 
                  borderRadius: 6, 
                  border: '1px solid #ccc',
                  fontSize: 14
                }}
              />
              <input
                type="number"
                placeholder="Amount"
                value={newAllowanceAmount}
                onChange={e => setNewAllowanceAmount(e.target.value)}
                style={{ 
                  width: 120, 
                  padding: '8px 12px', 
                  borderRadius: 6, 
                  border: '1px solid #ccc',
                  fontSize: 14
                }}
              />
              <button
                onClick={handleAddAllowance}
                style={{ 
                  padding: '8px 16px', 
                  borderRadius: 6, 
                  border: 'none', 
                  background: '#10b981', 
                  color: '#fff', 
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 13
                }}
              >
                + Add
              </button>
            </div>
          </div>

          {/* EPF Settings */}
          <div style={{ background: '#f8f9fa', padding: 16, borderRadius: 8 }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 16 }}>EPF (Employees' Provident Fund)</h3>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={epfEnabled}
                  onChange={e => setEpfEnabled(e.target.checked)}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
                <span style={{ fontWeight: 600, fontSize: 15 }}>Enable EPF Deductions</span>
              </label>
            </div>

            {epfEnabled && (
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
                  Employee Contribution Rate (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="8"
                  max="100"
                  value={epfRate}
                  onChange={e => setEpfRate(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '10px 12px', 
                    borderRadius: 8, 
                    border: '1px solid #ccc',
                    fontSize: 15
                  }}
                />
                <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                  Minimum 8%. Employer contributes 12%, ETF is 3% (if enabled)
                </div>
              </div>
            )}
          </div>

          {/* ETF Settings */}
          <div style={{ background: '#f8f9fa', padding: 16, borderRadius: 8 }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 16 }}>ETF (Employees' Trust Fund)</h3>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={etfEnabled}
                onChange={e => setEtfEnabled(e.target.checked)}
                style={{ width: 18, height: 18, cursor: 'pointer' }}
              />
              <span style={{ fontWeight: 600, fontSize: 15 }}>Enable ETF Contributions (3% Employer)</span>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24, paddingTop: 24, borderTop: '1px solid #e0e0e0' }}>
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              padding: '12px 24px',
              borderRadius: 8,
              border: '1px solid #ccc',
              background: '#fff',
              color: '#333',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: 15,
              fontWeight: 600,
              opacity: saving ? 0.5 : 1
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 24px',
              borderRadius: 8,
              border: 'none',
              background: 'var(--primary)',
              color: '#fff',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: 15,
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(0, 97, 255, 0.25)',
              opacity: saving ? 0.5 : 1
            }}
          >
            <Save size={18} />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}
