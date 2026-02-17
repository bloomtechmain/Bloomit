import { Building2, FolderKanban, Calendar, Clock } from 'lucide-react'

type Vendor = {
  vendor_id?: number
  vendor_name?: string
  contact_person?: string
  email?: string
  phone?: string
}

type Project = {
  contract_id?: number
  contract_name?: string
  project_code?: string
}

interface POVendorProjectDisplayProps {
  vendor?: Vendor | null
  vendorName?: string
  project?: Project | null
  projectName?: string
  vendorInvoiceNumber?: string
  createdAt: string
  updatedAt: string
}

export const POVendorProjectDisplay: React.FC<POVendorProjectDisplayProps> = ({
  vendor,
  vendorName,
  project,
  projectName,
  vendorInvoiceNumber,
  createdAt,
  updatedAt
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const displayVendorName = vendor?.vendor_name || vendorName || 'N/A'
  const displayProjectName = project?.contract_name || projectName || 'N/A'

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <h3
        style={{
          fontSize: '1rem',
          fontWeight: '600',
          color: '#374151',
          marginBottom: '1rem',
          paddingBottom: '0.5rem',
          borderBottom: '2px solid #e5e7eb'
        }}
      >
        Vendor & Project Information
      </h3>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem'
        }}
      >
        {/* Vendor Section */}
        <div
          style={{
            padding: '1.25rem',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
            <div
              style={{
                padding: '0.5rem',
                backgroundColor: '#dbeafe',
                borderRadius: '6px',
                marginRight: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Building2 size={20} color="#3b82f6" />
            </div>
            <h4
              style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                margin: 0
              }}
            >
              Vendor
            </h4>
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <p
              style={{
                fontSize: '0.75rem',
                fontWeight: '500',
                color: '#6b7280',
                margin: 0,
                marginBottom: '0.25rem'
              }}
            >
              Name
            </p>
            <p
              style={{
                fontSize: '1rem',
                fontWeight: '600',
                color: '#1f2937',
                margin: 0
              }}
            >
              {displayVendorName}
            </p>
          </div>

          {vendorInvoiceNumber && (
            <div style={{ marginBottom: '0.75rem' }}>
              <p
                style={{
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  color: '#6b7280',
                  margin: 0,
                  marginBottom: '0.25rem'
                }}
              >
                Invoice Number
              </p>
              <p
                style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#3b82f6',
                  margin: 0
                }}
              >
                {vendorInvoiceNumber}
              </p>
            </div>
          )}

          {vendor?.contact_person && (
            <div style={{ marginBottom: '0.75rem' }}>
              <p
                style={{
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  color: '#6b7280',
                  margin: 0,
                  marginBottom: '0.25rem'
                }}
              >
                Contact Person
              </p>
              <p
                style={{
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  margin: 0
                }}
              >
                {vendor.contact_person}
              </p>
            </div>
          )}

          {vendor?.email && (
            <div style={{ marginBottom: '0.75rem' }}>
              <p
                style={{
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  color: '#6b7280',
                  margin: 0,
                  marginBottom: '0.25rem'
                }}
              >
                Email
              </p>
              <p
                style={{
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#3b82f6',
                  margin: 0
                }}
              >
                {vendor.email}
              </p>
            </div>
          )}

          {vendor?.phone && (
            <div>
              <p
                style={{
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  color: '#6b7280',
                  margin: 0,
                  marginBottom: '0.25rem'
                }}
              >
                Phone
              </p>
              <p
                style={{
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  margin: 0
                }}
              >
                {vendor.phone}
              </p>
            </div>
          )}
        </div>

        {/* Project Section */}
        <div
          style={{
            padding: '1.25rem',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
            <div
              style={{
                padding: '0.5rem',
                backgroundColor: '#dcfce7',
                borderRadius: '6px',
                marginRight: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <FolderKanban size={20} color="#16a34a" />
            </div>
            <h4
              style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                margin: 0
              }}
            >
              Project / Contract
            </h4>
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <p
              style={{
                fontSize: '0.75rem',
                fontWeight: '500',
                color: '#6b7280',
                margin: 0,
                marginBottom: '0.25rem'
              }}
            >
              Name
            </p>
            <p
              style={{
                fontSize: '1rem',
                fontWeight: '600',
                color: '#1f2937',
                margin: 0
              }}
            >
              {displayProjectName}
            </p>
          </div>

          {project?.project_code && (
            <div>
              <p
                style={{
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  color: '#6b7280',
                  margin: 0,
                  marginBottom: '0.25rem'
                }}
              >
                Project Code
              </p>
              <p
                style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#16a34a',
                  margin: 0
                }}
              >
                {project.project_code}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Timestamps Section */}
      <div
        style={{
          marginTop: '1.5rem',
          padding: '1rem',
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1rem'
          }}
        >
          {/* Created Timestamp */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div
              style={{
                padding: '0.5rem',
                backgroundColor: '#f3f4f6',
                borderRadius: '6px',
                marginRight: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Calendar size={18} color="#6b7280" />
            </div>
            <div>
              <p
                style={{
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  color: '#6b7280',
                  margin: 0,
                  marginBottom: '0.25rem'
                }}
              >
                Created On
              </p>
              <p
                style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#374151',
                  margin: 0
                }}
              >
                {formatDate(createdAt)}
              </p>
            </div>
          </div>

          {/* Last Updated Timestamp */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div
              style={{
                padding: '0.5rem',
                backgroundColor: '#f3f4f6',
                borderRadius: '6px',
                marginRight: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Clock size={18} color="#6b7280" />
            </div>
            <div>
              <p
                style={{
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  color: '#6b7280',
                  margin: 0,
                  marginBottom: '0.25rem'
                }}
              >
                Last Updated
              </p>
              <p
                style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#374151',
                  margin: 0
                }}
              >
                {formatDate(updatedAt)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
