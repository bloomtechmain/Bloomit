import { Plus, Package } from 'lucide-react'
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
    <div style={{ marginBottom: 24 }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Package size={13} color="#10b981" />
          </div>
          <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>
            Line Items
            {items.length > 0 && (
              <span style={{ marginLeft: 8, background: '#eff6ff', color: '#3b82f6', borderRadius: 20, padding: '1px 7px', fontSize: 10.5, fontWeight: 700 }}>
                {items.length} / 20
              </span>
            )}
          </span>
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={onAddItem}
            disabled={items.length >= 20}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              background: items.length >= 20 ? '#f1f5f9' : 'linear-gradient(135deg, #059669, #10b981)',
              color: items.length >= 20 ? '#94a3b8' : '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: items.length >= 20 ? 'not-allowed' : 'pointer',
              boxShadow: items.length >= 20 ? 'none' : '0 2px 8px rgba(16,185,129,0.3)',
              transition: 'all 0.2s',
            }}
          >
            <Plus size={14} />
            Add Line Item
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div style={{
          padding: '2.5rem 2rem',
          textAlign: 'center',
          background: '#f8fafc',
          borderRadius: 10,
          border: '1.5px dashed #e2e8f0'
        }}>
          <Package size={32} style={{ color: '#cbd5e1', margin: '0 auto 10px' }} />
          <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 4px', fontWeight: 600 }}>No line items added yet</p>
          <p style={{ fontSize: 11.5, color: '#94a3b8', margin: 0 }}>Click "Add Line Item" to start building this purchase order</p>
        </div>
      ) : (
        <div style={{ border: '1.5px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: readOnly ? '1fr 90px 120px 120px' : '1fr 90px 120px 120px 64px',
            gap: '0.75rem',
            padding: '9px 14px',
            background: '#f8fafc',
            borderBottom: '1.5px solid #e2e8f0',
          }}>
            {[
              { label: 'Description', align: 'left' },
              { label: 'Qty', align: 'center' },
              { label: 'Unit Price', align: 'right' },
              { label: 'Total', align: 'right' },
              ...(!readOnly ? [{ label: '', align: 'center' }] : [])
            ].map((col, i) => (
              <div key={i} style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: col.align as any }}>
                {col.label}
              </div>
            ))}
          </div>

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
    </div>
  )
}
