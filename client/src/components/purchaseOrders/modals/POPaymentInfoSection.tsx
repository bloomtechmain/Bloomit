import type { PurchaseOrder } from '../../../types/purchaseOrders'

interface POPaymentInfoSectionProps {
  formData: Partial<PurchaseOrder> & {
    payment_method?: string
    check_number?: string
    payment_date?: string
    notes?: string
  }
  onChange: (field: string, value: any) => void
  isAdmin: boolean
  readOnly?: boolean
}

export const POPaymentInfoSection: React.FC<POPaymentInfoSectionProps> = ({
  formData,
  onChange,
  isAdmin,
  readOnly = false
}) => {
  const PAYMENT_METHODS = [
    { value: 'DEPOSIT_CHECK', label: 'Deposit Check' },
    { value: 'PAYMENT_CHECK', label: 'Payment Check' },
    { value: 'CREDIT_CARD', label: 'Credit Card' },
    { value: 'CASH', label: 'Cash' },
    { value: 'PETTY_CASH', label: 'Petty Cash' },
    { value: 'WIRE_TRANSFER', label: 'Wire Transfer' },
    { value: 'ACH', label: 'ACH Transfer' },
    { value: 'OTHER', label: 'Other' }
  ]

  const notesLength = formData.notes?.length || 0
  const MAX_NOTES_LENGTH = 1000

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
        Payment & Additional Information
      </h3>

      {/* Payment Method Dropdown */}
      <div style={{ marginBottom: '1.25rem' }}>
        <label
          htmlFor="payment_method"
          style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '0.5rem'
          }}
        >
          Payment Method
        </label>
        <select
          id="payment_method"
          value={formData.payment_method || ''}
          onChange={(e) => onChange('payment_method', e.target.value || undefined)}
          disabled={readOnly}
          style={{
            width: '100%',
            padding: '0.625rem',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '0.875rem',
            backgroundColor: readOnly ? '#f9fafb' : '#ffffff',
            cursor: readOnly ? 'not-allowed' : 'pointer',
            color: '#374151'
          }}
        >
          <option value="">-- Select Payment Method (Optional) --</option>
          {PAYMENT_METHODS.map((method) => (
            <option key={method.value} value={method.value}>
              {method.label}
            </option>
          ))}
        </select>
        <p style={{ 
          fontSize: '0.75rem', 
          color: '#6b7280', 
          marginTop: '0.25rem',
          marginBottom: 0 
        }}>
          Select how this purchase will be paid
        </p>
      </div>

      {/* Check Number - Only show if payment method is check */}
      {(formData.payment_method === 'DEPOSIT_CHECK' || formData.payment_method === 'PAYMENT_CHECK') && (
        <div style={{ marginBottom: '1.25rem' }}>
          <label
            htmlFor="check_number"
            style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}
          >
            Check Number
          </label>
          <input
            type="text"
            id="check_number"
            value={formData.check_number || ''}
            onChange={(e) => onChange('check_number', e.target.value)}
            disabled={readOnly}
            style={{
              width: '100%',
              padding: '0.625rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.875rem',
              backgroundColor: readOnly ? '#f9fafb' : '#ffffff',
              cursor: readOnly ? 'not-allowed' : 'text'
            }}
            placeholder="Enter check number"
          />
        </div>
      )}

      {/* Payment Date */}
      <div style={{ marginBottom: '1.25rem' }}>
        <label
          htmlFor="payment_date"
          style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '0.5rem'
          }}
        >
          Expected Payment Date
        </label>
        <input
          type="date"
          id="payment_date"
          value={formData.payment_date ? formData.payment_date.split('T')[0] : ''}
          onChange={(e) => onChange('payment_date', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
          disabled={readOnly}
          style={{
            width: '100%',
            padding: '0.625rem',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '0.875rem',
            backgroundColor: readOnly ? '#f9fafb' : '#ffffff',
            cursor: readOnly ? 'not-allowed' : 'text',
            color: '#374151'
          }}
        />
        <p style={{ 
          fontSize: '0.75rem', 
          color: '#6b7280', 
          marginTop: '0.25rem',
          marginBottom: 0 
        }}>
          When do you expect to make this payment?
        </p>
      </div>

      {/* Notes - Public */}
      <div style={{ marginBottom: '1.25rem' }}>
        <label
          htmlFor="notes"
          style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '0.5rem'
          }}
        >
          Notes
        </label>
        <textarea
          id="notes"
          value={formData.notes || ''}
          onChange={(e) => {
            if (e.target.value.length <= MAX_NOTES_LENGTH) {
              onChange('notes', e.target.value)
            }
          }}
          disabled={readOnly}
          rows={4}
          maxLength={MAX_NOTES_LENGTH}
          style={{
            width: '100%',
            padding: '0.625rem',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '0.875rem',
            backgroundColor: readOnly ? '#f9fafb' : '#ffffff',
            cursor: readOnly ? 'not-allowed' : 'text',
            resize: 'vertical',
            fontFamily: 'inherit',
            lineHeight: '1.5'
          }}
          placeholder="Add any additional notes or special instructions for this purchase order..."
        />
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '0.25rem'
        }}>
          <p style={{ 
            fontSize: '0.75rem', 
            color: '#6b7280',
            margin: 0
          }}>
            These notes will be visible to all users who can view this PO
          </p>
          <p style={{ 
            fontSize: '0.75rem', 
            color: notesLength > MAX_NOTES_LENGTH * 0.9 ? '#ef4444' : '#6b7280',
            margin: 0,
            fontWeight: notesLength > MAX_NOTES_LENGTH * 0.9 ? '600' : '400'
          }}>
            {notesLength} / {MAX_NOTES_LENGTH}
          </p>
        </div>
      </div>

      {/* Internal Notes - Admin Only */}
      {isAdmin && (
        <div style={{ 
          marginBottom: '1.25rem',
          padding: '1rem',
          backgroundColor: '#fef3c7',
          border: '1px solid #fcd34d',
          borderRadius: '8px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.75rem'
          }}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#92400e"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <label
              htmlFor="internal_notes"
              style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#92400e',
                margin: 0
              }}
            >
              Internal Notes (Admin Only)
            </label>
          </div>
          <textarea
            id="internal_notes"
            value={formData.notes || ''}
            onChange={(e) => onChange('internal_notes', e.target.value)}
            disabled={readOnly}
            rows={3}
            style={{
              width: '100%',
              padding: '0.625rem',
              border: '1px solid #fcd34d',
              borderRadius: '6px',
              fontSize: '0.875rem',
              backgroundColor: readOnly ? '#fef9e7' : '#fffbeb',
              cursor: readOnly ? 'not-allowed' : 'text',
              resize: 'vertical',
              fontFamily: 'inherit',
              lineHeight: '1.5',
              color: '#92400e'
            }}
            placeholder="Add internal notes visible only to administrators..."
          />
          <p style={{ 
            fontSize: '0.75rem', 
            color: '#92400e',
            marginTop: '0.5rem',
            marginBottom: 0,
            fontWeight: '500'
          }}>
            ⚠️ These notes are only visible to admin users
          </p>
        </div>
      )}
    </div>
  )
}
