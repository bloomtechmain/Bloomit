import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { ContractItem } from '../types/projects'
import { itemsApi } from '../services/projectsApi'
import { useToast } from '../context/ToastContext'

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
  const { toast } = useToast()

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
  }, [mode, item, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.requirements.trim()) {
      toast.error('Requirements field is required')
      return
    }
    if (!formData.service_category.trim()) {
      toast.error('Service category is required')
      return
    }
    if (!formData.unit_cost || isNaN(Number(formData.unit_cost)) || Number(formData.unit_cost) < 0) {
      toast.error('Please enter a valid unit cost')
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
      toast.success(mode === 'create' ? 'Item added successfully' : 'Item updated successfully')
      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Error saving item:', err)
      toast.error(err.response?.data?.message || 'Failed to save item')
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
    <div className="modal-overlay" style={{ zIndex: 1003 }} onClick={handleClose}>
      <div
        className="modal-container"
        style={{ maxWidth: '550px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">
            {mode === 'create' ? 'Add Contract Item' : 'Edit Contract Item'}
          </h2>
          <button
            className="modal-close-btn"
            onClick={handleClose}
            disabled={loading}
            style={{ opacity: loading ? 0.5 : 1 }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="modal-body">
          {/* Requirements */}
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" htmlFor="requirements">
              Requirements <span className="required-star">*</span>
            </label>
            <textarea
              id="requirements"
              value={formData.requirements}
              onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
              disabled={loading || mode === 'edit'} // Requirements can't be changed in edit mode (used as ID)
              required
              rows={3}
              style={{ opacity: loading || mode === 'edit' ? 0.6 : 1 }}
              placeholder="Enter item requirements"
            />
            {mode === 'edit' && (
              <div style={{ fontSize: '0.75rem', color: '#7aa3d4', marginTop: '0.25rem' }}>
                Requirements cannot be changed after creation
              </div>
            )}
          </div>

          {/* Service Category */}
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" htmlFor="service_category">
              Service Category <span className="required-star">*</span>
            </label>
            <input
              type="text"
              id="service_category"
              value={formData.service_category}
              onChange={(e) => setFormData({ ...formData, service_category: e.target.value })}
              disabled={loading}
              required
              style={{ opacity: loading ? 0.6 : 1 }}
              placeholder="e.g., Development, Design, Consulting"
            />
          </div>

          {/* Unit Cost */}
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" htmlFor="unit_cost">
              Unit Cost <span className="required-star">*</span>
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
              style={{ opacity: loading ? 0.6 : 1 }}
              placeholder="0.00"
            />
          </div>

          {/* Requirement Type */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">
              Requirement Type <span className="required-star">*</span>
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.75rem',
                  border: `1px solid ${formData.requirement_type === 'Initial Requirement' ? '#3b82f6' : '#1e3a5f'}`,
                  borderRadius: '6px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  backgroundColor:
                    formData.requirement_type === 'Initial Requirement' ? 'rgba(59,130,246,0.15)' : 'rgba(13,31,60,0.5)'
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
                  <div style={{ fontWeight: '500', fontSize: '0.875rem', color: '#e2e8f0' }}>Initial Requirement</div>
                  <div style={{ fontSize: '0.75rem', color: '#7aa3d4' }}>
                    Part of the original contract budget
                  </div>
                </div>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.75rem',
                  border: `1px solid ${formData.requirement_type === 'Additional Requirement' ? '#f59e0b' : '#1e3a5f'}`,
                  borderRadius: '6px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  backgroundColor:
                    formData.requirement_type === 'Additional Requirement' ? 'rgba(245,158,11,0.15)' : 'rgba(13,31,60,0.5)'
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
                  <div style={{ fontWeight: '500', fontSize: '0.875rem', color: '#e2e8f0' }}>
                    Additional Requirement
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#7aa3d4' }}>
                    {mode === 'create'
                      ? 'Will automatically add to extra budget allocation'
                      : 'Added to extra budget allocation'}
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="modal-footer" style={{ padding: 0, border: 'none' }}>
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="btn-secondary"
              style={{ opacity: loading ? 0.5 : 1 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Saving...' : mode === 'create' ? 'Add Item' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
