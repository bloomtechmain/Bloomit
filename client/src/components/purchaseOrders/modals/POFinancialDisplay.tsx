interface POFinancialDisplayProps {
  subtotal: number
  salesTax: number
  shippingHandling: number
  bankingFee: number
  total: number
  paymentMethod?: string
  paymentDate?: string
  checkNumber?: string
}

export const POFinancialDisplay: React.FC<POFinancialDisplayProps> = ({
  subtotal,
  salesTax,
  shippingHandling,
  bankingFee,
  total,
  paymentMethod,
  paymentDate,
  checkNumber
}) => {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatPaymentMethod = (method?: string): string => {
    if (!method) return 'Not specified'
    
    // Format the payment method for display
    return method
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

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
        Financial Summary
      </h3>

      <div
        style={{
          backgroundColor: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '1.5rem'
        }}
      >
        {/* Subtotal */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.875rem',
            paddingBottom: '0.875rem',
            borderBottom: '1px solid #e5e7eb'
          }}
        >
          <span
            style={{
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#6b7280'
            }}
          >
            Subtotal
          </span>
          <span
            style={{
              fontSize: '1rem',
              fontWeight: '600',
              color: '#374151',
              fontFamily: 'monospace'
            }}
          >
            {formatCurrency(subtotal)}
          </span>
        </div>

        {/* Sales Tax */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.75rem'
          }}
        >
          <span
            style={{
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151'
            }}
          >
            Sales Tax
          </span>
          <span
            style={{
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#374151',
              fontFamily: 'monospace'
            }}
          >
            {formatCurrency(salesTax)}
          </span>
        </div>

        {/* Shipping & Handling */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.75rem'
          }}
        >
          <span
            style={{
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151'
            }}
          >
            Shipping & Handling
          </span>
          <span
            style={{
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#374151',
              fontFamily: 'monospace'
            }}
          >
            {formatCurrency(shippingHandling)}
          </span>
        </div>

        {/* Banking Fee */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.25rem'
          }}
        >
          <span
            style={{
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151'
            }}
          >
            Banking Fee
          </span>
          <span
            style={{
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#374151',
              fontFamily: 'monospace'
            }}
          >
            {formatCurrency(bankingFee)}
          </span>
        </div>

        {/* Grand Total */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '1.25rem',
            borderTop: '2px solid #d1d5db',
            marginBottom: '1.25rem'
          }}
        >
          <span
            style={{
              fontSize: '1.125rem',
              fontWeight: '700',
              color: '#111827'
            }}
          >
            Grand Total
          </span>
          <span
            style={{
              fontSize: '1.75rem',
              fontWeight: '700',
              color: '#059669',
              fontFamily: 'monospace'
            }}
          >
            {formatCurrency(total)}
          </span>
        </div>

        {/* Payment Information Section */}
        <div
          style={{
            paddingTop: '1rem',
            borderTop: '1px solid #e5e7eb'
          }}
        >
          <h4
            style={{
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          >
            Payment Details
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {/* Payment Method */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: '500',
                  color: '#6b7280'
                }}
              >
                Payment Method:
              </span>
              <span
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: '600',
                  color: '#374151'
                }}
              >
                {formatPaymentMethod(paymentMethod)}
              </span>
            </div>

            {/* Check Number (if applicable) */}
            {checkNumber && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: '500',
                    color: '#6b7280'
                  }}
                >
                  Check Number:
                </span>
                <span
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: '600',
                    color: '#3b82f6'
                  }}
                >
                  {checkNumber}
                </span>
              </div>
            )}

            {/* Payment Date */}
            {paymentDate && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: '500',
                    color: '#6b7280'
                  }}
                >
                  Payment Date:
                </span>
                <span
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: '600',
                    color: '#374151'
                  }}
                >
                  {formatDate(paymentDate)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
