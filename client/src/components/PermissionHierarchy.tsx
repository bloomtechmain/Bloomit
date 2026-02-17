import { useState, useMemo } from 'react'
import { Search, ChevronDown, ChevronRight, CheckSquare, Square, MinusSquare } from 'lucide-react'
import { PERMISSION_HIERARCHY, type Permission, type Feature, type PermissionModule } from '../config/permissionHierarchy'

interface PermissionHierarchyProps {
  selectedPermissions: number[]
  onPermissionsChange: (permissionIds: number[]) => void
  allPermissions: Array<{ id: number; resource: string; action: string; description: string | null }>
  loading?: boolean
}

export default function PermissionHierarchy({
  selectedPermissions,
  onPermissionsChange,
  allPermissions,
  loading = false
}: PermissionHierarchyProps) {
  const [activeModule, setActiveModule] = useState<string>(PERMISSION_HIERARCHY[0]?.key || '')
  const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')

  // Get permission IDs by resource and action
  const getPermissionId = (resource: string, action: string): number | undefined => {
    const perm = allPermissions.find(p => p.resource === resource && p.action === action)
    return perm?.id
  }

  // Check if a permission is selected
  const isPermissionSelected = (resource: string, action: string): boolean => {
    const id = getPermissionId(resource, action)
    return id !== undefined && selectedPermissions.includes(id)
  }

  // Toggle a single permission
  const togglePermission = (resource: string, action: string) => {
    const id = getPermissionId(resource, action)
    if (id === undefined) return

    if (selectedPermissions.includes(id)) {
      onPermissionsChange(selectedPermissions.filter(pid => pid !== id))
    } else {
      onPermissionsChange([...selectedPermissions, id])
    }
  }

  // Toggle all permissions in a feature
  const toggleFeature = (feature: Feature) => {
    const featurePermIds = feature.permissions
      .map(p => getPermissionId(p.resource, p.action))
      .filter((id): id is number => id !== undefined)

    const allSelected = featurePermIds.every(id => selectedPermissions.includes(id))

    if (allSelected) {
      // Deselect all
      onPermissionsChange(selectedPermissions.filter(id => !featurePermIds.includes(id)))
    } else {
      // Select all
      const newIds = [...selectedPermissions, ...featurePermIds.filter(id => !selectedPermissions.includes(id))]
      onPermissionsChange(newIds)
    }
  }

  // Toggle all permissions in a module
  const toggleModule = (module: PermissionModule) => {
    const modulePermIds: number[] = []
    module.features.forEach(feature => {
      feature.permissions.forEach(p => {
        const id = getPermissionId(p.resource, p.action)
        if (id !== undefined) modulePermIds.push(id)
      })
    })

    const allSelected = modulePermIds.every(id => selectedPermissions.includes(id))

    if (allSelected) {
      // Deselect all
      onPermissionsChange(selectedPermissions.filter(id => !modulePermIds.includes(id)))
    } else {
      // Select all
      const newIds = [...selectedPermissions, ...modulePermIds.filter(id => !selectedPermissions.includes(id))]
      onPermissionsChange(newIds)
    }
  }

  // Get feature selection state (all, some, none)
  const getFeatureSelectionState = (feature: Feature): 'all' | 'some' | 'none' => {
    const featurePermIds = feature.permissions
      .map(p => getPermissionId(p.resource, p.action))
      .filter((id): id is number => id !== undefined)

    if (featurePermIds.length === 0) return 'none'

    const selectedCount = featurePermIds.filter(id => selectedPermissions.includes(id)).length

    if (selectedCount === 0) return 'none'
    if (selectedCount === featurePermIds.length) return 'all'
    return 'some'
  }

  // Get module selection count
  const getModuleSelectionCount = (module: PermissionModule): { selected: number; total: number } => {
    let total = 0
    let selected = 0

    module.features.forEach(feature => {
      feature.permissions.forEach(p => {
        const id = getPermissionId(p.resource, p.action)
        if (id !== undefined) {
          total++
          if (selectedPermissions.includes(id)) selected++
        }
      })
    })

    return { selected, total }
  }

  // Toggle feature expansion
  const toggleFeatureExpansion = (featureKey: string) => {
    const newExpanded = new Set(expandedFeatures)
    if (newExpanded.has(featureKey)) {
      newExpanded.delete(featureKey)
    } else {
      newExpanded.add(featureKey)
    }
    setExpandedFeatures(newExpanded)
  }

  // Filter modules and features based on search
  const filteredHierarchy = useMemo(() => {
    if (!searchQuery.trim()) return PERMISSION_HIERARCHY

    const query = searchQuery.toLowerCase()
    return PERMISSION_HIERARCHY.map(module => ({
      ...module,
      features: module.features.filter(feature =>
        feature.name.toLowerCase().includes(query) ||
        feature.permissions.some(p =>
          p.label.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query)
        )
      )
    })).filter(module => module.features.length > 0)
  }, [searchQuery])

  const activeModuleData = filteredHierarchy.find(m => m.key === activeModule)

  if (loading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: '#666' }}>
        Loading permissions...
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* Search Bar */}
      <div style={{ position: 'relative' }}>
        <Search
          size={20}
          style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#999'
          }}
        />
        <input
          type="text"
          placeholder="Search permissions..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 12px 12px 44px',
            borderRadius: 8,
            border: '1px solid #e0e0e0',
            fontSize: 14,
            outline: 'none',
            transition: 'border-color 0.2s'
          }}
          onFocus={(e) => e.target.style.borderColor = '#2196F3'}
          onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
        />
      </div>

      {/* Module Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: 8, 
        overflowX: 'auto', 
        paddingBottom: 8,
        borderBottom: '2px solid #e0e0e0'
      }}>
        {filteredHierarchy.map(module => {
          const { selected, total } = getModuleSelectionCount(module)
          return (
            <button
              key={module.key}
              onClick={() => setActiveModule(module.key)}
              style={{
                padding: '12px 20px',
                borderRadius: '8px 8px 0 0',
                border: 'none',
                background: activeModule === module.key ? module.color : 'transparent',
                color: activeModule === module.key ? '#fff' : '#666',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 14,
                transition: 'all 0.2s',
                opacity: activeModule === module.key ? 1 : 0.7
              }}
              onMouseEnter={(e) => {
                if (activeModule !== module.key) {
                  e.currentTarget.style.opacity = '1'
                  e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)'
                }
              }}
              onMouseLeave={(e) => {
                if (activeModule !== module.key) {
                  e.currentTarget.style.opacity = '0.7'
                  e.currentTarget.style.background = 'transparent'
                }
              }}
            >
              <span style={{ fontSize: 18 }}>{module.icon}</span>
              <span>{module.name}</span>
              {selected > 0 && (
                <span style={{
                  padding: '2px 8px',
                  borderRadius: 12,
                  background: activeModule === module.key ? 'rgba(255,255,255,0.3)' : module.color,
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 700
                }}>
                  {selected}/{total}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Module Content */}
      {activeModuleData && (
        <div>
          {/* Module Header with Select All */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
            padding: '16px 20px',
            background: `${activeModuleData.color}15`,
            borderRadius: 12,
            border: `2px solid ${activeModuleData.color}40`
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 20, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 24 }}>{activeModuleData.icon}</span>
                {activeModuleData.name}
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#ddd' }}>
                {(() => {
                  const { selected, total } = getModuleSelectionCount(activeModuleData)
                  return `${selected} of ${total} permissions granted`
                })()}
              </p>
            </div>
            <button
              onClick={() => toggleModule(activeModuleData)}
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                border: `2px solid ${activeModuleData.color}`,
                background: '#fff',
                color: activeModuleData.color,
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: 14,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = activeModuleData.color
                e.currentTarget.style.color = '#fff'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#fff'
                e.currentTarget.style.color = activeModuleData.color
              }}
            >
              {(() => {
                const { selected, total } = getModuleSelectionCount(activeModuleData)
                return selected === total ? 'Deselect All' : 'Select All'
              })()}
            </button>
          </div>

          {/* Features */}
          <div style={{ display: 'grid', gap: 16 }}>
            {activeModuleData.features.map(feature => {
              const selectionState = getFeatureSelectionState(feature)
              const isExpanded = expandedFeatures.has(feature.key)

              return (
                <div
                  key={feature.key}
                  style={{
                    background: '#fff',
                    borderRadius: 12,
                    border: '1px solid #e0e0e0',
                    overflow: 'hidden',
                    transition: 'all 0.2s'
                  }}
                >
                  {/* Feature Header */}
                  <div
                    style={{
                      padding: '16px 20px',
                      background: selectionState === 'all' ? `${activeModuleData.color}10` : '#f8f9fa',
                      borderBottom: isExpanded ? '1px solid #e0e0e0' : 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'background 0.2s'
                    }}
                    onClick={() => toggleFeatureExpansion(feature.key)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = selectionState === 'all' 
                        ? `${activeModuleData.color}15` 
                        : '#f0f0f0'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = selectionState === 'all' 
                        ? `${activeModuleData.color}10` 
                        : '#f8f9fa'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                      <span style={{ fontSize: 20 }}>{feature.icon}</span>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: 0, fontSize: 16, color: '#2c3e50', fontWeight: 600 }}>
                          {feature.name}
                        </h4>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#666' }}>
                          {feature.permissions.filter(p => isPermissionSelected(p.resource, p.action)).length} of {feature.permissions.length} granted
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleFeature(feature)
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 6,
                          border: '1px solid #e0e0e0',
                          background: '#fff',
                          color: '#666',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = activeModuleData.color
                          e.currentTarget.style.color = activeModuleData.color
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#e0e0e0'
                          e.currentTarget.style.color = '#666'
                        }}
                      >
                        {selectionState === 'all' ? (
                          <><CheckSquare size={14} /> Deselect</>
                        ) : selectionState === 'some' ? (
                          <><MinusSquare size={14} /> Select All</>
                        ) : (
                          <><Square size={14} /> Select All</>
                        )}
                      </button>
                      {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </div>
                  </div>

                  {/* Feature Permissions */}
                  {isExpanded && (
                    <div style={{ padding: 20 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                        {feature.permissions.map(permission => {
                          const isSelected = isPermissionSelected(permission.resource, permission.action)
                          const permId = getPermissionId(permission.resource, permission.action)

                          return (
                            <label
                              key={`${permission.resource}:${permission.action}`}
                              title={permission.description || permission.label}
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 10,
                                padding: '12px 14px',
                                borderRadius: 8,
                                background: isSelected ? `${activeModuleData.color}10` : '#f8f9fa',
                                border: `2px solid ${isSelected ? activeModuleData.color : '#e0e0e0'}`,
                                cursor: permId !== undefined ? 'pointer' : 'not-allowed',
                                transition: 'all 0.2s',
                                opacity: permId !== undefined ? 1 : 0.5
                              }}
                              onMouseEnter={(e) => {
                                if (permId !== undefined) {
                                  e.currentTarget.style.transform = 'translateY(-2px)'
                                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)'
                                e.currentTarget.style.boxShadow = 'none'
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => togglePermission(permission.resource, permission.action)}
                                disabled={permId === undefined}
                                style={{
                                  width: 18,
                                  height: 18,
                                  cursor: permId !== undefined ? 'pointer' : 'not-allowed',
                                  accentColor: activeModuleData.color,
                                  marginTop: 2
                                }}
                              />
                              <div style={{ flex: 1 }}>
                                <div style={{
                                  fontWeight: 600,
                                  color: isSelected ? '#1a237e' : '#424242',
                                  fontSize: 13,
                                  marginBottom: 4
                                }}>
                                  {permission.label}
                                </div>
                                {permission.description && (
                                  <div style={{
                                    fontSize: 11,
                                    color: '#666',
                                    lineHeight: 1.4
                                  }}>
                                    {permission.description}
                                  </div>
                                )}
                                {permId === undefined && (
                                  <div style={{
                                    fontSize: 10,
                                    color: '#ff9800',
                                    marginTop: 4,
                                    fontStyle: 'italic'
                                  }}>
                                    ⚠️ Not in database (run migration)
                                  </div>
                                )}
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* No Results */}
      {filteredHierarchy.length === 0 && (
        <div style={{ padding: '48px', textAlign: 'center', color: '#666' }}>
          <Search size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
          <p style={{ margin: 0, fontSize: 16 }}>No permissions found matching "{searchQuery}"</p>
        </div>
      )}
    </div>
  )
}
