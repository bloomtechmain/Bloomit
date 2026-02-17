import React, { useState, useEffect } from 'react'
import { getQuoteById } from '../../services/quotesApi'
import type { Quote } from '../../types/quotes'
import QuoteRemindersSection from './QuoteRemindersSection'

interface QuoteViewModalProps {
  quoteId: number
  onClose: () => void
}

const QuoteViewModal: React.FC<QuoteViewModalProps> = ({ quoteId, onClose }) => {
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadQuote()
  }, [quoteId])

  const loadQuote = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getQuoteById(quoteId)
      setQuote(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quote')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number | string | null | undefined): string => {
    if (amount == null) return 'LKR 0.00'
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
    if (isNaN(numAmount)) return 'LKR 0.00'
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
          maxWidth: 900,
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
            <span style={{ fontSize: 32 }}>👁️</span>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#fff' }}>View Quote</h2>
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

          {error && (
            <div style={{ padding: '16px', borderRadius: 8, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444' }}>
              {error}
            </div>
          )}

          {quote && !loading && (
            <div style={{ display: 'grid', gap: 24 }}>
              {/* Quote Header Info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', paddingBottom: 24, borderBottom: '1px solid rgba(255, 255, 255, 0.2)' }}>
                <div>
                  <h3 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 8px 0', color: 'var(--accent)' }}>{quote.quote_number}</h3>
                  <p style={{ margin: 0, fontSize: 14, color: 'rgba(255, 255, 255, 0.7)' }}>
                    Created: {formatDate(quote.created_at)}
                  </p>
                  {quote.created_by_name && (
                    <p style={{ margin: '4px 0 0 0', fontSize: 14, color: 'rgba(255, 255, 255, 0.7)' }}>
                      By: {quote.created_by_name}
                    </p>
                  )}
                </div>
                <span style={{ padding: '8px 16px', borderRadius: 16, fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }} className={getStatusColor(quote.status)}>
                  {quote.status}
                </span>
              </div>

              {/* Company Information */}
              <div>
                <h4 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px 0', color: '#fff' }}>Company Information</h4>
                <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: 16, borderRadius: 8 }}>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.7)', textTransform: 'uppercase', fontWeight: 600 }}>Company Name</label>
                    <p style={{ margin: '4px 0 0 0', fontSize: 15, color: '#fff', fontWeight: 500 }}>{quote.company_name}</p>
                  </div>
                  {quote.company_address && (
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.7)', textTransform: 'uppercase', fontWeight: 600 }}>Address</label>
                      <p style={{ margin: '4px 0 0 0', fontSize: 15, color: '#fff' }}>{quote.company_address}</p>
                    </div>
                  )}
                  <div>
                    <label style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.7)', textTransform: 'uppercase', fontWeight: 600 }}>Date of Issue</label>
                    <p style={{ margin: '4px 0 0 0', fontSize: 15, color: '#fff' }}>{formatDate(quote.date_of_issue)}</p>
                  </div>
                </div>
              </div>

              {/* Line Items */}
              {quote.items && quote.items.length > 0 && (
                <div>
                  <h4 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px 0', color: '#fff' }}>Line Items</h4>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                      <thead style={{ background: 'rgba(0, 0, 0, 0.3)' }}>
                        <tr>
                          <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, textTransform: 'uppercase', fontSize: 11, color: 'rgba(255, 255, 255, 0.9)' }}>Description</th>
                          <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, textTransform: 'uppercase', fontSize: 11, color: 'rgba(255, 255, 255, 0.9)' }}>Qty</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, textTransform: 'uppercase', fontSize: 11, color: 'rgba(255, 255, 255, 0.9)' }}>Unit Price</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, textTransform: 'uppercase', fontSize: 11, color: 'rgba(255, 255, 255, 0.9)' }}>Total</th>
                        </tr>
                      </thead>
                      <tbody style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
                        {quote.items.map((item, index) => (
                          <tr key={index} style={{ borderBottom: index < quote.items!.length - 1 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none' }}>
                            <td style={{ padding: '10px 12px', color: '#fff' }}>{item.description}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'center', color: '#fff' }}>{item.quantity}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: 'rgba(255, 255, 255, 0.8)' }}>{formatCurrency(item.unit_price)}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: 'var(--accent)' }}>{formatCurrency(item.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Additional Services */}
              {quote.additional_services && quote.additional_services.length > 0 && (
                <div>
                  <h4 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px 0', color: '#fff' }}>Additional Services</h4>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {quote.additional_services.map((service, index) => (
                      <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.05)', padding: 12, borderRadius: 8 }}>
                        <span style={{ fontWeight: 500, color: '#fff' }}>{service.service_name}</span>
                        <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{formatCurrency(service.price)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {quote.notes && (
                <div>
                  <h4 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px 0', color: '#fff' }}>Notes</h4>
                  <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: 16, borderRadius: 8 }}>
                    <p style={{ margin: 0, fontSize: 14, color: 'rgba(255, 255, 255, 0.9)', lineHeight: 1.6 }}>{quote.notes}</p>
                  </div>
                </div>
              )}

              {/* Assigned To */}
              {quote.assigned_to_name && (
                <div>
                  <h4 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px 0', color: '#fff' }}>Assigned To</h4>
                  <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: 16, borderRadius: 8 }}>
                    <p style={{ margin: 0, fontSize: 14, color: '#fff' }}>{quote.assigned_to_name}</p>
                  </div>
                </div>
              )}

              {/* Reminders Section */}
              <QuoteRemindersSection
                quoteId={quote.quote_id}
                quoteNumber={quote.quote_number}
                companyName={quote.company_name}
              />

              {/* Total */}
              <div style={{ background: 'linear-gradient(135deg, rgba(234, 88, 12, 0.2), rgba(234, 88, 12, 0.1))', padding: 24, borderRadius: 12, border: '1px solid rgba(234, 88, 12, 0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.7)', margin: '0 0 8px 0', textTransform: 'uppercase', fontWeight: 600 }}>Total Amount</p>
                    <p style={{ fontSize: 36, fontWeight: 800, color: 'var(--accent)', margin: 0 }}>{formatCurrency(quote.total_due)}</p>
                  </div>
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
          background: 'rgba(0, 0, 0, 0.2)'
        }}>
          <button
            onClick={onClose}
            className="btn-primary"
            style={{ padding: '10px 24px' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default QuoteViewModal
