import { X } from 'lucide-react'

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
        padding: '1.5rem',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#ffffff'
      }}
    >
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>
          {mode === 'create' ? 'Create Purchase Order' : 'Edit Purchase Order'}
        </h2>
        {poNumber && (
          <p style={{ 
            fontSize: '0.875rem', 
            color: '#6b7280', 
            margin: '0.25rem 0 0 0',
            fontWeight: '500'
          }}>
            PO Number: <span style={{ color: '#3b82f6', fontWeight: '600' }}>{poNumber}</span>
          </p>
        )}
      </div>
      <button
        onClick={onClose}
        style={{
          padding: '0.5rem',
          border: 'none',
          backgroundColor: 'transparent',
          cursor: 'pointer',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          transition: 'background-color 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#f3f4f6'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent'
        }}
        aria-label="Close modal"
      >
        <X size={20} color="#6b7280" />
      </button>
    </div>
  )
}
