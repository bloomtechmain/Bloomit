import { useState, useEffect } from 'react'
import { Save, X, Plus, Trash2, Globe, Info } from 'lucide-react'
import { updateEmployeePayrollData } from '../services/payrollService'
import type { EmployeePayrollData } from '../types/payroll'
import { useToast } from '../context/ToastContext'
import {
  COUNTRY_PRESETS,
  getStoredPreset,
  storePresetCode,
  getCustomEmployerRates,
  storeCustomEmployerRates,
  type CountryPreset,
} from '../config/payrollPresets'

type Props = {
  employee: EmployeePayrollData
  isOpen: boolean
  onClose: () => void
  onSave: () => void
}

const inp: React.CSSProperties = {
  width: '100%',
  padding: '10px 13px',
  borderRadius: 9,
  border: '1.5px solid #e2e8f0',
  background: '#f8fafc',
  fontSize: 13.5,
  color: '#1e293b',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'all 0.2s',
  fontFamily: 'inherit',
}
const fo = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
  e.target.style.borderColor = '#3b82f6'
  e.target.style.background = '#fff'
  e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)'
}
const bl = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
  e.target.style.borderColor = '#e2e8f0'
  e.target.style.background = '#f8fafc'
  e.target.style.boxShadow = 'none'
}

const SectionHead = ({ label }: { label: string }) => (
  <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
    {label}
  </div>
)

