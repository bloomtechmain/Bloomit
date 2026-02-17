import { useState, useEffect } from 'react'
import { Edit2, Trash2, FileText } from 'lucide-react'
import type { Contract } from '../types/projects'
import { contractsApi } from '../services/projectsApi'
import { ContractSkeleton } from './SkeletonLoader'

interface ContractsListProps {
  projectId: number
  onEdit?: (contract: Contract) => void
  onDelete?: (projectId: number, contractId: number) => void
  onViewItems?: (projectId: number, contract: Contract) => void
}

export const ContractsList: React.FC<ContractsListProps> = ({
  projectId,
  onEdit,
  onDelete,
  onViewItems
}) => {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchContracts = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await contractsApi.getAll(projectId)
      setContracts(response.data.contracts || [])
    } catch (err: any) {
      console.error('Error fetching contracts:', err)
      setError(err.response?.data?.message || 'Failed to load contracts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContracts()
  }, [projectId])

  const getPaymentTypeColor = (paymentType: string) => {
    switch (paymentType) {
      case 'Complete':
        return { bg: '#dcfce7', text: '#166534' }
      case 'Partial':
        return { bg: '#fef3c7', text: '#92400e' }
      case 'Pending':
        return { bg: '#fee2e2', text: '#991b1b' }
      default:
        return { bg: '#f3f4f6', text: '#374151' }
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ongoing':
        return { bg: '#dbeafe', text: '#1e40af' }
      case 'completed':
        return { bg: '#dcfce7', text: '#166534' }
      case 'paused':
        return { bg: '#fef3c7', text: '#92400e' }
      default:
        return { bg: '#f3f4f6', text: '#374151' }
    }
  }

  const handleDelete = (contract: Contract, e: React.MouseEvent) => {
    e.stopPropagation()
    if (
      window.confirm(
        `Are you sure you want to delete contract "${contract.contract_name}"? This will also delete all associated items.`
      )
    ) {
      if (onDelete) {
        onDelete(projectId, contract.contract_id)
      }
    }
  }

  if (loading) {
    return (
      <div>
        {[1, 2].map((i) => (
          <ContractSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div
        style={{
          padding: '0.75rem',
          backgroundColor: '#fee2e2',
          border: '1px solid #fecaca',
          borderRadius: '6px',
          color: '#dc2626',
          fontSize: '0.875rem'
        }}
      >
        {error}
      </div>
    )
  }

  if (contracts.length === 0) {
    return (
      <div
        style={{
          padding: '2rem',
          textAlign: 'center',
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '2px dashed #d1d5db'
        }}
      >
        <div style={{ fontSize: '1rem', fontWeight: '500', color: '#6b7280' }}>
          No contracts in this project yet
        </div>
        <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginTop: '0.25rem' }}>
          Click the + button above to add a contract
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {contracts.map((contract) => {
        const paymentStyle = getPaymentTypeColor(contract.payment_type)
        const statusStyle = getStatusColor(contract.status)
        const totalBudget = contract.initial_cost_budget + contract.extra_budget_allocation

        return (
          <div
            key={contract.contract_id}
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              padding: '1rem',
              cursor: onViewItems ? 'pointer' : 'default',
              transition: 'all 0.2s'
            }}
            onClick={() => onViewItems && onViewItems(projectId, contract)}
            onMouseEnter={(e) => {
              if (onViewItems) {
                e.currentTarget.style.borderColor = '#3b82f6'
                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }
            }}
            onMouseLeave={(e) => {
              if (onViewItems) {
                e.currentTarget.style.borderColor = '#e5e7eb'
                e.currentTarget.style.boxShadow = 'none'
              }
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              {/* Contract Info */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>
                    {contract.contract_name}
                  </h4>
                  <span
                    style={{
                      padding: '0.25rem 0.625rem',
                      backgroundColor: statusStyle.bg,
                      color: statusStyle.text,
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: '500'
                    }}
                  >
                    {contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
                  </span>
                </div>

                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.75rem' }}>
                  Customer: <span style={{ fontWeight: '500', color: '#374151' }}>{contract.customer_name}</span>
                </div>

                {contract.description && (
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.75rem' }}>
                    {contract.description}
                  </div>
                )}

                {/* Budget Info */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                    gap: '0.75rem',
                    marginBottom: '0.75rem'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Initial Budget</div>
                    <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1f2937' }}>
                      Rs. {contract.initial_cost_budget.toLocaleString()}
                    </div>
                  </div>
                  {contract.extra_budget_allocation > 0 && (
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Extra Budget</div>
                      <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#f59e0b' }}>
                        Rs. {contract.extra_budget_allocation.toLocaleString()}
                      </div>
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Total Budget</div>
                    <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1f2937' }}>
                      Rs. {totalBudget.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Payment</div>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '0.125rem 0.5rem',
                        backgroundColor: paymentStyle.bg,
                        color: paymentStyle.text,
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        marginTop: '0.125rem'
                      }}
                    >
                      {contract.payment_type}
                    </span>
                  </div>
                </div>

                {/* Mini Budget Progress Bar */}
                <div>
                  <div
                    style={{
                      width: '100%',
                      height: '6px',
                      backgroundColor: '#e5e7eb',
                      borderRadius: '9999px',
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      style={{
                        width: '0%', // Placeholder - will be calculated when items are loaded
                        height: '100%',
                        backgroundColor: '#3b82f6',
                        transition: 'width 0.3s'
                      }}
                    />
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                    Click to view items and budget details
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
                {onViewItems && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onViewItems(projectId, contract)
                    }}
                    style={{
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      backgroundColor: 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title="View Items"
                  >
                    <FileText size={16} color="#6b7280" />
                  </button>
                )}
                {onEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onEdit(contract)
                    }}
                    style={{
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      backgroundColor: 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title="Edit Contract"
                  >
                    <Edit2 size={16} color="#3b82f6" />
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={(e) => handleDelete(contract, e)}
                    style={{
                      padding: '0.5rem',
                      border: '1px solid #fecaca',
                      borderRadius: '6px',
                      backgroundColor: 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title="Delete Contract"
                  >
                    <Trash2 size={16} color="#ef4444" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
