import React, { useState, useEffect } from 'react'
import { getQuoteById, updateQuote } from '../../services/quotesApi'
import type { Quote, QuoteItem, QuoteAdditionalService, TemplateType } from '../../types/quotes'
import QuoteStatusManager from './QuoteStatusManager'
import QuoteStatusHistory from './QuoteStatusHistory'
import QuoteRemindersSection from './QuoteRemindersSection'
import { generateQuotePDF } from '../../utils/pdfExport'

interface QuoteDetailProps {
  quoteId: number
  onBack: () => void
  onEditMode?: () => void
  isEditMode?: boolean
}

const QuoteDetail: React.FC<QuoteDetailProps> = ({ quoteId, onBack, onEditMode, isEditMode = false }) => {
  // State
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [exportingPDF, setExportingPDF] = useState(false)
  
  // Edit mode state
  const [editMode, setEditMode] = useState(isEditMode)
  const [templateType, setTemplateType] = useState<TemplateType>('SERVICES')
  const [companyName, setCompanyName] = useState('')
  const [companyAddress, setCompanyAddress] = useState('')
  const [dateOfIssue, setDateOfIssue] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<QuoteItem[]>([])
  const [additionalServices, setAdditionalServices] = useState<QuoteAdditionalService[]>([])

  // Fetch quote data
  useEffect(() => {
    loadQuote()
  }, [quoteId])

  const loadQuote = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getQuoteById(quoteId)
      setQuote(data)
      
      // Populate edit fields
      setTemplateType(data.template_type)
      setCompanyName(data.company_name)
      setCompanyAddress(data.company_address || '')
      setDateOfIssue(data.date_of_issue)
      setNotes(data.notes || '')
      setItems(data.items || [])
      setAdditionalServices(data.additional_services || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quote')
    } finally {
      setLoading(false)
    }
  }

  // Edit mode handlers
  const handleEnterEditMode = () => {
    setEditMode(true)
    if (onEditMode) onEditMode()
  }

  const handleCancelEdit = () => {
    // Reset to original values
    if (quote) {
      setTemplateType(quote.template_type)
      setCompanyName(quote.company_name)
      setCompanyAddress(quote.company_address || '')
      setDateOfIssue(quote.date_of_issue)
      setNotes(quote.notes || '')
      setItems(quote.items || [])
      setAdditionalServices(quote.additional_services || [])
    }
    setEditMode(false)
    setError(null)
    setSuccess(false)
  }

  // Handle PDF export
  const handleExportPDF = () => {
    if (!quote) return
    
    setExportingPDF(true)
    try {
      generateQuotePDF(quote)
      // Show success message briefly
      setTimeout(() => setExportingPDF(false), 1000)
    } catch (err) {
      console.error('Failed to generate PDF:', err)
      setError('Failed to generate PDF')
      setExportingPDF(false)
    }
  }

  // Line item handlers
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

  // Additional service handlers
  const addService = () => {
    const serviceName = prompt('Service name:')
    const servicePrice = prompt('Service price:')
    
    if (serviceName && servicePrice) {
      setAdditionalServices([
        ...additionalServices,
        { service_name: serviceName, price: parseFloat(servicePrice) }
      ])
    }
  }

  const removeService = (index: number) => {
    setAdditionalServices(additionalServices.filter((_, i) => i !== index))
  }

  // Save changes
  const handleSave = async () => {
    if (!quote) return

    setError(null)
    setSuccess(false)

    // Validation
    if (!companyName.trim()) {
      setError('Company name is required')
      return
    }

    if (items.length === 0 || items.every(item => !item.description.trim())) {
      setError('At least one line item is required')
      return
    }

    const validItems = items.filter(item => item.description.trim())

    setSaving(true)

    try {
      const updatedQuote = await updateQuote(quoteId, {
        quote_id: quoteId,
        template_type: templateType,
        company_name: companyName,
        company_address: companyAddress || undefined,
        date_of_issue: dateOfIssue,
        notes: notes || undefined,
        status: quote.status,
        items: validItems,
        additional_services: additionalServices.length > 0 ? additionalServices : undefined
      })

      setQuote(updatedQuote)
      setSuccess(true)
      setEditMode(false)
      
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update quote')
    } finally {
      setSaving(false)
    }
  }

  // Calculations
  const calculateSubtotal = (): number => {
    const itemsTotal = items.reduce((sum, item) => sum + item.total, 0)
    const servicesTotal = additionalServices.reduce((sum, service) => sum + service.price, 0)
    return itemsTotal + servicesTotal
  }

  const formatCurrency = (amount: number | string | null | undefined): string => {
    // Handle null or undefined
    if (amount == null) {
      return 'LKR 0.00'
    }
    
    // Convert to number if it's a string
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
    
    // Check if it's a valid number
    if (isNaN(numAmount)) {
      return 'LKR 0.00'
    }
    
    return `LKR ${numAmount.toFixed(2)}`
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800'
      case 'SENT': return 'bg-blue-100 text-blue-800'
      case 'ACCEPTED': return 'bg-green-100 text-green-800'
      case 'REJECTED': return 'bg-red-100 text-red-800'
      case 'FOLLOW_UP': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Loading state
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256, padding: 48 }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--accent)' }}></div>
      </div>
    )
  }

  // Error state
  if (!quote) {
    return (
      <div className="glass-panel" style={{ padding: 24, maxWidth: 600 }}>
        <p style={{ margin: 0, color: 'var(--accent)', fontWeight: 600 }}>Quote not found</p>
        <button onClick={onBack} className="btn-primary" style={{ marginTop: 16 }}>
          Go Back
        </button>
      </div>
    )
  }

  // Handle status update callback
  const handleStatusUpdate = (updatedQuote: Quote) => {
    setQuote(updatedQuote)
  }

  return (
    <div style={{ width: '100%', display: 'grid', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>{quote.quote_number}</h1>
            <span style={{ padding: '6px 16px', borderRadius: 16, fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }} className={getStatusColor(quote.status)}>
              {quote.status}
            </span>
          </div>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 8 }}>
            Created: {formatDate(quote.created_at)} {quote.created_by_name && `by ${quote.created_by_name}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {!editMode && (
            <button
              onClick={handleExportPDF}
              disabled={exportingPDF}
              className="btn-primary"
              title="Export to PDF"
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
              </svg>
              {exportingPDF ? 'Exporting...' : 'Export PDF'}
            </button>
          )}
          {!editMode && quote.status === 'DRAFT' && (
            <button
              onClick={handleEnterEditMode}
              className="btn-primary"
              style={{ background: '#4ade80', borderColor: '#4ade80' }}
            >
              Edit Quote
            </button>
          )}
          <button
            onClick={onBack}
            className="btn-secondary"
          >
            ← Back to List
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(234, 88, 12, 0.1)', border: '1px solid var(--accent)', color: 'var(--accent)' }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(76, 175, 80, 0.1)', border: '1px solid #4CAF50', color: '#4CAF50' }}>
          Quote updated successfully!
        </div>
      )}

      {/* Status Management - Only show in view mode (not edit mode) */}
      {!editMode && (
        <>
          <QuoteStatusManager quote={quote} onStatusUpdate={handleStatusUpdate} />
          <QuoteStatusHistory quoteId={quote.quote_id} />
        </>
      )}

      {/* Reminders Section - Show in both view and edit modes */}
      <div className="glass-panel" style={{ padding: 24 }}>
        <QuoteRemindersSection
          quoteId={quote.quote_id}
          quoteNumber={quote.quote_number}
          companyName={quote.company_name}
        />
      </div>

      {/* Content */}
      <div className="glass-panel" style={{ padding: 24 }}>
        {/* Template Type - View Only */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 12 }}>Category</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(['SERVICES', 'PRODUCTS', 'CONSULTING', 'CONSTRUCTION', 'CUSTOM'] as const).map(t => {
              const icons: Record<string, string> = { SERVICES: '🛠️', PRODUCTS: '📦', CONSULTING: '💼', CONSTRUCTION: '🏗️', CUSTOM: '✏️' }
              return (
                <span key={t} style={{
                  padding: '6px 14px', borderRadius: 8, fontWeight: 600, fontSize: 13,
                  background: templateType === t ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
                  color: templateType === t ? '#fff' : 'rgba(255,255,255,0.45)',
                  border: templateType === t ? '1px solid transparent' : '1px solid rgba(255,255,255,0.1)',
                }}>
                  {icons[t]} {t.charAt(0) + t.slice(1).toLowerCase()}
                </span>
              )
            })}
          </div>
        </div>

        {/* Company Information */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 24, marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Company Information</h2>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label" style={{ color: '#fff' }}>Company Name</label>
              {editMode ? (
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              ) : (
                <p style={{ margin: 0, color: '#fff' }}>{quote.company_name}</p>
              )}
            </div>
            <div className="form-group">
              <label className="form-label" style={{ color: '#fff' }}>Date of Issue</label>
              <p style={{ margin: 0, color: '#fff' }}>{formatDate(quote.date_of_issue)}</p>
            </div>
          </div>
          <div className="form-group" style={{ marginTop: 16 }}>
            <label className="form-label" style={{ color: '#fff' }}>Company Address</label>
            {editMode ? (
              <textarea
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                rows={3}
              />
            ) : (
              <p style={{ margin: 0, color: '#fff' }}>{quote.company_address || '-'}</p>
            )}
          </div>
        </div>

        {/* Line Items */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Line Items</h2>
            {editMode && (
              <button onClick={addItem} className="btn-primary">
                + Add Item
              </button>
            )}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead style={{ background: 'var(--primary)', color: '#fff' }}>
                <tr>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, textTransform: 'uppercase', fontSize: 11 }}>Description</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, textTransform: 'uppercase', fontSize: 11 }}>Quantity</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, textTransform: 'uppercase', fontSize: 11 }}>Unit Price</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, textTransform: 'uppercase', fontSize: 11 }}>Total</th>
                  {editMode && <th style={{ padding: '10px 12px' }}></th>}
                </tr>
              </thead>
              <tbody style={{ background: 'rgba(255,255,255,0.05)' }}>
                {items.map((item, index) => (
                  <tr key={index} style={{ borderBottom: index < items.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
                    <td style={{ padding: '10px 12px' }}>
                      {editMode ? (
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          style={{ width: '100%' }}
                        />
                      ) : (
                        <span>{item.description}</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {editMode ? (
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                          style={{ width: 80 }}
                        />
                      ) : (
                        <span>{item.quantity}</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {editMode ? (
                        <input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                          style={{ width: 100 }}
                          step="0.01"
                        />
                      ) : (
                        <span>{formatCurrency(item.unit_price)}</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--accent)' }}>{formatCurrency(item.total)}</td>
                    {editMode && items.length > 1 && (
                      <td style={{ padding: '10px 12px' }}>
                        <button
                          onClick={() => removeItem(index)}
                          style={{ color: '#ef4444', background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}
                        >
                          ×
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Additional Services */}
        {(additionalServices.length > 0 || editMode) && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 24, marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Additional Services</h2>
              {editMode && (
                <button onClick={addService} className="btn-primary">
                  + Add Service
                </button>
              )}
            </div>
            {additionalServices.length > 0 ? (
              <div style={{ display: 'grid', gap: 8 }}>
                {additionalServices.map((service, index) => (
                  <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.1)', padding: 12, borderRadius: 8 }}>
                    <span style={{ fontWeight: 600 }}>{service.service_name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span>{formatCurrency(service.price)}</span>
                      {editMode && (
                        <button
                          onClick={() => removeService(index)}
                          style={{ color: '#ef4444', background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>No additional services</p>
            )}
          </div>
        )}

        {/* Notes */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 24, marginBottom: 24 }}>
          <label className="form-label" style={{ color: '#fff' }}>Notes</label>
          {editMode ? (
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          ) : (
            <p style={{ margin: 0, color: '#fff' }}>{quote.notes || '-'}</p>
          )}
        </div>

        {/* Total */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 24 }}>
          <div style={{ background: 'rgba(255,255,255,0.1)', padding: 24, borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', margin: 0 }}>Subtotal</p>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', margin: '8px 0 0' }}>Total Due</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>{formatCurrency(editMode ? calculateSubtotal() : quote.subtotal)}</p>
                <p style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)', margin: '8px 0 0' }}>{formatCurrency(editMode ? calculateSubtotal() : quote.total_due)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons (Edit Mode) */}
        {editMode && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 24, marginTop: 24, display: 'flex', gap: 16 }}>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary"
              style={{ flex: 1, padding: '12px 24px', fontSize: 16 }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={handleCancelEdit}
              className="btn-secondary"
              style={{ padding: '12px 24px' }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default QuoteDetail
