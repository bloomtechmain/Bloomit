import React, { useState, useEffect } from 'react'
import type { TemplateType, QuoteItem, QuoteAdditionalService, QuoteStatus, Quote, ServiceSuggestion } from '../types/quotes'
import { createQuote, getServiceSuggestions } from '../services/quotesApi'
// import { API_URL } from '../config/api'
import QuoteList from '../components/quotes/QuoteList'
import QuoteDetail from '../components/quotes/QuoteDetail'
import QuoteReminderModal from '../components/quotes/QuoteReminderModal'
import { useToast } from '../context/ToastContext'

type ViewMode = 'list' | 'create' | 'edit' | 'view'

// Fixed line items for each template type
const TEMPLATE_FIXED_ITEMS: Record<TemplateType, QuoteItem[]> = {
  RESTAURANT: [
    { description: 'PC System Full Set Up (1 Year Warranty)', quantity: 1, unit_price: 0, total: 0 },
    { description: 'Printer', quantity: 1, unit_price: 0, total: 0 },
    { description: 'POS software', quantity: 1, unit_price: 0, total: 0 },
    { description: 'Delivery Fee & Setup and Maintenance', quantity: 1, unit_price: 0, total: 0 }
  ],
  RETAIL: [
    { description: 'PC System Set up  (1 Year Warranty)', quantity: 1, unit_price: 0, total: 0 },
    { description: 'Printer (1 Year Warranty)', quantity: 1, unit_price: 0, total: 0 },
    { description: 'Barcode Scanner', quantity: 1, unit_price: 0, total: 0 },
    { description: 'POS software', quantity: 1, unit_price: 0, total: 0 },
    { description: 'Delivery Fee & Setup and Maintenance', quantity: 1, unit_price: 0, total: 0 }
  ],
  CUSTOM: []  // Empty for custom templates
}

