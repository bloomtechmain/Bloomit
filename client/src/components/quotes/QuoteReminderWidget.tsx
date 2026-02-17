import { useState, useEffect } from 'react'
import { getAllPendingReminders, dismissReminder, updateQuoteStatus } from '../../services/quotesApi'
import type { PendingRemindersResponse, QuoteReminder } from '../../types/quotes'

export default function QuoteReminderWidget() {
  const [data, setData] = useState<PendingRemindersResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dismissing, setDismissing] = useState<number | null>(null)

  const loadReminders = async () => {
    try {
      setLoading(true)
      const response = await getAllPendingReminders()
      setData(response)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reminders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReminders()
    // Refresh every 5 minutes
    const interval = setInterval(loadReminders, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const handleDismiss = async (reminderId: number) => {
    try {
      setDismissing(reminderId)
      await dismissReminder(reminderId)
      await loadReminders()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to dismiss reminder')
    } finally {
      setDismissing(null)
    }
  }

  const handleMarkFollowedUp = async (reminder: QuoteReminder) => {
    if (!confirm(`Mark quote ${reminder.quote_number} as followed up?`)) return

    try {
      setDismissing(reminder.reminder_id)
      // Update quote status to FOLLOW_UP
      await updateQuoteStatus(reminder.quote_id, {
        status: 'FOLLOW_UP',
        notes: 'Status updated from reminder widget'
      })
      // Dismiss the reminder
      await dismissReminder(reminder.reminder_id)
      await loadReminders()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setDismissing(null)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 2
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🔔</span>
          <h2 className="text-xl font-semibold text-gray-800">Quote Follow-Up Reminders</h2>
        </div>
        <div className="text-center py-8 text-gray-500">Loading reminders...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🔔</span>
          <h2 className="text-xl font-semibold text-gray-800">Quote Follow-Up Reminders</h2>
        </div>
        <div className="text-center py-8 text-red-500">{error}</div>
      </div>
    )
  }

  if (!data || data.reminders.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🔔</span>
          <h2 className="text-xl font-semibold text-gray-800">Quote Follow-Up Reminders</h2>
        </div>
        <div className="text-center py-8 text-gray-500">
          ✅ No pending reminders - all caught up!
        </div>
      </div>
    )
  }

  const ReminderItem = ({ reminder, urgencyColor }: { reminder: QuoteReminder; urgencyColor: string }) => (
    <div
      key={reminder.reminder_id}
      className={`p-4 rounded-lg border-l-4 ${urgencyColor} bg-gray-50 hover:bg-gray-100 transition-colors`}
    >
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-gray-900">{reminder.quote_number}</span>
            <span className="text-gray-600">-</span>
            <span className="text-gray-700">{reminder.company_name}</span>
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <div>
              Status: <span className="font-medium">{reminder.quote_status}</span> | 
              Amount: <span className="font-medium">{formatCurrency(reminder.total_due || 0)}</span>
            </div>
            <div>
              Reminder: {formatDate(reminder.reminder_date)}
              {reminder.reminder_type === 'AUTO' && ' (Auto-generated)'}
            </div>
            {reminder.notes && (
              <div className="text-gray-500 italic">"{reminder.notes}"</div>
            )}
            {reminder.assigned_to_name && (
              <div>Assigned to: <span className="font-medium">{reminder.assigned_to_name}</span></div>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => handleMarkFollowedUp(reminder)}
            disabled={dismissing === reminder.reminder_id}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {dismissing === reminder.reminder_id ? '...' : 'Mark Followed Up'}
          </button>
          <button
            onClick={() => handleDismiss(reminder.reminder_id)}
            disabled={dismissing === reminder.reminder_id}
            className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {dismissing === reminder.reminder_id ? '...' : 'Dismiss'}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔔</span>
          <h2 className="text-xl font-semibold text-gray-800">Quote Follow-Up Reminders</h2>
          <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            {data.reminders.length}
          </span>
        </div>
        <button
          onClick={loadReminders}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Summary Badges */}
      <div className="flex gap-4 mb-4">
        {data.categorized.overdue.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
            <span>⚠️</span>
            <span>{data.categorized.overdue.length} Overdue</span>
          </div>
        )}
        {data.categorized.today.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
            <span>⏰</span>
            <span>{data.categorized.today.length} Today</span>
          </div>
        )}
        {data.categorized.upcoming.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
            <span>📅</span>
            <span>{data.categorized.upcoming.length} Upcoming</span>
          </div>
        )}
      </div>

      {/* Reminders List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {/* Overdue - Red */}
        {data.categorized.overdue.map(reminder => (
          <ReminderItem
            key={reminder.reminder_id}
            reminder={reminder}
            urgencyColor="border-red-500"
          />
        ))}

        {/* Today - Yellow */}
        {data.categorized.today.map(reminder => (
          <ReminderItem
            key={reminder.reminder_id}
            reminder={reminder}
            urgencyColor="border-yellow-500"
          />
        ))}

        {/* Upcoming - Blue */}
        {data.categorized.upcoming.map(reminder => (
          <ReminderItem
            key={reminder.reminder_id}
            reminder={reminder}
            urgencyColor="border-blue-500"
          />
        ))}
      </div>

      {/* Footer Info */}
      <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
        💡 Tip: Click "Mark Followed Up" to update the quote status and dismiss the reminder, 
        or "Dismiss" to remove the reminder without changing the quote status.
      </div>
    </div>
  )
}
