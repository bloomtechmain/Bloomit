import type { BudgetInfo } from '../types/projects'

interface BudgetProgressBarProps {
  budget: BudgetInfo
}

export const BudgetProgressBar: React.FC<BudgetProgressBarProps> = ({ budget }) => {
  // Ensure all values are valid numbers
  const total_budget = Number(budget.total_budget) || 0
  const total_items_cost = Number(budget.total_items_cost) || 0
  const remaining_budget = Number(budget.remaining_budget) || 0
  const budget_percentage = Number(budget.budget_percentage) || 0
  
  const getColor = () => {
    if (budget_percentage >= 100) return '#ef4444' // red
    if (budget_percentage >= 85) return '#f59e0b' // orange
    return '#10b981' // green
  }
  
  const getBackgroundColor = () => {
    if (budget_percentage >= 100) return '#fee2e2' // light red
    if (budget_percentage >= 85) return '#fef3c7' // light orange
    return '#d1fae5' // light green
  }
  
  // Format number with proper handling for NaN/undefined
  const formatCurrency = (value: number) => {
    if (isNaN(value) || value === null || value === undefined) {
      return '0.00'
    }
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  
  return (
    <div style={{ width: '100%', marginBottom: '1rem' }}>
      {/* Progress Bar */}
      <div
        style={{
          width: '100%',
          height: '32px',
          backgroundColor: '#f3f4f6',
          borderRadius: '8px',
          overflow: 'hidden',
          position: 'relative',
          border: '1px solid #e5e7eb'
        }}
      >
        <div
          style={{
            width: `${Math.min(budget_percentage, 100)}%`,
            height: '100%',
            backgroundColor: getColor(),
            transition: 'width 0.3s ease-in-out',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: '600',
            fontSize: '0.875rem'
          }}
        >
          {budget_percentage > 10 && `${budget_percentage.toFixed(1)}%`}
        </div>
        {budget_percentage <= 10 && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontWeight: '600',
              fontSize: '0.875rem',
              color: '#6b7280'
            }}
          >
            {budget_percentage.toFixed(1)}%
          </div>
        )}
      </div>
      
      {/* Budget Statistics */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '0.75rem',
          marginTop: '0.75rem',
          fontSize: '0.875rem'
        }}
      >
        <div
          style={{
            padding: '0.5rem',
            backgroundColor: getBackgroundColor(),
            borderRadius: '6px',
            border: `1px solid ${getColor()}20`
          }}
        >
          <div style={{ color: '#6b7280', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
            Spent
          </div>
          <div style={{ fontWeight: '600', color: '#1f2937' }}>
            Rs. {formatCurrency(total_items_cost)}
          </div>
        </div>
        
        <div
          style={{
            padding: '0.5rem',
            backgroundColor: '#f9fafb',
            borderRadius: '6px',
            border: '1px solid #e5e7eb'
          }}
        >
          <div style={{ color: '#6b7280', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
            Remaining
          </div>
          <div
            style={{
              fontWeight: '600',
              color: remaining_budget < 0 ? '#ef4444' : '#1f2937'
            }}
          >
            Rs. {formatCurrency(remaining_budget)}
          </div>
        </div>
        
        <div
          style={{
            padding: '0.5rem',
            backgroundColor: '#f9fafb',
            borderRadius: '6px',
            border: '1px solid #e5e7eb'
          }}
        >
          <div style={{ color: '#6b7280', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
            Total Budget
          </div>
          <div style={{ fontWeight: '600', color: '#1f2937' }}>
            Rs. {formatCurrency(total_budget)}
          </div>
        </div>
      </div>
    </div>
  )
}
