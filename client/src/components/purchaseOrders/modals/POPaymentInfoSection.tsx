import { CreditCard, Calendar, Hash, FileText, Lock } from 'lucide-react'
import type { PurchaseOrder } from '../../../types/purchaseOrders'

interface POPaymentInfoSectionProps {
  formData: Partial<PurchaseOrder> & {
    payment_method?: string
    check_number?: string
    payment_date?: string
    notes?: string
  }
  onChange: (field: string, value: any) => void
  isAdmin: boolean
  readOnly?: boolean
}

const PAYMENT_METHODS = [
  { value: 'DEPOSIT_CHECK', label: 'Deposit Check' },
  { value: 'PAYMENT_CHECK', label: 'Payment Check' },
  { value: 'CREDIT_CARD',   label: 'Credit Card' },
  { value: 'CASH',          label: 'Cash' },
  { value: 'PETTY_CASH',    label: 'Petty Cash' },
  { value: 'WIRE_TRANSFER', label: 'Wire Transfer' },
  { value: 'ACH',           label: 'ACH Transfer' },
  { value: 'OTHER',         label: 'Other' },
]

const MAX_NOTES = 1000

const inp: React.CSSProperties = {
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

export const POPaymentInfoSection: React.FC<POPaymentInfoSectionProps> = ({
  formData,
  onChange,
  isAdmin,
  readOnly = false,
}) => {
  const notesLen = formData.notes?.length || 0
  const isCheck = formData.payment_method === 'DEPOSIT_CHECK' || formData.payment_method === 'PAYMENT_CHECK'

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <CreditCard size={13} color="#6366f1" />
        </div>
        <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>Payment & Notes</span>
      </div>

      {/* Payment Method + Date */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <label style={{ display: 'grid', gap: 5 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>
            <CreditCard size={11} color="#94a3b8" /> Payment Method
          </span>
          <select
            value={formData.payment_method || ''}
            onChange={e => onChange('payment_method', e.target.value || undefined)}
            disabled={readOnly}
            style={{ ...inp, cursor: readOnly ? 'not-allowed' : 'pointer', appearance: 'none', background: readOnly ? '#f1f5f9' : '#f8fafc' }}
            onFocus={fo}
            onBlur={bl}
          >
            <option value="">— Select Method —</option>
            {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </label>

        <label style={{ display: 'grid', gap: 5 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>
            <Calendar size={11} color="#94a3b8" /> Expected Payment Date
          </span>
          <input
            type="date"
            value={formData.payment_date ? formData.payment_date.split('T')[0] : ''}
            onChange={e => onChange('payment_date', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
            disabled={readOnly}
            style={{ ...inp, cursor: readOnly ? 'not-allowed' : 'text', background: readOnly ? '#f1f5f9' : '#f8fafc' }}
            onFocus={fo}
            onBlur={bl}
          />
        </label>
      </div>

      {/* Check Number — conditional */}
      {isCheck && (
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'grid', gap: 5 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>
              <Hash size={11} color="#94a3b8" /> Check Number
            </span>
            <input
              type="text"
              value={formData.check_number || ''}
              onChange={e => onChange('check_number', e.target.value)}
              disabled={readOnly}
              style={{ ...inp, background: readOnly ? '#f1f5f9' : '#f8fafc' }}
              placeholder="Enter check number"
              onFocus={fo}
              onBlur={bl}
            />
          </label>
        </div>
      )}

      {/* Notes */}
      <div style={{ marginBottom: isAdmin ? 12 : 0 }}>
        <label style={{ display: 'grid', gap: 5 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>
              <FileText size={11} color="#94a3b8" /> Notes
            </span>
            <span style={{ fontSize: 11, color: notesLen > MAX_NOTES * 0.9 ? '#ef4444' : '#94a3b8', fontWeight: notesLen > MAX_NOTES * 0.9 ? 700 : 400 }}>
              {notesLen} / {MAX_NOTES}
            </span>
          </div>
          <textarea
            value={formData.notes || ''}
            onChange={e => { if (e.target.value.length <= MAX_NOTES) onChange('notes', e.target.value) }}
            disabled={readOnly}
            rows={3}
            style={{
              ...inp,
              resize: 'vertical',
              lineHeight: 1.6,
              cursor: readOnly ? 'not-allowed' : 'text',
              background: readOnly ? '#f1f5f9' : '#f8fafc',
            } as React.CSSProperties}
            placeholder="Add any additional notes or special instructions..."
            onFocus={fo as any}
            onBlur={bl as any}
          />
          <span style={{ fontSize: 11, color: '#94a3b8' }}>Visible to all users who can view this PO</span>
        </label>
      </div>

      {/* Admin-only internal notes */}
      {isAdmin && (
        <div style={{
          padding: '14px 16px',
          background: '#fffbeb',
          border: '1.5px solid #fcd34d',
          borderRadius: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Lock size={11} color="#b45309" />
            </div>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Internal Notes — Admin Only</span>
          </div>
          <textarea
            value={formData.notes || ''}
            onChange={e => onChange('internal_notes', e.target.value)}
            disabled={readOnly}
            rows={3}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: 8,
              border: '1.5px solid #fcd34d',
              background: readOnly ? '#fef9e7' : '#fffde7',
              fontSize: 13,
              color: '#78350f',
              outline: 'none',
              resize: 'vertical',
              fontFamily: 'inherit',
              lineHeight: 1.5,
              boxSizing: 'border-box' as const,
              transition: 'all 0.2s',
            }}
            placeholder="Internal notes visible only to administrators..."
            onFocus={e => { e.target.style.borderColor = '#f59e0b'; e.target.style.boxShadow = '0 0 0 3px rgba(245,158,11,0.1)' }}
            onBlur={e => { e.target.style.borderColor = '#fcd34d'; e.target.style.boxShadow = 'none' }}
          />
          <p style={{ fontSize: 11, color: '#92400e', margin: '6px 0 0', fontWeight: 500 }}>
            ⚠ These notes are only visible to admin users
          </p>
        </div>
      )}
    </div>
  )
}
