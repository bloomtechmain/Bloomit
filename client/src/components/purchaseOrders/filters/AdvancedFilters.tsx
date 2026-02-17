import { useState } from 'react'
import { Filter, X, Save, Calendar, DollarSign } from 'lucide-react'

type FilterPreset = {
  name: string
  status: string[]
  vendors: string[]
  dateFrom: string
  dateTo: string
  amountMin: string
  amountMax: string
}

type AdvancedFiltersProps = {
  onApply: (filters: any) => void
  vendors: Array<{ vendor_id: number; vendor_name: string }>
  projects: Array<{ contract_id: number; contract_name: string }>
}

export function AdvancedFilters({ onApply, vendors, projects }: AdvancedFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [selectedVendors, setSelectedVendors] = useState<string[]>([])
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [amountMin, setAmountMin] = useState('')
  const [amountMax, setAmountMax] = useState('')
  const [presetName, setPresetName] = useState('')
  const [savedPresets, setSavedPresets] = useState<FilterPreset[]>(() => {
    const saved = localStorage.getItem('poFilterPresets')
    return saved ? JSON.parse(saved) : []
  })

  const statuses = ['PENDING', 'APPROVED', 'REJECTED', 'PAID']

  const toggleStatus = (status: string) => {
    setSelectedStatuses(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    )
  }

  const toggleVendor = (vendorId: string) => {
    setSelectedVendors(prev =>
      prev.includes(vendorId) ? prev.filter(v => v !== vendorId) : [...prev, vendorId]
    )
  }

  const toggleProject = (projectId: string) => {
    setSelectedProjects(prev =>
      prev.includes(projectId) ? prev.filter(p => p !== projectId) : [...prev, projectId]
    )
  }

  const handleApply = () => {
    onApply({
      statuses: selectedStatuses,
      vendors: selectedVendors,
      projects: selectedProjects,
      dateFrom,
      dateTo,
      amountMin: amountMin ? Number(amountMin) : undefined,
      amountMax: amountMax ? Number(amountMax) : undefined
    })
  }

  const handleClear = () => {
    setSelectedStatuses([])
    setSelectedVendors([])
    setSelectedProjects([])
    setDateFrom('')
    setDateTo('')
    setAmountMin('')
    setAmountMax('')
    onApply({})
  }

  const handleSavePreset = () => {
    if (!presetName.trim()) {
      alert('Please enter a preset name')
      return
    }

    const newPreset: FilterPreset = {
      name: presetName,
      status: selectedStatuses,
      vendors: selectedVendors,
      dateFrom,
      dateTo,
      amountMin,
      amountMax
    }

    const updatedPresets = [...savedPresets, newPreset]
    setSavedPresets(updatedPresets)
    localStorage.setItem('poFilterPresets', JSON.stringify(updatedPresets))
    setPresetName('')
    alert('Filter preset saved!')
  }

  const handleLoadPreset = (preset: FilterPreset) => {
    setSelectedStatuses(preset.status)
    setSelectedVendors(preset.vendors)
    setDateFrom(preset.dateFrom)
    setDateTo(preset.dateTo)
    setAmountMin(preset.amountMin)
    setAmountMax(preset.amountMax)
  }

  const handleDeletePreset = (index: number) => {
    const updatedPresets = savedPresets.filter((_, i) => i !== index)
    setSavedPresets(updatedPresets)
    localStorage.setItem('poFilterPresets', JSON.stringify(updatedPresets))
  }

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      padding: '1rem',
      marginBottom: '1.5rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isExpanded ? '1rem' : '0' }}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            background: 'transparent',
            border: 'none',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#3b82f6',
            cursor: 'pointer'
          }}
        >
          <Filter size={16} />
          {isExpanded ? 'Hide Advanced Filters' : 'Show Advanced Filters'}
        </button>

        {!isExpanded && (selectedStatuses.length > 0 || selectedVendors.length > 0 || dateFrom || dateTo || amountMin || amountMax) && (
          <button
            onClick={handleClear}
            style={{
              padding: '0.375rem 0.75rem',
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
            {/* Status Filter */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>
                Status
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {statuses.map(status => (
                  <label key={status} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={selectedStatuses.includes(status)}
                      onChange={() => toggleStatus(status)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '0.875rem' }}>{status}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Vendor Filter */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>
                Vendors
              </label>
              <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {vendors.map(vendor => (
                  <label key={vendor.vendor_id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={selectedVendors.includes(vendor.vendor_id.toString())}
                      onChange={() => toggleVendor(vendor.vendor_id.toString())}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '0.875rem' }}>{vendor.vendor_name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Project Filter */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>
                Projects
              </label>
              <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {projects.map(project => (
                  <label key={project.contract_id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={selectedProjects.includes(project.contract_id.toString())}
                      onChange={() => toggleProject(project.contract_id.toString())}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '0.875rem' }}>{project.contract_name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>
                <Calendar size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                Date Range
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  placeholder="From"
                  style={{
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.875rem'
                  }}
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  placeholder="To"
                  style={{
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.875rem'
                  }}
                />
              </div>
            </div>

            {/* Amount Range */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>
                <DollarSign size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                Amount Range (LKR)
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <input
                  type="number"
                  value={amountMin}
                  onChange={e => setAmountMin(e.target.value)}
                  placeholder="Min"
                  style={{
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.875rem'
                  }}
                />
                <input
                  type="number"
                  value={amountMax}
                  onChange={e => setAmountMax(e.target.value)}
                  placeholder="Max"
                  style={{
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.875rem'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Filter Actions */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
            <button
              onClick={handleApply}
              style={{
                padding: '0.5rem 1.5rem',
                background: '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Apply Filters
            </button>
            <button
              onClick={handleClear}
              style={{
                padding: '0.5rem 1.5rem',
                background: '#6b7280',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Clear All
            </button>
          </div>

          {/* Save Preset */}
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="text"
                value={presetName}
                onChange={e => setPresetName(e.target.value)}
                placeholder="Preset name..."
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem'
                }}
              />
              <button
                onClick={handleSavePreset}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.5rem 1rem',
                  background: '#10b981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <Save size={14} />
                Save Preset
              </button>
            </div>

            {/* Saved Presets */}
            {savedPresets.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.5rem' }}>
                  SAVED PRESETS
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {savedPresets.map((preset, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.375rem 0.75rem',
                        background: '#f3f4f6',
                        borderRadius: '6px',
                        fontSize: '0.75rem'
                      }}
                    >
                      <button
                        onClick={() => handleLoadPreset(preset)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#3b82f6',
                          fontWeight: 600,
                          cursor: 'pointer',
                          padding: 0
                        }}
                      >
                        {preset.name}
                      </button>
                      <button
                        onClick={() => handleDeletePreset(idx)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
