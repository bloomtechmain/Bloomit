import React, { useState, useEffect, useMemo } from 'react'
import { getAllQuotes, updateQuoteStatus, getQuoteById } from '../../services/quotesApi'
import type { Quote, QuoteStatus } from '../../types/quotes'
import QuoteFilters from './QuoteFilters'
import type { FilterState } from './QuoteFilters'
import QuoteViewModal from './QuoteViewModal'
import QuoteEditModal from './QuoteEditModal'
import QuoteDeleteModal from './QuoteDeleteModal'
import { generateQuotePDF } from '../../utils/pdfExport'

interface QuoteListProps {
  onCreateNew: () => void
}

type SortField = 'quote_number' | 'company_name' | 'date_of_issue' | 'total_due' | 'status'
type SortDirection = 'asc' | 'desc'

const QuoteList: React.FC<QuoteListProps> = ({ onCreateNew }) => {
  // State management
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Modal state
  const [viewModalQuoteId, setViewModalQuoteId] = useState<number | null>(null)
  const [editModalQuoteId, setEditModalQuoteId] = useState<number | null>(null)
  const [deleteModalQuote, setDeleteModalQuote] = useState<{ id: number; number: string } | null>(null)
  
  // Filter and sort state
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    status: 'ALL',
    dateFrom: '',
    dateTo: '',
    assignedTo: ''
  })
  const [sortField] = useState<SortField>('date_of_issue')
  const [sortDirection] = useState<SortDirection>('desc')

  // Fetch quotes on mount
  useEffect(() => {
    loadQuotes()
  }, [])

  const loadQuotes = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAllQuotes()
      setQuotes(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quotes')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSuccess = () => {
    loadQuotes()
  }

  const handleEditSuccess = () => {
    loadQuotes()
  }

  // Handle approve/deny actions
  const handleApprove = async (quote: Quote) => {
    if (!window.confirm(`Are you sure you want to approve quote ${quote.quote_number}?`)) {
      return
    }

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      await updateQuoteStatus(quote.quote_id, {
        status: 'ACCEPTED',
        changed_by: user.id,
        notes: 'Quote approved'
      })
      loadQuotes()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to approve quote')
    }
  }

  const handleDeny = async (quote: Quote) => {
    const reason = window.prompt(`Please provide a reason for denying quote ${quote.quote_number}:`)
    if (reason === null) {
      return // User cancelled
    }

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      await updateQuoteStatus(quote.quote_id, {
        status: 'REJECTED',
        changed_by: user.id,
        notes: reason || 'Quote denied'
      })
      loadQuotes()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to deny quote')
    }
  }

  // Handle PDF download
  const handleDownloadPDF = async (quoteId: number) => {
    try {
      const quote = await getQuoteById(quoteId)
      generateQuotePDF(quote)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to generate PDF')
    }
  }

  // Filter quotes based on current filters
  const filteredQuotes = useMemo(() => {
    let result = [...quotes]

    // Search filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase()
      result = result.filter(
        q =>
          q.company_name.toLowerCase().includes(searchLower) ||
          q.quote_number.toLowerCase().includes(searchLower)
      )
    }

    // Status filter
    if (filters.status !== 'ALL') {
      result = result.filter(q => q.status === filters.status)
    }

    // Date range filter
    if (filters.dateFrom) {
      result = result.filter(q => new Date(q.date_of_issue) >= new Date(filters.dateFrom))
    }
    if (filters.dateTo) {
      result = result.filter(q => new Date(q.date_of_issue) <= new Date(filters.dateTo))
    }

    // Assigned to filter
    if (filters.assignedTo) {
      result = result.filter(q => q.assigned_to_name?.toLowerCase().includes(filters.assignedTo.toLowerCase()))
    }

    return result
  }, [quotes, filters])

  // Sort filtered quotes
  const sortedQuotes = useMemo(() => {
    const result = [...filteredQuotes]

    result.sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'quote_number':
          comparison = a.quote_number.localeCompare(b.quote_number)
          break
        case 'company_name':
          comparison = a.company_name.localeCompare(b.company_name)
          break
        case 'date_of_issue':
          comparison = new Date(a.date_of_issue).getTime() - new Date(b.date_of_issue).getTime()
          break
        case 'total_due':
          const aTotal = typeof a.total_due === 'string' ? parseFloat(a.total_due) : a.total_due
          const bTotal = typeof b.total_due === 'string' ? parseFloat(b.total_due) : b.total_due
          comparison = aTotal - bTotal
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })

    return result
  }, [filteredQuotes, sortField, sortDirection])

  // Categorize quotes by status
  const categorizedQuotes = useMemo(() => {
    return {
      approved: sortedQuotes.filter(q => q.status === 'ACCEPTED'),
      denied: sortedQuotes.filter(q => q.status === 'REJECTED'),
      active: sortedQuotes.filter(q => q.status === 'DRAFT' || q.status === 'SENT' || q.status === 'FOLLOW_UP')
    }
  }, [sortedQuotes])

  const getStatusColor = (status: QuoteStatus): string => {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800'
      case 'SENT':
        return 'bg-blue-100 text-blue-800'
      case 'ACCEPTED':
        return 'bg-green-100 text-green-800'
      case 'REJECTED':
        return 'bg-red-100 text-red-800'
      case 'FOLLOW_UP':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount: number | string | null | undefined): string => {
    if (amount == null) {
      return 'LKR 0.00'
    }
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
    if (isNaN(numAmount)) {
      return 'LKR 0.00'
    }
    return `LKR ${numAmount.toFixed(2)}`
  }

  // Render action buttons for a quote
  const renderActionButtons = (quote: Quote) => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, flexWrap: 'wrap' }}>
      {/* Approve Button - Show for non-approved quotes */}
      {quote.status !== 'ACCEPTED' && (
        <button
          onClick={() => handleApprove(quote)}
          style={{
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: 6,
            padding: '6px 10px',
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1,
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Approve Quote"
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(34, 197, 94, 0.2)'
            e.currentTarget.style.transform = 'scale(1.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(34, 197, 94, 0.1)'
            e.currentTarget.style.transform = 'scale(1)'
          }}
        >
          ✅
        </button>
      )}

      {/* Deny Button - Show for non-denied quotes */}
      {quote.status !== 'REJECTED' && (
        <button
          onClick={() => handleDeny(quote)}
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 6,
            padding: '6px 10px',
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1,
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Deny Quote"
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'
            e.currentTarget.style.transform = 'scale(1.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'
            e.currentTarget.style.transform = 'scale(1)'
          }}
        >
          ❌
        </button>
      )}

      {/* PDF Download Button */}
      <button
        onClick={() => handleDownloadPDF(quote.quote_id)}
        style={{
          background: 'rgba(168, 85, 247, 0.1)',
          border: '1px solid rgba(168, 85, 247, 0.3)',
          borderRadius: 6,
          padding: '6px 10px',
          cursor: 'pointer',
          fontSize: 16,
          lineHeight: 1,
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        title="Download PDF"
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(168, 85, 247, 0.2)'
          e.currentTarget.style.transform = 'scale(1.1)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(168, 85, 247, 0.1)'
          e.currentTarget.style.transform = 'scale(1)'
        }}
      >
        📥
      </button>

      {/* View Button */}
      <button
        onClick={() => setViewModalQuoteId(quote.quote_id)}
        style={{
          background: 'rgba(96, 165, 250, 0.1)',
          border: '1px solid rgba(96, 165, 250, 0.3)',
          borderRadius: 6,
          padding: '6px 10px',
          cursor: 'pointer',
          fontSize: 16,
          lineHeight: 1,
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        title="View Quote"
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(96, 165, 250, 0.2)'
          e.currentTarget.style.transform = 'scale(1.1)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(96, 165, 250, 0.1)'
          e.currentTarget.style.transform = 'scale(1)'
        }}
      >
        👁️
      </button>

      {/* Edit Button - Only for DRAFT quotes */}
      {quote.status === 'DRAFT' && (
        <button
          onClick={() => setEditModalQuoteId(quote.quote_id)}
          style={{
            background: 'rgba(74, 222, 128, 0.1)',
            border: '1px solid rgba(74, 222, 128, 0.3)',
            borderRadius: 6,
            padding: '6px 10px',
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1,
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Edit Quote"
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(74, 222, 128, 0.2)'
            e.currentTarget.style.transform = 'scale(1.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(74, 222, 128, 0.1)'
            e.currentTarget.style.transform = 'scale(1)'
          }}
        >
          ✏️
        </button>
      )}

      {/* Delete Button */}
      <button
        onClick={() => setDeleteModalQuote({ id: quote.quote_id, number: quote.quote_number })}
        style={{
          background: 'rgba(220, 38, 38, 0.1)',
          border: '1px solid rgba(220, 38, 38, 0.3)',
          borderRadius: 6,
          padding: '6px 10px',
          cursor: 'pointer',
          fontSize: 16,
          lineHeight: 1,
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        title="Delete Quote"
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(220, 38, 38, 0.2)'
          e.currentTarget.style.transform = 'scale(1.1)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(220, 38, 38, 0.1)'
          e.currentTarget.style.transform = 'scale(1)'
        }}
      >
        🗑️
      </button>
    </div>
  )

  // Render a quote table section
  const renderQuoteSection = (quotesList: Quote[], title: string, icon: string, bgColor: string, borderColor: string) => {
    if (quotesList.length === 0) return null

    return (
      <div className="glass-panel" style={{ overflow: 'hidden', marginBottom: 24, border: `2px solid ${borderColor}` }}>
        <div style={{ background: bgColor, padding: '16px 20px', borderBottom: `1px solid ${borderColor}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>{icon}</span>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#fff' }}>{title}</h2>
            <span style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: 12, fontSize: 14, fontWeight: 600 }}>
              {quotesList.length}
            </span>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead style={{ background: 'var(--primary)', color: '#fff' }}>
              <tr>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, textTransform: 'uppercase', fontSize: 12 }}>
                  Quote Number
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, textTransform: 'uppercase', fontSize: 12 }}>
                  Company Name
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, textTransform: 'uppercase', fontSize: 12 }}>
                  Date Created
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, textTransform: 'uppercase', fontSize: 12 }}>
                  Total Amount
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, textTransform: 'uppercase', fontSize: 12 }}>
                  Status
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, textTransform: 'uppercase', fontSize: 12 }}>
                  Assigned To
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, textTransform: 'uppercase', fontSize: 12 }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody style={{ background: 'rgba(255,255,255,0.05)' }}>
              {quotesList.map((quote, idx) => (
                <tr 
                  key={quote.quote_id} 
                  style={{ borderBottom: idx < quotesList.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none', transition: 'background 0.2s' }} 
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', fontWeight: 600 }}>
                    {quote.quote_number}
                  </td>
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                    {quote.company_name}
                  </td>
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', color: 'rgba(255,255,255,0.7)' }}>
                    {formatDate(quote.date_of_issue)}
                  </td>
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', fontWeight: 600, color: 'var(--accent)' }}>
                    {formatCurrency(quote.total_due)}
                  </td>
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                    <span style={{ padding: '4px 12px', borderRadius: 12, fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }} className={getStatusColor(quote.status)}>
                      {quote.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', color: 'rgba(255,255,255,0.7)' }}>
                    {quote.assigned_to_name || '-'}
                  </td>
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', textAlign: 'right' }}>
                    {renderActionButtons(quote)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        <p className="font-medium">Error loading quotes</p>
        <p className="text-sm mt-1">{error}</p>
        <button
          onClick={loadQuotes}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  // Empty state - no quotes at all
  if (!loading && quotes.length === 0) {
    return (
      <div style={{ padding: 48, textAlign: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: 12, border: '1px dashed rgba(255,255,255,0.2)' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
        <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--accent)' }}>No quotes yet</div>
        <p style={{ color: 'rgba(255,255,255,0.7)', margin: '8px 0 24px' }}>Get started by creating a new quote.</p>
        <button
          onClick={onCreateNew}
          className="btn-primary"
        >
          Create First Quote
        </button>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', display: 'grid', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h1 style={{ marginTop: 0, fontSize: 28, marginBottom: 8 }}>Quotes</h1>
          <p style={{ fontSize: 14, margin: 0, color: '#2d3748' }}>{quotes.length} total quotes</p>
        </div>
        <button
          onClick={onCreateNew}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <span style={{ fontSize: 20, lineHeight: 1 }}>+</span>
          <span>Create New Quote</span>
        </button>
      </div>

      {/* Filters */}
      <QuoteFilters
        onFilterChange={setFilters}
        totalCount={quotes.length}
        filteredCount={sortedQuotes.length}
      />

      {/* Empty filtered state */}
      {sortedQuotes.length === 0 && quotes.length > 0 && (
        <div style={{ padding: 40, textAlign: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: 12, border: '1px dashed rgba(255,255,255,0.2)' }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>🔍</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--accent)' }}>No quotes found</div>
          <p style={{ color: 'rgba(255,255,255,0.7)', margin: '8px 0 0' }}>
            Try adjusting your filters or search term
          </p>
        </div>
      )}

      {/* Render Quote Sections */}
      {sortedQuotes.length > 0 && (
        <>
          {/* Approved Quotes Section */}
          {renderQuoteSection(
            categorizedQuotes.approved,
            'Approved Quotes - Ready to Move Forward',
            '✅',
            'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
            '#22c55e'
          )}

          {/* Denied Quotes Section */}
          {renderQuoteSection(
            categorizedQuotes.denied,
            'Denied Quotes',
            '❌',
            'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            '#ef4444'
          )}

          {/* Active/Pending Quotes Section */}
          {renderQuoteSection(
            categorizedQuotes.active,
            'Active Quotes - Pending Decision',
            '📋',
            'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            '#3b82f6'
          )}
        </>
      )}

      {/* Modals */}
      {viewModalQuoteId && (
        <QuoteViewModal
          quoteId={viewModalQuoteId}
          onClose={() => setViewModalQuoteId(null)}
        />
      )}

      {editModalQuoteId && (
        <QuoteEditModal
          quoteId={editModalQuoteId}
          onClose={() => setEditModalQuoteId(null)}
          onSuccess={handleEditSuccess}
        />
      )}

      {deleteModalQuote && (
        <QuoteDeleteModal
          quoteId={deleteModalQuote.id}
          quoteNumber={deleteModalQuote.number}
          onClose={() => setDeleteModalQuote(null)}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  )
}

export default QuoteList
