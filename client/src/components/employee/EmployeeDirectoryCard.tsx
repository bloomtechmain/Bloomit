import { Mail, Phone } from 'lucide-react'

export interface DirectoryEmployee {
  id: number
  employeeNumber: string
  firstName: string
  lastName: string
  fullName: string
  email: string
  phone: string | null
  phoneVisible: boolean
  position: string
  department: string
  role: string
}

interface EmployeeDirectoryCardProps {
  employee: DirectoryEmployee
}

export default function EmployeeDirectoryCard({ employee }: EmployeeDirectoryCardProps) {
  // Generate color based on department
  const getDepartmentColor = (dept: string): string => {
    const colors: Record<string, string> = {
      'Engineering': '#3b82f6',
      'Sales': '#10b981',
      'HR': '#f59e0b',
      'Design': '#8b5cf6',
      'Marketing': '#ec4899',
      'Finance': '#14b8a6',
      'Operations': '#06b6d4',
      'Support': '#84cc16'
    }
    return colors[dept] || '#6b7280'
  }

  // Generate initials for avatar
  const getInitials = (firstName: string, lastName: string): string => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

  const departmentColor = getDepartmentColor(employee.department)

  return (
    <div className="glass-panel" style={{ padding: 20, borderRadius: 12, transition: 'all 0.2s' }}>
      {/* Avatar with initials */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div 
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            backgroundColor: departmentColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 28,
            fontWeight: 600,
            border: '3px solid rgba(255,255,255,0.2)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}
        >
          {getInitials(employee.firstName, employee.lastName)}
        </div>

        {/* Employee Name */}
        <div style={{ textAlign: 'center', width: '100%' }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 600, color: '#fff' }}>
            {employee.fullName}
          </h3>
          <p style={{ margin: 0, fontSize: 13, color: '#9ca3af' }}>
            {employee.employeeNumber}
          </p>
        </div>

        {/* Position & Department */}
        <div style={{ textAlign: 'center', width: '100%' }}>
          <p style={{ 
            margin: '0 0 4px', 
            fontSize: 14, 
            fontWeight: 500,
            color: departmentColor 
          }}>
            {employee.position}
          </p>
          <div style={{
            display: 'inline-block',
            padding: '4px 12px',
            borderRadius: 12,
            backgroundColor: departmentColor + '20',
            fontSize: 12,
            fontWeight: 600,
            color: departmentColor
          }}>
            {employee.department}
          </div>
        </div>

        {/* Contact Information */}
        <div style={{ 
          width: '100%', 
          borderTop: '1px solid rgba(255,255,255,0.1)', 
          paddingTop: 12,
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          gap: 8
        }}>
          {/* Email */}
          <a 
            href={`mailto:${employee.email}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: '#3b82f6',
              textDecoration: 'none',
              fontSize: 13,
              padding: '6px 8px',
              borderRadius: 6,
              transition: 'background 0.2s',
              wordBreak: 'break-all'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <Mail size={16} />
            <span>{employee.email}</span>
          </a>

          {/* Phone - only if visible */}
          {employee.phoneVisible && employee.phone ? (
            <a 
              href={`tel:${employee.phone}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: '#10b981',
                textDecoration: 'none',
                fontSize: 13,
                padding: '6px 8px',
                borderRadius: 6,
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <Phone size={16} />
              <span>{employee.phone}</span>
            </a>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: '#6b7280',
              fontSize: 12,
              fontStyle: 'italic',
              padding: '6px 8px'
            }}>
              <Phone size={14} />
              <span>Phone number hidden</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
