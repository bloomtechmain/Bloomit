import type { PurchaseOrder } from '../../../types/purchaseOrders'

interface POStatusBadgeProps {
  status: PurchaseOrder['status']
  size?: 'small' | 'medium' | 'large'
}

export const POStatusBadge: React.FC<POStatusBadgeProps> = ({ status, size = 'medium' }) => {
  const getStatusStyles = () => {
    switch (status) {
      case 'PENDING':
        return {
          backgroundColor: '#fef3c7',
          color: '#92400e',
          borderColor: '#fbbf24'
        }
      case 'APPROVED':
        return {
          backgroundColor: '#d1fae5',
          color: '#065f46',
          borderColor: '#10b981'
        }
      case 'REJECTED':
        return {
          backgroundColor: '#fee2e2',
          color: '#991b1b',
          borderColor: '#ef4444'
        }
      case 'PAID':
        return {
          backgroundColor: '#dbeafe',
          color: '#1e40af',
          borderColor: '#3b82f6'
        }
      default:
        return {
          backgroundColor: '#f3f4f6',
          color: '#374151',
          borderColor: '#9ca3af'
        }
    }
  }

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          fontSize: '0.75rem',
          padding: '0.25rem 0.5rem',
          fontWeight: '500' as const
        }
      case 'large':
        return {
          fontSize: '1rem',
          padding: '0.625rem 1rem',
          fontWeight: '600' as const
        }
      case 'medium':
      default:
        return {
          fontSize: '0.875rem',
          padding: '0.375rem 0.75rem',
          fontWeight: '600' as const
        }
    }
  }

  const statusStyles = getStatusStyles()
  const sizeStyles = getSizeStyles()

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: '6px',
        border: `1.5px solid ${statusStyles.borderColor}`,
        backgroundColor: statusStyles.backgroundColor,
        color: statusStyles.color,
        ...sizeStyles,
        textTransform: 'uppercase',
        letterSpacing: '0.025em'
      }}
    >
      {status}
    </span>
  )
}
