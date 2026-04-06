import { FileText, User, Tag, Building2, Hash, FolderOpen } from 'lucide-react'
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

const inp: React.CSSProperties = {
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
  fontFamily: 'inherit',
}

const fo = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.target.style.borderColor = '#3b82f6'
  e.target.style.background = '#fff'
  e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)'
}
const bl = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.target.style.borderColor = '#e2e8f0'
  e.target.style.background = '#f8fafc'
  e.target.style.boxShadow = 'none'
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
    <div style={{ marginBottom: 24 }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <FileText size={13} color="#3b82f6" />
        </div>
        <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>Basic Information</span>
      </div>

      {/* Two-column grid for top fields */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        {/* PO Number */}
        <label style={{ display: 'grid', gap: 5 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>
            <Hash size={11} color="#94a3b8" /> PO Number
          </span>
          <input
            type="text"
            value={formData.po_number || ''}
            disabled
            readOnly
            style={{ ...inp, background: '#f1f5f9', color: '#3b82f6', fontWeight: 700, cursor: 'not-allowed' }}
            placeholder="Auto-generated"
          />
        </label>

        {/* Date Created (edit mode) */}
        {mode === 'edit' && formData.created_at ? (
          <label style={{ display: 'grid', gap: 5 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>
              <Tag size={11} color="#94a3b8" /> Date Created
            </span>
            <input
              type="text"
              value={new Date(formData.created_at).toLocaleString()}
              disabled
              readOnly
              style={{ ...inp, background: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' }}
            />
          </label>
        ) : (
          /* Requested By Title */
          <label style={{ display: 'grid', gap: 5 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>
              <Tag size={11} color="#94a3b8" /> Requested By Title
            </span>
            <input
              type="text"
              value={formData.requested_by_title || ''}
              onChange={(e) => onChange('requested_by_title', e.target.value)}
              style={inp}
              placeholder="e.g. Project Manager"
              onFocus={fo}
              onBlur={bl}
            />
          </label>
        )}
      </div>

      {/* Requested By */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'grid', gap: 5 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>
            <User size={11} color="#94a3b8" /> Requested By <span style={{ color: '#ef4444' }}>*</span>
          </span>
          <input
            type="text"
            value={formData.requested_by_name || currentUser.name}
            disabled
            readOnly
            style={{ ...inp, background: '#f1f5f9', color: '#374151', fontWeight: 600, cursor: 'not-allowed' }}
          />
          <span style={{ fontSize: 11, color: '#94a3b8' }}>Your name is automatically used as the requester</span>
        </label>
      </div>

      {/* Title field for edit mode */}
      {mode === 'edit' && (
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'grid', gap: 5 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>
              <Tag size={11} color="#94a3b8" /> Requested By Title
            </span>
            <input
              type="text"
              value={formData.requested_by_title || ''}
              onChange={(e) => onChange('requested_by_title', e.target.value)}
              style={inp}
              placeholder="e.g. Project Manager"
              onFocus={fo}
              onBlur={bl}
            />
          </label>
        </div>
      )}

      {/* Vendor + Invoice Number */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <label style={{ display: 'grid', gap: 5 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>
            <Building2 size={11} color="#94a3b8" /> Vendor
          </span>
          <select
            value={formData.vendor_id || ''}
            onChange={(e) => onChange('vendor_id', e.target.value ? Number(e.target.value) : undefined)}
            style={{ ...inp, cursor: 'pointer', appearance: 'none' }}
            onFocus={fo}
            onBlur={bl}
          >
            <option value="">— Select Vendor —</option>
            {vendors.map((v) => (
              <option key={v.vendor_id} value={v.vendor_id}>{v.vendor_name}</option>
            ))}
          </select>
        </label>

        <label style={{ display: 'grid', gap: 5 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>
            <Hash size={11} color="#94a3b8" /> Vendor Invoice #
          </span>
          <input
            type="text"
            value={formData.vendor_invoice_number || ''}
            onChange={(e) => onChange('vendor_invoice_number', e.target.value)}
            style={inp}
            placeholder="Invoice number (optional)"
            onFocus={fo}
            onBlur={bl}
          />
        </label>
      </div>

      {/* Project */}
      <div style={{ marginBottom: 4 }}>
        <label style={{ display: 'grid', gap: 5 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>
            <FolderOpen size={11} color="#94a3b8" /> Project / Contract
          </span>
          <select
            value={formData.project_id || ''}
            onChange={(e) => onChange('project_id', e.target.value ? Number(e.target.value) : undefined)}
            style={{ ...inp, cursor: 'pointer', appearance: 'none' }}
            onFocus={fo}
            onBlur={bl}
          >
            <option value="">— Select Project (Optional) —</option>
            {projects.map((p) => (
              <option key={p.contract_id} value={p.contract_id}>{p.contract_name}</option>
            ))}
          </select>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>Link this PO to a project for tracking</span>
        </label>
      </div>
    </div>
  )
}
