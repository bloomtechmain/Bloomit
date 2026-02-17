import { AlertTriangle } from 'lucide-react'

interface DeletePOConfirmModalProps {
  poNumber: string
  status: string
  totalAmount: number
  onConfirm: () => void
  onCancel: () => void
}

export default function DeletePOConfirmModal({
  poNumber,
  status,
  totalAmount,
  onConfirm,
  onCancel
}: DeletePOConfirmModalProps) {
  const getWarningMessage = () => {
    switch (status) {
      case 'PAID':
        return 'This purchase order has been PAID. Deleting it will permanently remove all payment records.'
      case 'APPROVED':
        return 'This purchase order has been APPROVED. Deleting it may affect financial records.'
      case 'REJECTED':
        return 'This rejected purchase order will be permanently deleted from the system.'
      default:
        return 'This pending purchase order will be permanently deleted from the system.'
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '1rem'
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '12px',
        padding: '2rem',
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: '#fef2f2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <AlertTriangle size={24} color="#dc2626" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#1f2937' }}>
              Delete Purchase Order
            </h2>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
              This action cannot be undone
            </p>
          </div>
        </div>

        <div style={{
          padding: '1rem',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          marginBottom: '1.5rem'
        }}>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#991b1b', lineHeight: 1.5 }}>
            <strong>Warning:</strong> {getWarningMessage()}
          </p>
        </div>

        <div style={{
          background: '#f9fafb',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>PO Number:</span>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1f2937' }}>{poNumber}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Status:</span>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '0.25rem 0.5rem',
              borderRadius: '6px',
              background: status === 'PAID' ? '#dbeafe' : status === 'APPROVED' ? '#d1fae5' : status === 'REJECTED' ? '#fee2e2' : '#fef3c7',
              color: status === 'PAID' ? '#1e40af' : status === 'APPROVED' ? '#065f46' : status === 'REJECTED' ? '#991b1b' : '#92400e'
            }}>
              {status}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Total Amount:</span>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1f2937' }}>
              LKR {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '0.625rem 1.25rem',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              background: '#fff',
              color: '#374151',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '0.625rem 1.25rem',
              borderRadius: '8px',
              border: 'none',
              background: '#dc2626',
              color: '#fff',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Delete Purchase Order
          </button>
        </div>
      </div>
    </div>
  )
}
