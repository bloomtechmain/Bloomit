import { useState, useEffect } from 'react'
import { FileText, X, Hash, Building2, DollarSign, CreditCard, SlidersHorizontal, AlignLeft } from 'lucide-react'
import type { Contract } from '../types/projects'
import { contractsApi } from '../services/projectsApi'
import { useToast } from '../context/ToastContext'

interface ContractModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  projectId: number
  contract?: Contract | null
  mode: 'create' | 'edit'
}

const INPUT_BASE: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 10,
  border: '1.5px solid #e2e8f0',
  background: '#f8fafc',
  fontSize: 13.5,
  color: '#1e293b',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  transition: 'all 0.2s',
}

const ACCENT = '#7c3aed'
const ACCENT_SHADOW = 'rgba(124,58,237,0.12)'

function focusIn(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  e.target.style.borderColor = ACCENT
  e.target.style.background = '#fff'
  e.target.style.boxShadow = `0 0 0 3px ${ACCENT_SHADOW}`
}
function focusOut(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  e.target.style.borderColor = '#e2e8f0'
  e.target.style.background = '#f8fafc'
  e.target.style.boxShadow = 'none'
}

const PAYMENT_CONFIG: Record<string, { color: string }> = {
  Pending:  { color: '#d97706' },
  Partial:  { color: '#2563eb' },
  Complete: { color: '#059669' },
}

const STATUS_CONFIG: Record<string, { color: string }> = {
  ongoing:   { color: '#7c3aed' },
  completed: { color: '#059669' },
  paused:    { color: '#d97706' },
}

