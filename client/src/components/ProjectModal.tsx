import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { Project } from '../types/projects'
import { projectsApi, contractsApi } from '../services/projectsApi'

interface ProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  project?: Project | null
  mode: 'create' | 'edit'
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  project,
  mode
}) => {
  const [formData, setFormData] = useState({
    project_name: '',
    project_description: '',
    status: 'active' as 'active' | 'completed' | 'on-hold',
    customer_name: '',
    initial_cost_budget: '',
    contract_name: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (mode === 'edit' && project) {
      setFormData({
        project_name: project.project_name,
        project_description: project.project_description,
        status: project.status,
        customer_name: '',
        initial_cost_budget: '',
        contract_name: ''
      })
    } else {
      setFormData({
        project_name: '',
        project_description: '',
        status: 'active',
        customer_name: '',
        initial_cost_budget: '',
        contract_name: ''
      })
    }
    setError(null)
  }, [mode, project, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!formData.project_name.trim()) {
      setError('Project name is required')
      return
    }

    // Additional validation for create mode
    if (mode === 'create') {
      if (!formData.customer_name.trim()) {
        setError('Customer name is required')
        return
      }
      if (!formData.initial_cost_budget.trim() || isNaN(Number(formData.initial_cost_budget))) {
        setError('Initial cost budget is required and must be a valid number')
        return
      }
    }

    setLoading(true)

    try {
      if (mode === 'create') {
        // Step 1: Create the project
        const projectResponse = await projectsApi.create({
          project_name: formData.project_name,
          project_description: formData.project_description,
          status: formData.status
        })
        
        const newProject = projectResponse.data.project
        
        // Step 2: Auto-create a default contract for the project
        const contractName = formData.contract_name.trim() || `${formData.project_name} - Main Contract`
        await contractsApi.create(newProject.project_id, {
          contract_name: contractName,
          customer_name: formData.customer_name,
          description: formData.project_description || undefined,
          initial_cost_budget: Number(formData.initial_cost_budget),
          extra_budget_allocation: 0,
          payment_type: 'Pending',
          status: 'ongoing'
        })
        
      } else if (mode === 'edit' && project) {
        await projectsApi.update(project.project_id, {
          project_name: formData.project_name,
          project_description: formData.project_description,
          status: formData.status
        })
      }
      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Error saving project:', err)
      setError(err.response?.data?.message || 'Failed to save project')
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
          maxWidth: '500px',
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
            {mode === 'create' ? 'Create New Project' : 'Edit Project'}
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

          {/* Project Name */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label
              htmlFor="project_name"
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}
            >
              Project Name <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              id="project_name"
              value={formData.project_name}
              onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
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
              placeholder="Enter project name"
            />
          </div>

          {/* Project Description */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label
              htmlFor="project_description"
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
              id="project_description"
              value={formData.project_description}
              onChange={(e) => setFormData({ ...formData, project_description: e.target.value })}
              disabled={loading}
              rows={4}
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
              placeholder="Enter project description"
            />
          </div>

          {/* Status */}
          <div style={{ marginBottom: '1.25rem' }}>
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
                  status: e.target.value as 'active' | 'completed' | 'on-hold'
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
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="on-hold">On Hold</option>
            </select>
          </div>

          {/* Show additional fields only in create mode */}
          {mode === 'create' && (
            <>
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

              {/* Initial Cost Budget */}
              <div style={{ marginBottom: '1.25rem' }}>
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
                  Initial Cost Budget <span style={{ color: '#ef4444' }}>*</span>
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
                  placeholder="Enter initial budget amount"
                />
              </div>

              {/* Contract Name (Optional) */}
              <div style={{ marginBottom: '1.5rem' }}>
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
                  Contract Name (Optional)
                </label>
                <input
                  type="text"
                  id="contract_name"
                  value={formData.contract_name}
                  onChange={(e) => setFormData({ ...formData, contract_name: e.target.value })}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    backgroundColor: loading ? '#f9fafb' : 'white',
                    cursor: loading ? 'not-allowed' : 'text'
                  }}
                  placeholder="Defaults to '[Project Name] - Main Contract'"
                />
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem', marginBottom: 0 }}>
                  Leave blank to auto-generate
                </p>
              </div>
            </>
          )}

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
              {loading ? 'Saving...' : mode === 'create' ? 'Create Project' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
