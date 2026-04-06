import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, Edit2, Trash2, Plus, FolderOpen, DollarSign, FileText, Calendar } from 'lucide-react'
import type { Project, Contract } from '../types/projects'
import { projectsApi } from '../services/projectsApi'
import { ContractsList } from './ContractsList'
import { ProjectSkeleton } from './SkeletonLoader'
import { useConfirm } from '../context/ConfirmContext'

interface ProjectsListProps {
  onEdit: (project: Project) => void
  onDelete: (project: Project) => void
  onAddContract: (projectId: number) => void
  onEditContract?: (contract: Contract) => void
  onDeleteContract?: (projectId: number, contractId: number) => void
  onViewItems?: (projectId: number, contract: Contract) => void
  refreshTrigger?: number
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  active:    { bg: 'rgba(37,99,235,0.08)',  text: '#2563eb', dot: '#2563eb', label: 'Active' },
  completed: { bg: 'rgba(5,150,105,0.08)',  text: '#059669', dot: '#059669', label: 'Completed' },
  'on-hold': { bg: 'rgba(217,119,6,0.08)',  text: '#d97706', dot: '#d97706', label: 'On Hold' },
}

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #1e3a8a, #2563eb)',
  'linear-gradient(135deg, #065f46, #059669)',
  'linear-gradient(135deg, #6d28d9, #8b5cf6)',
  'linear-gradient(135deg, #9a3412, #ea580c)',
  'linear-gradient(135deg, #1e40af, #4338ca)',
]

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

function getAvatarGradient(id: number) {
  return AVATAR_GRADIENTS[id % AVATAR_GRADIENTS.length]
}

export const ProjectsList: React.FC<ProjectsListProps> = ({
  onEdit, onDelete, onAddContract, onEditContract, onDeleteContract, onViewItems, refreshTrigger
}) => {
  const confirm = useConfirm()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set())

  const fetchProjects = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await projectsApi.getAll()
      setProjects(response.data.projects || [])
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProjects() }, [refreshTrigger])

  const toggleProject = (projectId: number) => {
    const next = new Set(expandedProjects)
    next.has(projectId) ? next.delete(projectId) : next.add(projectId)
    setExpandedProjects(next)
  }

  const handleDelete = async (project: Project, e: React.MouseEvent) => {
    e.stopPropagation()
    const confirmed = await confirm(`Delete project "${project.project_name}"?`, { destructive: true })
    if (confirmed) onDelete(project)
  }

  if (loading) return <div>{[1, 2, 3].map(i => <ProjectSkeleton key={i} />)}</div>

  if (error) return (
    <div style={{ padding: '1rem', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 10, color: '#dc2626' }}>{error}</div>
  )

  if (projects.length === 0) return (
    <div style={{ padding: '3rem', textAlign: 'center', background: 'rgba(255,255,255,0.6)', borderRadius: 16, border: '2px dashed rgba(37,99,235,0.2)' }}>
      <FolderOpen size={40} color="#93c5fd" style={{ marginBottom: 12 }} />
      <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>No Projects Yet</div>
      <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Create your first project to get started</div>
    </div>
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, alignItems: 'start' }}>
      {projects.map((project) => {
        const isExpanded = expandedProjects.has(project.project_id)
        const status = STATUS_CONFIG[project.status] || STATUS_CONFIG['on-hold']
        const initials = getInitials(project.project_name)
        const avatarGradient = getAvatarGradient(project.project_id)

        return (
          <div
            key={project.project_id}
            style={{ background: '#fff', borderRadius: 16, border: '1px solid rgba(6,48,98,0.08)', boxShadow: '0 2px 12px rgba(6,48,98,0.07)', overflow: 'hidden', transition: 'box-shadow 0.2s', gridColumn: isExpanded ? 'span 2' : 'span 1' }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 6px 24px rgba(6,48,98,0.13)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 2px 12px rgba(6,48,98,0.07)')}
          >
            {/* Card Header */}
            <div
              style={{ padding: '18px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16, background: isExpanded ? '#f8fafc' : '#fff', transition: 'background 0.2s' }}
              onClick={() => toggleProject(project.project_id)}
            >
              {/* Avatar */}
              <div style={{ width: 52, height: 52, borderRadius: 14, background: avatarGradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#fff', flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                {initials}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 15.5, fontWeight: 700, color: '#1e293b', letterSpacing: '-0.2px' }}>
                    {project.project_name}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 999, background: status.bg, color: status.text, fontSize: 11.5, fontWeight: 600 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: status.dot, display: 'inline-block' }} />
                    {status.label}
                  </span>
                </div>
                {project.project_description && (
                  <p style={{ fontSize: 12.5, color: '#94a3b8', margin: '0 0 8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 480 }}>
                    {project.project_description}
                  </p>
                )}
                <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#64748b' }}>
                    <FileText size={12} color="#94a3b8" />
                    <span style={{ fontWeight: 600, color: '#334155' }}>{project.contract_count || 0}</span> contracts
                  </span>
                  {project.total_budget !== undefined && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#64748b' }}>
                      <DollarSign size={12} color="#94a3b8" />
                      <span style={{ fontWeight: 600, color: '#334155' }}>Rs. {project.total_budget.toLocaleString()}</span>
                    </span>
                  )}
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#64748b' }}>
                    <Calendar size={12} color="#94a3b8" />
                    {new Date(project.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>

              {/* Chevron */}
              <div style={{ flexShrink: 0 }}>
                {isExpanded ? <ChevronDown size={18} color="#94a3b8" /> : <ChevronRight size={18} color="#94a3b8" />}
              </div>
            </div>

            {/* Action bar */}
            <div className="emp-card-actions" onClick={e => e.stopPropagation()}>
              <button
                className="emp-btn-view"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 8 }}
                onClick={() => onAddContract(project.project_id)}
              >
                <Plus size={12} strokeWidth={2.5} /> Add Contract
              </button>
              <button
                className="emp-btn-edit"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 8 }}
                onClick={() => onEdit(project)}
              >
                <Edit2 size={12} /> Edit
              </button>
              <button
                className="emp-btn-delete"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 8 }}
                onClick={e => handleDelete(project, e)}
              >
                <Trash2 size={12} /> Delete
              </button>
            </div>

            {/* Expanded Contracts */}
            {isExpanded && (
              <div style={{ borderTop: '1px solid rgba(6,48,98,0.06)', background: '#f8fafc', padding: '16px 20px' }}>
                <ContractsList
                  projectId={project.project_id}
                  onEdit={onEditContract}
                  onDelete={onDeleteContract}
                  onViewItems={onViewItems}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