export default function EmployeePayrollSettingsModal({ employee, isOpen, onClose, onSave }: Props) {
  const { toast } = useToast()

  // Country preset
  const [preset, setPreset] = useState<CountryPreset>(getStoredPreset())
  const [customEr1, setCustomEr1] = useState(0)
  const [customEr2, setCustomEr2] = useState(0)

  // Basic info
  const [baseSalary, setBaseSalary] = useState('')
  const [department, setDepartment] = useState('')

  // Allowances
  const [allowances, setAllowances] = useState<Record<string, number>>({})
  const [newAllowanceName, setNewAllowanceName] = useState('')
  const [newAllowanceAmount, setNewAllowanceAmount] = useState('')

  // Scheme 1 (EPF-equivalent)
  const [scheme1Enabled, setScheme1Enabled] = useState(false)
  const [scheme1EmployeeRate, setScheme1EmployeeRate] = useState('')

  // Scheme 2 (ETF-equivalent)
  const [scheme2Enabled, setScheme2Enabled] = useState(false)

  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    const stored = getStoredPreset()
    const { rate1, rate2 } = getCustomEmployerRates()
    setPreset(stored)
    setCustomEr1(rate1)
    setCustomEr2(rate2)
    setBaseSalary(employee.base_salary?.toString() || '')
    setDepartment(employee.employee_department || '')
    setAllowances(employee.allowances || {})
    setScheme1Enabled(employee.epf_enabled || false)
    setScheme1EmployeeRate(employee.epf_contribution_rate?.toString() || stored.scheme1.employeeRate.toString())
    setScheme2Enabled(employee.etf_enabled || false)
  }, [employee, isOpen])

  const handlePresetChange = (code: string) => {
    const p = COUNTRY_PRESETS.find(x => x.code === code)!
    setPreset(p)
    storePresetCode(code)
    // Reset rates to preset defaults
    setScheme1EmployeeRate(p.scheme1.employeeRate.toString())
  }

  const effectiveScheme1EmployerRate = preset.code === 'custom' ? customEr1 : preset.scheme1.employerRate
  const effectiveScheme2EmployerRate = preset.code === 'custom' ? customEr2 : (preset.scheme2?.employerRate ?? 0)

  const handleAddAllowance = () => {
    if (!newAllowanceName.trim() || !newAllowanceAmount) return
    setAllowances({ ...allowances, [newAllowanceName.trim()]: Number(newAllowanceAmount) })
    setNewAllowanceName('')
    setNewAllowanceAmount('')
  }

  const handleRemoveAllowance = (key: string) => {
    const u = { ...allowances }
    delete u[key]
    setAllowances(u)
  }

  const handleSave = async () => {
    if (!baseSalary || Number(baseSalary) <= 0) {
      toast.error('Please enter a valid base salary')
      return
    }
    const rate = Number(scheme1EmployeeRate)
    if (scheme1Enabled && rate < preset.scheme1.minEmployeeRate) {
      toast.error(`${preset.scheme1.name} employee rate must be at least ${preset.scheme1.minEmployeeRate}%`)
      return
    }

    if (preset.code === 'custom') {
      storeCustomEmployerRates(customEr1, customEr2)
    }

    setSaving(true)
    try {
      await updateEmployeePayrollData(employee.employee_id, {
        base_salary: Number(baseSalary),
        allowances,
        epf_enabled: scheme1Enabled,
        epf_contribution_rate: rate,
        etf_enabled: scheme2Enabled,
        employee_department: department,
      })
      toast.success('Payroll settings saved!')
      onSave()
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  const initials = (employee.name || '??').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 1200 }}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 'min(520px, 100vw)',
        background: '#fff',
        zIndex: 1201,
        display: 'flex', flexDirection: 'column',
        boxShadow: '-6px 0 32px rgba(0,0,0,0.14)',
        animation: 'slideInFromRight 0.27s cubic-bezier(0.25,0.8,0.25,1)',
      }}>

        {/* ── Header ── */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 60%, #2563eb 100%)',
          padding: '28px 24px 22px',
          flexShrink: 0,
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -30, left: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
          <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, zIndex: 1 }}>
            <X size={16} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative', zIndex: 1 }}>
            <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
              {initials}
            </div>
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>Payroll Settings</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>{employee.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Changes apply to all future payslips</div>
            </div>
          </div>
        </div>

        {/* ── Scrollable Body ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Country / Region Preset */}
          <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
            <SectionHead label="Country / Region" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Globe size={14} color="#64748b" />
              <span style={{ fontSize: 12.5, fontWeight: 600, color: '#475569' }}>Statutory deduction scheme</span>
            </div>
            <select
              value={preset.code}
              onChange={e => handlePresetChange(e.target.value)}
              style={{ ...inp, appearance: 'none', cursor: 'pointer', fontWeight: 600 }}
              onFocus={fo} onBlur={bl}
            >
              {COUNTRY_PRESETS.map(p => (
                <option key={p.code} value={p.code}>{p.flag} {p.label}</option>
              ))}
            </select>

            {/* Preset info card */}
            <div style={{ marginTop: 10, background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 8, padding: '10px 12px', display: 'flex', gap: 8 }}>
              <Info size={13} color="#3b82f6" style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.55 }}>{preset.notes}</div>
            </div>
          </div>

          {/* Basic Information */}
          <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
            <SectionHead label="Basic Information" />
            <div style={{ display: 'grid', gap: 14 }}>
              <label style={{ display: 'grid', gap: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>
                  Base Monthly Salary {preset.currencySymbol && <span style={{ color: '#94a3b8' }}>({preset.currencySymbol})</span>} <span style={{ color: '#ef4444' }}>*</span>
                </span>
                <input type="number" value={baseSalary} onChange={e => setBaseSalary(e.target.value)} placeholder="e.g. 50000" style={inp} onFocus={fo} onBlur={bl} />
              </label>
              <label style={{ display: 'grid', gap: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Department</span>
                <input type="text" value={department} onChange={e => setDepartment(e.target.value)} placeholder="e.g. Engineering, Finance" style={inp} onFocus={fo} onBlur={bl} />
              </label>
            </div>
          </div>

          {/* Default Allowances */}
          <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
            <SectionHead label="Default Allowances" />
            <p style={{ margin: '0 0 12px', fontSize: 12.5, color: '#64748b' }}>Auto-included in every payslip for this employee</p>

            <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
              {Object.entries(allowances).map(([key, value]) => (
                <div key={key} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="text" value={key} readOnly style={{ ...inp, flex: 1, background: '#fff', cursor: 'default' }} />
                  <input
                    type="number"
                    value={value}
                    onChange={e => setAllowances({ ...allowances, [key]: Number(e.target.value) })}
                    style={{ ...inp, width: 110 }}
                    onFocus={fo} onBlur={bl}
                  />
                  <button onClick={() => handleRemoveAllowance(key)} style={{ width: 34, height: 34, borderRadius: 8, border: 'none', background: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <input type="text" placeholder="Allowance name" value={newAllowanceName} onChange={e => setNewAllowanceName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddAllowance()} style={{ ...inp, flex: 1 }} onFocus={fo} onBlur={bl} />
              <input type="number" placeholder="Amount" value={newAllowanceAmount} onChange={e => setNewAllowanceAmount(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddAllowance()} style={{ ...inp, width: 110 }} onFocus={fo} onBlur={bl} />
              <button onClick={handleAddAllowance} style={{ width: 34, height: 34, borderRadius: 8, border: 'none', background: 'rgba(16,185,129,0.12)', color: '#059669', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Plus size={15} />
              </button>
            </div>
          </div>

          {/* Scheme 1 */}
          <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
            <SectionHead label={`${preset.scheme1.name} — ${preset.scheme1.fullName}`} />

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 14 }}>
              <div
                onClick={() => setScheme1Enabled(v => !v)}
                style={{
                  width: 42, height: 24, borderRadius: 99, position: 'relative', cursor: 'pointer', flexShrink: 0,
                  background: scheme1Enabled ? '#3b82f6' : '#cbd5e1',
                  transition: 'background 0.2s',
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', background: '#fff',
                  position: 'absolute', top: 3,
                  left: scheme1Enabled ? 21 : 3,
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                }} />
              </div>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: '#1e293b' }}>Enable {preset.scheme1.name} Deduction</span>
            </label>

            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 14, lineHeight: 1.55 }}>{preset.scheme1.description}</div>

            {scheme1Enabled && (
              <div style={{ display: 'grid', gap: 12 }}>
                <label style={{ display: 'grid', gap: 5 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>
                    Employee Contribution Rate (%)
                    {preset.scheme1.minEmployeeRate > 0 && <span style={{ color: '#94a3b8', fontWeight: 400 }}> — min {preset.scheme1.minEmployeeRate}%</span>}
                  </span>
                  <input
                    type="number" step="0.01" min={preset.scheme1.minEmployeeRate} max={100}
                    value={scheme1EmployeeRate}
                    onChange={e => setScheme1EmployeeRate(e.target.value)}
                    style={inp} onFocus={fo} onBlur={bl}
                    readOnly={!preset.scheme1.employeeEditable}
                  />
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Employee</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#2563eb' }}>{scheme1EmployeeRate || '0'}%</div>
                  </div>
                  <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Employer</div>
                    {preset.code === 'custom' ? (
                      <input
                        type="number" step="0.01" min={0}
                        value={customEr1}
                        onChange={e => setCustomEr1(Number(e.target.value))}
                        style={{ ...inp, padding: '2px 6px', fontSize: 16, fontWeight: 800, color: '#059669', background: 'transparent', border: 'none', width: '100%' }}
                      />
                    ) : (
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#059669' }}>{effectiveScheme1EmployerRate}%</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Scheme 2 */}
          {preset.scheme2 && (
            <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
              <SectionHead label={`${preset.scheme2.name} — ${preset.scheme2.fullName}`} />

              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 14 }}>
                <div
                  onClick={() => setScheme2Enabled(v => !v)}
                  style={{
                    width: 42, height: 24, borderRadius: 99, position: 'relative', cursor: 'pointer', flexShrink: 0,
                    background: scheme2Enabled ? '#3b82f6' : '#cbd5e1',
                    transition: 'background 0.2s',
                  }}
                >
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%', background: '#fff',
                    position: 'absolute', top: 3,
                    left: scheme2Enabled ? 21 : 3,
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                  }} />
                </div>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: '#1e293b' }}>Enable {preset.scheme2.name}</span>
              </label>

              <div style={{ fontSize: 12, color: '#64748b', marginBottom: scheme2Enabled ? 14 : 0, lineHeight: 1.55 }}>{preset.scheme2.description}</div>

              {scheme2Enabled && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {preset.scheme2.employeeRate > 0 && (
                    <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Employee</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#2563eb' }}>{preset.scheme2.employeeRate}%</div>
                      <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 2 }}>Add as Other Deduction</div>
                    </div>
                  )}
                  <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Employer</div>
                    {preset.code === 'custom' ? (
                      <input
                        type="number" step="0.01" min={0}
                        value={customEr2}
                        onChange={e => setCustomEr2(Number(e.target.value))}
                        style={{ ...inp, padding: '2px 6px', fontSize: 16, fontWeight: 800, color: '#059669', background: 'transparent', border: 'none', width: '100%' }}
                      />
                    ) : (
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#059669' }}>{effectiveScheme2EmployerRate}%</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* ── Footer ── */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: '#fff', flexShrink: 0, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} disabled={saving} style={{ padding: '10px 20px', borderRadius: 9, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 22px', borderRadius: 9, border: 'none',
              background: saving ? '#e2e8f0' : 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
              color: saving ? '#94a3b8' : '#fff',
              fontSize: 13.5, fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              boxShadow: saving ? 'none' : '0 4px 14px rgba(59,130,246,0.3)',
              transition: 'all 0.2s',
            }}
          >
            <Save size={15} />
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </div>
    </>
  )
}