const QuoteGenerator: React.FC = () => {
  const { toast } = useToast()
  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedQuoteId, setSelectedQuoteId] = useState<number | null>(null)
  
  // Form state
  const [templateType, setTemplateType] = useState<TemplateType>('RESTAURANT')
  const [companyName, setCompanyName] = useState('')
  const [companyAddress, setCompanyAddress] = useState('')
  const [dateOfIssue, setDateOfIssue] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<QuoteStatus>('DRAFT')
  
  // Line items state
  const [items, setItems] = useState<QuoteItem[]>([
    { description: '', quantity: 1, unit_price: 0, total: 0 }
  ])
  
  // Additional services state
  const [additionalServices, setAdditionalServices] = useState<QuoteAdditionalService[]>([])
  const [serviceSuggestions, setServiceSuggestions] = useState<ServiceSuggestion[]>([])
  const [newServiceName, setNewServiceName] = useState('')
  const [newServicePrice, setNewServicePrice] = useState('')
  
  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Reminder modal state
  const [showReminderModal, setShowReminderModal] = useState(false)
  const [createdQuote, setCreatedQuote] = useState<Quote | null>(null)

  // Load service suggestions on mount
  useEffect(() => {
    loadServiceSuggestions()
  }, [])

  // Auto-populate line items when template type changes
  useEffect(() => {
    const fixedItems = TEMPLATE_FIXED_ITEMS[templateType]
    if (fixedItems.length > 0) {
      setItems([...fixedItems])
    } else {
      // For CUSTOM or templates without fixed items
      setItems([{ description: '', quantity: 1, unit_price: 0, total: 0 }])
    }
  }, [templateType])

  const loadServiceSuggestions = async () => {
    try {
      const suggestions = await getServiceSuggestions()
      setServiceSuggestions(suggestions)
    } catch (err) {
      console.error('Failed to load service suggestions:', err)
    }
  }

  // Helper function to check if an item is a fixed template item
  const isFixedTemplateItem = (template: TemplateType, description: string): boolean => {
    const fixedItems = TEMPLATE_FIXED_ITEMS[template]
    return fixedItems.some(item => item.description === description)
  }

  // Calculate line item total
  const calculateItemTotal = (quantity: number, unitPrice: number): number => {
    return quantity * unitPrice
  }

  // Calculate subtotal
  const calculateSubtotal = (): number => {
    const itemsTotal = items.reduce((sum, item) => sum + item.total, 0)
    const servicesTotal = additionalServices.reduce((sum, service) => sum + service.price, 0)
    return itemsTotal + servicesTotal
  }

  // Format currency with safe type handling
  const formatCurrency = (amount: number | string | null | undefined): string => {
    // Handle null or undefined
    if (amount == null) {
      return '0.00'
    }
    
    // Convert to number if it's a string
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
    
    // Check if it's a valid number
    if (isNaN(numAmount)) {
      return '0.00'
    }
    
    return numAmount.toFixed(2)
  }

  // Handle line item changes
  const handleItemChange = (index: number, field: keyof QuoteItem, value: string | number) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    
    // Recalculate total if quantity or unit_price changed
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].total = calculateItemTotal(
        Number(newItems[index].quantity),
        Number(newItems[index].unit_price)
      )
    }
    
    setItems(newItems)
  }

  // Add new line item
  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unit_price: 0, total: 0 }])
  }

  // Remove line item
  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  // Add additional service
  const addService = () => {
    if (newServiceName && newServicePrice) {
      setAdditionalServices([
        ...additionalServices,
        { service_name: newServiceName, price: parseFloat(newServicePrice) }
      ])
      setNewServiceName('')
      setNewServicePrice('')
    }
  }

  // Add service from suggestion
  const addServiceFromSuggestion = (suggestion: ServiceSuggestion) => {
    setAdditionalServices([
      ...additionalServices,
      { service_name: suggestion.service_name, price: suggestion.price }
    ])
  }

  // Remove additional service
  const removeService = (index: number) => {
    setAdditionalServices(additionalServices.filter((_, i) => i !== index))
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!companyName.trim()) {
      setError('Company name is required')
      return
    }

    if (items.length === 0 || items.every(item => !item.description.trim())) {
      setError('At least one line item is required')
      return
    }

    // Filter out empty items
    const validItems = items.filter(item => item.description.trim())

    setLoading(true)

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')

      const newQuote = await createQuote({
        template_type: templateType,
        company_name: companyName,
        company_address: companyAddress || undefined,
        date_of_issue: dateOfIssue,
        notes: notes || undefined,
        status,
        created_by: user.id || undefined,
        items: validItems,
        additional_services: additionalServices.length > 0 ? additionalServices : undefined
      })

      toast.success('Quote created successfully!')
      setCreatedQuote(newQuote)

      // Show reminder modal after successful creation
      setTimeout(() => {
        setShowReminderModal(true)
      }, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create quote')
    } finally {
      setLoading(false)
    }
  }

  // Reset form
  const resetForm = () => {
    setCompanyName('')
    setCompanyAddress('')
    setDateOfIssue(new Date().toISOString().split('T')[0])
    setNotes('')
    setStatus('DRAFT')
    setItems([{ description: '', quantity: 1, unit_price: 0, total: 0 }])
    setAdditionalServices([])
    setSelectedQuoteId(null)
  }

  // Handle view mode changes
  // @ts-expect-error - Reserved for future use
  const _handleViewQuote = (quoteId: number) => {
    setSelectedQuoteId(quoteId)
    setViewMode('view')
  }

  // @ts-expect-error - Reserved for future use
  const _handleEditQuote = (quoteId: number) => {
    setSelectedQuoteId(quoteId)
    setViewMode('edit')
    // TODO: Load quote data for editing
  }

  const handleCreateNew = () => {
    resetForm()
    setViewMode('create')
  }

  const handleBackToList = () => {
    resetForm()
    setViewMode('list')
  }

  // Render list view
  if (viewMode === 'list') {
    return (
      <div style={{ width: '100%', display: 'grid', gap: 16 }}>
        <QuoteList
          onCreateNew={handleCreateNew}
        />
      </div>
    )
  }

  // Render view/edit mode
  if (viewMode === 'view' || viewMode === 'edit') {
    if (!selectedQuoteId) {
      return (
        <div style={{ width: '100%', display: 'grid', gap: 16 }}>
          <div className="glass-panel" style={{ padding: 24, maxWidth: 600 }}>
            <p style={{ margin: 0, color: 'var(--accent)', fontWeight: 600 }}>No quote selected</p>
            <button onClick={handleBackToList} className="btn-primary" style={{ marginTop: 16 }}>
              Go Back
            </button>
          </div>
        </div>
      )
    }

    return (
      <div style={{ width: '100%', display: 'grid', gap: 16 }}>
        <QuoteDetail
          quoteId={selectedQuoteId}
          onBack={handleBackToList}
          isEditMode={viewMode === 'edit'}
        />
      </div>
    )
  }

  // Render create/edit form
  return (
    <div style={{ width: '100%', display: 'grid', gap: 16 }}>
      <div className="glass-panel" style={{ padding: 32, maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>Create Quote</h1>
          <button
            onClick={handleBackToList}
            className="btn-secondary"
          >
            ← Back to List
          </button>
        </div>

        {error && (
            <div style={{ marginBottom: 24, padding: '12px 16px', borderRadius: 8, background: 'rgba(234, 88, 12, 0.1)', border: '1px solid var(--accent)', color: 'var(--accent)' }}>
              {error}
            </div>
          )}

        <form onSubmit={handleSubmit}>
            {/* Phase 4A: Template Selection */}
            <div style={{ marginBottom: 32 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 12 }}>
                Template Type
              </label>
              <div style={{ display: 'flex', gap: 16 }}>
                <button
                  type="button"
                  onClick={() => setTemplateType('RESTAURANT')}
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    borderRadius: 8,
                    border: templateType === 'RESTAURANT' ? '2px solid var(--accent)' : '1px solid rgba(255,255,255,0.3)',
                    background: templateType === 'RESTAURANT' ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Restaurant
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateType('RETAIL')}
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    borderRadius: 8,
                    border: templateType === 'RETAIL' ? '2px solid var(--accent)' : '1px solid rgba(255,255,255,0.3)',
                    background: templateType === 'RETAIL' ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Retail
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateType('CUSTOM')}
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    borderRadius: 8,
                    border: templateType === 'CUSTOM' ? '2px solid var(--accent)' : '1px solid rgba(255,255,255,0.3)',
                    background: templateType === 'CUSTOM' ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Custom
                </button>
              </div>
            </div>

            {/* Phase 4B: Company Information */}
            <div style={{ marginBottom: 32, borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Company Information</h2>
              
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label" style={{ color: '#fff' }}>
                    Company Name *
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Enter company name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ color: '#fff' }}>
                    Date of Issue *
                  </label>
                  <input
                    type="date"
                    value={dateOfIssue}
                    onChange={(e) => setDateOfIssue(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: 16 }}>
                <label className="form-label" style={{ color: '#fff' }}>
                  Company Address
                </label>
                <textarea
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                  rows={3}
                  placeholder="Enter company address"
                />
              </div>
            </div>

            {/* Phase 4C: Line Items */}
            <div style={{ marginBottom: 32, borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Line Items</h2>
                <button
                  type="button"
                  onClick={addItem}
                  className="btn-primary"
                >
                  + Add Item
                </button>
              </div>

              <div style={{ display: 'grid', gap: 16 }}>
                {items.map((item, index) => {
                  const isFixed = isFixedTemplateItem(templateType, item.description)
                  return (
                  <div key={index} style={{ display: 'flex', gap: 12, alignItems: 'start', background: 'rgba(255,255,255,0.1)', padding: 16, borderRadius: 8 }}>
                    <div style={{ flex: 1 }}>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        placeholder="Item description"
                        readOnly={isFixed}
                        style={{
                          background: isFixed ? 'rgba(255,255,255,0.05)' : undefined,
                          cursor: isFixed ? 'not-allowed' : 'text',
                          color: isFixed ? 'rgba(255,255,255,0.7)' : undefined
                        }}
                      />
                    </div>
                    <div style={{ width: 100 }}>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                        placeholder="Qty"
                        min="1"
                      />
                    </div>
                    <div style={{ width: 130 }}>
                      <input
                        type="number"
                        value={item.unit_price}
                        onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        placeholder="Price"
                        step="0.01"
                        min="0"
                      />
                    </div>
                    <div style={{ width: 150 }}>
                      <input
                        type="text"
                        value={`LKR ${formatCurrency(item.total)}`}
                        style={{ background: 'rgba(255,255,255,0.05)', cursor: 'not-allowed' }}
                        disabled
                      />
                    </div>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        style={{ padding: '8px 12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                  )
                })}
              </div>
            </div>

            {/* Phase 4D: Additional Services */}
            <div style={{ marginBottom: 32, borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Additional Services</h2>

              {/* Service Suggestions */}
              {serviceSuggestions.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 14, marginBottom: 8 }}>Quick add:</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {serviceSuggestions.slice(0, 5).map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => addServiceFromSuggestion(suggestion)}
                        style={{ padding: '6px 12px', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', border: '1px solid #3b82f6', borderRadius: 16, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                      >
                        {suggestion.service_name} (LKR {formatCurrency(suggestion.price)})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Add New Service */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <input
                  type="text"
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  style={{ flex: 1 }}
                  placeholder="Service name"
                />
                <input
                  type="number"
                  value={newServicePrice}
                  onChange={(e) => setNewServicePrice(e.target.value)}
                  style={{ width: 130 }}
                  placeholder="Price"
                  step="0.01"
                  min="0"
                />
                <button
                  type="button"
                  onClick={addService}
                  className="btn-primary"
                >
                  Add
                </button>
              </div>

              {/* Services List */}
              {additionalServices.length > 0 && (
                <div style={{ display: 'grid', gap: 8 }}>
                  {additionalServices.map((service, index) => (
                    <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.1)', padding: 12, borderRadius: 8 }}>
                      <span style={{ fontWeight: 600 }}>{service.service_name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span>LKR {formatCurrency(service.price)}</span>
                        <button
                          type="button"
                          onClick={() => removeService(index)}
                          style={{ padding: '4px 8px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div style={{ marginBottom: 32, borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 24 }}>
              <label className="form-label" style={{ color: '#fff' }}>
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Add any additional notes..."
              />
            </div>

            {/* Phase 4E: Total and Submit */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 24 }}>
              <div style={{ background: 'rgba(255,255,255,0.1)', padding: 24, borderRadius: 12, marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 24, fontWeight: 700 }}>Total:</span>
                  <span style={{ fontSize: 32, fontWeight: 800, color: 'var(--accent)' }}>LKR {formatCurrency(calculateSubtotal())}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 16 }}>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary"
                  style={{ flex: 1, padding: '12px 24px', fontSize: 16 }}
                >
                  {loading ? 'Creating...' : 'Create Quote'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="btn-secondary"
                  style={{ padding: '12px 24px' }}
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={handleBackToList}
                  className="btn-secondary"
                  style={{ padding: '12px 24px' }}
                >
                  Cancel
                </button>
              </div>
          </div>
        </form>
      </div>

      {/* Reminder Modal */}
      {showReminderModal && createdQuote && (
        <QuoteReminderModal
          quoteId={createdQuote.quote_id}
          quoteNumber={createdQuote.quote_number}
          companyName={createdQuote.company_name}
          isOpen={showReminderModal}
          onClose={() => {
            setShowReminderModal(false)
            resetForm()
            handleBackToList()
          }}
          onSuccess={() => {
            setShowReminderModal(false)
            resetForm()
            handleBackToList()
          }}
        />
      )}
    </div>
  )
}

export default QuoteGenerator
