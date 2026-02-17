import { useState, useEffect } from 'react'
import { Search, Users } from 'lucide-react'
import { getEmployeeDirectory } from '../services/employeePortalService'
import type { EmployeeDirectoryResponse } from '../services/employeePortalService'
import EmployeeDirectoryCard from '../components/employee/EmployeeDirectoryCard'

interface EmployeeDirectoryProps {
  accessToken: string
}

export default function EmployeeDirectory({ accessToken }: EmployeeDirectoryProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [directory, setDirectory] = useState<EmployeeDirectoryResponse | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('all')
  const [selectedRole, setSelectedRole] = useState('all')
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Fetch directory data
  const fetchDirectory = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const data = await getEmployeeDirectory(accessToken, {
        search: searchQuery,
        department: selectedDepartment !== 'all' ? selectedDepartment : undefined,
        role: selectedRole !== 'all' ? selectedRole : undefined
      })
      setDirectory(data)
    } catch (err) {
      console.error('Error fetching directory:', err)
      setError(err instanceof Error ? err.message : 'Failed to load directory')
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchDirectory()
  }, [])

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDirectory()
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, selectedDepartment, selectedRole])

  if (loading && !directory) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <p>Loading directory...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="glass-panel" style={{ padding: 24, margin: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <h2>Error Loading Directory</h2>
        <p style={{ color: '#6b7280' }}>{error}</p>
        <button onClick={fetchDirectory} className="btn-primary">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: isMobile ? 12 : 24, maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 12, 
          marginTop: 0,
          fontSize: isMobile ? 24 : 32 
        }}>
          <Users size={isMobile ? 28 : 36} />
          Employee Directory
        </h1>
        <p style={{ color: '#6b7280', margin: '8px 0 0' }}>
          Find and connect with your colleagues
        </p>
      </div>

      {/* Search and Filters */}
      <div className="glass-panel" style={{ 
        padding: isMobile ? 16 : 20, 
        marginBottom: 24,
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: 12,
        alignItems: isMobile ? 'stretch' : 'center'
      }}>
        {/* Search Input */}
        <div style={{ flex: 1, position: 'relative' }}>
          <Search 
            size={20} 
            style={{ 
              position: 'absolute', 
              left: 12, 
              top: '50%', 
              transform: 'translateY(-50%)',
              color: '#6b7280'
            }} 
          />
          <input
            type="text"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 40px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.05)',
              color: '#fff',
              fontSize: 14
            }}
          />
        </div>

        {/* Department Filter */}
        <select
          value={selectedDepartment}
          onChange={(e) => setSelectedDepartment(e.target.value)}
          style={{
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.05)',
            color: '#fff',
            fontSize: 14,
            minWidth: isMobile ? '100%' : 180
          }}
        >
          <option value="all">All Departments</option>
          {directory?.filters.departments.map(dept => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>

        {/* Role Filter */}
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          style={{
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.05)',
            color: '#fff',
            fontSize: 14,
            minWidth: isMobile ? '100%' : 180
          }}
        >
          <option value="all">All Positions</option>
          {directory?.filters.roles.map(role => (
            <option key={role} value={role}>{role}</option>
          ))}
        </select>
      </div>

      {/* Results Count */}
      <div style={{ marginBottom: 16, color: '#6b7280', fontSize: 14 }}>
        {loading ? (
          'Searching...'
        ) : (
          `${directory?.total || 0} employee${directory?.total !== 1 ? 's' : ''} found`
        )}
      </div>

      {/* Employee Grid */}
      {directory && directory.employees.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile 
            ? '1fr' 
            : 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16
        }}>
          {directory.employees.map(employee => (
            <EmployeeDirectoryCard key={employee.id} employee={employee} />
          ))}
        </div>
      ) : (
        <div className="glass-panel" style={{ 
          padding: 40, 
          textAlign: 'center' 
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
          <h3 style={{ marginTop: 0, marginBottom: 8 }}>No employees found</h3>
          <p style={{ color: '#6b7280', margin: 0 }}>
            Try adjusting your search or filters
          </p>
        </div>
      )}
    </div>
  )
}
