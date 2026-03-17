import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { Contract } from '../types/projects'
import { contractsApi } from '../services/projectsApi'
import { useToast } from '../context/ToastContext'

interface ContractModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  projectId: number
  contract?: Contract | null
  mode: 'create' | 'edit'
}

export const ContractModal: React.FC<ContractModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  projectId,
  contract,
  mode
}) => {
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    contract_name: '',
    customer_name: '',
    description: '',
    initial_cost_budget: '',
    extra_budget_allocation: '0',
    payment_type: 'Pending' as 'Pending' | 'Partial' | 'Complete',
    status: 'ongoing' as 'ongoing' | 'completed' | 'paused'
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (mode === 'edit' && contract) {
      setFormData({
        contract_name: contract.contract_name,
        customer_name: contract.customer_name,
        description: contract.description || '',
        initial_cost_budget: contract.initial_cost_budget.toString(),
        extra_budget_allocation: contract.extra_budget_allocation.toString(),
        payment_type: contract.payment_type,
        status: contract.status
      })
    } else {
      setFormData({
        contract_name: '',
        customer_name: '',
        description: '',
        initial_cost_budget: '',
        extra_budget_allocation: '0',
        payment_type: 'Pending',
        status: 'ongoing'
      })
    }
  }, [mode, contract, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.contract_name.trim()) {
      toast.error('Contract name is required')
      return
    }
    if (!formData.customer_name.trim()) {
      toast.error('Customer name is required')
      return
    }
    if (!formData.initial_cost_budget || isNaN(Number(formData.initial_cost_budget)) || Number(formData.initial_cost_budget) < 0) {
      toast.error('Please enter a valid initial cost budget')
      return
    }
    if (isNaN(Number(formData.extra_budget_allocation)) || Number(formData.extra_budget_allocation) < 0) {
      toast.error('Please enter a valid extra budget allocation')
      return
    }

    setLoading(true)

    try {
      const payload = {
        contract_name: formData.contract_name.trim(),
        customer_name: formData.customer_name.trim(),
        description: formData.description.trim() || undefined,
        initial_cost_budget: Number(formData.initial_cost_budget),
        extra_budget_allocation: Number(formData.extra_budget_allocation),
        payment_type: formData.payment_type,
        status: formData.status
      }

      if (mode === 'create') {
        await contractsApi.create(projectId, payload)
        toast.success('Contract created successfully')
      } else if (mode === 'edit' && contract) {
        await contractsApi.update(projectId, contract.contract_id, payload)
        toast.success('Contract updated successfully')
      }
      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Error saving contract:', err)
      toast.error(err.response?.data?.message || 'Failed to save contract')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      onClose()
    }
  }

  if (!isOpen) return null

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
        zIndex: 1000,
        padding: '1rem'
      }}
      onClick={handleClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
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
            justifyContent: 'space-between'
          }}
        >
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>
            {mode === 'create' ? 'Create New Contract' : 'Edit Contract'}
          </h2>
          <button
            onClick={handleClose}
            disabled={loading}
            style={{
              padding: '0.5rem',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: loading ? 'not-allowed' : 'pointer',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              opacity: loading ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.backgroundColor = '#f3f4f6'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <X size={20} color="#6b7280" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          {/* Contract Name */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label
              htmlFor="contract_name"
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}
            >
              Contract Name <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              id="contract_name"
              value={formData.contract_name}
              onChange={(e) => setFormData({ ...formData, contract_name: e.target.value })}
              disabled={loading}
              required
              style={{
                width: '100%',
                padding: '0.625rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.875rem',
                backgroundColor: loading ? '#f9fafb' : 'white',
                cursor: loading ? 'not-allowed' : 'text'
              }}
              placeholder="Enter contract name"
            />
          </div>

          {/* Customer Name */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label
              htmlFor="customer_name"
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}
            >
              Customer Name <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              id="customer_name"
              value={formData.customer_name}
              onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
              disabled={loading}
              required
              style={{
                width: '100%',
                padding: '0.625rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.875rem',
                backgroundColor: loading ? '#f9fafb' : 'white',
                cursor: loading ? 'not-allowed' : 'text'
              }}
              placeholder="Enter customer name"
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label
              htmlFor="description"
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}
            >
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={loading}
              rows={3}
              style={{
                width: '100%',
                padding: '0.625rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.875rem',
                backgroundColor: loading ? '#f9fafb' : 'white',
                cursor: loading ? 'not-allowed' : 'text',
                resize: 'vertical'
              }}
              placeholder="Enter contract description (optional)"
            />
          </div>

          {/* Budget Fields - Side by Side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            {/* Initial Cost Budget */}
            <div>
              <label
                htmlFor="initial_cost_budget"
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}
              >
                Initial Budget <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="number"
                id="initial_cost_budget"
                value={formData.initial_cost_budget}
                onChange={(e) => setFormData({ ...formData, initial_cost_budget: e.target.value })}
                disabled={loading}
                required
                min="0"
                step="0.01"
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  backgroundColor: loading ? '#f9fafb' : 'white',
                  cursor: loading ? 'not-allowed' : 'text'
                }}
                placeholder="0.00"
              />
            </div>

            {/* Extra Budget Allocation */}
            <div>
              <label
                htmlFor="extra_budget_allocation"
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}
              >
                Extra Budget
              </label>
              <input
                type="number"
                id="extra_budget_allocation"
                value={formData.extra_budget_allocation}
                onChange={(e) => setFormData({ ...formData, extra_budget_allocation: e.target.value })}
                disabled={loading}
                min="0"
                step="0.01"
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  backgroundColor: loading ? '#f9fafb' : 'white',
                  cursor: loading ? 'not-allowed' : 'text'
                }}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Payment Type & Status - Side by Side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            {/* Payment Type */}
            <div>
              <label
                htmlFor="payment_type"
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}
              >
                Payment Type <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                id="payment_type"
                value={formData.payment_type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    payment_type: e.target.value as 'Pending' | 'Partial' | 'Complete'
                  })
                }
                disabled={loading}
                required
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  backgroundColor: loading ? '#f9fafb' : 'white',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                <option value="Pending">Pending</option>
                <option value="Partial">Partial</option>
                <option value="Complete">Complete</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label
                htmlFor="status"
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}
              >
                Status <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as 'ongoing' | 'completed' | 'paused'
                  })
                }
                disabled={loading}
                required
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  backgroundColor: loading ? '#f9fafb' : 'white',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="paused">Paused</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'flex-end'
            }}
          >
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              style={{
                padding: '0.625rem 1.25rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                backgroundColor: 'white',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0.625rem 1.25rem',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: 'white',
                backgroundColor: loading ? '#9ca3af' : '#3b82f6',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Saving...' : mode === 'create' ? 'Create Contract' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
