import { useState, useEffect } from 'react'
import './toast.css'
import { useConfirmState } from '../../context/ConfirmContext'

export default function ConfirmDialog() {
  const { request, resolve } = useConfirmState()
  const [exiting, setExiting] = useState(false)

  // Reset exiting state whenever a new request appears
  useEffect(() => {
    if (request) setExiting(false)
  }, [request])

  if (!request) return null

  const { message, options } = request
  const {
    title = options.destructive ? 'Confirm Action' : 'Are you sure?',
    confirmLabel = options.destructive ? 'Delete' : 'Confirm',
    cancelLabel = 'Cancel',
    destructive = false,
  } = options

  function handleResolve(value: boolean) {
    setExiting(true)
    setTimeout(() => resolve(value), 200)
  }

  return (
    <div
      className={`confirm-overlay${exiting ? ' exiting' : ''}`}
      onClick={() => handleResolve(false)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div
        className="confirm-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className={`confirm-icon ${destructive ? 'destructive' : 'info'}`}>
          {destructive ? (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"
                stroke="#ef4444"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="12" cy="12" r="10" stroke="#063062" strokeWidth="2" />
              <path d="M12 8v4M12 16h.01" stroke="#063062" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        </div>

        <h2 className="confirm-title" id="confirm-title">{title}</h2>
        <p className="confirm-message">{message}</p>

        <div className="confirm-actions">
          <button
            className="confirm-btn confirm-btn-cancel"
            onClick={() => handleResolve(false)}
          >
            {cancelLabel}
          </button>
          <button
            className={`confirm-btn confirm-btn-confirm${destructive ? '' : ' safe'}`}
            onClick={() => handleResolve(true)}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
