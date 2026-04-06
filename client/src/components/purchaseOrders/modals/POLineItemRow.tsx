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

const cellInp: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 8,
  border: '1.5px solid #e2e8f0',
  background: '#f8fafc',
  fontSize: 13,
  color: '#1e293b',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'all 0.2s',
  fontFamily: 'inherit',
}

const fo = (e: React.FocusEvent<HTMLInputElement>) => {
  e.target.style.borderColor = '#3b82f6'
  e.target.style.background = '#fff'
  e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)'
}
const bl = (e: React.FocusEvent<HTMLInputElement>) => {
  e.target.style.borderColor = '#e2e8f0'
  e.target.style.background = '#f8fafc'
  e.target.style.boxShadow = 'none'
}

const fmt = (v: number) => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const POLineItemRow: React.FC<POLineItemRowProps> = ({
  item,
  index,
  onUpdate,
  onRemove,
  readOnly = false,
  isLastRow = false
}) => {
  const [showConfirm, setShowConfirm] = useState(false)

  const handleChange = (field: keyof PurchaseOrderItem, value: any) => {
    if (readOnly) return
    const updates: Partial<PurchaseOrderItem> = { [field]: value }
    if (field === 'quantity' || field === 'unit_price') {
      const qty = field === 'quantity' ? Number(value) : Number(item.quantity || 0)
      const price = field === 'unit_price' ? Number(value) : Number(item.unit_price || 0)
      updates.total = qty * price
      if (field === 'quantity') updates.quantity = qty
      if (field === 'unit_price') updates.unit_price = price
    }
    onUpdate(index, updates)
  }

  const handleDelete = () => {
    if (readOnly) return
    if (showConfirm) {
      onRemove(index)
      setShowConfirm(false)
    } else {
      setShowConfirm(true)
      setTimeout(() => setShowConfirm(false), 3000)
    }
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: readOnly ? '1fr 90px 120px 120px' : '1fr 90px 120px 120px 64px',
        gap: '0.75rem',
        padding: '10px 14px',
        background: '#fff',
        borderBottom: isLastRow ? 'none' : '1px solid #f1f5f9',
        alignItems: 'center',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => { if (!readOnly) (e.currentTarget as HTMLDivElement).style.background = '#fafcff' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = '#fff' }}
    >
      {/* Description */}
      {readOnly ? (
        <div style={{ fontSize: 13, color: '#374151', wordBreak: 'break-word' }}>{item.description || '—'}</div>
      ) : (
        <input
          type="text"
          value={item.description || ''}
          onChange={e => handleChange('description', e.target.value)}
          placeholder="Item description"
          style={cellInp}
          onFocus={fo}
          onBlur={bl}
        />
      )}

      {/* Quantity */}
      {readOnly ? (
        <div style={{ fontSize: 13, color: '#374151', textAlign: 'center', fontWeight: 600 }}>{item.quantity || 0}</div>
      ) : (
        <input
          type="number"
          value={item.quantity || ''}
          onChange={e => handleChange('quantity', e.target.value)}
          placeholder="0"
          min="0"
          step="1"
          style={{ ...cellInp, textAlign: 'center' }}
          onFocus={fo}
          onBlur={bl}
        />
      )}

      {/* Unit Price */}
      {readOnly ? (
        <div style={{ fontSize: 13, color: '#374151', textAlign: 'right', fontWeight: 600 }}>LKR {fmt(item.unit_price || 0)}</div>
      ) : (
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#94a3b8', pointerEvents: 'none', fontWeight: 600 }}>LKR</span>
          <input
            type="number"
            value={item.unit_price || ''}
            onChange={e => handleChange('unit_price', e.target.value)}
            placeholder="0.00"
            min="0"
            step="0.01"
            style={{ ...cellInp, paddingLeft: 38, textAlign: 'right' }}
            onFocus={fo}
            onBlur={bl}
          />
        </div>
      )}

      {/* Total */}
      <div style={{
        fontSize: 13,
        color: '#059669',
        textAlign: 'right',
        fontWeight: 700,
        background: '#f0fdf4',
        padding: '7px 10px',
        borderRadius: 8,
        border: '1px solid #bbf7d0'
      }}>
        LKR {fmt(item.total || 0)}
      </div>

      {/* Delete */}
      {!readOnly && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={handleDelete}
            title={showConfirm ? 'Click again to confirm' : 'Remove item'}
            style={{
              padding: showConfirm ? '5px 8px' : '6px',
              background: showConfirm ? '#ef4444' : 'transparent',
              color: showConfirm ? '#fff' : '#ef4444',
              border: showConfirm ? 'none' : '1.5px solid #fca5a5',
              borderRadius: 7,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 600,
              minWidth: showConfirm ? 52 : 30,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { if (!showConfirm) (e.currentTarget as HTMLButtonElement).style.background = '#fff1f2' }}
            onMouseLeave={e => { if (!showConfirm) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
          >
            {showConfirm ? 'Confirm' : <Trash2 size={14} />}
          </button>
        </div>
      )}
    </div>
  )
}
