import type { PurchaseOrder } from '../../../types/purchaseOrders'

type User = {
  id: number
  name: string
  email: string
  roleId: number | null
  roleName: string | null
  roleNames?: string[]
  permissions: string[]
}

type Vendor = {
  vendor_id: number
  vendor_name: string
}

type Project = {
  contract_id: number
  contract_name: string
}

interface POBasicInfoSectionProps {
  formData: Partial<PurchaseOrder> & {
    po_number?: string
    requested_by_name?: string
    requested_by_title?: string
    vendor_id?: number
    vendor_invoice_number?: string
    project_id?: number
  }
  currentUser: User
  vendors: Vendor[]
  projects: Project[]
  onChange: (field: string, value: any) => void
  mode: 'create' | 'edit'
}

export const POBasicInfoSection: React.FC<POBasicInfoSectionProps> = ({
  formData,
  currentUser,
  vendors,
  projects,
  onChange,
  mode
}) => {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <h3 style={{ 
        fontSize: '1rem', 
        fontWeight: '600', 
        color: '#374151', 
        marginBottom: '1rem',
        paddingBottom: '0.5rem',
        borderBottom: '2px solid #e5e7eb'
      }}>
        Basic Information
      </h3>

      {/* PO Number Display (Read-only) */}
      <div style={{ marginBottom: '1.25rem' }}>
        <label
          style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '0.5rem'
          }}
        >
          PO Number
        </label>
        <input
          type="text"
          value={formData.po_number || ''}
          disabled
          readOnly
          style={{
            width: '100%',
            padding: '0.625rem',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '0.875rem',
            backgroundColor: '#f9fafb',
            color: '#3b82f6',
            fontWeight: '600',
            cursor: 'not-allowed'
          }}
          placeholder="Auto-generated"
        />
      </div>

      {/* Date Created (for edit mode) */}
      {mode === 'edit' && formData.created_at && (
        <div style={{ marginBottom: '1.25rem' }}>
          <label
            style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}
          >
            Date Created
          </label>
          <input
            type="text"
            value={new Date(formData.created_at).toLocaleString()}
            disabled
            readOnly
            style={{
              width: '100%',
              padding: '0.625rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.875rem',
              backgroundColor: '#f9fafb',
              color: '#6b7280',
              cursor: 'not-allowed'
            }}
          />
        </div>
      )}

      {/* Requested By Name (Read-only, auto-filled from current user) */}
      <div style={{ marginBottom: '1.25rem' }}>
        <label
          style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '0.5rem'
          }}
        >
          Requested By <span style={{ color: '#ef4444' }}>*</span>
        </label>
        <input
          type="text"
          value={formData.requested_by_name || currentUser.name}
          disabled
          readOnly
          style={{
            width: '100%',
            padding: '0.625rem',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '0.875rem',
            backgroundColor: '#f9fafb',
            color: '#374151',
            fontWeight: '500',
            cursor: 'not-allowed'
          }}
        />
        <p style={{ 
          fontSize: '0.75rem', 
          color: '#6b7280', 
          marginTop: '0.25rem',
          marginBottom: 0 
        }}>
          Your name is automatically used as the requester
        </p>
      </div>

      {/* Requested By Title (Optional) */}
      <div style={{ marginBottom: '1.25rem' }}>
        <label
          htmlFor="requested_by_title"
          style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '0.5rem'
          }}
        >
          Requested By Title
        </label>
        <input
          type="text"
          id="requested_by_title"
          value={formData.requested_by_title || ''}
          onChange={(e) => onChange('requested_by_title', e.target.value)}
          style={{
            width: '100%',
            padding: '0.625rem',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '0.875rem',
            backgroundColor: '#ffffff'
          }}
          placeholder="e.g., Project Manager, Accounting Lead"
        />
      </div>

      {/* Vendor Dropdown */}
      <div style={{ marginBottom: '1.25rem' }}>
        <label
          htmlFor="vendor_id"
          style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '0.5rem'
          }}
        >
          Vendor
        </label>
        <select
          id="vendor_id"
          value={formData.vendor_id || ''}
          onChange={(e) => onChange('vendor_id', e.target.value ? Number(e.target.value) : undefined)}
          style={{
            width: '100%',
            padding: '0.625rem',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '0.875rem',
            backgroundColor: '#ffffff',
            cursor: 'pointer'
          }}
        >
          <option value="">-- Select Vendor (Optional) --</option>
          {vendors.map((vendor) => (
            <option key={vendor.vendor_id} value={vendor.vendor_id}>
              {vendor.vendor_name}
            </option>
          ))}
        </select>
        <p style={{ 
          fontSize: '0.75rem', 
          color: '#6b7280', 
          marginTop: '0.25rem',
          marginBottom: 0 
        }}>
          Select the vendor for this purchase order
        </p>
      </div>

      {/* Vendor Invoice Number */}
      <div style={{ marginBottom: '1.25rem' }}>
        <label
          htmlFor="vendor_invoice_number"
          style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '0.5rem'
          }}
        >
          Vendor Invoice Number
        </label>
        <input
          type="text"
          id="vendor_invoice_number"
          value={formData.vendor_invoice_number || ''}
          onChange={(e) => onChange('vendor_invoice_number', e.target.value)}
          style={{
            width: '100%',
            padding: '0.625rem',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '0.875rem',
            backgroundColor: '#ffffff'
          }}
          placeholder="Enter vendor's invoice number (optional)"
        />
      </div>

      {/* Project Dropdown */}
      <div style={{ marginBottom: '1.25rem' }}>
        <label
          htmlFor="project_id"
          style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '0.5rem'
          }}
        >
          Project / Contract
        </label>
        <select
          id="project_id"
          value={formData.project_id || ''}
          onChange={(e) => onChange('project_id', e.target.value ? Number(e.target.value) : undefined)}
          style={{
            width: '100%',
            padding: '0.625rem',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '0.875rem',
            backgroundColor: '#ffffff',
            cursor: 'pointer'
          }}
        >
          <option value="">-- Select Project (Optional) --</option>
          {projects.map((project) => (
            <option key={project.contract_id} value={project.contract_id}>
              {project.contract_name}
            </option>
          ))}
        </select>
        <p style={{ 
          fontSize: '0.75rem', 
          color: '#6b7280', 
          marginTop: '0.25rem',
          marginBottom: 0 
        }}>
          Link this purchase order to a project for tracking
        </p>
      </div>
    </div>
  )
}