export const ContractModal: React.FC<ContractModalProps> = ({
  isOpen, onClose, onSuccess, projectId, contract, mode
}) => {
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    contract_name: '',
    customer_name: '',
    description: '',
    initial_cost_budget: '',
    extra_budget_allocation: '0',
    payment_type: 'Pending' as 'Pending' | 'Partial' | 'Complete',
    status: 'ongoing' as 'ongoing' | 'completed' | 'paused'
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (mode === 'edit' && contract) {
      setFormData({
        contract_name: contract.contract_name,
        customer_name: contract.customer_name,
        description: contract.description || '',
        initial_cost_budget: contract.initial_cost_budget.toString(),
        extra_budget_allocation: contract.extra_budget_allocation.toString(),
        payment_type: contract.payment_type,
        status: contract.status
      })
    } else {
      setFormData({ contract_name: '', customer_name: '', description: '', initial_cost_budget: '', extra_budget_allocation: '0', payment_type: 'Pending', status: 'ongoing' })
    }
  }, [mode, contract, isOpen])

  const handleSubmit = async () => {
    if (!formData.contract_name.trim()) { toast.error('Contract name is required'); return }
    if (!formData.customer_name.trim()) { toast.error('Customer name is required'); return }
    if (!formData.initial_cost_budget || isNaN(Number(formData.initial_cost_budget)) || Number(formData.initial_cost_budget) < 0) {
      toast.error('Please enter a valid initial cost budget'); return
    }
    if (isNaN(Number(formData.extra_budget_allocation)) || Number(formData.extra_budget_allocation) < 0) {
      toast.error('Please enter a valid extra budget allocation'); return
    }

    setLoading(true)
    try {
      const payload = {
        contract_name: formData.contract_name.trim(),
        customer_name: formData.customer_name.trim(),
        description: formData.description.trim() || undefined,
        initial_cost_budget: Number(formData.initial_cost_budget),
        extra_budget_allocation: Number(formData.extra_budget_allocation),
        payment_type: formData.payment_type,
        status: formData.status
      }
      if (mode === 'create') {
        await contractsApi.create(projectId, payload)
        toast.success('Contract created successfully')
      } else if (mode === 'edit' && contract) {
        await contractsApi.update(projectId, contract.contract_id, payload)
        toast.success('Contract updated successfully')
      }
      onSuccess()
      onClose()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save contract')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const initials = formData.contract_name
    ? formData.contract_name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
    : null

  return (
    <>
      <div className="emp-drawer-overlay" onClick={() => !loading && onClose()} />
      <div className="emp-drawer">

        {/* Header */}
        <div style={{ background: 'linear-gradient(160deg, #0f172a 0%, #4c1d95 55%, #7c3aed 100%)', padding: '24px 24px 20px', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
          <div style={{ position: 'absolute', top: -50, right: -50, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -30, left: 30, width: 110, height: 110, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />

          {/* Title row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, position: 'relative' }}>
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Contracts</div>
              <div style={{ color: '#fff', fontSize: 19, fontWeight: 700, letterSpacing: '-0.3px' }}>
                {mode === 'create' ? 'New Contract' : 'Edit Contract'}
              </div>
            </div>
            <button onClick={() => !loading && onClose()} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, color: 'rgba(255,255,255,0.7)', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <X size={16} />
            </button>
          </div>

          {/* Preview */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative' }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: initials ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' : 'rgba(255,255,255,0.1)', border: '2.5px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#fff', boxShadow: initials ? '0 4px 16px rgba(124,58,237,0.4)' : 'none', transition: 'all 0.3s', flexShrink: 0 }}>
              {initials || <FileText size={24} color="rgba(255,255,255,0.35)" />}
            </div>
            <div>
              <div style={{ color: '#fff', fontSize: 15, fontWeight: 600, letterSpacing: '-0.1px', minHeight: 22 }}>
                {formData.contract_name || 'New Contract'}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.42)', fontSize: 12, marginTop: 3 }}>
                {formData.customer_name ? `Client: ${formData.customer_name}` : 'No client yet'}
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="emp-drawer-body">

          {/* Section: Contract Details */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FileText size={13} color={ACCENT} />
              </div>
              <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>Contract Details</span>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'grid', gap: 5 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>
                  <Hash size={11} color="#94a3b8" /> Contract Name *
                </span>
                <input type="text" value={formData.contract_name} onChange={e => setFormData({ ...formData, contract_name: e.target.value })}
                  placeholder="e.g. Phase 1 - Development" disabled={loading}
                  style={{ ...INPUT_BASE, opacity: loading ? 0.6 : 1 }} onFocus={focusIn} onBlur={focusOut} />
              </label>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'grid', gap: 5 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>
                  <Building2 size={11} color="#94a3b8" /> Customer Name *
                </span>
                <input type="text" value={formData.customer_name} onChange={e => setFormData({ ...formData, customer_name: e.target.value })}
                  placeholder="e.g. Acme Corporation" disabled={loading}
                  style={{ ...INPUT_BASE, opacity: loading ? 0.6 : 1 }} onFocus={focusIn} onBlur={focusOut} />
              </label>
            </div>

            <div>
              <label style={{ display: 'grid', gap: 5 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>
                  <AlignLeft size={11} color="#94a3b8" /> Description
                </span>
                <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief contract description..." disabled={loading} rows={3}
                  style={{ ...INPUT_BASE, resize: 'vertical', opacity: loading ? 0.6 : 1 }} onFocus={focusIn} onBlur={focusOut} />
              </label>
            </div>
          </div>

          <div style={{ height: 1, background: 'linear-gradient(to right, #e2e8f0, transparent)', marginBottom: 24 }} />

          {/* Section: Budget */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <DollarSign size={13} color={ACCENT} />
              </div>
              <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>Budget</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label style={{ display: 'grid', gap: 5 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>
                  <DollarSign size={11} color="#94a3b8" /> Initial Budget *
                </span>
                <input type="number" value={formData.initial_cost_budget} onChange={e => setFormData({ ...formData, initial_cost_budget: e.target.value })}
                  placeholder="0.00" disabled={loading} min="0" step="0.01"
                  style={{ ...INPUT_BASE, opacity: loading ? 0.6 : 1 }} onFocus={focusIn} onBlur={focusOut} />
              </label>
              <label style={{ display: 'grid', gap: 5 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>
                  <DollarSign size={11} color="#94a3b8" /> Extra Budget
                </span>
                <input type="number" value={formData.extra_budget_allocation} onChange={e => setFormData({ ...formData, extra_budget_allocation: e.target.value })}
                  placeholder="0.00" disabled={loading} min="0" step="0.01"
                  style={{ ...INPUT_BASE, opacity: loading ? 0.6 : 1 }} onFocus={focusIn} onBlur={focusOut} />
              </label>
            </div>
          </div>

          <div style={{ height: 1, background: 'linear-gradient(to right, #e2e8f0, transparent)', marginBottom: 24 }} />

          {/* Section: Payment Type */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CreditCard size={13} color={ACCENT} />
              </div>
              <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>Payment Type</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['Pending', 'Partial', 'Complete'] as const).map(p => {
                const c = PAYMENT_CONFIG[p].color
                return (
                  <button key={p} type="button" disabled={loading} onClick={() => setFormData({ ...formData, payment_type: p })}
                    style={{ flex: 1, padding: '9px 4px', borderRadius: 10, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                      border: `1.5px solid ${formData.payment_type === p ? c : '#e2e8f0'}`,
                      background: formData.payment_type === p ? `${c}14` : '#f8fafc',
                      color: formData.payment_type === p ? c : '#94a3b8',
                      boxShadow: formData.payment_type === p ? `0 0 0 3px ${c}18` : 'none' }}>
                    {p}
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ height: 1, background: 'linear-gradient(to right, #e2e8f0, transparent)', marginBottom: 24 }} />

          {/* Section: Status */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <SlidersHorizontal size={13} color={ACCENT} />
              </div>
              <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>Status</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['ongoing', 'paused', 'completed'] as const).map(s => {
                const c = STATUS_CONFIG[s].color
                const label = s.charAt(0).toUpperCase() + s.slice(1)
                return (
                  <button key={s} type="button" disabled={loading} onClick={() => setFormData({ ...formData, status: s })}
                    style={{ flex: 1, padding: '9px 4px', borderRadius: 10, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                      border: `1.5px solid ${formData.status === s ? c : '#e2e8f0'}`,
                      background: formData.status === s ? `${c}14` : '#f8fafc',
                      color: formData.status === s ? c : '#94a3b8',
                      boxShadow: formData.status === s ? `0 0 0 3px ${c}18` : 'none' }}>
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', background: '#fff', display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0 }}>
          <button type="button" onClick={() => !loading && onClose()} disabled={loading}
            style={{ padding: '10px 20px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: 'transparent', color: '#64748b', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
            Cancel
          </button>
          <button type="button" onClick={handleSubmit} disabled={loading}
            style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #4c1d95, #7c3aed)', color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 14px rgba(124,58,237,0.3)' }}>
            {loading ? 'Saving...' : mode === 'create' ? '+ Create Contract' : 'Save Changes'}
          </button>
        </div>

      </div>
    </>
  )
}
