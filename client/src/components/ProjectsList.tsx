import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, Edit2, Trash2, Plus } from 'lucide-react'
import type { Project, Contract } from '../types/projects'
import { projectsApi } from '../services/projectsApi'
import { ContractsList } from './ContractsList'
import { ProjectSkeleton } from './SkeletonLoader'

interface ProjectsListProps {
  onEdit: (project: Project) => void
  onDelete: (project: Project) => void
  onAddContract: (projectId: number) => void
  onEditContract?: (contract: Contract) => void
  onDeleteContract?: (projectId: number, contractId: number) => void
  onViewItems?: (projectId: number, contract: Contract) => void
  refreshTrigger?: number
}

export const ProjectsList: React.FC<ProjectsListProps> = ({
  onEdit,
  onDelete,
  onAddContract,
  onEditContract,
  onDeleteContract,
  onViewItems,
  refreshTrigger
}) => {
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
      console.error('Error fetching projects:', err)
      setError(err.response?.data?.message || 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [refreshTrigger])

  const toggleProject = (projectId: number) => {
    const newExpanded = new Set(expandedProjects)
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId)
    } else {
      newExpanded.add(projectId)
    }
    setExpandedProjects(newExpanded)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return { bg: '#dcfce7', text: '#166534', border: '#86efac' }
      case 'completed':
        return { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' }
      case 'on-hold':
        return { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' }
      default:
        return { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' }
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Active'
      case 'completed':
        return 'Completed'
      case 'on-hold':
        return 'On Hold'
      default:
        return status
    }
  }

  const handleDelete = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation()
    if (window.confirm(`Are you sure you want to delete project "${project.project_name}"?`)) {
      onDelete(project)
    }
  }

  if (loading) {
    return (
      <div>
        {[1, 2, 3].map((i) => (
          <ProjectSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (error) {
    return (
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
    )
  }

  if (projects.length === 0) {
    return (
      <div
        style={{
          padding: '3rem',
          textAlign: 'center',
          backgroundColor: '#f9fafb',
          borderRadius: '12px',
          border: '2px dashed #d1d5db'
        }}
      >
        <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
          No Projects Yet
        </div>
        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          Create your first project to get started
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {projects.map((project) => {
        const isExpanded = expandedProjects.has(project.project_id)
        const statusStyle = getStatusColor(project.status)

        return (
          <div
            key={project.project_id}
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
              overflow: 'hidden'
            }}
          >
            {/* Project Header */}
            <div
              style={{
                padding: '1.25rem',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                backgroundColor: isExpanded ? '#f9fafb' : 'white'
              }}
              onClick={() => toggleProject(project.project_id)}
              onMouseEnter={(e) => {
                if (!isExpanded) e.currentTarget.style.backgroundColor = '#f9fafb'
              }}
              onMouseLeave={(e) => {
                if (!isExpanded) e.currentTarget.style.backgroundColor = 'white'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                {/* Expand/Collapse Icon */}
                <div style={{ paddingTop: '0.25rem' }}>
                  {isExpanded ? (
                    <ChevronDown size={20} color="#6b7280" />
                  ) : (
                    <ChevronRight size={20} color="#6b7280" />
                  )}
                </div>

                {/* Project Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>
                      {project.project_name}
                    </h3>
                    <span
                      style={{
                        padding: '0.25rem 0.75rem',
                        backgroundColor: statusStyle.bg,
                        color: statusStyle.text,
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        border: `1px solid ${statusStyle.border}`
                      }}
                    >
                      {getStatusLabel(project.status)}
                    </span>
                  </div>

                  {project.project_description && (
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0 0 0.75rem 0' }}>
                      {project.project_description}
                    </p>
                  )}

                  {/* Project Metadata */}
                  <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span style={{ color: '#6b7280' }}>Contracts:</span>
                      <span style={{ fontWeight: '600', color: '#1f2937' }}>
                        {project.contract_count || 0}
                      </span>
                    </div>
                    {project.total_budget !== undefined && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span style={{ color: '#6b7280' }}>Total Budget:</span>
                        <span style={{ fontWeight: '600', color: '#1f2937' }}>
                          Rs. {project.total_budget.toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span style={{ color: '#6b7280' }}>Created:</span>
                      <span style={{ fontWeight: '500', color: '#1f2937' }}>
                        {new Date(project.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onAddContract(project.project_id)
                    }}
                    style={{
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      backgroundColor: 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      fontSize: '0.875rem',
                      color: '#374151'
                    }}
                    title="Add Contract"
                  >
                    <Plus size={16} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onEdit(project)
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
                    title="Edit Project"
                  >
                    <Edit2 size={16} color="#3b82f6" />
                  </button>
                  <button
                    onClick={(e) => handleDelete(project, e)}
                    style={{
                      padding: '0.5rem',
                      border: '1px solid #fecaca',
                      borderRadius: '6px',
                      backgroundColor: 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title="Delete Project"
                  >
                    <Trash2 size={16} color="#ef4444" />
                  </button>
                </div>
              </div>
            </div>

            {/* Expanded Content - Contracts List */}
            {isExpanded && (
              <div
                style={{
                  borderTop: '1px solid #e5e7eb',
                  backgroundColor: '#f9fafb',
                  padding: '1.25rem'
                }}
              >
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
