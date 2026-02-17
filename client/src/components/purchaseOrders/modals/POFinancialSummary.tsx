import { useMemo } from 'react'
import type { PurchaseOrderItem } from '../../../types/purchaseOrders'

interface POFinancialSummaryProps {
  lineItems: PurchaseOrderItem[]
  salesTax: number
  shippingHandling: number
  bankingFee: number
  onSalesTaxChange: (value: number) => void
  onShippingHandlingChange: (value: number) => void
  onBankingFeeChange: (value: number) => void
  readOnly?: boolean
}

export const POFinancialSummary: React.FC<POFinancialSummaryProps> = ({
  lineItems,
  salesTax,
  shippingHandling,
  bankingFee,
  onSalesTaxChange,
  onShippingHandlingChange,
  onBankingFeeChange,
  readOnly = false
}) => {
  // Calculate subtotal from line items
  const subtotal = useMemo(() => {
    return lineItems.reduce((sum, item) => {
      const itemTotal = item.quantity * item.unit_price
      return sum + itemTotal
    }, 0)
  }, [lineItems])

  // Calculate grand total
  const grandTotal = useMemo(() => {
    return subtotal + salesTax + shippingHandling + bankingFee
  }, [subtotal, salesTax, shippingHandling, bankingFee])

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const handleNumberInput = (
    value: string,
    onChange: (value: number) => void
  ) => {
    // Allow empty string or valid numbers
    if (value === '') {
      onChange(0)
      return
    }
    
    const numValue = parseFloat(value)
    if (!isNaN(numValue) && numValue >= 0) {
      onChange(numValue)
    }
  }

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <h3 style={{ 
        fontSize: '1rem', 
        fontWeight: '600', 
        color: '#374151', 
        marginBottom: '1rem',
        paddingBottom: '0.5rem',
        borderBottom: '2px solid #e5e7eb'
      }}>
        Financial Summary
      </h3>

      <div style={{
        backgroundColor: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '1.25rem'
      }}>
        {/* Subtotal - Read-only, auto-calculated */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.875rem',
          paddingBottom: '0.875rem',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <label style={{
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#6b7280'
          }}>
            Subtotal (from line items)
          </label>
          <span style={{
            fontSize: '1rem',
            fontWeight: '600',
            color: '#374151'
          }}>
            {formatCurrency(subtotal)}
          </span>
        </div>

        {/* Sales Tax Input */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.875rem',
          gap: '1rem'
        }}>
          <label
            htmlFor="sales_tax"
            style={{
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              flex: '0 0 auto'
            }}
          >
            Sales Tax
          </label>
          <div style={{ flex: '0 0 150px', position: 'relative' }}>
            <span style={{
              position: 'absolute',
              left: '0.625rem',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '0.875rem',
              color: '#6b7280',
              pointerEvents: 'none'
            }}>
              $
            </span>
            <input
              type="number"
              id="sales_tax"
              value={salesTax || ''}
              onChange={(e) => handleNumberInput(e.target.value, onSalesTaxChange)}
              disabled={readOnly}
              min="0"
              step="0.01"
              style={{
                width: '100%',
                padding: '0.5rem 0.625rem 0.5rem 1.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.875rem',
                backgroundColor: readOnly ? '#f3f4f6' : '#ffffff',
                textAlign: 'right',
                fontWeight: '500',
                color: '#374151',
                cursor: readOnly ? 'not-allowed' : 'text'
              }}
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Shipping & Handling Input */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.875rem',
          gap: '1rem'
        }}>
          <label
            htmlFor="shipping_handling"
            style={{
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              flex: '0 0 auto'
            }}
          >
            Shipping & Handling
          </label>
          <div style={{ flex: '0 0 150px', position: 'relative' }}>
            <span style={{
              position: 'absolute',
              left: '0.625rem',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '0.875rem',
              color: '#6b7280',
              pointerEvents: 'none'
            }}>
              $
            </span>
            <input
              type="number"
              id="shipping_handling"
              value={shippingHandling || ''}
              onChange={(e) => handleNumberInput(e.target.value, onShippingHandlingChange)}
              disabled={readOnly}
              min="0"
              step="0.01"
              style={{
                width: '100%',
                padding: '0.5rem 0.625rem 0.5rem 1.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.875rem',
                backgroundColor: readOnly ? '#f3f4f6' : '#ffffff',
                textAlign: 'right',
                fontWeight: '500',
                color: '#374151',
                cursor: readOnly ? 'not-allowed' : 'text'
              }}
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Banking Fee Input */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          gap: '1rem'
        }}>
          <label
            htmlFor="banking_fee"
            style={{
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              flex: '0 0 auto'
            }}
          >
            Banking Fee
          </label>
          <div style={{ flex: '0 0 150px', position: 'relative' }}>
            <span style={{
              position: 'absolute',
              left: '0.625rem',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '0.875rem',
              color: '#6b7280',
              pointerEvents: 'none'
            }}>
              $
            </span>
            <input
              type="number"
              id="banking_fee"
              value={bankingFee || ''}
              onChange={(e) => handleNumberInput(e.target.value, onBankingFeeChange)}
              disabled={readOnly}
              min="0"
              step="0.01"
              style={{
                width: '100%',
                padding: '0.5rem 0.625rem 0.5rem 1.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.875rem',
                backgroundColor: readOnly ? '#f3f4f6' : '#ffffff',
                textAlign: 'right',
                fontWeight: '500',
                color: '#374151',
                cursor: readOnly ? 'not-allowed' : 'text'
              }}
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Grand Total - Read-only, auto-calculated */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: '1rem',
          borderTop: '2px solid #d1d5db'
        }}>
          <label style={{
            fontSize: '1rem',
            fontWeight: '700',
            color: '#111827'
          }}>
            Grand Total
          </label>
          <span style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#059669'
          }}>
            {formatCurrency(grandTotal)}
          </span>
        </div>
      </div>

      {!readOnly && (
        <p style={{ 
          fontSize: '0.75rem', 
          color: '#6b7280',
          marginTop: '0.5rem',
          marginBottom: 0
        }}>
          Subtotal and Grand Total are calculated automatically based on line items and fees
        </p>
      )}
    </div>
  )
}
