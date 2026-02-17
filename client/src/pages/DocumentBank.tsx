import { useState, useEffect, useCallback } from 'react'
import { API_URL } from '../config/api'
import { Upload, FileText, Download, Trash2, File, Search } from 'lucide-react'

type Document = {
  id: number
  document_name: string
  original_filename: string
  file_type: string
  file_size: number
  uploaded_by: number
  upload_date: string
  description: string | null
  uploaded_by_name: string
}

type User = {
  roleNames: string[]
}

export default function DocumentBank({ user, accessToken }: { user: User; accessToken: string }) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(false)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [documentName, setDocumentName] = useState('')
  const [description, setDescription] = useState('')
  const [uploading, setUploading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletingDocument, setDeletingDocument] = useState<Document | null>(null)

  const isAdmin = user.roleNames.includes('Admin') || user.roleNames.includes('Super Admin')

  const fetchDocuments = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/documents`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setDocuments(data.documents || [])
      } else {
        console.error('Failed to fetch documents')
      }
    } catch (error) {
      console.error('Error fetching documents:', error)
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
      if (!documentName) {
        // Auto-populate document name from filename (without extension)
        const name = e.target.files[0].name.replace(/\.[^/.]+$/, '')
        setDocumentName(name)
      }
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !documentName) {
      alert('Please select a file and provide a document name')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('document_name', documentName)
      if (description) {
        formData.append('description', description)
      }

      const response = await fetch(`${API_URL}/documents/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        body: formData
      })

      if (response.ok) {
        alert('Document uploaded successfully!')
        setUploadModalOpen(false)
        resetUploadForm()
        fetchDocuments()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to upload document')
      }
    } catch (error) {
      console.error('Error uploading document:', error)
      alert('Error uploading document')
    } finally {
      setUploading(false)
    }
  }

  const handleDownload = async (doc: Document) => {
    try {
      const response = await fetch(`${API_URL}/documents/${doc.id}/download`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = doc.original_filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        alert('Failed to download document')
      }
    } catch (error) {
      console.error('Error downloading document:', error)
      alert('Error downloading document')
    }
  }

  const handleDelete = async () => {
    if (!deletingDocument) return

    try {
      const response = await fetch(`${API_URL}/documents/${deletingDocument.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (response.ok) {
        alert('Document deleted successfully')
        setDeleteModalOpen(false)
        setDeletingDocument(null)
        fetchDocuments()
      } else {
        alert('Failed to delete document')
      }
    } catch (error) {
      console.error('Error deleting document:', error)
      alert('Error deleting document')
    }
  }

  const resetUploadForm = () => {
    setSelectedFile(null)
    setDocumentName('')
    setDescription('')
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) {
      return <FileText size={24} color="#f44336" />
    } else if (fileType.includes('word') || fileType.includes('document')) {
      return <FileText size={24} color="#2196F3" />
    } else if (fileType.includes('sheet') || fileType.includes('excel')) {
      return <FileText size={24} color="#4CAF50" />
    }
    return <File size={24} color="#666" />
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const filteredDocuments = documents.filter(doc => 
    doc.document_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.original_filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div style={{ width: '100%', display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ marginTop: 0, fontSize: 28, marginBottom: 0 }}>Document Bank</h1>
        {isAdmin && (
          <button
            onClick={() => setUploadModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              borderRadius: 8,
              border: 'none',
              background: 'var(--primary)',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}
          >
            <Upload size={16} />
            <span>Upload Document</span>
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: '#f8f9fa', padding: 12, borderRadius: 8 }}>
        <Search size={20} color="#666" />
        <input
          type="text"
          placeholder="Search documents..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid #ccc' }}
        />
      </div>

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center' }}>Loading documents...</div>
      ) : filteredDocuments.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', background: '#f5f5f5', borderRadius: 12, border: '1px dashed #ddd' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#333' }}>
            {documents.length === 0 ? 'No documents yet' : 'No matching documents'}
          </div>
          <p style={{ color: '#666', margin: '8px 0 0' }}>
            {documents.length === 0 
              ? isAdmin ? 'Upload your first document using the button above' : 'No documents have been uploaded yet'
              : 'Try adjusting your search terms'
            }
          </p>
        </div>
      ) : (
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table className="glass-panel" style={{ width: '100%', borderCollapse: 'collapse', overflow: 'hidden', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: 'var(--primary)', color: '#fff' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, width: 50 }}>Type</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Document Name</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>File Name</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Description</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Size</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Uploaded By</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Upload Date</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.map((doc, idx) => (
                <tr key={doc.id} style={{ borderBottom: idx < filteredDocuments.length - 1 ? '1px solid #e0e0e0' : 'none' }}>
                  <td style={{ padding: '12px 16px' }}>{getFileIcon(doc.file_type)}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{doc.document_name}</td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 13 }}>{doc.original_filename}</td>
                  <td style={{ padding: '12px 16px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={doc.description || ''}>
                    {doc.description || '-'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>{formatFileSize(doc.file_size)}</td>
                  <td style={{ padding: '12px 16px' }}>{doc.uploaded_by_name}</td>
                  <td style={{ padding: '12px 16px' }}>{new Date(doc.upload_date).toLocaleString()}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                      <button
                        onClick={() => handleDownload(doc)}
                        style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: '#2196F3', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                        title="Download"
                      >
                        <Download size={14} />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => {
                            setDeletingDocument(doc)
                            setDeleteModalOpen(true)
                          }}
                          style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: '#f44336', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {uploadModalOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: '20px' }}
          onClick={() => { setUploadModalOpen(false); resetUploadForm() }}
        >
          <div className="glass-panel form-container-sm" onClick={e => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>Upload Document</h2>
            <div className="form-grid-1">
              <div className="form-group">
                <label className="form-label">Select File *</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                  onChange={handleFileSelect}
                  style={{ padding: '8px' }}
                />
                {selectedFile && (
                  <div style={{ marginTop: 8, fontSize: 13, color: '#666' }}>
                    Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Document Name *</label>
                <input
                  type="text"
                  value={documentName}
                  onChange={e => setDocumentName(e.target.value)}
                  placeholder="Enter document name"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description (Optional)</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Brief description of the document"
                  rows={3}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setUploadModalOpen(false); resetUploadForm() }}
                className="btn-secondary"
                style={{ color: 'var(--text-main)', background: 'rgba(255,255,255,0.5)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || !selectedFile || !documentName}
                className="btn-primary"
                style={{ opacity: uploading || !selectedFile || !documentName ? 0.6 : 1 }}
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteModalOpen && deletingDocument && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 1000 }}
          onClick={() => { setDeleteModalOpen(false); setDeletingDocument(null) }}
        >
          <div className="glass-panel" style={{ width: 'min(400px, 92vw)', padding: 24, borderRadius: 16 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: 'var(--accent)', marginTop: 0 }}>Delete Document</h2>
            <p style={{ margin: '16px 0' }}>
              Are you sure you want to delete <strong>{deletingDocument.document_name}</strong>?
            </p>
            <p style={{ margin: '16px 0', fontSize: '14px', color: '#666' }}>This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={() => { setDeleteModalOpen(false); setDeletingDocument(null) }} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleDelete} className="btn-primary" style={{ background: '#f44336', borderColor: '#f44336' }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
