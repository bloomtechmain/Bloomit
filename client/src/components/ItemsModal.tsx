import { useState, useEffect } from 'react'
import { X, Plus, Edit2, Trash2 } from 'lucide-react'
import type { Contract, ContractItem, BudgetInfo } from '../types/projects'
import { itemsApi } from '../services/projectsApi'
import { BudgetProgressBar } from './BudgetProgressBar'

interface ItemsModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: number
  contract: Contract
  onAddItem: () => void
  onEditItem: (item: ContractItem) => void
  onDeleteItem: (projectId: number, contractId: number, requirements: string) => void
  refreshTrigger?: number
}

export const ItemsModal: React.FC<ItemsModalProps> = ({
  isOpen,
  onClose,
  projectId,
  contract,
  onAddItem,
  onEditItem,
  onDeleteItem,
  refreshTrigger
}) => {
  const [items, setItems] = useState<ContractItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchItems = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await itemsApi.getAll(projectId, contract.contract_id)
      setItems(response.data.items || [])
    } catch (err: any) {
      console.error('Error fetching items:', err)
      setError(err.response?.data?.message || 'Failed to load items')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchItems()
    }
  }, [isOpen, projectId, contract.contract_id, refreshTrigger])

  const calculateBudget = (): BudgetInfo => {
    // Ensure all values are properly converted to numbers to prevent string concatenation
    const total_items_cost = items.reduce((sum, item) => sum + Number(item.unit_cost || 0), 0)
    const initial_budget = Number(contract.initial_cost_budget || 0)
    const extra_budget = Number(contract.extra_budget_allocation || 0)
    const total_budget = initial_budget + extra_budget
    const remaining_budget = total_budget - total_items_cost
    const budget_percentage = total_budget > 0 ? (total_items_cost / total_budget) * 100 : 0

    return {
      initial_cost_budget: initial_budget,
      extra_budget_allocation: extra_budget,
      total_items_cost,
      total_budget,
      remaining_budget,
      budget_percentage
    }
  }

  const handleDelete = async (item: ContractItem, e: React.MouseEvent) => {
    e.stopPropagation()
    if (
      window.confirm(
        `Are you sure you want to delete item "${item.requirements.substring(0, 50)}..."?`
      )
    ) {
      await onDeleteItem(projectId, contract.contract_id, item.requirements)
      // Refresh items immediately after delete
      await fetchItems()
    }
  }

  if (!isOpen) return null

  const budget = calculateBudget()
  
  // Format currency with proper handling
  const formatCurrency = (value: number) => {
    if (isNaN(value) || value === null || value === undefined) {
      return '0.00'
    }
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1002,
        padding: '1rem',
        overflowY: 'auto'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          maxWidth: '1200px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          margin: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.5rem',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1f2937', margin: '0 0 0.25rem 0' }}>
              {contract.contract_name}
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
              Customer: {contract.customer_name}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <X size={20} color="#6b7280" />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
          {/* Budget Section */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem' }}>
              Budget Overview
            </h3>
            
            <BudgetProgressBar budget={budget} />

            {/* Budget Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                marginTop: '1rem'
              }}
            >
              <div
                style={{
                  padding: '1rem',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '8px'
                }}
              >
                <div style={{ fontSize: '0.875rem', color: '#1e40af', marginBottom: '0.25rem' }}>
                  Initial Budget
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1e3a8a' }}>
                  Rs. {formatCurrency(budget.initial_cost_budget)}
                </div>
              </div>

              <div
                style={{
                  padding: '1rem',
                  backgroundColor: budget.total_items_cost > budget.total_budget ? '#fee2e2' : '#f0fdf4',
                  border: `1px solid ${budget.total_items_cost > budget.total_budget ? '#fecaca' : '#bbf7d0'}`,
                  borderRadius: '8px'
                }}
              >
                <div
                  style={{
                    fontSize: '0.875rem',
                    color: budget.total_items_cost > budget.total_budget ? '#991b1b' : '#166534',
                    marginBottom: '0.25rem'
                  }}
                >
                  Items Cost
                </div>
                <div
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: '600',
                    color: budget.total_items_cost > budget.total_budget ? '#991b1b' : '#166534'
                  }}
                >
                  Rs. {formatCurrency(budget.total_items_cost)}
                </div>
              </div>

              {budget.extra_budget_allocation > 0 && (
                <div
                  style={{
                    padding: '1rem',
                    backgroundColor: '#fef3c7',
                    border: '1px solid #fde68a',
                    borderRadius: '8px'
                  }}
                >
                  <div style={{ fontSize: '0.875rem', color: '#92400e', marginBottom: '0.25rem' }}>
                    Extra Budget
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#92400e' }}>
                    Rs. {formatCurrency(budget.extra_budget_allocation)}
                  </div>
                </div>
              )}

              <div
                style={{
                  padding: '1rem',
                  backgroundColor: budget.remaining_budget < 0 ? '#fee2e2' : '#f9fafb',
                  border: `1px solid ${budget.remaining_budget < 0 ? '#fecaca' : '#e5e7eb'}`,
                  borderRadius: '8px'
                }}
              >
                <div
                  style={{
                    fontSize: '0.875rem',
                    color: budget.remaining_budget < 0 ? '#991b1b' : '#374151',
                    marginBottom: '0.25rem'
                  }}
                >
                  Remaining Budget
                </div>
                <div
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: '600',
                    color: budget.remaining_budget < 0 ? '#991b1b' : '#374151'
                  }}
                >
                  Rs. {formatCurrency(budget.remaining_budget)}
                </div>
              </div>
            </div>
          </div>

          {/* Items Section */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>
                Contract Items
              </h3>
              <button
                onClick={onAddItem}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <Plus size={16} />
                Add Item
              </button>
            </div>

            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                Loading items...
              </div>
            ) : error ? (
              <div
                style={{
                  padding: '1rem',
                  backgroundColor: '#fee2e2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  color: '#dc2626'
                }}
              >
                {error}
              </div>
            ) : items.length === 0 ? (
              <div
                style={{
                  padding: '3rem',
                  textAlign: 'center',
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px',
                  border: '2px dashed #d1d5db'
                }}
              >
                <div style={{ fontSize: '1rem', fontWeight: '500', color: '#6b7280', marginBottom: '0.5rem' }}>
                  No items in this contract yet
                </div>
                <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
                  Click "Add Item" to create the first item
                </div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>
                        Requirements
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>
                        Service Category
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600', color: '#374151' }}>
                        Unit Cost
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', color: '#374151' }}>
                        Type
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', color: '#374151' }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr
                        key={`${item.requirements}-${index}`}
                        style={{
                          borderBottom: '1px solid #e5e7eb',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f9fafb'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'white'
                        }}
                      >
                        <td style={{ padding: '0.75rem', color: '#374151', maxWidth: '300px' }}>
                          {item.requirements}
                        </td>
                        <td style={{ padding: '0.75rem', color: '#6b7280' }}>
                          {item.service_category}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600', color: '#1f2937' }}>
                          Rs. {formatCurrency(Number(item.unit_cost))}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '0.25rem 0.5rem',
                              backgroundColor:
                                item.requirement_type === 'Initial Requirement' ? '#eff6ff' : '#fef3c7',
                              color: item.requirement_type === 'Initial Requirement' ? '#1e40af' : '#92400e',
                              borderRadius: '9999px',
                              fontSize: '0.75rem',
                              fontWeight: '500'
                            }}
                          >
                            {item.requirement_type === 'Initial Requirement' ? 'Initial' : 'Additional'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                            <button
                              onClick={() => onEditItem(item)}
                              style={{
                                padding: '0.375rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                backgroundColor: 'white',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                              title="Edit Item"
                            >
                              <Edit2 size={14} color="#3b82f6" />
                            </button>
                            <button
                              onClick={(e) => handleDelete(item, e)}
                              style={{
                                padding: '0.375rem',
                                border: '1px solid #fecaca',
                                borderRadius: '4px',
                                backgroundColor: 'white',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                              title="Delete Item"
                            >
                              <Trash2 size={14} color="#ef4444" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'flex-end',
            flexShrink: 0
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              backgroundColor: 'white',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
