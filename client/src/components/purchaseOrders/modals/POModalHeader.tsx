import { X, ShoppingCart, FileText } from 'lucide-react'

interface POModalHeaderProps {
  mode: 'create' | 'edit'
  poNumber?: string
  onClose: () => void
}

export const POModalHeader: React.FC<POModalHeaderProps> = ({
  mode,
  poNumber,
  onClose
}) => {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #3b82f6 100%)',
        padding: '1.5rem 1.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0
      }}
    >
      {/* Decorative background icons */}
      <ShoppingCart
        size={160}
        strokeWidth={0.6}
        style={{ position: 'absolute', right: -20, top: -30, opacity: 0.08, color: '#fff', pointerEvents: 'none' }}
      />
      <FileText
        size={90}
        strokeWidth={0.6}
        style={{ position: 'absolute', right: 130, bottom: -20, opacity: 0.06, color: '#fff', pointerEvents: 'none' }}
      />

      {/* Left: icon + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative', zIndex: 1 }}>
        <div style={{
          width: 46,
          height: 46,
          borderRadius: 12,
          background: 'rgba(255,255,255,0.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <ShoppingCart size={22} color="#fff" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.2 }}>
              {mode === 'create' ? 'Create Purchase Order' : 'Edit Purchase Order'}
            </h2>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 20,
              background: mode === 'create' ? 'rgba(255,255,255,0.22)' : 'rgba(251,191,36,0.28)',
              color: '#fff',
              letterSpacing: '0.04em',
              textTransform: 'uppercase' as const
            }}>
              {mode === 'create' ? 'New' : 'Edit'}
            </span>
          </div>
          {poNumber && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.25rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>PO Number:</span>
              <span style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#fff',
                background: 'rgba(255,255,255,0.15)',
                padding: '1px 8px',
                borderRadius: 10,
                letterSpacing: '0.03em'
              }}>
                {poNumber}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Right: close button */}
      <button
        onClick={onClose}
        style={{
          position: 'relative',
          zIndex: 1,
          padding: '0.45rem',
          border: '1.5px solid rgba(255,255,255,0.3)',
          backgroundColor: 'rgba(255,255,255,0.12)',
          cursor: 'pointer',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          transition: 'all 0.2s',
          flexShrink: 0
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.25)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)'
        }}
        aria-label="Close modal"
      >
        <X size={18} color="#fff" />
      </button>
    </div>
  )
}
