import React, { useState, useEffect } from 'react'
import { getQuoteById, updateQuote } from '../../services/quotesApi'
import type { QuoteItem, QuoteAdditionalService, TemplateType } from '../../types/quotes'
import { useToast } from '../../context/ToastContext'

interface QuoteEditModalProps {
  quoteId: number
  onClose: () => void
  onSuccess: () => void
}

const QuoteEditModal: React.FC<QuoteEditModalProps> = ({ quoteId, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  // Form state
  const [templateType, setTemplateType] = useState<TemplateType>('RESTAURANT')
  const [companyName, setCompanyName] = useState('')
  const [companyAddress, setCompanyAddress] = useState('')
  const [dateOfIssue, setDateOfIssue] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<QuoteItem[]>([{ description: '', quantity: 1, unit_price: 0, total: 0 }])
  const [additionalServices, setAdditionalServices] = useState<QuoteAdditionalService[]>([])
  const [quoteStatus, setQuoteStatus] = useState<string>('DRAFT')

  useEffect(() => {
    loadQuote()
  }, [quoteId])

  const loadQuote = async () => {
    try {
      setLoading(true)
      const data = await getQuoteById(quoteId)
      
      setTemplateType(data.template_type)
      setCompanyName(data.company_name)
      setCompanyAddress(data.company_address || '')
      setDateOfIssue(data.date_of_issue.split('T')[0]) // Format for input[type=date]
      setNotes(data.notes || '')
      setItems(data.items && data.items.length > 0 
        ? data.items.map(item => ({
            ...item,
            quantity: Number(item.quantity),
            unit_price: Number(item.unit_price),
            total: Number(item.total)
          }))
        : [{ description: '', quantity: 1, unit_price: 0, total: 0 }])
      setAdditionalServices(data.additional_services 
        ? data.additional_services.map(service => ({
            ...service,
            price: Number(service.price)
          }))
        : [])
      setQuoteStatus(data.status)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load quote')
    } finally {
      setLoading(false)
    }
  }

  const handleItemChange = (index: number, field: keyof QuoteItem, value: string | number) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].total = Number(newItems[index].quantity) * Number(newItems[index].unit_price)
    }
    
    setItems(newItems)
  }

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unit_price: 0, total: 0 }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const handleServiceChange = (index: number, field: 'service_name' | 'price', value: string | number) => {
    const newServices = [...additionalServices]
    newServices[index] = { ...newServices[index], [field]: value }
    setAdditionalServices(newServices)
  }

  const addService = () => {
    setAdditionalServices([...additionalServices, { service_name: '', price: 0 }])
  }

  const removeService = (index: number) => {
    setAdditionalServices(additionalServices.filter((_, i) => i !== index))
  }

  const calculateSubtotal = (): number => {
    const itemsTotal = items.reduce((sum, item) => sum + Number(item.total || 0), 0)
    const servicesTotal = additionalServices.reduce((sum, service) => sum + Number(service.price || 0), 0)
    return itemsTotal + servicesTotal
  }

  const handleSave = async () => {
    // Validation
    if (!companyName.trim()) {
      toast.error('Company name is required')
      return
    }

    if (!dateOfIssue) {
      toast.error('Date of issue is required')
      return
    }

    const validItems = items.filter(item => item.description.trim())

    if (validItems.length === 0) {
      toast.error('At least one line item with description is required')
      return
    }

    setSaving(true)

    try {
      await updateQuote(quoteId, {
        quote_id: quoteId,
        template_type: templateType,
        company_name: companyName,
        company_address: companyAddress || undefined,
        date_of_issue: dateOfIssue,
        notes: notes || undefined,
        status: quoteStatus as any,
        items: validItems,
        additional_services: additionalServices.filter(s => s.service_name.trim()).length > 0 
          ? additionalServices.filter(s => s.service_name.trim()) 
          : undefined
      })

      toast.success('Quote updated successfully!')
      onSuccess()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update quote')
    } finally {
      setSaving(false)
    }
  }

  const formatCurrency = (amount: number | string): string => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
    return `LKR ${(numAmount || 0).toFixed(2)}`
  }

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 20
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: 'var(--primary)',
          borderRadius: 16,
          maxWidth: 1000,
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ 
          padding: '24px 32px', 
          borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(0, 0, 0, 0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 32 }}>✏️</span>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#fff' }}>Edit Quote</h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 32,
              color: 'rgba(255, 255, 255, 0.7)',
              cursor: 'pointer',
              lineHeight: 1,
              padding: 0,
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
              e.currentTarget.style.color = '#fff'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none'
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 32 }}>
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--accent)' }}></div>
            </div>
          )}

          {!loading && (
            <div style={{ display: 'grid', gap: 24 }}>
              {/* Company Information */}
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 16px 0', color: '#fff' }}>Company Information</h3>
                <div style={{ display: 'grid', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 8, color: '#fff' }}>
                      Company Name <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(255, 255, 255, 0.05)', color: '#fff', fontSize: 14 }}
                      placeholder="Enter company name"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 8, color: '#fff' }}>
                      Company Address
                    </label>
                    <textarea
                      value={companyAddress}
                      onChange={(e) => setCompanyAddress(e.target.value)}
                      rows={2}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(255, 255, 255, 0.05)', color: '#fff', fontSize: 14, resize: 'vertical' }}
                      placeholder="Enter company address"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 8, color: '#fff' }}>
                      Date of Issue <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="date"
                      value={dateOfIssue}
                      onChange={(e) => setDateOfIssue(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(255, 255, 255, 0.05)', color: '#fff', fontSize: 14 }}
                    />
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: '#fff' }}>Line Items</h3>
                  <button
                    onClick={addItem}
                    className="btn-primary"
                    style={{ padding: '8px 16px', fontSize: 14 }}
                  >
                    + Add Item
                  </button>
                </div>
                <div style={{ display: 'grid', gap: 12 }}>
                  {items.map((item, index) => (
                    <div key={index} style={{ background: 'rgba(255, 255, 255, 0.05)', padding: 16, borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 12, alignItems: 'end' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6, color: 'rgba(255, 255, 255, 0.8)' }}>
                            Description
                          </label>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(255, 255, 255, 0.05)', color: '#fff', fontSize: 13 }}
                            placeholder="Item description"
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6, color: 'rgba(255, 255, 255, 0.8)' }}>
                            Qty
                          </label>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                            style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(255, 255, 255, 0.05)', color: '#fff', fontSize: 13 }}
                            min="1"
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6, color: 'rgba(255, 255, 255, 0.8)' }}>
                            Unit Price
                          </label>
                          <input
                            type="number"
                            value={item.unit_price}
                            onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                            style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(255, 255, 255, 0.05)', color: '#fff', fontSize: 13 }}
                            step="0.01"
                            min="0"
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6, color: 'rgba(255, 255, 255, 0.8)' }}>
                            Total
                          </label>
                          <div style={{ padding: '8px 10px', fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>
                            {formatCurrency(item.total)}
                          </div>
                        </div>
                        {items.length > 1 && (
                          <button
                            onClick={() => removeItem(index)}
                            style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#ef4444', padding: '8px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 18, lineHeight: 1 }}
                            title="Remove item"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Additional Services */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: '#fff' }}>Additional Services</h3>
                  <button
                    onClick={addService}
                    className="btn-primary"
                    style={{ padding: '8px 16px', fontSize: 14 }}
                  >
                    + Add Service
                  </button>
                </div>
                {additionalServices.length > 0 ? (
                  <div style={{ display: 'grid', gap: 12 }}>
                    {additionalServices.map((service, index) => (
                      <div key={index} style={{ background: 'rgba(255, 255, 255, 0.05)', padding: 16, borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 12, alignItems: 'end' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6, color: 'rgba(255, 255, 255, 0.8)' }}>
                              Service Name
                            </label>
                            <input
                              type="text"
                              value={service.service_name}
                              onChange={(e) => handleServiceChange(index, 'service_name', e.target.value)}
                              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(255, 255, 255, 0.05)', color: '#fff', fontSize: 13 }}
                              placeholder="Service name"
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6, color: 'rgba(255, 255, 255, 0.8)' }}>
                              Price
                            </label>
                            <input
                              type="number"
                              value={service.price}
                              onChange={(e) => handleServiceChange(index, 'price', parseFloat(e.target.value) || 0)}
                              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(255, 255, 255, 0.05)', color: '#fff', fontSize: 13 }}
                              step="0.01"
                              min="0"
                            />
                          </div>
                          <button
                            onClick={() => removeService(index)}
                            style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#ef4444', padding: '8px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 18, lineHeight: 1 }}
                            title="Remove service"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.5)', margin: 0 }}>No additional services added</p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 8, color: '#fff' }}>
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(255, 255, 255, 0.05)', color: '#fff', fontSize: 14, resize: 'vertical' }}
                  placeholder="Add any additional notes or terms"
                />
              </div>

              {/* Total Summary */}
              <div style={{ background: 'linear-gradient(135deg, rgba(234, 88, 12, 0.2), rgba(234, 88, 12, 0.1))', padding: 20, borderRadius: 12, border: '1px solid rgba(234, 88, 12, 0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 16, fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)' }}>Total Amount</span>
                  <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)' }}>{formatCurrency(calculateSubtotal())}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ 
          padding: '20px 32px', 
          borderTop: '1px solid rgba(255, 255, 255, 0.2)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 12,
          background: 'rgba(0, 0, 0, 0.2)'
        }}>
          <button
            onClick={onClose}
            className="btn-secondary"
            style={{ padding: '10px 24px' }}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="btn-primary"
            style={{ padding: '10px 24px' }}
            disabled={saving || loading}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default QuoteEditModal
