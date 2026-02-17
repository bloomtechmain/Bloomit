import { useMemo } from 'react'
import { TrendingUp, Users, Clock } from 'lucide-react'
import type { PurchaseOrder } from '../../../types/purchaseOrders'

type Vendor = {
  vendor_id: number
  vendor_name: string
}

type PODashboardWidgetsProps = {
  purchaseOrders: PurchaseOrder[]
  vendors: Vendor[]
  onViewPO?: (po: PurchaseOrder) => void
}

export function PODashboardWidgets({ purchaseOrders, onViewPO }: PODashboardWidgetsProps) {
  // Calculate top vendors by spending
  const topVendors = useMemo(() => {
    const vendorMap = new Map<number, { name: string; total: number; count: number }>()
    
    purchaseOrders.forEach(po => {
      if (po.vendor_id && po.status !== 'REJECTED') {
        const current = vendorMap.get(po.vendor_id) || { 
          name: po.vendor_name || 'Unknown', 
          total: 0, 
          count: 0 
        }
        vendorMap.set(po.vendor_id, {
          name: current.name,
          total: current.total + Number(po.total_amount),
          count: current.count + 1
        })
      }
    })

    return Array.from(vendorMap.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
  }, [purchaseOrders])

  // Get pending approvals
  const pendingPOs = useMemo(() => {
    return purchaseOrders
      .filter(po => po.status === 'PENDING')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
  }, [purchaseOrders])

  // Get recent POs
  const recentPOs = useMemo(() => {
    return purchaseOrders
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
  }, [purchaseOrders])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
      {/* Top Vendors Widget */}
      <div style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <TrendingUp size={20} style={{ color: '#3b82f6' }} />
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#374151' }}>
            Top Vendors by Spend
          </h3>
        </div>
        
        {topVendors.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>No vendor data yet</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {topVendors.map((vendor, idx) => (
              <div key={vendor.id} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem',
                background: '#f9fafb',
                borderRadius: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: idx === 0 ? '#fbbf24' : idx === 1 ? '#9ca3af' : idx === 2 ? '#d97706' : '#e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#fff'
                  }}>
                    {idx + 1}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                      {vendor.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      {vendor.count} PO{vendor.count !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#3b82f6' }}>
                  LKR {vendor.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Approvals Widget */}
      <div style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Clock size={20} style={{ color: '#f59e0b' }} />
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#374151' }}>
            Pending Approvals
          </h3>
        </div>
        
        {pendingPOs.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>No pending approvals</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {pendingPOs.map(po => (
              <div 
                key={po.id} 
                onClick={() => onViewPO?.(po)}
                style={{
                  padding: '0.75rem',
                  background: '#fef3c7',
                  borderRadius: '8px',
                  cursor: onViewPO ? 'pointer' : 'default',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => {
                  if (onViewPO) e.currentTarget.style.background = '#fde68a'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#fef3c7'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#92400e' }}>
                      {po.po_number}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#78350f', marginTop: '0.25rem' }}>
                      {po.requested_by_name}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#92400e', textAlign: 'right' }}>
                    LKR {Number(po.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    <div style={{ fontSize: '0.75rem', fontWeight: 400, color: '#78350f', marginTop: '0.25rem' }}>
                      {new Date(po.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent POs Widget */}
      <div style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Users size={20} style={{ color: '#10b981' }} />
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#374151' }}>
            Recent Purchase Orders
          </h3>
        </div>
        
        {recentPOs.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>No purchase orders yet</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {recentPOs.map(po => (
              <div 
                key={po.id}
                onClick={() => onViewPO?.(po)}
                style={{
                  padding: '0.75rem',
                  background: '#f9fafb',
                  borderRadius: '8px',
                  cursor: onViewPO ? 'pointer' : 'default',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => {
                  if (onViewPO) e.currentTarget.style.background = '#f3f4f6'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#f9fafb'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                      {po.po_number}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                      {po.vendor_name || 'No vendor'} • {new Date(po.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <span style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '12px',
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    background: 
                      po.status === 'PENDING' ? '#fef3c7' :
                      po.status === 'APPROVED' ? '#d1fae5' :
                      po.status === 'REJECTED' ? '#fee2e2' :
                      '#dbeafe',
                    color:
                      po.status === 'PENDING' ? '#92400e' :
                      po.status === 'APPROVED' ? '#065f46' :
                      po.status === 'REJECTED' ? '#991b1b' :
                      '#1e40af'
                  }}>
                    {po.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
