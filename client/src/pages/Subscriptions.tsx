import { useState, useEffect, useCallback, useMemo } from 'react'
import { Calendar, Plus, DollarSign, TrendingUp, CreditCard } from 'lucide-react'
import { subscriptionsApi } from '../services/subscriptionsApi'
import type { Subscription } from '../types/subscriptions'

export default function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(false)
  const [isAddingSubscription, setIsAddingSubscription] = useState(false)
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null)
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

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

  useEffect(() => {
    fetchSubscriptions()
  }, [fetchSubscriptions])

  const resetForm = () => {
    setDescription('')
    setAmount('')
    setDueDate('')
    setFrequency('MONTHLY')
    setAutoPay(false)
    setIsActive(true)
    setEditingSubscription(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!description || !amount || !dueDate) {
      showNotification('Please fill in all required fields', 'error')
      return
    }

    try {
      const data = {
        description,
        amount: Number(amount),
        due_date: dueDate,
        frequency,
        auto_pay: autoPay,
        is_active: isActive
      }

      if (editingSubscription) {
        await subscriptionsApi.update(editingSubscription.id, data)
        showNotification('Subscription updated successfully', 'success')
      } else {
        await subscriptionsApi.create(data)
        showNotification('Subscription added successfully', 'success')
      }

      resetForm()
      setIsAddingSubscription(false)
      fetchSubscriptions()
    } catch (error) {
      console.error('Error saving subscription:', error)
      showNotification('Failed to save subscription', 'error')
    }
  }

  const handleEdit = (subscription: Subscription) => {
    setEditingSubscription(subscription)
    setDescription(subscription.description)
    setAmount(String(subscription.amount))
    setDueDate(subscription.due_date.split('T')[0])
    setFrequency(subscription.frequency)
    setAutoPay(subscription.auto_pay)
    setIsActive(subscription.is_active)
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

  // Filter subscriptions
  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter(sub => {
      const matchesSearch = 
        sub.description.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesFrequency = 
        filterFrequency === 'ALL' || sub.frequency === filterFrequency
      
      const matchesStatus = 
        filterStatus === 'ALL' 
          ? true 
          : filterStatus === 'ACTIVE' 
            ? sub.is_active 
            : !sub.is_active
      
      return matchesSearch && matchesFrequency && matchesStatus
    })
  }, [subscriptions, searchQuery, filterFrequency, filterStatus])

  // Calculate statistics
  const stats = useMemo(() => {
    const active = subscriptions.filter(s => s.is_active)
    const monthlyTotal = active
      .filter(s => s.frequency === 'MONTHLY')
      .reduce((sum, s) => sum + Number(s.amount), 0)
    const yearlyTotal = active
      .filter(s => s.frequency === 'YEARLY')
      .reduce((sum, s) => sum + Number(s.amount), 0)
    const totalYearlyCost = active.reduce((sum, s) => sum + Number(s.yearly_cost), 0)
    const autoPayCount = active.filter(s => s.auto_pay).length

    return { active: active.length, monthlyTotal, yearlyTotal, totalYearlyCost, autoPayCount }
  }, [subscriptions])

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Notification */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '2rem',
          right: '2rem',
          padding: '1rem 1.5rem',
          backgroundColor: notification.type === 'success' ? '#dcfce7' : '#fee2e2',
          border: `1px solid ${notification.type === 'success' ? '#86efac' : '#fecaca'}`,
          borderRadius: '8px',
          color: notification.type === 'success' ? '#166534' : '#991b1b',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          zIndex: 9999
        }}>
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#1f2937', margin: '0 0 0.5rem 0' }}>
          Monthly Subscriptions
        </h1>
        <p style={{ fontSize: '1rem', color: '#6b7280', margin: 0 }}>
          Track and manage your recurring subscription payments
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '1.5rem', borderRadius: '12px', color: '#fff', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, opacity: 0.9 }}>Active Subscriptions</div>
            <Calendar size={20} style={{ opacity: 0.8 }} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{stats.active}</div>
        </div>

        <div style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', padding: '1.5rem', borderRadius: '12px', color: '#fff', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, opacity: 0.9 }}>Monthly Total</div>
            <DollarSign size={20} style={{ opacity: 0.8 }} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>
            LKR {stats.monthlyTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', padding: '1.5rem', borderRadius: '12px', color: '#fff', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, opacity: 0.9 }}>Yearly Cost</div>
            <TrendingUp size={20} style={{ opacity: 0.8 }} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>
            LKR {stats.totalYearlyCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', padding: '1.5rem', borderRadius: '12px', color: '#fff', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, opacity: 0.9 }}>Auto-Pay Enabled</div>
            <CreditCard size={20} style={{ opacity: 0.8 }} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{stats.autoPayCount}</div>
        </div>
      </div>

      {/* Action Bar */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={() => { resetForm(); setIsAddingSubscription(true) }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            background: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          <Plus size={18} />
          Add Subscription
        </button>

        <input
          type="text"
          placeholder="Search subscriptions..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            minWidth: '200px',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            border: '1px solid #d1d5db',
            fontSize: '0.875rem'
          }}
        />

        <select
          value={filterFrequency}
          onChange={e => setFilterFrequency(e.target.value as any)}
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            border: '1px solid #d1d5db',
            fontSize: '0.875rem'
          }}
        >
          <option value="ALL">All Frequencies</option>
          <option value="MONTHLY">Monthly</option>
          <option value="YEARLY">Yearly</option>
        </select>

        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as any)}
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            border: '1px solid #d1d5db',
            fontSize: '0.875rem'
          }}
        >
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      {/* Add/Edit Form Modal */}
      {isAddingSubscription && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'grid',
          placeItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }} onClick={() => { setIsAddingSubscription(false); resetForm() }}>
          <div style={{
            background: '#fff',
            padding: '2rem',
            borderRadius: '16px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            width: 'min(600px, 100%)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 600 }}>
              {editingSubscription ? 'Edit Subscription' : 'Add New Subscription'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
                    Description *
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    required
                    placeholder="e.g., Netflix Premium"
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
                      Amount (LKR) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      required
                      placeholder="0.00"
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
                      Frequency *
                    </label>
                    <select
                      value={frequency}
                      onChange={e => setFrequency(e.target.value as 'MONTHLY' | 'YEARLY')}
                      required
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                    >
                      <option value="MONTHLY">Monthly</option>
                      <option value="YEARLY">Yearly</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
                    Due Date *
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    required
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '2rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={autoPay}
                      onChange={e => setAutoPay(e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Auto-Pay Enabled</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={e => setIsActive(e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Active</span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => { setIsAddingSubscription(false); resetForm() }}
                  style={{
                    padding: '0.75rem 1.5rem',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    background: '#fff',
                    color: '#374151',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.75rem 1.5rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#3b82f6',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {editingSubscription ? 'Update' : 'Add'} Subscription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subscriptions List */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
          Loading subscriptions...
        </div>
      ) : filteredSubscriptions.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280', background: '#f9fafb', borderRadius: '12px', border: '2px dashed #e5e7eb' }}>
          <Calendar size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <p style={{ fontSize: '1.125rem', fontWeight: 600, margin: '0 0 0.5rem 0' }}>
            {subscriptions.length === 0 ? 'No subscriptions yet' : 'No matching subscriptions'}
          </p>
          <p style={{ margin: 0 }}>
            {subscriptions.length === 0 
              ? 'Add your first subscription to start tracking.' 
              : 'Try adjusting your filters.'}
          </p>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>Description</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>Amount</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>Frequency</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>Yearly Cost</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>Due Date</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>Auto-Pay</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubscriptions.map((sub, idx) => (
                  <tr key={sub.id} style={{ borderBottom: idx < filteredSubscriptions.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: 500 }}>{sub.description}</td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                      LKR {Number(sub.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: sub.frequency === 'MONTHLY' ? '#dbeafe' : '#fef3c7',
                        color: sub.frequency === 'MONTHLY' ? '#1e40af' : '#92400e'
                      }}>
                        {sub.frequency}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#059669' }}>
                      LKR {Number(sub.yearly_cost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{new Date(sub.due_date).toLocaleDateString()}</td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      {sub.auto_pay ? (
                        <span style={{ color: '#059669', fontSize: '1.25rem' }}>✓</span>
                      ) : (
                        <span style={{ color: '#d1d5db', fontSize: '1.25rem' }}>○</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: sub.is_active ? '#d1fae5' : '#fee2e2',
                        color: sub.is_active ? '#065f46' : '#991b1b'
                      }}>
                        {sub.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button
                          onClick={() => handleEdit(sub)}
                          style={{
                            padding: '0.375rem 0.75rem',
                            borderRadius: '6px',
                            border: '1px solid #3b82f6',
                            background: '#3b82f6',
                            color: '#fff',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(sub.id)}
                          style={{
                            padding: '0.375rem 0.75rem',
                            borderRadius: '6px',
                            border: '1px solid #ef4444',
                            background: '#ef4444',
                            color: '#fff',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
