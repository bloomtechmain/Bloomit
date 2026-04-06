import { useState, useEffect, useCallback, useMemo } from 'react'
import { Calendar, Plus, DollarSign, TrendingUp, CreditCard, Repeat, Hash, Pencil, Trash2, CheckCircle } from 'lucide-react'
import { subscriptionsApi } from '../services/subscriptionsApi'
import type { Subscription } from '../types/subscriptions'

export default function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(false)
  const [isAddingSubscription, setIsAddingSubscription] = useState(false)
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null)
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [frequency, setFrequency] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY')
  const [autoPay, setAutoPay] = useState(false)
  const [isActive, setIsActive] = useState(true)

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [filterFrequency, setFilterFrequency] = useState<'ALL' | 'MONTHLY' | 'YEARLY'>('ALL')
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  const fetchSubscriptions = useCallback(async () => {
    try {
      setLoading(true)
      const response = await subscriptionsApi.getAll()
      setSubscriptions(response.data.subscriptions)
    } catch (error) {
      console.error('Error fetching subscriptions:', error)
      showNotification('Failed to load subscriptions', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSubscriptions() }, [fetchSubscriptions])

  const resetForm = () => {
    setDescription('')
    setAmount('')
    setDueDate('')
    setFrequency('MONTHLY')
    setAutoPay(false)
    setIsActive(true)
    setEditingSubscription(null)
  }

  const closeDrawer = () => { setIsAddingSubscription(false); resetForm() }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description || !amount || !dueDate) {
      showNotification('Please fill in all required fields', 'error')
      return
    }
    setSaving(true)
    try {
      const data = { description, amount: Number(amount), due_date: dueDate, frequency, auto_pay: autoPay, is_active: isActive }
      if (editingSubscription) {
        await subscriptionsApi.update(editingSubscription.id, data)
        showNotification('Subscription updated successfully', 'success')
      } else {
        await subscriptionsApi.create(data)
        showNotification('Subscription added successfully', 'success')
      }
      closeDrawer()
      fetchSubscriptions()
    } catch (error) {
      console.error('Error saving subscription:', error)
      showNotification('Failed to save subscription', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (sub: Subscription) => {
    setEditingSubscription(sub)
    setDescription(sub.description)
    setAmount(String(sub.amount))
    setDueDate(sub.due_date.split('T')[0])
    setFrequency(sub.frequency)
    setAutoPay(sub.auto_pay)
    setIsActive(sub.is_active)
    setIsAddingSubscription(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this subscription?')) return
    try {
      await subscriptionsApi.delete(id)
      showNotification('Subscription deleted successfully', 'success')
      fetchSubscriptions()
    } catch (error) {
      console.error('Error deleting subscription:', error)
      showNotification('Failed to delete subscription', 'error')
    }
  }

  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter(sub => {
      const matchesSearch = sub.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesFrequency = filterFrequency === 'ALL' || sub.frequency === filterFrequency
      const matchesStatus = filterStatus === 'ALL' ? true : filterStatus === 'ACTIVE' ? sub.is_active : !sub.is_active
      return matchesSearch && matchesFrequency && matchesStatus
    })
  }, [subscriptions, searchQuery, filterFrequency, filterStatus])

  const stats = useMemo(() => {
    const active = subscriptions.filter(s => s.is_active)
    const monthlyTotal = active.filter(s => s.frequency === 'MONTHLY').reduce((sum, s) => sum + Number(s.amount), 0)
    const totalYearlyCost = active.reduce((sum, s) => sum + Number(s.yearly_cost), 0)
    const autoPayCount = active.filter(s => s.auto_pay).length
    return { active: active.length, monthlyTotal, totalYearlyCost, autoPayCount }
  }, [subscriptions])

  const inputStyle = { padding: '9px 14px', borderRadius: 9, border: '1.5px solid #e2e8f0', background: '#fff', color: '#1e293b', outline: 'none', fontSize: 13.5, fontFamily: 'inherit' }
  const drawerInputStyle = { padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#1e293b', outline: 'none', fontSize: 13.5, fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' as const, transition: 'all 0.2s' }
  const dOnFocus = e => { e.target.style.borderColor = '#6366f1'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)' }
  const dOnBlur  = e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none' }

  return (
    <div style={{ display: 'grid', gap: 16 }}>

      {/* Notification toast */}
      {notification && (
        <div style={{ position: 'fixed', top: '1.5rem', right: '1.5rem', padding: '12px 20px', borderRadius: 10, background: notification.type === 'success' ? '#f0fdf4' : '#fef2f2', border: `1.5px solid ${notification.type === 'success' ? '#86efac' : '#fecaca'}`, color: notification.type === 'success' ? '#166534' : '#991b1b', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', zIndex: 9999, fontWeight: 600, fontSize: 13.5 }}>
          {notification.message}
        </div>
      )}

      {/* Summary stat cards */}
      {!loading && subscriptions.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { label: 'Active', value: stats.active, icon: <Calendar size={18} color="#063062" />, bg: 'rgba(6,48,98,0.06)', color: '#063062' },
            { label: 'Monthly Total', value: `$${stats.monthlyTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: <DollarSign size={18} color="#0ea5e9" />, bg: 'rgba(14,165,233,0.07)', color: '#0369a1' },
            { label: 'Yearly Cost', value: `$${stats.totalYearlyCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: <TrendingUp size={18} color="#10b981" />, bg: 'rgba(16,185,129,0.07)', color: '#065f46' },
            { label: 'Auto-Pay', value: stats.autoPayCount, icon: <CreditCard size={18} color="#6366f1" />, bg: 'rgba(99,102,241,0.07)', color: '#4338ca' },
          ].map(card => (
            <div key={card.label} style={{ background: card.bg, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, border: `1px solid ${card.bg}` }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', flexShrink: 0 }}>{card.icon}</div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{card.label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: card.color, lineHeight: 1.2 }}>{card.value}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action bar */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button
          onClick={() => { resetForm(); setIsAddingSubscription(true) }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--primary)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', whiteSpace: 'nowrap' as const }}
        >
          <Plus size={15} /> Add Subscription
        </button>
        <input
          type="text"
          placeholder="Search subscriptions..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ ...inputStyle, flex: 1 }}
          onFocus={e => { e.target.style.borderColor = '#063062'; e.target.style.boxShadow = '0 0 0 3px rgba(6,48,98,0.08)' }}
          onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' }}
        />
        <select value={filterFrequency} onChange={e => setFilterFrequency(e.target.value as any)} style={inputStyle}>
          <option value="ALL">All Frequencies</option>
          <option value="MONTHLY">Monthly</option>
          <option value="YEARLY">Yearly</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} style={inputStyle}>
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #e2e8f0', borderTop: '3px solid #063062', animation: 'ql-spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          Loading subscriptions…
        </div>
      ) : filteredSubscriptions.length === 0 ? (
        subscriptions.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', background: '#f8fafc', borderRadius: 12, border: '1.5px dashed #e2e8f0' }}>
            <Repeat size={40} style={{ margin: '0 auto 12px', color: '#cbd5e1', display: 'block' }} />
            <div style={{ fontSize: 15, fontWeight: 700, color: '#475569', marginBottom: 6 }}>No subscriptions yet</div>
            <div style={{ fontSize: 13.5, color: '#94a3b8' }}>Add your first subscription to start tracking recurring costs.</div>
          </div>
        ) : (
          <div style={{ padding: 32, textAlign: 'center', background: '#f8fafc', borderRadius: 12, border: '1.5px dashed #e2e8f0', color: '#94a3b8', fontSize: 14 }}>
            No subscriptions match your filters.
          </div>
        )
      ) : (
        <div style={{ width: '100%', overflowX: 'auto', borderRadius: 12, border: '1.5px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px', background: '#fff' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                <th style={{ padding: '11px 16px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Description</th>
                <th style={{ padding: '11px 16px', textAlign: 'right', fontWeight: 700, color: '#475569', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Amount</th>
                <th style={{ padding: '11px 16px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Frequency</th>
                <th style={{ padding: '11px 16px', textAlign: 'right', fontWeight: 700, color: '#475569', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Yearly Cost</th>
                <th style={{ padding: '11px 16px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Due Date</th>
                <th style={{ padding: '11px 16px', textAlign: 'center', fontWeight: 700, color: '#475569', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Auto-Pay</th>
                <th style={{ padding: '11px 16px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Status</th>
                <th style={{ padding: '11px 16px', textAlign: 'center', fontWeight: 700, color: '#475569', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubscriptions.map((sub, idx) => (
                <tr key={sub.id} style={{ borderBottom: idx < filteredSubscriptions.length - 1 ? '1px solid #f1f5f9' : 'none', transition: 'background 0.12s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Repeat size={14} color="#6366f1" />
                      </div>
                      <div>
                        <div style={{ color: '#1e293b', fontWeight: 600 }}>{sub.description}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' as const }}>
                    ${Number(sub.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '2px 9px', borderRadius: 99, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', background: sub.frequency === 'MONTHLY' ? 'rgba(6,48,98,0.08)' : 'rgba(99,102,241,0.1)', color: sub.frequency === 'MONTHLY' ? '#063062' : '#6366f1', border: `1px solid ${sub.frequency === 'MONTHLY' ? 'rgba(6,48,98,0.18)' : 'rgba(99,102,241,0.25)'}`, whiteSpace: 'nowrap' as const }}>
                      {sub.frequency === 'MONTHLY' ? 'Monthly' : 'Yearly'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#059669', whiteSpace: 'nowrap' as const }}>
                    ${Number(sub.yearly_cost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 12.5, whiteSpace: 'nowrap' as const }}>
                    {new Date(sub.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' })}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    {sub.auto_pay
                      ? <CheckCircle size={16} color="#059669" />
                      : <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid #e2e8f0', display: 'inline-block' }} />}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', background: sub.is_active ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: sub.is_active ? '#16a34a' : '#dc2626', border: `1px solid ${sub.is_active ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}` }}>
                      {sub.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                      <button onClick={() => handleEdit(sub)} title="Edit" style={{ width: 32, height: 32, padding: 0, borderRadius: 7, border: '1.5px solid #bfdbfe', background: '#eff6ff', color: '#2563eb', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', boxSizing: 'border-box' as const }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#dbeafe' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#eff6ff' }}>
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleDelete(sub.id)} title="Delete" style={{ width: 32, height: 32, padding: 0, borderRadius: 7, border: '1.5px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', boxSizing: 'border-box' as const }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fee2e2' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fef2f2' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Side Drawer */}
      {isAddingSubscription && (
        <>
          <div onClick={closeDrawer} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000 }} />
          <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(440px, 100vw)', background: '#fff', zIndex: 1001, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 40px rgba(0,0,0,0.18)', animation: 'slideInFromRight 0.25s ease' }}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #3730a3 0%, #4f46e5 60%, #6366f1 100%)', padding: '28px 24px 24px', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', bottom: -20, left: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
              <button onClick={closeDrawer} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: 34, height: 34, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, lineHeight: 1, padding: 0, boxSizing: 'border-box' as const }}>×</button>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <Repeat size={26} color="#fff" />
              </div>
              <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Subscriptions</div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 22, letterSpacing: 0.2 }}>{editingSubscription ? 'Edit Subscription' : 'Add Subscription'}</div>
              <div style={{ marginTop: 8, color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>Track recurring software licenses and services</div>
            </div>
            {/* Body */}
            <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}><Repeat size={11} color="#94a3b8" /> Description <span style={{ color: '#ef4444' }}>*</span></span>
                <input value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Netflix Premium" style={drawerInputStyle} onFocus={dOnFocus} onBlur={dOnBlur} />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}><DollarSign size={11} color="#94a3b8" /> Amount <span style={{ color: '#ef4444' }}>*</span></span>
                  <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" style={drawerInputStyle} onFocus={dOnFocus} onBlur={dOnBlur} />
                </label>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}><Repeat size={11} color="#94a3b8" /> Frequency</span>
                  <select value={frequency} onChange={e => setFrequency(e.target.value as 'MONTHLY' | 'YEARLY')} style={drawerInputStyle} onFocus={dOnFocus} onBlur={dOnBlur}>
                    <option value="MONTHLY">Monthly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </label>
              </div>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}><Calendar size={11} color="#94a3b8" /> Due Date <span style={{ color: '#ef4444' }}>*</span></span>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={drawerInputStyle} onFocus={dOnFocus} onBlur={dOnBlur} />
              </label>
              <div style={{ display: 'flex', gap: 24 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input type="checkbox" checked={autoPay} onChange={e => setAutoPay(e.target.checked)} style={{ width: 16, height: 16, accentColor: '#6366f1' }} />
                  <span style={{ fontWeight: 600, color: '#475569', fontSize: 13.5 }}>Auto-Pay Enabled</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} style={{ width: 16, height: 16, accentColor: '#6366f1' }} />
                  <span style={{ fontWeight: 600, color: '#475569', fontSize: 13.5 }}>Active</span>
                </label>
              </div>
              {/* Footer inside form so submit works */}
              <div style={{ marginTop: 'auto', paddingTop: 8, borderTop: '1px solid #f1f5f9', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={closeDrawer} style={{ padding: '10px 20px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: 'transparent', color: '#64748b', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', fontWeight: 600, fontSize: 13.5, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 14px rgba(99,102,241,0.3)', boxSizing: 'border-box' as const }}>
                  {saving ? 'Saving...' : <><Repeat size={15} /> {editingSubscription ? 'Update' : 'Add'} Subscription</>}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
