import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { ContractItem } from '../types/projects'
import { itemsApi } from '../services/projectsApi'

interface ItemModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  projectId: number
  contractId: number
  item?: ContractItem | null
  mode: 'create' | 'edit'
}

export const ItemModal: React.FC<ItemModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  projectId,
  contractId,
  item,
  mode
}) => {
  const [formData, setFormData] = useState({
    requirements: '',
    service_category: '',
    unit_cost: '',
    requirement_type: 'Initial Requirement' as 'Initial Requirement' | 'Additional Requirement'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (mode === 'edit' && item) {
      setFormData({
        requirements: item.requirements,
        service_category: item.service_category,
        unit_cost: item.unit_cost.toString(),
        requirement_type: item.requirement_type
      })
    } else {
      setFormData({
        requirements: '',
        service_category: '',
        unit_cost: '',
        requirement_type: 'Initial Requirement'
      })
    }
    setError(null)
  }, [mode, item, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!formData.requirements.trim()) {
      setError('Requirements field is required')
      return
    }
    if (!formData.service_category.trim()) {
      setError('Service category is required')
      return
    }
    if (!formData.unit_cost || isNaN(Number(formData.unit_cost)) || Number(formData.unit_cost) < 0) {
      setError('Please enter a valid unit cost')
      return
    }

    setLoading(true)

    try {
      const payload = {
        requirements: formData.requirements.trim(),
        service_category: formData.service_category.trim(),
        unit_cost: Number(formData.unit_cost),
        requirement_type: formData.requirement_type,
        contract_id: contractId
      }

      if (mode === 'create') {
        await itemsApi.create(projectId, contractId, payload)
      } else if (mode === 'edit' && item) {
        await itemsApi.update(projectId, contractId, item.requirements, payload)
      }

      // Call onSuccess to trigger parent refresh
      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Error saving item:', err)
      setError(err.response?.data?.message || 'Failed to save item')
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
        zIndex: 1003,
        padding: '1rem'
      }}
      onClick={handleClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          maxWidth: '550px',
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
            {mode === 'create' ? 'Add Contract Item' : 'Edit Contract Item'}
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
          {error && (
            <div
              style={{
                padding: '0.75rem',
                backgroundColor: '#fee2e2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                color: '#dc2626',
                marginBottom: '1rem',
                fontSize: '0.875rem'
              }}
            >
              {error}
            </div>
          )}

          {/* Requirements */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label
              htmlFor="requirements"
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}
            >
              Requirements <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              id="requirements"
              value={formData.requirements}
              onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
              disabled={loading || mode === 'edit'} // Requirements can't be changed in edit mode (used as ID)
              required
              rows={3}
              style={{
                width: '100%',
                padding: '0.625rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.875rem',
                backgroundColor: loading || mode === 'edit' ? '#f9fafb' : 'white',
                cursor: loading || mode === 'edit' ? 'not-allowed' : 'text',
                resize: 'vertical'
              }}
              placeholder="Enter item requirements"
            />
            {mode === 'edit' && (
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                Requirements cannot be changed after creation
              </div>
            )}
          </div>

          {/* Service Category */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label
              htmlFor="service_category"
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}
            >
              Service Category <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              id="service_category"
              value={formData.service_category}
              onChange={(e) => setFormData({ ...formData, service_category: e.target.value })}
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
              placeholder="e.g., Development, Design, Consulting"
            />
          </div>

          {/* Unit Cost */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label
              htmlFor="unit_cost"
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}
            >
              Unit Cost <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="number"
              id="unit_cost"
              value={formData.unit_cost}
              onChange={(e) => setFormData({ ...formData, unit_cost: e.target.value })}
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

          {/* Requirement Type */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}
            >
              Requirement Type <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  backgroundColor:
                    formData.requirement_type === 'Initial Requirement' ? '#eff6ff' : 'white',
                  borderColor:
                    formData.requirement_type === 'Initial Requirement' ? '#3b82f6' : '#d1d5db'
                }}
              >
                <input
                  type="radio"
                  name="requirement_type"
                  value="Initial Requirement"
                  checked={formData.requirement_type === 'Initial Requirement'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      requirement_type: e.target.value as 'Initial Requirement' | 'Additional Requirement'
                    })
                  }
                  disabled={loading}
                  style={{ marginRight: '0.5rem' }}
                />
                <div>
                  <div style={{ fontWeight: '500', fontSize: '0.875rem' }}>Initial Requirement</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    Part of the original contract budget
                  </div>
                </div>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  backgroundColor:
                    formData.requirement_type === 'Additional Requirement' ? '#fef3c7' : 'white',
                  borderColor:
                    formData.requirement_type === 'Additional Requirement' ? '#f59e0b' : '#d1d5db'
                }}
              >
                <input
                  type="radio"
                  name="requirement_type"
                  value="Additional Requirement"
                  checked={formData.requirement_type === 'Additional Requirement'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      requirement_type: e.target.value as 'Initial Requirement' | 'Additional Requirement'
                    })
                  }
                  disabled={loading}
                  style={{ marginRight: '0.5rem' }}
                />
                <div>
                  <div style={{ fontWeight: '500', fontSize: '0.875rem' }}>
                    Additional Requirement
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    {mode === 'create'
                      ? 'Will automatically add to extra budget allocation'
                      : 'Added to extra budget allocation'}
                  </div>
                </div>
              </label>
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
              {loading ? 'Saving...' : mode === 'create' ? 'Add Item' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
