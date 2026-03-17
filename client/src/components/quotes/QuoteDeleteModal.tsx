import React, { useState } from 'react'
import { deleteQuote } from '../../services/quotesApi'
import { useToast } from '../../context/ToastContext'

interface QuoteDeleteModalProps {
  quoteId: number
  quoteNumber: string
  onClose: () => void
  onSuccess: () => void
}

const QuoteDeleteModal: React.FC<QuoteDeleteModalProps> = ({ quoteId, quoteNumber, onClose, onSuccess }) => {
  const [deleting, setDeleting] = useState(false)
  const { toast } = useToast()

  const handleDelete = async () => {
    setDeleting(true)

    try {
      await deleteQuote(quoteId)
      toast.success('Quote deleted successfully')
      onSuccess()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete quote')
      setDeleting(false)
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
          maxWidth: 500,
          width: '100%',
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
          background: 'rgba(239, 68, 68, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 32 }}>🗑️</span>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#fff' }}>Delete Quote</h2>
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
            disabled={deleting}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 32 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>⚠️</div>
            <h3 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 16px 0', color: '#fff' }}>
              Are you sure you want to delete this quote?
            </h3>
            <p style={{ fontSize: 15, color: 'rgba(255, 255, 255, 0.8)', margin: '0 0 8px 0', lineHeight: 1.6 }}>
              This will permanently delete quote <strong style={{ color: 'var(--accent)' }}>{quoteNumber}</strong>.
            </p>
            <p style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.6)', margin: 0, lineHeight: 1.6 }}>
              This action cannot be undone.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={{ 
          padding: '20px 32px', 
          borderTop: '1px solid rgba(255, 255, 255, 0.2)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 12,
          background: 'rgba(0, 0, 0, 0.2)'
        }}>
          <button
            onClick={onClose}
            className="btn-secondary"
            style={{ padding: '10px 24px' }}
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            style={{
              padding: '10px 24px',
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 8,
              border: 'none',
              background: '#ef4444',
              color: '#fff',
              cursor: deleting ? 'not-allowed' : 'pointer',
              opacity: deleting ? 0.6 : 1,
              transition: 'all 0.2s'
            }}
            disabled={deleting}
            onMouseEnter={(e) => {
              if (!deleting) e.currentTarget.style.background = '#dc2626'
            }}
            onMouseLeave={(e) => {
              if (!deleting) e.currentTarget.style.background = '#ef4444'
            }}
          >
            {deleting ? 'Deleting...' : 'Yes, Delete Quote'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default QuoteDeleteModal
