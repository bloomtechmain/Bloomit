import { AlertCircle, Loader2 } from 'lucide-react'

interface POFormActionsProps {
  onSubmit: () => Promise<void>
  onCancel: () => void
  isSubmitting: boolean
  isValid: boolean
  validationErrors?: string[]
  mode: 'create' | 'edit'
}

export const POFormActions: React.FC<POFormActionsProps> = ({
  onSubmit,
  onCancel,
  isSubmitting,
  isValid,
  validationErrors = [],
  mode
}) => {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isValid && !isSubmitting) {
      await onSubmit()
    }
  }

  return (
    <div style={{ 
      borderTop: '2px solid #e5e7eb',
      paddingTop: '1.5rem',
      marginTop: '1.5rem'
    }}>
      {/* Validation Errors Display */}
      {validationErrors.length > 0 && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          marginBottom: '1rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem'
          }}>
            <AlertCircle 
              size={20} 
              style={{ 
                color: '#ef4444', 
                marginTop: '0.125rem',
                flexShrink: 0 
              }} 
            />
            <div style={{ flex: 1 }}>
              <h4 style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#991b1b',
                margin: '0 0 0.5rem 0'
              }}>
                Please fix the following errors:
              </h4>
              <ul style={{
                margin: 0,
                paddingLeft: '1.25rem',
                fontSize: '0.875rem',
                color: '#dc2626',
                listStyleType: 'disc'
              }}>
                {validationErrors.map((error, index) => (
                  <li key={index} style={{ marginBottom: '0.25rem' }}>
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '0.75rem'
      }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          style={{
            padding: '0.625rem 1.5rem',
            backgroundColor: '#ffffff',
            color: '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            opacity: isSubmitting ? 0.6 : 1,
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            if (!isSubmitting) {
              e.currentTarget.style.backgroundColor = '#f9fafb'
              e.currentTarget.style.borderColor = '#9ca3af'
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#ffffff'
            e.currentTarget.style.borderColor = '#d1d5db'
          }}
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!isValid || isSubmitting}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.625rem 1.5rem',
            backgroundColor: !isValid || isSubmitting ? '#9ca3af' : '#3b82f6',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: !isValid || isSubmitting ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => {
            if (isValid && !isSubmitting) {
              e.currentTarget.style.backgroundColor = '#2563eb'
            }
          }}
          onMouseLeave={(e) => {
            if (isValid && !isSubmitting) {
              e.currentTarget.style.backgroundColor = '#3b82f6'
            }
          }}
        >
          {isSubmitting && (
            <Loader2 
              size={16} 
              style={{ 
                animation: 'spin 1s linear infinite'
              }} 
            />
          )}
          {isSubmitting 
            ? (mode === 'create' ? 'Creating...' : 'Updating...') 
            : (mode === 'create' ? 'Create Purchase Order' : 'Update Purchase Order')
          }
        </button>
      </div>

      {/* Helper text */}
      {!isValid && validationErrors.length === 0 && (
        <p style={{
          fontSize: '0.75rem',
          color: '#6b7280',
          textAlign: 'right',
          marginTop: '0.5rem',
          marginBottom: 0
        }}>
          Please fill in all required fields to submit
        </p>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
