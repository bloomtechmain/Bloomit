import { useState, useEffect } from 'react'
import { FolderOpen, ClipboardList, Briefcase, FileText } from 'lucide-react'
import type { Project, Contract, ContractItem } from '../types/projects'
import { projectsApi, contractsApi, itemsApi } from '../services/projectsApi'
import { ProjectsList } from '../components/ProjectsList'
import { ProjectModal } from '../components/ProjectModal'
import { ContractModal } from '../components/ContractModal'
import { ItemModal } from '../components/ItemModal'
import { ItemsModal } from '../components/ItemsModal'
import { ErrorBoundary } from '../components/ErrorBoundary'

interface ProjectsProps {
  onRegisterCreate?: (handler: () => void) => void
}

export default function Projects({ onRegisterCreate }: ProjectsProps) {

  // State for data refresh
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Modal states
  const [projectModalOpen, setProjectModalOpen] = useState(false)
  const [contractModalOpen, setContractModalOpen] = useState(false)
  const [itemModalOpen, setItemModalOpen] = useState(false)
  const [itemsModalOpen, setItemsModalOpen] = useState(false)

  // Modal modes
  const [projectMode, setProjectMode] = useState<'create' | 'edit'>('create')
  const [contractMode, setContractMode] = useState<'create' | 'edit'>('create')
  const [itemMode, setItemMode] = useState<'create' | 'edit'>('create')

  // Selected entities
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)
  const [selectedItem, setSelectedItem] = useState<ContractItem | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)

  // Notification state
  const [notification, setNotification] = useState<{
    message: string
    type: 'success' | 'error'
  } | null>(null)

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  const refreshData = () => {
    setRefreshTrigger((prev) => prev + 1)
  }

  // Project handlers
  const handleCreateProject = () => {
    setProjectMode('create')
    setSelectedProject(null)
    setProjectModalOpen(true)
  }

  useEffect(() => {
    onRegisterCreate?.(handleCreateProject)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleEditProject = (project: Project) => {
    setProjectMode('edit')
    setSelectedProject(project)
    setProjectModalOpen(true)
  }

  const handleDeleteProject = async (project: Project) => {
    try {
      await projectsApi.delete(project.project_id)
      showNotification('Project deleted successfully', 'success')
      refreshData()
    } catch (error: any) {
      console.error('Error deleting project:', error)
      showNotification(error.response?.data?.message || 'Failed to delete project', 'error')
    }
  }

  const handleProjectSuccess = () => {
    showNotification(
      projectMode === 'create' ? 'Project created successfully' : 'Project updated successfully',
      'success'
    )
    refreshData()
  }

  // Contract handlers
  const handleAddContract = (projectId: number) => {
    setContractMode('create')
    setSelectedProjectId(projectId)
    setSelectedContract(null)
    setContractModalOpen(true)
  }

  const handleEditContract = (contract: Contract) => {
    setContractMode('edit')
    setSelectedProjectId(contract.project_id)
    setSelectedContract(contract)
    setContractModalOpen(true)
  }

  const handleDeleteContract = async (projectId: number, contractId: number) => {
    try {
      await contractsApi.delete(projectId, contractId)
      showNotification('Contract deleted successfully', 'success')
      refreshData()
      // Close items modal if it's open for this contract
      if (selectedContract?.contract_id === contractId) {
        setItemsModalOpen(false)
      }
    } catch (error: any) {
      console.error('Error deleting contract:', error)
      showNotification(error.response?.data?.message || 'Failed to delete contract', 'error')
    }
  }

  const handleContractSuccess = () => {
    showNotification(
      contractMode === 'create' ? 'Contract created successfully' : 'Contract updated successfully',
      'success'
    )
    refreshData()
  }

  // Item handlers
  const handleViewItems = (projectId: number, contract: Contract) => {
    setSelectedProjectId(projectId)
    setSelectedContract(contract)
    setItemsModalOpen(true)
  }

  const handleAddItem = () => {
    if (!selectedProjectId || !selectedContract) return
    setItemMode('create')
    setSelectedItem(null)
    setItemModalOpen(true)
  }

  const handleEditItem = (item: ContractItem) => {
    setItemMode('edit')
    setSelectedItem(item)
    setItemModalOpen(true)
  }

  const handleDeleteItem = async (projectId: number, contractId: number, requirements: string) => {
    try {
      await itemsApi.delete(projectId, contractId, requirements)
      showNotification('Item deleted successfully', 'success')
      refreshData()
    } catch (error: any) {
      console.error('Error deleting item:', error)
      showNotification(error.response?.data?.message || 'Failed to delete item', 'error')
    }
  }

  const handleItemSuccess = () => {
    showNotification(
      itemMode === 'create' ? 'Item created successfully' : 'Item updated successfully',
      'success'
    )
    refreshData()
  }

  return (
    <ErrorBoundary>
      <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', position: 'relative' }}>
      <div aria-hidden="true" style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <FolderOpen size={520} strokeWidth={0.6} style={{ position: 'absolute', right: -120, top: -80, opacity: 0.07, color: '#3b82f6', transform: 'rotate(-12deg)' }} />
        <ClipboardList size={380} strokeWidth={0.6} style={{ position: 'absolute', left: -60, bottom: -60, opacity: 0.06, color: '#6366f1', transform: 'rotate(10deg)' }} />
        <Briefcase size={300} strokeWidth={0.6} style={{ position: 'absolute', left: '42%', top: '22%', opacity: 0.05, color: '#3b82f6', transform: 'translateX(-50%) rotate(-5deg)' }} />
        <FolderOpen size={240} strokeWidth={0.6} style={{ position: 'absolute', left: '3%', top: '6%', opacity: 0.06, color: '#818cf8', transform: 'rotate(-8deg)' }} />
        <ClipboardList size={260} strokeWidth={0.6} style={{ position: 'absolute', right: '4%', top: '35%', opacity: 0.05, color: '#6366f1', transform: 'rotate(-10deg)' }} />
        <Briefcase size={240} strokeWidth={0.6} style={{ position: 'absolute', right: '6%', bottom: '8%', opacity: 0.06, color: '#3b82f6', transform: 'rotate(7deg)' }} />
        <FileText size={200} strokeWidth={0.6} style={{ position: 'absolute', left: '22%', bottom: '12%', opacity: 0.05, color: '#818cf8', transform: 'rotate(-15deg)' }} />
      </div>
      {/* Notification */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            top: '2rem',
            right: '2rem',
            padding: '1rem 1.5rem',
            backgroundColor: notification.type === 'success' ? '#dcfce7' : '#fee2e2',
            border: `1px solid ${notification.type === 'success' ? '#86efac' : '#fecaca'}`,
            borderRadius: '8px',
            color: notification.type === 'success' ? '#166534' : '#991b1b',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            zIndex: 9999,
            animation: 'slideIn 0.3s ease-out'
          }}
        >
          {notification.message}
        </div>
      )}

      {/* Projects List */}
      <ProjectsList
        onEdit={handleEditProject}
        onDelete={handleDeleteProject}
        onAddContract={handleAddContract}
        onEditContract={handleEditContract}
        onDeleteContract={handleDeleteContract}
        onViewItems={handleViewItems}
        refreshTrigger={refreshTrigger}
      />

      {/* Modals */}
      <ProjectModal
        isOpen={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        onSuccess={handleProjectSuccess}
        project={selectedProject}
        mode={projectMode}
      />

      {selectedProjectId && (
        <ContractModal
          isOpen={contractModalOpen}
          onClose={() => setContractModalOpen(false)}
          onSuccess={handleContractSuccess}
          projectId={selectedProjectId}
          contract={selectedContract}
          mode={contractMode}
        />
      )}

      {selectedProjectId && selectedContract && (
        <>
          <ItemModal
            isOpen={itemModalOpen}
            onClose={() => setItemModalOpen(false)}
            onSuccess={handleItemSuccess}
            projectId={selectedProjectId}
            contractId={selectedContract.contract_id}
            item={selectedItem}
            mode={itemMode}
          />

          <ItemsModal
            isOpen={itemsModalOpen}
            onClose={() => setItemsModalOpen(false)}
            projectId={selectedProjectId}
            contract={selectedContract}
            onAddItem={handleAddItem}
            onEditItem={handleEditItem}
            onDeleteItem={handleDeleteItem}
            refreshTrigger={refreshTrigger}
          />
        </>
      )}
      </div>
    </ErrorBoundary>
  )
}
