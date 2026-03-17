import './toast.css'
import { useToast } from '../../context/ToastContext'
import type { Toast, ToastType } from '../../context/ToastContext'

/* ---- Icon components ---- */

function SuccessIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
      <circle cx="14" cy="14" r="13" stroke="#10b981" strokeWidth="2" fill="rgba(16,185,129,0.1)" />
      <path
        className="checkmark-path"
        d="M8 14.5l4.5 4.5 7.5-9"
        stroke="#10b981"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        strokeDasharray="100"
      />
    </svg>
  )
}

function ErrorIcon() {
  return (
    <div className="toast-icon-error">
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
        <circle cx="14" cy="14" r="13" stroke="#ef4444" strokeWidth="2" fill="rgba(239,68,68,0.1)" />
        <path d="M9 9l10 10M19 9L9 19" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    </div>
  )
}

function WarningIcon() {
  return (
    <div className="toast-icon-warning">
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
        <path
          d="M14 3L26 24H2L14 3Z"
          stroke="#f59e0b"
          strokeWidth="2"
          fill="rgba(245,158,11,0.12)"
          strokeLinejoin="round"
        />
        <path d="M14 11v6" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="14" cy="20" r="1.1" fill="#f59e0b" />
      </svg>
    </div>
  )
}

function InfoIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
      <circle className="info-spin" cx="14" cy="14" r="13" stroke="#063062" strokeWidth="2" strokeDasharray="50 32" fill="rgba(6,48,98,0.08)" />
      <path d="M14 12v8" stroke="#063062" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="14" cy="9" r="1.2" fill="#063062" />
    </svg>
  )
}

const ICONS: Record<ToastType, () => JSX.Element> = {
  success: SuccessIcon,
  error:   ErrorIcon,
  warning: WarningIcon,
  info:    InfoIcon,
}

function ToastCard({ toast }: { toast: Toast }) {
  const { dismiss } = useToast()
  const Icon = ICONS[toast.type]

  return (
    <div
      className={`toast-card ${toast.type}${toast.exiting ? ' exiting' : ''}`}
      onClick={() => dismiss(toast.id)}
      role="alert"
      aria-live="polite"
    >
      <div className="toast-strip" />
      <div className="toast-icon">
        <Icon />
      </div>
      <div className="toast-content">
        <p className="toast-message">{toast.message}</p>
      </div>
      <button
        className="toast-dismiss"
        onClick={(e) => { e.stopPropagation(); dismiss(toast.id) }}
        aria-label="Dismiss notification"
      >
        ×
      </button>
      <div
        className="toast-progress"
        style={{ animationDuration: `${toast.duration}ms` }}
      />
    </div>
  )
}

export default function ToastContainer() {
  const { toasts } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="toast-container" aria-label="Notifications">
      {toasts.map(t => (
        <ToastCard key={t.id} toast={t} />
      ))}
    </div>
  )
}
