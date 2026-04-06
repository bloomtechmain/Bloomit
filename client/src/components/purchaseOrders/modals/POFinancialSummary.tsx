import { useMemo } from 'react'
import { DollarSign, TrendingUp } from 'lucide-react'
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

const fmtUSD = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(v)

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
  const subtotal = useMemo(() => lineItems.reduce((s, i) => s + i.quantity * i.unit_price, 0), [lineItems])
  const grandTotal = useMemo(() => subtotal + salesTax + shippingHandling + bankingFee, [subtotal, salesTax, shippingHandling, bankingFee])

  const handleNum = (val: string, cb: (n: number) => void) => {
    if (val === '') { cb(0); return }
    const n = parseFloat(val)
    if (!isNaN(n) && n >= 0) cb(n)
  }

  const feeRow = (
    label: string,
    id: string,
    value: number,
    onChange: (n: number) => void
  ) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
      <span style={{ fontSize: 13, color: '#475569', fontWeight: 500, flexShrink: 0 }}>{label}</span>
      {readOnly ? (
        <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{fmtUSD(value)}</span>
      ) : (
        <div style={{ position: 'relative', width: 140 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#94a3b8', pointerEvents: 'none', fontWeight: 600 }}>$</span>
          <input
            id={id}
            type="number"
            value={value || ''}
            onChange={e => handleNum(e.target.value, onChange)}
            disabled={readOnly}
            min="0"
            step="0.01"
            placeholder="0.00"
            style={{
              width: '100%',
              padding: '8px 10px 8px 24px',
              borderRadius: 8,
              border: '1.5px solid #e2e8f0',
              background: '#f8fafc',
              fontSize: 13,
              color: '#1e293b',
              outline: 'none',
              textAlign: 'right',
              fontWeight: 600,
              boxSizing: 'border-box' as const,
              transition: 'all 0.2s',
            }}
            onFocus={fo}
            onBlur={bl}
          />
        </div>
      )}
    </div>
  )

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <DollarSign size={13} color="#f59e0b" />
        </div>
        <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>Financial Summary</span>
      </div>

      <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '16px 18px' }}>
        {/* Subtotal row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>Subtotal (line items)</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{fmtUSD(subtotal)}</span>
        </div>

        {feeRow('Sales Tax', 'sales_tax', salesTax, onSalesTaxChange)}
        {feeRow('Shipping & Handling', 'shipping_handling', shippingHandling, onShippingHandlingChange)}
        {feeRow('Banking Fee', 'banking_fee', bankingFee, onBankingFeeChange)}

        {/* Grand total highlight */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 12,
          paddingTop: 14,
          borderTop: '2px solid #e2e8f0',
          background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)',
          borderRadius: 10,
          padding: '14px 16px',
          marginLeft: -2,
          marginRight: -2,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <TrendingUp size={16} color="#059669" />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#065f46' }}>Grand Total</span>
          </div>
          <span style={{ fontSize: 22, fontWeight: 800, color: '#059669', letterSpacing: '-0.5px' }}>
            {fmtUSD(grandTotal)}
          </span>
        </div>
      </div>

      {!readOnly && (
        <p style={{ fontSize: 11, color: '#94a3b8', margin: '6px 0 0', textAlign: 'right' }}>
          Subtotal and Grand Total are auto-calculated from line items
        </p>
      )}
    </div>
  )
}
