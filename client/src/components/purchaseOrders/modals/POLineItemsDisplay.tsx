import type { PurchaseOrderItem } from '../../../types/purchaseOrders'

interface POLineItemsDisplayProps {
  items: PurchaseOrderItem[]
}

export const POLineItemsDisplay: React.FC<POLineItemsDisplayProps> = ({ items }) => {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const formatQuantity = (qty: number): string => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(qty)
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
        Line Items
      </h3>

      {items.length === 0 ? (
        <div
          style={{
            padding: '2rem',
            textAlign: 'center',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}
        >
          <p
            style={{
              fontSize: '0.875rem',
              color: '#6b7280',
              margin: 0,
              fontStyle: 'italic'
            }}
          >
            No line items in this purchase order
          </p>
        </div>
      ) : (
        <div
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            overflow: 'hidden'
          }}
        >
          {/* Table Header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 120px 140px 140px',
              gap: '0.75rem',
              padding: '0.875rem 1rem',
              backgroundColor: '#f9fafb',
              borderBottom: '2px solid #e5e7eb',
              fontWeight: '600',
              fontSize: '0.875rem',
              color: '#374151'
            }}
          >
            <div>Description</div>
            <div style={{ textAlign: 'center' }}>Quantity</div>
            <div style={{ textAlign: 'right' }}>Unit Price</div>
            <div style={{ textAlign: 'right' }}>Line Total</div>
          </div>

          {/* Table Rows */}
          <div>
            {items.map((item, index) => {
              const lineTotal = item.quantity * item.unit_price

              return (
                <div
                  key={index}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 120px 140px 140px',
                    gap: '0.75rem',
                    padding: '0.875rem 1rem',
                    borderBottom: index < items.length - 1 ? '1px solid #e5e7eb' : 'none',
                    backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb',
                    transition: 'background-color 0.15s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f3f4f6'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#f9fafb'
                  }}
                >
                  {/* Description */}
                  <div
                    style={{
                      fontSize: '0.875rem',
                      color: '#374151',
                      fontWeight: '500',
                      lineHeight: '1.5',
                      wordBreak: 'break-word'
                    }}
                  >
                    {item.description || '—'}
                  </div>

                  {/* Quantity */}
                  <div
                    style={{
                      fontSize: '0.875rem',
                      color: '#1f2937',
                      fontWeight: '600',
                      textAlign: 'center'
                    }}
                  >
                    {formatQuantity(item.quantity)}
                  </div>

                  {/* Unit Price */}
                  <div
                    style={{
                      fontSize: '0.875rem',
                      color: '#1f2937',
                      fontWeight: '500',
                      textAlign: 'right',
                      fontFamily: 'monospace'
                    }}
                  >
                    {formatCurrency(item.unit_price)}
                  </div>

                  {/* Line Total */}
                  <div
                    style={{
                      fontSize: '0.875rem',
                      color: '#059669',
                      fontWeight: '700',
                      textAlign: 'right',
                      fontFamily: 'monospace'
                    }}
                  >
                    {formatCurrency(lineTotal)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {items.length > 0 && (
        <p
          style={{
            fontSize: '0.75rem',
            color: '#6b7280',
            marginTop: '0.5rem',
            marginBottom: 0,
            fontStyle: 'italic'
          }}
        >
          {items.length} line item{items.length !== 1 ? 's' : ''} total
        </p>
      )}
    </div>
  )
}
