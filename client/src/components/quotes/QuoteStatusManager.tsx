import React, { useState, useEffect } from 'react'
import { updateQuoteStatus, assignQuote } from '../../services/quotesApi'
import type { Quote, QuoteStatus } from '../../types/quotes'
import { useToast } from '../../context/ToastContext'

interface QuoteStatusManagerProps {
  quote: Quote
  onStatusUpdate: (updatedQuote: Quote) => void
}

interface Employee {
  id: number
  name: string
}

const QuoteStatusManager: React.FC<QuoteStatusManagerProps> = ({ quote, onStatusUpdate }) => {
  const [selectedStatus, setSelectedStatus] = useState<QuoteStatus>(quote.status)
  const [statusNotes, setStatusNotes] = useState('')
  const [assignedTo, setAssignedTo] = useState<number | null>(quote.assigned_to || null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const [showStatusDialog, setShowStatusDialog] = useState(false)

  // Load employees for assignment
  useEffect(() => {
    loadEmployees()
  }, [])

  const loadEmployees = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:3000/api/employees', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setEmployees(data.employees || [])
      }
    } catch (err) {
      console.error('Failed to load employees:', err)
    }
  }

  // Handle status update
  const handleStatusUpdate = async () => {
    if (selectedStatus === quote.status) {
      toast.error('Please select a different status')
      return
    }

    setLoading(true)

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      const updatedQuote = await updateQuoteStatus(quote.quote_id, {
        status: selectedStatus,
        changed_by: user.id,
        notes: statusNotes || undefined
      })

      toast.success(`Status updated to ${selectedStatus}`)
      onStatusUpdate(updatedQuote)
      setShowStatusDialog(false)
      setStatusNotes('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setLoading(false)
    }
  }

  // Handle quick action
  const handleQuickAction = async (status: QuoteStatus) => {
    setSelectedStatus(status)
    setShowStatusDialog(true)
  }

  // Handle assignment
  const handleAssignment = async (employeeId: number) => {
    if (employeeId === quote.assigned_to) {
      return
    }

    setLoading(true)

    try {
      const updatedQuote = await assignQuote(quote.quote_id, employeeId)
      setAssignedTo(employeeId)
      toast.success('Quote assigned successfully')
      onStatusUpdate(updatedQuote)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to assign quote')
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

  const availableStatuses: QuoteStatus[] = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'FOLLOW_UP']

  return (
    <div className="space-y-6">
      {/* Current Status & Quick Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Status Management</h3>
        
        <div className="space-y-4">
          {/* Current Status Display */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Status
            </label>
            <div className={`inline-flex px-4 py-2 rounded-full font-semibold border-2 ${getStatusColor(quote.status)}`}>
              {quote.status}
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick Actions
            </label>
            <div className="flex flex-wrap gap-2">
              {quote.status !== 'SENT' && (
                <button
                  onClick={() => handleQuickAction('SENT')}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors text-sm"
                >
                  📤 Mark as Sent
                </button>
              )}
              {quote.status !== 'ACCEPTED' && (
                <button
                  onClick={() => handleQuickAction('ACCEPTED')}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors text-sm"
                >
                  ✅ Mark as Accepted
                </button>
              )}
              {quote.status !== 'REJECTED' && (
                <button
                  onClick={() => handleQuickAction('REJECTED')}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors text-sm"
                >
                  ❌ Mark as Rejected
                </button>
              )}
              {quote.status !== 'FOLLOW_UP' && (
                <button
                  onClick={() => handleQuickAction('FOLLOW_UP')}
                  disabled={loading}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 transition-colors text-sm"
                >
                  🔄 Add Follow-Up
                </button>
              )}
            </div>
          </div>

          {/* Change Status Button */}
          <div>
            <button
              onClick={() => setShowStatusDialog(true)}
              disabled={loading}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 transition-colors"
            >
              Change Status
            </button>
          </div>
        </div>
      </div>

      {/* Assignment Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Assignment</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assigned To
            </label>
            <select
              value={assignedTo || ''}
              onChange={(e) => handleAssignment(parseInt(e.target.value))}
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            >
              <option value="">Unassigned</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </div>

          {quote.assigned_to_name && (
            <div className="text-sm text-gray-600">
              Currently assigned to: <span className="font-semibold">{quote.assigned_to_name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Status Change Dialog */}
      {showStatusDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Update Quote Status</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Status
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as QuoteStatus)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {availableStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Add notes about this status change..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleStatusUpdate}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
                >
                  {loading ? 'Updating...' : 'Update Status'}
                </button>
                <button
                  onClick={() => {
                    setShowStatusDialog(false)
                    setSelectedStatus(quote.status)
                    setStatusNotes('')
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default QuoteStatusManager
