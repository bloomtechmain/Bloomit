import { useState, useEffect } from 'react'
import { Calendar, TrendingUp, AlertCircle } from 'lucide-react'
import { getEmployeePTOBalance } from '../../services/employeePortalService'
import type { PTOBalanceResponse } from '../../services/employeePortalService'
import { getPTOStatusColor, formatPTODays } from '../../utils/ptoCalculations'

interface PTOBalanceCardProps {
  employeeId: number
  accessToken: string
  onViewHistory?: () => void
}

export default function PTOBalanceCard({ employeeId, accessToken, onViewHistory }: PTOBalanceCardProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [balance, setBalance] = useState<PTOBalanceResponse | null>(null)

  useEffect(() => {
    fetchBalance()
  }, [employeeId, accessToken])

  const fetchBalance = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getEmployeePTOBalance(employeeId, accessToken)
      setBalance(data)
    } catch (err) {
      console.error('Error fetching PTO balance:', err)
      setError(err instanceof Error ? err.message : 'Failed to load PTO balance')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="glass-panel" style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 14, color: '#6b7280' }}>Loading PTO balance...</div>
      </div>
    )
  }

  if (error || !balance) {
    return (
      <div className="glass-panel" style={{ padding: 24, border: '1px solid #ef4444' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ef4444' }}>
          <AlertCircle size={20} />
          <span style={{ fontSize: 14 }}>Error loading balance</span>
        </div>
      </div>
    )
  }

  const colors = getPTOStatusColor(balance.status)

  return (
    <div 
      className="glass-panel" 
      style={{ 
        padding: 24,
        transition: 'transform 0.2s, box-shadow 0.2s',
        cursor: onViewHistory ? 'pointer' : 'default'
      }}
      onClick={onViewHistory}
      onMouseEnter={onViewHistory ? (e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
      } : undefined}
      onMouseLeave={onViewHistory ? (e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      } : undefined}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: colors.background,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.text
          }}>
            <Calendar size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>PTO Balance</h3>
            <div style={{ fontSize: 12, color: '#6b7280' }}>{balance.year}</div>
          </div>
        </div>
        
        {/* Status Badge */}
        <div style={{
          padding: '4px 10px',
          borderRadius: 12,
          background: colors.background,
          color: colors.text,
          fontSize: 12,
          fontWeight: 600,
          textTransform: 'capitalize'
        }}>
          {balance.status}
        </div>
      </div>

      {/* Main Balance Display */}
      <div style={{ 
        textAlign: 'center', 
        padding: '20px 0',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{ 
          fontSize: 48, 
          fontWeight: 700, 
          lineHeight: 1,
          color: colors.text,
          marginBottom: 8
        }}>
          {balance.daysRemaining}
        </div>
        <div style={{ fontSize: 15, color: '#6b7280', fontWeight: 500 }}>
          {formatPTODays(balance.daysRemaining)} remaining
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ margin: '20px 0' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: 8,
          fontSize: 13,
          color: '#6b7280'
        }}>
          <span>Usage: {balance.percentageUsed}%</span>
          <span>{balance.daysUsed} of {balance.totalAllowance} days</span>
        </div>
        
        {/* Horizontal Progress Bar */}
        <div style={{
          width: '100%',
          height: 12,
          background: 'rgba(255,255,255,0.1)',
          borderRadius: 6,
          overflow: 'hidden',
          position: 'relative'
        }}>
          <div style={{
            width: `${Math.min(balance.percentageUsed, 100)}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${colors.progress}, ${colors.text})`,
            borderRadius: 6,
            transition: 'width 0.5s ease'
          }} />
        </div>
      </div>

      {/* Breakdown */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr 1fr', 
        gap: 12,
        paddingTop: 16,
        borderTop: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Total</div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{balance.totalAllowance}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Used</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: colors.text }}>{balance.daysUsed}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Pending</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#f59e0b' }}>
            {balance.daysPending}
          </div>
        </div>
      </div>

      {/* Breakdown by Type */}
      {(balance.breakdown.vacation > 0 || balance.breakdown.sick > 0 || balance.breakdown.personal > 0) && (
        <div style={{ 
          marginTop: 16, 
          paddingTop: 16, 
          borderTop: '1px solid rgba(255,255,255,0.1)' 
        }}>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8, fontWeight: 500 }}>
            Days Used by Type:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {balance.breakdown.vacation > 0 && (
              <div style={{
                padding: '4px 10px',
                borderRadius: 8,
                background: 'rgba(59, 130, 246, 0.15)',
                fontSize: 12,
                color: '#3b82f6'
              }}>
                🏖️ Vacation: {balance.breakdown.vacation}
              </div>
            )}
            {balance.breakdown.sick > 0 && (
              <div style={{
                padding: '4px 10px',
                borderRadius: 8,
                background: 'rgba(239, 68, 68, 0.15)',
                fontSize: 12,
                color: '#ef4444'
              }}>
                🤒 Sick: {balance.breakdown.sick}
              </div>
            )}
            {balance.breakdown.personal > 0 && (
              <div style={{
                padding: '4px 10px',
                borderRadius: 8,
                background: 'rgba(168, 85, 247, 0.15)',
                fontSize: 12,
                color: '#a855f7'
              }}>
                👤 Personal: {balance.breakdown.personal}
              </div>
            )}
          </div>
        </div>
      )}

      {/* View History Button */}
      {onViewHistory && (
        <div style={{ marginTop: 16 }}>
          <button 
            className="btn-secondary" 
            style={{ 
              width: '100%', 
              padding: '10px',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}
          >
            View History
            <TrendingUp size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
