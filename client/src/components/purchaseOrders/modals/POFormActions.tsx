import { AlertCircle, Loader2, ShoppingCart } from 'lucide-react'

interface POFormActionsProps {
  onSubmit: () => Promise<void>
  onCancel: () => void
  isSubmitting: boolean
  isValid: boolean
  validationErrors?: string[]
  mode: 'create' | 'edit'
}

export const POFormActions: React.FC<POFormActionsProps> = ({
  onSubmit,
  onCancel,
  isSubmitting,
  isValid,
  validationErrors = [],
  mode
}) => {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isValid && !isSubmitting) await onSubmit()
  }

  return (
    <div style={{ flexShrink: 0 }}>
      {/* Validation errors — shown above footer */}
      {validationErrors.length > 0 && (
        <div style={{
          padding: '10px 24px',
          background: '#fff1f2',
          borderTop: '1px solid #fecdd3',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <AlertCircle size={15} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#991b1b', margin: '0 0 4px' }}>Please fix the following:</p>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: '#dc2626' }}>
                {validationErrors.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{
        padding: '14px 24px',
        borderTop: '1px solid #f1f5f9',
        background: '#fff',
        display: 'flex',
        gap: 10,
        justifyContent: 'flex-end',
        alignItems: 'center',
      }}>
        {!isValid && validationErrors.length === 0 && (
          <span style={{ fontSize: 11.5, color: '#94a3b8', marginRight: 'auto' }}>Fill in all required fields to submit</span>
        )}

        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          style={{
            padding: '10px 20px',
            borderRadius: 10,
            border: '1.5px solid #e2e8f0',
            background: 'transparent',
            color: '#64748b',
            fontSize: 13.5,
            fontWeight: 600,
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            opacity: isSubmitting ? 0.6 : 1,
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { if (!isSubmitting) { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1' } }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#e2e8f0' }}
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!isValid || isSubmitting}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 24px',
            borderRadius: 10,
            border: 'none',
            background: !isValid || isSubmitting
              ? '#e2e8f0'
              : 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
            color: !isValid || isSubmitting ? '#94a3b8' : '#fff',
            fontSize: 13.5,
            fontWeight: 600,
            cursor: !isValid || isSubmitting ? 'not-allowed' : 'pointer',
            boxShadow: !isValid || isSubmitting ? 'none' : '0 4px 14px rgba(59,130,246,0.35)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { if (isValid && !isSubmitting) e.currentTarget.style.boxShadow = '0 6px 20px rgba(59,130,246,0.45)' }}
          onMouseLeave={e => { if (isValid && !isSubmitting) e.currentTarget.style.boxShadow = '0 4px 14px rgba(59,130,246,0.35)' }}
        >
          {isSubmitting
            ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> {mode === 'create' ? 'Creating...' : 'Updating...'}</>
            : <><ShoppingCart size={15} /> {mode === 'create' ? 'Create Purchase Order' : 'Update Purchase Order'}</>
          }
        </button>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
