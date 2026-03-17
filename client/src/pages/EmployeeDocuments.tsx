import { useState, useEffect } from 'react'
import { Download, Search, Filter, FolderOpen } from 'lucide-react'
import { getEmployeeDocuments, downloadEmployeeDocument } from '../services/employeePortalService'
import type { Document } from '../services/employeePortalService'
import { useToast } from '../context/ToastContext'

interface EmployeeDocumentsProps {
  employeeId: number
  accessToken: string
}

export default function EmployeeDocuments({ employeeId, accessToken }: EmployeeDocumentsProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [downloadingId, setDownloadingId] = useState<number | null>(null)

  useEffect(() => {
    fetchDocuments()
  }, [employeeId, accessToken, categoryFilter, searchQuery])

  const fetchDocuments = async () => {
    setLoading(true)
    setError(null)
    try {
      const filters = {
        category: categoryFilter,
        search: searchQuery || undefined
      }
      const data = await getEmployeeDocuments(employeeId, accessToken, filters)
      setDocuments(data.documents)
    } catch (err) {
      console.error('Error fetching documents:', err)
      setError(err instanceof Error ? err.message : 'Failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (doc: Document) => {
    setDownloadingId(doc.document_id)
    try {
      const blob = await downloadEmployeeDocument(employeeId, doc.document_id, accessToken)
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = doc.document_name
      document.body.appendChild(link)
      link.click()
      
      // Cleanup
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error downloading document:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to download document')
    } finally {
      setDownloadingId(null)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const getDocumentIcon = (type: string) => {
    const iconMap: Record<string, string> = {
      policy: '📋',
      handbook: '📖',
      form: '📝',
      template: '📄',
      certificate: '🏆',
      contract: '📑',
      default: '📄'
    }
    return iconMap[type] || iconMap.default
  }

  const getCategoryBadgeColor = (type: string): string => {
    const colorMap: Record<string, string> = {
      policy: '#3b82f6',
      handbook: '#10b981',
      form: '#f59e0b',
      template: '#8b5cf6',
      certificate: '#ec4899',
      contract: '#14b8a6',
      default: '#6b7280'
    }
    return colorMap[type] || colorMap.default
  }

  const clearFilters = () => {
    setCategoryFilter('all')
    setSearchQuery('')
  }

  if (loading && documents.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <div>Loading documents...</div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ marginTop: 0, marginBottom: 8, fontSize: 28 }}>
          📚 Document Bank
        </h1>
        <p style={{ margin: 0, color: '#6b7280' }}>
          Access company policies, handbooks, forms, and other documents
        </p>
      </div>

      {/* Search and Filters */}
      <div className="glass-panel" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16, marginBottom: 16 }}>
          {/* Search */}
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: 14, marginBottom: 6, color: '#6b7280' }}>
              <Search size={16} style={{ display: 'inline', marginRight: 6 }} />
              Search Documents
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or description..."
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.1)',
                color: 'inherit',
                fontSize: 14
              }}
            />
          </div>

          {/* Category Filter */}
          <div>
            <label style={{ display: 'block', fontSize: 14, marginBottom: 6, color: '#6b7280' }}>
              <Filter size={16} style={{ display: 'inline', marginRight: 6 }} />
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.1)',
                color: 'inherit',
                fontSize: 14
              }}
            >
              <option value="all">All Categories</option>
              <option value="policy">Policies</option>
              <option value="handbook">Handbooks</option>
              <option value="form">Forms</option>
              <option value="template">Templates</option>
              <option value="certificate">Certificates</option>
              <option value="contract">Contracts</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              onClick={clearFilters}
              className="btn-secondary"
              style={{ width: '100%', padding: '10px 12px', fontSize: 14 }}
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="glass-panel" style={{ padding: 24, marginBottom: 24, border: '1px solid var(--danger)' }}>
          <p style={{ margin: 0, color: 'var(--danger)' }}>
            <strong>Error:</strong> {error}
          </p>
        </div>
      )}

      {/* Results Summary */}
      <div style={{ marginBottom: 16, color: '#6b7280', fontSize: 14 }}>
        Showing {documents.length} document{documents.length !== 1 ? 's' : ''}
        {categoryFilter !== 'all' && ` (${categoryFilter})`}
        {searchQuery && ` matching "${searchQuery}"`}
      </div>

      {/* Documents Grid */}
      {documents.length === 0 ? (
        <div className="glass-panel" style={{ padding: 60, textAlign: 'center' }}>
          <FolderOpen size={64} style={{ color: '#6b7280', margin: '0 auto 16px' }} />
          <h3 style={{ margin: '0 0 8px', color: '#6b7280' }}>No Documents Found</h3>
          <p style={{ margin: 0, color: '#9ca3af', fontSize: 14 }}>
            {categoryFilter !== 'all' || searchQuery
              ? 'Try adjusting your filters or search terms'
              : 'No documents are currently available'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {documents.map((doc) => (
            <div
              key={doc.document_id}
              className="glass-panel"
              style={{
                padding: 20,
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 180
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = ''
              }}
            >
              {/* Document Icon and Category */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                <div style={{ fontSize: 40 }}>
                  {getDocumentIcon(doc.document_type)}
                </div>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: 12,
                  background: getCategoryBadgeColor(doc.document_type) + '20',
                  color: getCategoryBadgeColor(doc.document_type),
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: 'uppercase'
                }}>
                  {doc.document_type}
                </span>
              </div>

              {/* Document Name */}
              <h3 style={{ 
                margin: '0 0 8px', 
                fontSize: 16, 
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                lineHeight: 1.4
              }}>
                {doc.document_name}
              </h3>

              {/* Description */}
              {doc.description && (
                <p style={{ 
                  margin: '0 0 12px', 
                  fontSize: 13, 
                  color: '#9ca3af',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  lineHeight: 1.5,
                  flex: 1
                }}>
                  {doc.description}
                </p>
              )}

              {/* Metadata */}
              <div style={{ 
                marginTop: 'auto',
                paddingTop: 12,
                borderTop: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                fontSize: 12,
                color: '#6b7280'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>📅 {formatDate(doc.uploaded_at)}</span>
                  <span>💾 {formatFileSize(doc.file_size)}</span>
                </div>
                {doc.uploaded_by_name && (
                  <div>👤 Uploaded by: {doc.uploaded_by_name}</div>
                )}
              </div>

              {/* Download Button */}
              <button
                onClick={() => handleDownload(doc)}
                className="btn-primary"
                style={{
                  width: '100%',
                  marginTop: 12,
                  padding: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  fontSize: 14
                }}
                disabled={downloadingId === doc.document_id}
              >
                <Download size={16} />
                {downloadingId === doc.document_id ? 'Downloading...' : 'Download'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
