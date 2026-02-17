import { X } from 'lucide-react'
import { POStatusBadge } from '../shared/POStatusBadge'
import type { PurchaseOrder } from '../../../types/purchaseOrders'

interface POHeaderDisplayProps {
  poNumber: string
  status: PurchaseOrder['status']
  createdAt: string
  requestedBy: string
  onClose: () => void
}

export const POHeaderDisplay: React.FC<POHeaderDisplayProps> = ({
  poNumber,
  status,
  createdAt,
  requestedBy,
  onClose
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div
      style={{
        padding: '1.5rem',
        borderBottom: '2px solid #e5e7eb',
        backgroundColor: '#ffffff'
      }}
    >
      {/* Header Row with Close Button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '1rem'
        }}
      >
        <div style={{ flex: 1 }}>
          {/* Large PO Number */}
          <h2
            style={{
              fontSize: '1.875rem',
              fontWeight: '700',
              color: '#1f2937',
              margin: 0,
              marginBottom: '0.5rem'
            }}
          >
            Purchase Order{' '}
            <span style={{ color: '#3b82f6' }}>{poNumber}</span>
          </h2>

          {/* Status Badge */}
          <div style={{ marginBottom: '0.75rem' }}>
            <POStatusBadge status={status} size="large" />
          </div>
        </div>

        {/* Close Button */}
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
          <X size={24} color="#6b7280" />
        </button>
      </div>

      {/* Info Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          padding: '1rem',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}
      >
        {/* Created Date */}
        <div>
          <p
            style={{
              fontSize: '0.75rem',
              fontWeight: '500',
              color: '#6b7280',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              margin: 0,
              marginBottom: '0.25rem'
            }}
          >
            Created
          </p>
          <p
            style={{
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#1f2937',
              margin: 0
            }}
          >
            {formatDate(createdAt)}
          </p>
        </div>

        {/* Requested By */}
        <div>
          <p
            style={{
              fontSize: '0.75rem',
              fontWeight: '500',
              color: '#6b7280',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              margin: 0,
              marginBottom: '0.25rem'
            }}
          >
            Requested By
          </p>
          <p
            style={{
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#1f2937',
              margin: 0
            }}
          >
            {requestedBy}
          </p>
        </div>
      </div>
    </div>
  )
}
