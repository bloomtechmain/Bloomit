import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import type { PurchaseOrderItem } from '../../../types/purchaseOrders'

interface POLineItemRowProps {
  item: PurchaseOrderItem
  index: number
  onUpdate: (index: number, item: Partial<PurchaseOrderItem>) => void
  onRemove: (index: number) => void
  readOnly?: boolean
  isLastRow?: boolean
}

export const POLineItemRow: React.FC<POLineItemRowProps> = ({
  item,
  index,
  onUpdate,
  onRemove,
  readOnly = false,
  isLastRow = false
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleFieldChange = (field: keyof PurchaseOrderItem, value: any) => {
    if (readOnly) return

    const updates: Partial<PurchaseOrderItem> = { [field]: value }

    // Auto-calculate total when quantity or unit_price changes
    if (field === 'quantity' || field === 'unit_price') {
      const qty = field === 'quantity' ? Number(value) : Number(item.quantity || 0)
      const price = field === 'unit_price' ? Number(value) : Number(item.unit_price || 0)
      updates.total = qty * price
      
      // If changing quantity, also update the quantity field
      if (field === 'quantity') {
        updates.quantity = qty
      }
      // If changing unit_price, also update the unit_price field
      if (field === 'unit_price') {
        updates.unit_price = price
      }
    }

    onUpdate(index, updates)
  }

  const handleDelete = () => {
    if (readOnly) return
    
    if (showDeleteConfirm) {
      onRemove(index)
      setShowDeleteConfirm(false)
    } else {
      setShowDeleteConfirm(true)
      // Auto-cancel confirmation after 3 seconds
      setTimeout(() => setShowDeleteConfirm(false), 3000)
    }
  }

  const formatCurrency = (value: number): string => {
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: readOnly ? '1fr 100px 120px 120px' : '1fr 100px 120px 120px 80px',
        gap: '0.75rem',
        padding: '0.75rem 1rem',
        backgroundColor: '#ffffff',
        borderBottom: isLastRow ? 'none' : '1px solid #e5e7eb',
        alignItems: 'center',
        transition: 'background-color 0.2s'
      }}
      onMouseEnter={(e) => {
        if (!readOnly) e.currentTarget.style.backgroundColor = '#f9fafb'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#ffffff'
      }}
    >
      {/* Description */}
      <div>
        {readOnly ? (
          <div style={{ 
            fontSize: '0.875rem', 
            color: '#374151',
            wordBreak: 'break-word'
          }}>
            {item.description || '-'}
          </div>
        ) : (
          <input
            type="text"
            value={item.description || ''}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            placeholder="Item description"
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.875rem',
              backgroundColor: '#ffffff'
            }}
          />
        )}
      </div>

      {/* Quantity */}
      <div>
        {readOnly ? (
          <div style={{ 
            fontSize: '0.875rem', 
            color: '#374151',
            textAlign: 'center',
            fontWeight: '500'
          }}>
            {item.quantity || 0}
          </div>
        ) : (
          <input
            type="number"
            value={item.quantity || ''}
            onChange={(e) => handleFieldChange('quantity', e.target.value)}
            placeholder="0"
            min="0"
            step="1"
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.875rem',
              textAlign: 'center',
              backgroundColor: '#ffffff'
            }}
          />
        )}
      </div>

      {/* Unit Price */}
      <div>
        {readOnly ? (
          <div style={{ 
            fontSize: '0.875rem', 
            color: '#374151',
            textAlign: 'right',
            fontWeight: '500'
          }}>
            LKR {formatCurrency(item.unit_price || 0)}
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute',
              left: '0.625rem',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '0.875rem',
              color: '#6b7280',
              pointerEvents: 'none'
            }}>
              LKR
            </span>
            <input
              type="number"
              value={item.unit_price || ''}
              onChange={(e) => handleFieldChange('unit_price', e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              style={{
                width: '100%',
                padding: '0.5rem 0.5rem 0.5rem 3rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.875rem',
                textAlign: 'right',
                backgroundColor: '#ffffff'
              }}
            />
          </div>
        )}
      </div>

      {/* Total (Calculated) */}
      <div style={{ 
        fontSize: '0.875rem', 
        color: '#1f2937',
        textAlign: 'right',
        fontWeight: '600',
        backgroundColor: '#f0fdf4',
        padding: '0.5rem',
        borderRadius: '6px'
      }}>
        LKR {formatCurrency(item.total || 0)}
      </div>

      {/* Actions */}
      {!readOnly && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <button
            type="button"
            onClick={handleDelete}
            style={{
              padding: '0.375rem',
              backgroundColor: showDeleteConfirm ? '#ef4444' : 'transparent',
              color: showDeleteConfirm ? '#ffffff' : '#ef4444',
              border: showDeleteConfirm ? 'none' : '1px solid #ef4444',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              fontSize: '0.75rem',
              fontWeight: '500',
              minWidth: showDeleteConfirm ? '60px' : '32px'
            }}
            onMouseEnter={(e) => {
              if (!showDeleteConfirm) {
                e.currentTarget.style.backgroundColor = '#fee2e2'
              }
            }}
            onMouseLeave={(e) => {
              if (!showDeleteConfirm) {
                e.currentTarget.style.backgroundColor = 'transparent'
              }
            }}
            title={showDeleteConfirm ? 'Click again to confirm' : 'Delete item'}
          >
            {showDeleteConfirm ? (
              'Confirm'
            ) : (
              <Trash2 size={16} />
            )}
          </button>
        </div>
      )}
    </div>
  )
}
