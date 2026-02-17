import { CheckCircle2, XCircle, Clock, Download, FileText, AlertCircle } from 'lucide-react'
import type { PurchaseOrder } from '../../../types/purchaseOrders'

interface POStatusTimelineProps {
  purchaseOrder: PurchaseOrder
  isAdmin: boolean
}

export const POStatusTimeline: React.FC<POStatusTimelineProps> = ({
  purchaseOrder,
  isAdmin
}) => {
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTimelineSteps = () => {
    const steps = [
      {
        label: 'Created',
        status: 'completed',
        date: purchaseOrder.created_at,
        icon: FileText,
        color: '#3b82f6'
      },
      {
        label: 'Pending Approval',
        status: purchaseOrder.status === 'PENDING' ? 'current' : 'completed',
        date: purchaseOrder.created_at,
        icon: Clock,
        color: '#f59e0b'
      }
    ]

    if (purchaseOrder.status === 'APPROVED' || purchaseOrder.status === 'PAID') {
      steps.push({
        label: 'Approved',
        status: purchaseOrder.status === 'APPROVED' ? 'current' : 'completed',
        date: purchaseOrder.approved_at || '',
        icon: CheckCircle2,
        color: '#10b981'
      })

      if (purchaseOrder.status === 'PAID') {
        steps.push({
          label: 'Paid',
          status: 'current',
          date: purchaseOrder.receipt_uploaded_at || '',
          icon: CheckCircle2,
          color: '#3b82f6'
        })
      }
    } else if (purchaseOrder.status === 'REJECTED') {
      steps.push({
        label: 'Rejected',
        status: 'current',
        date: purchaseOrder.approved_at || '',
        icon: XCircle,
        color: '#ef4444'
      })
    }

    return steps
  }

  const timelineSteps = getTimelineSteps()

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <h3
        style={{
          fontSize: '1rem',
          fontWeight: '600',
          color: '#374151',
          marginBottom: '1rem',
          paddingBottom: '0.5rem',
          borderBottom: '2px solid #e5e7eb'
        }}
      >
        Status & Timeline
      </h3>

      {/* Status Timeline Visualization */}
      <div
        style={{
          padding: '1.5rem',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          marginBottom: '1.5rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
          {timelineSteps.map((step, index) => {
            const Icon = step.icon
            const isLast = index === timelineSteps.length - 1
            const isCurrent = step.status === 'current'

            return (
              <div key={index} style={{ flex: 1, position: 'relative' }}>
                {/* Connector Line */}
                {!isLast && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '20px',
                      left: '50%',
                      width: '100%',
                      height: '2px',
                      backgroundColor: step.status === 'completed' ? step.color : '#d1d5db',
                      zIndex: 0
                    }}
                  />
                )}

                {/* Step Content */}
                <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
                  {/* Icon Circle */}
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: isCurrent || step.status === 'completed' ? step.color : '#e5e7eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 0.5rem',
                      border: isCurrent ? `3px solid ${step.color}40` : 'none',
                      boxShadow: isCurrent ? `0 0 0 4px ${step.color}20` : 'none'
                    }}
                  >
                    <Icon
                      size={20}
                      color="#ffffff"
                      strokeWidth={isCurrent ? 3 : 2}
                    />
                  </div>

                  {/* Label */}
                  <div
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: isCurrent ? '700' : '600',
                      color: isCurrent ? '#111827' : '#6b7280',
                      marginBottom: '0.25rem'
                    }}
                  >
                    {step.label}
                  </div>

                  {/* Date */}
                  {step.date && (
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: '#9ca3af',
                        fontWeight: '500'
                      }}
                    >
                      {formatDateTime(step.date)}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Approval Information */}
      {purchaseOrder.status === 'APPROVED' || purchaseOrder.status === 'PAID' ? (
        <div
          style={{
            padding: '1.25rem',
            backgroundColor: '#dcfce7',
            border: '1px solid #86efac',
            borderRadius: '8px',
            marginBottom: '1.5rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <CheckCircle2 size={20} color="#16a34a" style={{ marginTop: '2px', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <h4
                style={{
                  fontSize: '0.875rem',
                  fontWeight: '700',
                  color: '#166534',
                  margin: 0,
                  marginBottom: '0.5rem'
                }}
              >
                Approved
              </h4>
              <p style={{ fontSize: '0.875rem', color: '#166534', margin: 0, marginBottom: '0.25rem' }}>
                <strong>By:</strong> {purchaseOrder.approved_by_name || purchaseOrder.approved_by_user_name || 'Unknown'}
                {purchaseOrder.approved_by_title && ` (${purchaseOrder.approved_by_title})`}
              </p>
              {purchaseOrder.approved_at && (
                <p style={{ fontSize: '0.8125rem', color: '#15803d', margin: 0 }}>
                  <strong>On:</strong> {formatDateTime(purchaseOrder.approved_at)}
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Rejection Information */}
      {purchaseOrder.status === 'REJECTED' && (
        <div
          style={{
            padding: '1.25rem',
            backgroundColor: '#fee2e2',
            border: '1px solid #fca5a5',
            borderRadius: '8px',
            marginBottom: '1.5rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <AlertCircle size={20} color="#dc2626" style={{ marginTop: '2px', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <h4
                style={{
                  fontSize: '0.875rem',
                  fontWeight: '700',
                  color: '#991b1b',
                  margin: 0,
                  marginBottom: '0.5rem'
                }}
              >
                Rejected
              </h4>
              {purchaseOrder.rejection_reason && (
                <div
                  style={{
                    padding: '0.75rem',
                    backgroundColor: '#ffffff',
                    borderRadius: '6px',
                    marginBottom: '0.5rem'
                  }}
                >
                  <p
                    style={{
                      fontSize: '0.875rem',
                      color: '#991b1b',
                      fontWeight: '500',
                      margin: 0,
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    {purchaseOrder.rejection_reason}
                  </p>
                </div>
              )}
              {purchaseOrder.approved_at && (
                <p style={{ fontSize: '0.8125rem', color: '#b91c1c', margin: 0 }}>
                  <strong>On:</strong> {formatDateTime(purchaseOrder.approved_at)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Receipt Document */}
      {purchaseOrder.receipt_document_url && (
        <div
          style={{
            padding: '1.25rem',
            backgroundColor: '#dbeafe',
            border: '1px solid #93c5fd',
            borderRadius: '8px',
            marginBottom: '1.5rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <FileText size={20} color="#1e40af" />
              <div>
                <h4
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: '700',
                    color: '#1e3a8a',
                    margin: 0,
                    marginBottom: '0.25rem'
                  }}
                >
                  Receipt Document
                </h4>
                {purchaseOrder.receipt_uploaded_at && (
                  <p style={{ fontSize: '0.75rem', color: '#1e40af', margin: 0 }}>
                    Uploaded on {formatDateTime(purchaseOrder.receipt_uploaded_at)}
                  </p>
                )}
              </div>
            </div>
            <a
              href={purchaseOrder.receipt_document_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.5rem 0.875rem',
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                textDecoration: 'none',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: '600',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#2563eb'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#3b82f6'
              }}
            >
              <Download size={16} />
              View Receipt
            </a>
          </div>
        </div>
      )}

      {/* Public Notes */}
      {purchaseOrder.notes && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h4
            style={{
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '0.5rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          >
            Notes
          </h4>
          <div
            style={{
              padding: '1rem',
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '0.875rem',
              color: '#374151',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap'
            }}
          >
            {purchaseOrder.notes}
          </div>
        </div>
      )}

      {/* Internal Notes (Admin Only) */}
      {isAdmin && purchaseOrder.notes && (
        <div>
          <h4
            style={{
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '0.5rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            Internal Notes
            <span
              style={{
                fontSize: '0.625rem',
                fontWeight: '600',
                padding: '0.125rem 0.375rem',
                backgroundColor: '#fef3c7',
                color: '#92400e',
                borderRadius: '4px',
                textTransform: 'uppercase'
              }}
            >
              Admin Only
            </span>
          </h4>
          <div
            style={{
              padding: '1rem',
              backgroundColor: '#fffbeb',
              border: '1px solid #fcd34d',
              borderRadius: '8px',
              fontSize: '0.875rem',
              color: '#78350f',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap'
            }}
          >
            {purchaseOrder.notes}
          </div>
        </div>
      )}

      {/* Empty State for Notes */}
      {!purchaseOrder.notes && (
        <div
          style={{
            padding: '1.5rem',
            textAlign: 'center',
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '8px'
          }}
        >
          <p style={{ fontSize: '0.875rem', color: '#9ca3af', margin: 0, fontStyle: 'italic' }}>
            No notes have been added to this purchase order
          </p>
        </div>
      )}
    </div>
  )
}
