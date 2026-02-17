import { Plus } from 'lucide-react'
import type { PurchaseOrderItem } from '../../../types/purchaseOrders'
import { POLineItemRow } from './POLineItemRow'

interface POLineItemsTableProps {
  items: PurchaseOrderItem[]
  onAddItem: () => void
  onUpdateItem: (index: number, item: Partial<PurchaseOrderItem>) => void
  onRemoveItem: (index: number) => void
  readOnly?: boolean
}

export const POLineItemsTable: React.FC<POLineItemsTableProps> = ({
  items,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  readOnly = false
}) => {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: '1rem',
        paddingBottom: '0.5rem',
        borderBottom: '2px solid #e5e7eb'
      }}>
        <h3 style={{ 
          fontSize: '1rem', 
          fontWeight: '600', 
          color: '#374151',
          margin: 0
        }}>
          Line Items
        </h3>
        {!readOnly && (
          <button
            type="button"
            onClick={onAddItem}
            disabled={items.length >= 20}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.5rem 0.875rem',
              backgroundColor: items.length >= 20 ? '#9ca3af' : '#10b981',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: items.length >= 20 ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              if (items.length < 20) {
                e.currentTarget.style.backgroundColor = '#059669'
              }
            }}
            onMouseLeave={(e) => {
              if (items.length < 20) {
                e.currentTarget.style.backgroundColor = '#10b981'
              }
            }}
          >
            <Plus size={16} />
            Add Line Item
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div style={{
          padding: '3rem 2rem',
          textAlign: 'center',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          border: '2px dashed #d1d5db'
        }}>
          <p style={{ 
            fontSize: '0.875rem', 
            color: '#6b7280',
            margin: '0 0 0.5rem 0',
            fontWeight: '500'
          }}>
            No line items added yet
          </p>
          <p style={{ 
            fontSize: '0.75rem', 
            color: '#9ca3af',
            margin: 0
          }}>
            Click "Add Line Item" to start adding items to this purchase order
          </p>
        </div>
      ) : (
        <div style={{ 
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          {/* Table Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: readOnly ? '1fr 100px 120px 120px' : '1fr 100px 120px 120px 80px',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            backgroundColor: '#f9fafb',
            borderBottom: '2px solid #e5e7eb',
            fontWeight: '600',
            fontSize: '0.875rem',
            color: '#374151'
          }}>
            <div>Description</div>
            <div style={{ textAlign: 'center' }}>Quantity</div>
            <div style={{ textAlign: 'right' }}>Unit Price</div>
            <div style={{ textAlign: 'right' }}>Total</div>
            {!readOnly && <div style={{ textAlign: 'center' }}>Actions</div>}
          </div>

          {/* Table Rows */}
          <div>
            {items.map((item, index) => (
              <POLineItemRow
                key={index}
                item={item}
                index={index}
                onUpdate={onUpdateItem}
                onRemove={onRemoveItem}
                readOnly={readOnly}
                isLastRow={index === items.length - 1}
              />
            ))}
          </div>
        </div>
      )}

      {!readOnly && items.length > 0 && items.length < 20 && (
        <p style={{ 
          fontSize: '0.75rem', 
          color: '#6b7280',
          marginTop: '0.5rem',
          marginBottom: 0
        }}>
          {items.length} of 20 line items added
        </p>
      )}
    </div>
  )
}
