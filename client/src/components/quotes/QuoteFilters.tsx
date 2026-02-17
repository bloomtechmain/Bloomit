import React, { useState, useEffect } from 'react'
import type { QuoteStatus } from '../../types/quotes'

interface QuoteFiltersProps {
  onFilterChange: (filters: FilterState) => void
  totalCount: number
  filteredCount: number
}

export interface FilterState {
  searchTerm: string
  status: QuoteStatus | 'ALL'
  dateFrom: string
  dateTo: string
  assignedTo: string
}

const QuoteFilters: React.FC<QuoteFiltersProps> = ({ onFilterChange, totalCount, filteredCount }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [status, setStatus] = useState<QuoteStatus | 'ALL'>('ALL')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      handleFilterChange()
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm, status, dateFrom, dateTo, assignedTo])

  const handleFilterChange = () => {
    onFilterChange({
      searchTerm,
      status,
      dateFrom,
      dateTo,
      assignedTo
    })
  }

  const handleClearFilters = () => {
    setSearchTerm('')
    setStatus('ALL')
    setDateFrom('')
    setDateTo('')
    setAssignedTo('')
  }

  const hasActiveFilters = searchTerm || status !== 'ALL' || dateFrom || dateTo || assignedTo

  return (
    <div className="glass-panel" style={{ padding: 16, marginBottom: 16 }}>
      {/* Search Bar - Always Visible */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <svg
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', height: 20, width: 20, color: 'rgba(255,255,255,0.5)' }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              width: '100%', 
              paddingLeft: 40, 
              paddingRight: 16, 
              paddingTop: 10, 
              paddingBottom: 10,
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 8,
              color: '#fff',
              fontSize: 14
            }}
            placeholder="Search by company name or quote number..."
          />
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}
        >
          <svg style={{ height: 20, width: 20 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          Filters
          {hasActiveFilters && (
            <span style={{ background: 'var(--accent)', color: '#fff', fontSize: 11, padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>
              Active
            </span>
          )}
        </button>

        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="btn-secondary"
            style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', borderColor: '#ef4444' }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Advanced Filters - Collapsible */}
      {isExpanded && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {/* Status Filter */}
            <div className="form-group">
              <label className="form-label" style={{ color: '#fff' }}>
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as QuoteStatus | 'ALL')}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 8,
                  color: '#fff',
                  fontSize: 14
                }}
              >
                <option value="ALL" style={{ background: '#063062' }}>All Statuses</option>
                <option value="DRAFT" style={{ background: '#063062' }}>Draft</option>
                <option value="SENT" style={{ background: '#063062' }}>Sent</option>
                <option value="ACCEPTED" style={{ background: '#063062' }}>Accepted</option>
                <option value="REJECTED" style={{ background: '#063062' }}>Rejected</option>
                <option value="FOLLOW_UP" style={{ background: '#063062' }}>Follow-Up</option>
              </select>
            </div>

            {/* Date From */}
            <div className="form-group">
              <label className="form-label" style={{ color: '#fff' }}>
                Date From
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 8,
                  color: '#fff',
                  fontSize: 14
                }}
              />
            </div>

            {/* Date To */}
            <div className="form-group">
              <label className="form-label" style={{ color: '#fff' }}>
                Date To
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 8,
                  color: '#fff',
                  fontSize: 14
                }}
              />
            </div>
          </div>

          {/* Results Count */}
          <div style={{ marginTop: 16, fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>
            Showing <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{filteredCount}</span> of{' '}
            <span style={{ fontWeight: 600, color: '#fff' }}>{totalCount}</span> quotes
          </div>
        </div>
      )}
    </div>
  )
}

export default QuoteFilters
