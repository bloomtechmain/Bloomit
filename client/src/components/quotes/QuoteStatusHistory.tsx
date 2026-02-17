import React, { useState, useEffect } from 'react'
import { getQuoteStatusHistory } from '../../services/quotesApi'
import type { QuoteStatusHistory, QuoteStatus } from '../../types/quotes'

interface QuoteStatusHistoryProps {
  quoteId: number
}

const QuoteStatusHistoryComponent: React.FC<QuoteStatusHistoryProps> = ({ quoteId }) => {
  const [history, setHistory] = useState<QuoteStatusHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(true)

  useEffect(() => {
    loadHistory()
  }, [quoteId])

  const loadHistory = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getQuoteStatusHistory(quoteId)
      // Sort by newest first
      const sorted = data.sort((a, b) => 
        new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime()
      )
      setHistory(sorted)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: QuoteStatus): string => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800 border-gray-300'
      case 'SENT': return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'ACCEPTED': return 'bg-green-100 text-green-800 border-green-300'
      case 'REJECTED': return 'bg-red-100 text-red-800 border-red-300'
      case 'FOLLOW_UP': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getStatusIcon = (status: QuoteStatus): string => {
    switch (status) {
      case 'DRAFT': return '📝'
      case 'SENT': return '📤'
      case 'ACCEPTED': return '✅'
      case 'REJECTED': return '❌'
      case 'FOLLOW_UP': return '🔄'
      default: return '📄'
    }
  }

  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getRelativeTime = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`
    return formatDateTime(dateString)
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Status History</h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Status History</h3>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Status History</h3>
        <p className="text-gray-500 text-sm">No status changes yet</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          Status History ({history.length})
        </h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
        >
          {isExpanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-4">
          {/* Timeline */}
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>

            {/* Timeline items */}
            <div className="space-y-6">
              {history.map((item) => (
                <div key={item.history_id} className="relative flex gap-4">
                  {/* Status icon */}
                  <div className="relative z-10">
                    <div className={`flex items-center justify-center w-12 h-12 rounded-full border-4 border-white ${getStatusColor(item.new_status)}`}>
                      <span className="text-lg">{getStatusIcon(item.new_status)}</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-6">
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      {/* Status change info */}
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.old_status)}`}>
                              {item.old_status}
                            </span>
                            <span className="text-gray-400">→</span>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.new_status)}`}>
                              {item.new_status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">
                            {item.changed_by_name ? (
                              <>Changed by <span className="font-semibold">{item.changed_by_name}</span></>
                            ) : (
                              'Status changed'
                            )}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500" title={formatDateTime(item.changed_at)}>
                            {getRelativeTime(item.changed_at)}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatDateTime(item.changed_at)}
                          </p>
                        </div>
                      </div>

                      {/* Notes */}
                      {item.notes && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-xs text-gray-500 mb-1">Notes:</p>
                          <p className="text-sm text-gray-700">{item.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="border-t pt-4 mt-4">
            <p className="text-xs text-gray-500">
              Total status changes: <span className="font-semibold">{history.length}</span>
              {history.length > 0 && (
                <> · Last updated {getRelativeTime(history[0].changed_at)}</>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default QuoteStatusHistoryComponent
