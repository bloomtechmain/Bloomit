import { useState, useEffect } from 'react'
import { FolderOpen, X, FileText, Building2, DollarSign, Hash, SlidersHorizontal } from 'lucide-react'
import type { Project } from '../types/projects'
import { projectsApi, contractsApi } from '../services/projectsApi'
import { useToast } from '../context/ToastContext'

interface ProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  project?: Project | null
  mode: 'create' | 'edit'
}

const INPUT_BASE: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 10,
  border: '1.5px solid #e2e8f0',
  background: '#f8fafc',
  fontSize: 13.5,
  color: '#1e293b',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  transition: 'all 0.2s',
}

const ACCENT = '#2563eb'
const ACCENT_SHADOW = 'rgba(37,99,235,0.12)'

function focusIn(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  e.target.style.borderColor = ACCENT
  e.target.style.background = '#fff'
  e.target.style.boxShadow = `0 0 0 3px ${ACCENT_SHADOW}`
}
function focusOut(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  e.target.style.borderColor = '#e2e8f0'
  e.target.style.background = '#f8fafc'
  e.target.style.boxShadow = 'none'
}

export const ProjectModal: React.FC<ProjectModalProps> = ({ isOpen, onClose, onSuccess, project, mode }) => {
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    project_name: '',
    project_description: '',
    status: 'active' as 'active' | 'completed' | 'on-hold',
    customer_name: '',
    initial_cost_budget: '',
    contract_name: ''
  })
  const [loading, setLoading] = useState(false)

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
      setFormData({ project_name: '', project_description: '', status: 'active', customer_name: '', initial_cost_budget: '', contract_name: '' })
    }
  }, [mode, project, isOpen])

  const handleSubmit = async () => {
    if (!formData.project_name.trim()) { toast.error('Project name is required'); return }
    if (mode === 'create') {
      if (!formData.customer_name.trim()) { toast.error('Customer name is required'); return }
      if (!formData.initial_cost_budget.trim() || isNaN(Number(formData.initial_cost_budget))) {
        toast.error('Initial cost budget must be a valid number'); return
      }
    }
    setLoading(true)
    try {
      if (mode === 'create') {
        const res = await projectsApi.create({ project_name: formData.project_name, project_description: formData.project_description, status: formData.status })
        const newProject = res.data.project
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
        toast.success('Project created successfully')
      } else if (mode === 'edit' && project) {
        await projectsApi.update(project.project_id, { project_name: formData.project_name, project_description: formData.project_description, status: formData.status })
        toast.success('Project updated successfully')
      }
      onSuccess()
      onClose()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save project')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const initials = formData.project_name
    ? formData.project_name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
    : null

  const statusColors: Record<string, string> = {
    active: '#2563eb',
    completed: '#059669',
    'on-hold': '#d97706'
  }
  const statusColor = statusColors[formData.status] || ACCENT

  return (
    <>
      <div className="emp-drawer-overlay" onClick={() => !loading && onClose()} />
      <div className="emp-drawer">

        {/* Header */}
        <div style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1e3a8a 55%, #2563eb 100%)', padding: '24px 24px 20px', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
          <div style={{ position: 'absolute', top: -50, right: -50, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -30, left: 30, width: 110, height: 110, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />

          {/* Title row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, position: 'relative' }}>
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Projects</div>
              <div style={{ color: '#fff', fontSize: 19, fontWeight: 700, letterSpacing: '-0.3px' }}>
                {mode === 'create' ? 'New Project' : 'Edit Project'}
              </div>
            </div>
            <button onClick={() => !loading && onClose()} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, color: 'rgba(255,255,255,0.7)', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <X size={16} />
            </button>
          </div>

          {/* Preview */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative' }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: initials ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'rgba(255,255,255,0.1)', border: '2.5px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#fff', boxShadow: initials ? '0 4px 16px rgba(37,99,235,0.4)' : 'none', transition: 'all 0.3s', flexShrink: 0 }}>
              {initials || <FolderOpen size={24} color="rgba(255,255,255,0.35)" />}
            </div>
            <div>
              <div style={{ color: '#fff', fontSize: 15, fontWeight: 600, letterSpacing: '-0.1px', minHeight: 22 }}>
                {formData.project_name || 'New Project'}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.42)', fontSize: 12, marginTop: 3 }}>
                {formData.customer_name ? `Client: ${formData.customer_name}` : 'No client yet'}
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="emp-drawer-body">

          {/* Section: Project Details */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: `rgba(37,99,235,0.1)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FolderOpen size={13} color={ACCENT} />
              </div>
              <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>Project Details</span>
            </div>

            {/* Project Name */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'grid', gap: 5 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>
                  <Hash size={11} color="#94a3b8" /> Project Name *
                </span>
                <input
                  type="text"
                  value={formData.project_name}
                  onChange={e => setFormData({ ...formData, project_name: e.target.value })}
                  placeholder="e.g. Website Redesign"
                  disabled={loading}
                  style={{ ...INPUT_BASE, opacity: loading ? 0.6 : 1 }}
                  onFocus={focusIn} onBlur={focusOut}
                />
              </label>
            </div>

            {/* Description */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'grid', gap: 5 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>
                  <FileText size={11} color="#94a3b8" /> Description
                </span>
                <textarea
                  value={formData.project_description}
                  onChange={e => setFormData({ ...formData, project_description: e.target.value })}
                  placeholder="Brief project description..."
                  disabled={loading}
                  rows={3}
                  style={{ ...INPUT_BASE, resize: 'vertical', opacity: loading ? 0.6 : 1 }}
                  onFocus={focusIn} onBlur={focusOut}
                />
              </label>
            </div>
          </div>

          <div style={{ height: 1, background: 'linear-gradient(to right, #e2e8f0, transparent)', marginBottom: 24 }} />

          {/* Section: Status */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: `rgba(37,99,235,0.1)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <SlidersHorizontal size={13} color={ACCENT} />
              </div>
              <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>Status</span>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              {(['active', 'on-hold', 'completed'] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFormData({ ...formData, status: s })}
                  disabled={loading}
                  style={{
                    flex: 1, padding: '9px 4px', borderRadius: 10, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', textTransform: 'capitalize',
                    border: `1.5px solid ${formData.status === s ? statusColors[s] : '#e2e8f0'}`,
                    background: formData.status === s ? `${statusColors[s]}14` : '#f8fafc',
                    color: formData.status === s ? statusColors[s] : '#94a3b8',
                    boxShadow: formData.status === s ? `0 0 0 3px ${statusColors[s]}18` : 'none'
                  }}
                >
                  {s === 'on-hold' ? 'On Hold' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Create-only fields */}
          {mode === 'create' && (
            <>
              <div style={{ height: 1, background: 'linear-gradient(to right, #e2e8f0, transparent)', marginBottom: 24 }} />

              {/* Section: Client & Budget */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: `rgba(37,99,235,0.1)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Building2 size={13} color={ACCENT} />
                  </div>
                  <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>Client & Budget</span>
                </div>

                {/* Customer Name */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'grid', gap: 5 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>
                      <Building2 size={11} color="#94a3b8" /> Customer Name *
                    </span>
                    <input
                      type="text"
                      value={formData.customer_name}
                      onChange={e => setFormData({ ...formData, customer_name: e.target.value })}
                      placeholder="e.g. Acme Corporation"
                      disabled={loading}
                      style={{ ...INPUT_BASE, opacity: loading ? 0.6 : 1 }}
                      onFocus={focusIn} onBlur={focusOut}
                    />
                  </label>
                </div>

                {/* Budget */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'grid', gap: 5 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>
                      <DollarSign size={11} color="#94a3b8" /> Initial Cost Budget *
                    </span>
                    <input
                      type="number"
                      value={formData.initial_cost_budget}
                      onChange={e => setFormData({ ...formData, initial_cost_budget: e.target.value })}
                      placeholder="0.00"
                      disabled={loading}
                      min="0"
                      step="0.01"
                      style={{ ...INPUT_BASE, opacity: loading ? 0.6 : 1 }}
                      onFocus={focusIn} onBlur={focusOut}
                    />
                  </label>
                </div>

                {/* Contract Name */}
                <div>
                  <label style={{ display: 'grid', gap: 5 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>
                      <FileText size={11} color="#94a3b8" /> Contract Name <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span>
                    </span>
                    <input
                      type="text"
                      value={formData.contract_name}
                      onChange={e => setFormData({ ...formData, contract_name: e.target.value })}
                      placeholder={`Defaults to "${formData.project_name || 'Project'} - Main Contract"`}
                      disabled={loading}
                      style={{ ...INPUT_BASE, opacity: loading ? 0.6 : 1 }}
                      onFocus={focusIn} onBlur={focusOut}
                    />
                  </label>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', background: '#fff', display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => !loading && onClose()}
            disabled={loading}
            style={{ padding: '10px 20px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: 'transparent', color: '#64748b', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 14px rgba(37,99,235,0.3)' }}
          >
            {loading ? 'Saving...' : mode === 'create' ? '+ Create Project' : 'Save Changes'}
          </button>
        </div>

      </div>
    </>
  )
}
