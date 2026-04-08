import { useState, useEffect, useCallback } from 'react'
import type { CSSProperties, FocusEvent, ChangeEvent } from 'react'
import { API_URL } from '../config/api'
import { Upload, FileText, Download, Trash2, File, Search, FolderOpen, X, AlertTriangle, Archive } from 'lucide-react'

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

type UserProp = {
  roleNames: string[]
}

const DOC_INPUT: CSSProperties = {
  padding: '10px 14px',
  borderRadius: 10,
  border: '1.5px solid #e0e7ff',
  background: '#f5f3ff',
  fontSize: 13.5,
  color: '#1e293b',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  transition: 'all 0.2s',
}

function docFocusIn(e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.target.style.borderColor = '#4f46e5'
  e.target.style.background = '#fff'
  e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,0.12)'
}

function docFocusOut(e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.target.style.borderColor = '#e0e7ff'
  e.target.style.background = '#f5f3ff'
  e.target.style.boxShadow = 'none'
}

function getFileCategory(fileType: string): 'pdf' | 'word' | 'excel' | 'other' {
  if (fileType.includes('pdf')) return 'pdf'
  if (fileType.includes('word') || fileType.includes('document') || fileType.includes('msword')) return 'word'
  if (fileType.includes('sheet') || fileType.includes('excel') || fileType.includes('spreadsheet')) return 'excel'
  return 'other'
}

const FILE_META = {
  pdf:   { bg: 'rgba(220,38,38,0.1)',    color: '#dc2626', label: 'PDF'   },
  word:  { bg: 'rgba(37,99,235,0.1)',    color: '#2563eb', label: 'Word'  },
  excel: { bg: 'rgba(22,163,74,0.1)',    color: '#16a34a', label: 'Excel' },
  other: { bg: 'rgba(100,116,139,0.1)', color: '#64748b', label: 'File'  },
}

export default function DocumentBank({ user, accessToken }: { user: UserProp; accessToken: string }) {
  const [documents, setDocuments]           = useState<Document[]>([])
  const [loading, setLoading]               = useState(false)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [selectedFile, setSelectedFile]     = useState<File | null>(null)
  const [documentName, setDocumentName]     = useState('')
  const [description, setDescription]       = useState('')
  const [uploading, setUploading]           = useState(false)
  const [searchTerm, setSearchTerm]         = useState('')
  const [typeFilter, setTypeFilter]         = useState<'all' | 'pdf' | 'word' | 'excel' | 'other'>('all')
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletingDocument, setDeletingDocument] = useState<Document | null>(null)

  const isAdmin = user.roleNames.includes('Admin') || user.roleNames.includes('Super Admin')

  const fetchDocuments = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/documents`, { headers: { Authorization: `Bearer ${accessToken}` } })
      if (res.ok) {
        const data = await res.json()
        setDocuments(data.documents || [])
      }
    } catch (err) {
      console.error('Error fetching documents:', err)
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  useEffect(() => { fetchDocuments() }, [fetchDocuments])

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const f = e.target.files[0]
      setSelectedFile(f)
      if (!documentName) setDocumentName(f.name.replace(/\.[^/.]+$/, ''))
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !documentName) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', selectedFile)
      fd.append('document_name', documentName)
      if (description) fd.append('description', description)
      const res = await fetch(`${API_URL}/documents/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: fd,
      })
      if (res.ok) {
        setUploadModalOpen(false)
        resetUploadForm()
        fetchDocuments()
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to upload document')
      }
    } catch (err) {
      console.error('Error uploading document:', err)
      alert('Error uploading document')
    } finally {
      setUploading(false)
    }
  }

  const handleDownload = async (doc: Document) => {
    try {
      const res = await fetch(`${API_URL}/documents/${doc.id}/download`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = doc.original_filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (err) {
      console.error('Error downloading document:', err)
    }
  }

  const handleDelete = async () => {
    if (!deletingDocument) return
    try {
      const res = await fetch(`${API_URL}/documents/${deletingDocument.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (res.ok) {
        setDeleteModalOpen(false)
        setDeletingDocument(null)
        fetchDocuments()
      }
    } catch (err) {
      console.error('Error deleting document:', err)
    }
  }

  const resetUploadForm = () => {
    setSelectedFile(null)
    setDocumentName('')
    setDescription('')
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const totalSize  = documents.reduce((s, d) => s + d.file_size, 0)
  const pdfCount   = documents.filter(d => getFileCategory(d.file_type) === 'pdf').length
  const wordCount  = documents.filter(d => getFileCategory(d.file_type) === 'word').length
  const excelCount = documents.filter(d => getFileCategory(d.file_type) === 'excel').length

  const filtered = documents.filter(doc => {
    const q = searchTerm.toLowerCase()
    const matchSearch = doc.document_name.toLowerCase().includes(q) ||
      doc.original_filename.toLowerCase().includes(q) ||
      (doc.description?.toLowerCase().includes(q) ?? false)
    const matchType = typeFilter === 'all' || getFileCategory(doc.file_type) === typeFilter
    return matchSearch && matchType
  })

  const TYPE_FILTERS: { key: 'all' | 'pdf' | 'word' | 'excel' | 'other'; label: string }[] = [
    { key: 'all',   label: 'All'   },
    { key: 'pdf',   label: 'PDF'   },
    { key: 'word',  label: 'Word'  },
    { key: 'excel', label: 'Excel' },
    { key: 'other', label: 'Other' },
  ]

  return (
    <>
      {/* ── Stats row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(160px, 100%), 1fr))', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Total Documents', value: documents.length,          icon: <FolderOpen size={18} />, color: '#4f46e5', bg: 'rgba(79,70,229,0.1)'  },
          { label: 'Total Storage',   value: formatFileSize(totalSize), icon: <Archive   size={18} />, color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)' },
          { label: 'PDF Files',       value: pdfCount,                  icon: <FileText  size={18} />, color: '#dc2626', bg: 'rgba(220,38,38,0.1)'  },
          { label: 'Word / Excel',    value: wordCount + excelCount,    icon: <File      size={18} />, color: '#16a34a', bg: 'rgba(22,163,74,0.1)'  },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 14, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 1px 6px rgba(0,0,0,0.07)', border: '1px solid rgba(0,0,0,0.05)' }}>
            <div style={{ width: 42, height: 42, borderRadius: 11, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, flexShrink: 0 }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', lineHeight: 1.1 }}>{s.value}</div>
              <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 500, marginTop: 2 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Search + filters + upload button ── */}
      <div style={{ background: '#fff', borderRadius: 14, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.07)', border: '1px solid rgba(0,0,0,0.05)', flexWrap: 'wrap' }}>
        {/* Search input */}
        <div style={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 9, background: '#f8fafc', borderRadius: 10, border: '1.5px solid #e2e8f0', padding: '8px 14px' }}>
          <Search size={14} color="#94a3b8" style={{ flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search documents…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13.5, color: '#1e293b' }}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: '#94a3b8' }}>
              <X size={13} />
            </button>
          )}
        </div>

        {/* Type filter pills */}
        <div style={{ display: 'flex', gap: 6 }}>
          {TYPE_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setTypeFilter(f.key)}
              style={{
                padding: '6px 14px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                background: typeFilter === f.key ? '#4f46e5' : 'rgba(79,70,229,0.07)',
                color:      typeFilter === f.key ? '#fff'    : '#4f46e5',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Upload button */}
        {isAdmin && (
          <button
            onClick={() => setUploadModalOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px',
              borderRadius: 10, border: 'none', flexShrink: 0,
              background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
              color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(79,70,229,0.3)',
            }}
          >
            <Upload size={14} />
            Upload Document
          </button>
        )}
      </div>

      {/* ── Documents table ── */}
      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.08)', borderTop: '3px solid #6366f1', animation: 'ql-spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          Loading documents…
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 52, textAlign: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: 16, border: '1px dashed rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
          <FolderOpen size={44} style={{ marginBottom: 14, opacity: 0.45 }} />
          <div style={{ fontWeight: 700, fontSize: 15.5, marginBottom: 6 }}>
            {documents.length === 0 ? 'No documents yet' : 'No matching documents'}
          </div>
          <div style={{ fontSize: 13 }}>
            {documents.length === 0
              ? isAdmin ? 'Upload your first document using the button above' : 'No documents have been uploaded yet'
              : 'Try adjusting your search or filter'}
          </div>
        </div>
      ) : (
        <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 16px rgba(0,0,0,0.12)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <thead>
              <tr style={{ background: 'linear-gradient(90deg, #1e1b4b 0%, #312e81 55%, #4f46e5 100%)', color: '#fff' }}>
                <th style={{ padding: '13px 16px', textAlign: 'left', fontWeight: 700, fontSize: 11.5, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>TYPE</th>
                <th style={{ padding: '13px 16px', textAlign: 'left', fontWeight: 700, fontSize: 11.5, letterSpacing: '0.06em' }}>DOCUMENT</th>
                <th style={{ padding: '13px 16px', textAlign: 'left', fontWeight: 700, fontSize: 11.5, letterSpacing: '0.06em' }}>DESCRIPTION</th>
                <th style={{ padding: '13px 16px', textAlign: 'left', fontWeight: 700, fontSize: 11.5, letterSpacing: '0.06em' }}>SIZE</th>
                <th style={{ padding: '13px 16px', textAlign: 'left', fontWeight: 700, fontSize: 11.5, letterSpacing: '0.06em' }}>UPLOADED BY</th>
                <th style={{ padding: '13px 16px', textAlign: 'left', fontWeight: 700, fontSize: 11.5, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>DATE</th>
                <th style={{ padding: '13px 16px', textAlign: 'center', fontWeight: 700, fontSize: 11.5, letterSpacing: '0.06em' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((doc, idx) => {
                const cat  = getFileCategory(doc.file_type)
                const meta = FILE_META[cat]
                const initials = (doc.uploaded_by_name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                return (
                  <tr
                    key={doc.id}
                    style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #f1f5f9', transition: 'background 0.12s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f5f3ff')}
                    onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafafa')}
                  >
                    {/* Type */}
                    <td style={{ padding: '13px 16px' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: meta.bg, borderRadius: 8, padding: '5px 10px' }}>
                        <FileText size={13} color={meta.color} />
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: meta.color, letterSpacing: '0.04em' }}>{meta.label}</span>
                      </div>
                    </td>

                    {/* Name */}
                    <td style={{ padding: '13px 16px' }}>
                      <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 13.5 }}>{doc.document_name}</div>
                      <div style={{ fontSize: 11.5, color: '#94a3b8', fontFamily: 'monospace', marginTop: 2 }}>{doc.original_filename}</div>
                    </td>

                    {/* Description */}
                    <td style={{ padding: '13px 16px', maxWidth: 220 }}>
                      {doc.description
                        ? <span style={{ fontSize: 12.5, color: '#64748b' }} title={doc.description}>{doc.description.length > 60 ? doc.description.slice(0, 60) + '…' : doc.description}</span>
                        : <span style={{ color: '#cbd5e1', fontSize: 12, fontStyle: 'italic' }}>—</span>}
                    </td>

                    {/* Size */}
                    <td style={{ padding: '13px 16px' }}>
                      <span style={{ fontSize: 12, color: '#475569', fontWeight: 600, background: '#f1f5f9', padding: '3px 9px', borderRadius: 6 }}>{formatFileSize(doc.file_size)}</span>
                    </td>

                    {/* Uploader */}
                    <td style={{ padding: '13px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #4f46e5, #818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ color: '#fff', fontSize: 10, fontWeight: 800 }}>{initials}</span>
                        </div>
                        <span style={{ fontSize: 12.5, color: '#374151', fontWeight: 500 }}>{doc.uploaded_by_name}</span>
                      </div>
                    </td>

                    {/* Date */}
                    <td style={{ padding: '13px 16px' }}>
                      <div style={{ fontSize: 12.5, color: '#475569', fontWeight: 500 }}>{new Date(doc.upload_date).toLocaleDateString()}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{new Date(doc.upload_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '13px 16px' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <button
                          onClick={() => handleDownload(doc)}
                          title="Download"
                          style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'rgba(79,70,229,0.1)', color: '#4f46e5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#4f46e5'; (e.currentTarget as HTMLButtonElement).style.color = '#fff' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(79,70,229,0.1)'; (e.currentTarget as HTMLButtonElement).style.color = '#4f46e5' }}
                        >
                          <Download size={13} />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => { setDeletingDocument(doc); setDeleteModalOpen(true) }}
                            title="Delete"
                            style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'rgba(220,38,38,0.1)', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#ef4444'; (e.currentTarget as HTMLButtonElement).style.color = '#fff' }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(220,38,38,0.1)'; (e.currentTarget as HTMLButtonElement).style.color = '#dc2626' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Upload Drawer ── */}
      {uploadModalOpen && (
        <>
          <div
            onClick={() => { setUploadModalOpen(false); resetUploadForm() }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000 }}
          />
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(480px, 100vw)',
            background: '#fff', zIndex: 1001, display: 'flex', flexDirection: 'column',
            boxShadow: '-8px 0 40px rgba(0,0,0,0.18)', animation: 'slideInFromRight 0.25s ease',
          }}>
            {/* Gradient header */}
            <div style={{ background: 'linear-gradient(160deg, #1e1b4b 0%, #312e81 55%, #4f46e5 100%)', padding: '28px 24px 24px', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', top: 20, right: 60, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', bottom: -30, left: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
              {/* Close */}
              <button
                onClick={() => { setUploadModalOpen(false); resetUploadForm() }}
                style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', width: 34, height: 34, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}
              >
                <X size={16} />
              </button>
              {/* Icon / preview */}
              <div style={{ width: 58, height: 58, borderRadius: '50%', background: selectedFile ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.12)', border: '2px solid rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, position: 'relative', zIndex: 1 }}>
                {selectedFile ? <FileText size={26} color="#a5b4fc" /> : <Upload size={26} color="rgba(255,255,255,0.65)" />}
              </div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 20, letterSpacing: 0.2, position: 'relative', zIndex: 1 }}>
                {selectedFile ? (documentName || selectedFile.name) : 'Upload Document'}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12.5, marginTop: 5, position: 'relative', zIndex: 1 }}>
                {selectedFile
                  ? `${getFileCategory(selectedFile.type).toUpperCase()} · ${formatFileSize(selectedFile.size)}`
                  : 'Add a file to the document bank'}
              </div>
            </div>

            {/* Scrollable body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 12px' }}>

              {/* File picker */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(79,70,229,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Upload size={13} color="#4f46e5" />
                  </div>
                  <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>Select File</span>
                </div>
                <label style={{ display: 'block', cursor: 'pointer' }}>
                  <div style={{
                    border: `2px dashed ${selectedFile ? '#6366f1' : '#c7d2fe'}`,
                    borderRadius: 12, padding: '22px 16px', textAlign: 'center',
                    background: selectedFile ? '#f5f3ff' : '#fafbff', transition: 'all 0.2s',
                  }}>
                    {selectedFile ? (
                      <>
                        <FileText size={30} color="#6366f1" style={{ marginBottom: 8 }} />
                        <div style={{ fontWeight: 700, color: '#4f46e5', fontSize: 13.5 }}>{selectedFile.name}</div>
                        <div style={{ fontSize: 12, color: '#818cf8', marginTop: 4 }}>{formatFileSize(selectedFile.size)} · Click to change</div>
                      </>
                    ) : (
                      <>
                        <Upload size={30} color="#a5b4fc" style={{ marginBottom: 8 }} />
                        <div style={{ fontWeight: 600, color: '#6366f1', fontSize: 13.5 }}>Click to browse</div>
                        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>PDF, Word (.doc / .docx), Excel (.xls / .xlsx)</div>
                      </>
                    )}
                  </div>
                  <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" onChange={handleFileSelect} style={{ display: 'none' }} />
                </label>
              </div>

              {/* Details */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(79,70,229,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={13} color="#4f46e5" />
                  </div>
                  <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>Details</span>
                </div>
                <div style={{ display: 'grid', gap: 12 }}>
                  <label style={{ display: 'grid', gap: 5 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>
                      Document Name <span style={{ color: '#ef4444' }}>*</span>
                    </span>
                    <input
                      type="text"
                      value={documentName}
                      onChange={e => setDocumentName(e.target.value)}
                      placeholder="Enter a name for this document"
                      style={DOC_INPUT}
                      onFocus={docFocusIn}
                      onBlur={docFocusOut}
                    />
                  </label>
                  <label style={{ display: 'grid', gap: 5 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>
                      Description <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span>
                    </span>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Brief description of the document…"
                      rows={3}
                      style={{ ...DOC_INPUT, resize: 'vertical', lineHeight: 1.5 }}
                      onFocus={docFocusIn}
                      onBlur={docFocusOut}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Footer actions */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 10 }}>
              <button
                onClick={() => { setUploadModalOpen(false); resetUploadForm() }}
                style={{ flex: 1, padding: 11, borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || !selectedFile || !documentName}
                style={{
                  flex: 2, padding: 11, borderRadius: 10, border: 'none',
                  background: uploading || !selectedFile || !documentName
                    ? '#c7d2fe'
                    : 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                  color: '#fff', fontSize: 13.5, fontWeight: 700,
                  cursor: uploading || !selectedFile || !documentName ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: uploading || !selectedFile || !documentName ? 'none' : '0 2px 8px rgba(79,70,229,0.35)',
                }}
              >
                {uploading ? (
                  <>
                    <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', animation: 'ql-spin 0.8s linear infinite' }} />
                    Uploading…
                  </>
                ) : (
                  <><Upload size={14} /> Upload Document</>
                )}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Delete confirmation ── */}
      {deleteModalOpen && deletingDocument && (
        <div
          onClick={() => { setDeleteModalOpen(false); setDeletingDocument(null) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 1000 }}
        >
          <div onClick={e => e.stopPropagation()} style={{ width: 'min(400px, 92vw)', background: '#fff', borderRadius: 18, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.22)' }}>
            {/* Red header */}
            <div style={{ background: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 55%, #dc2626 100%)', padding: '24px 24px 20px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -30, right: -30, width: 110, height: 110, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, position: 'relative', zIndex: 1 }}>
                <AlertTriangle size={22} color="#fca5a5" />
              </div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 17, position: 'relative', zIndex: 1 }}>Delete Document</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12.5, marginTop: 4, position: 'relative', zIndex: 1 }}>This action cannot be undone</div>
            </div>
            {/* Body */}
            <div style={{ padding: '20px 24px 24px' }}>
              <p style={{ fontSize: 14, color: '#374151', margin: '0 0 20px', lineHeight: 1.6 }}>
                Are you sure you want to permanently delete{' '}
                <strong style={{ color: '#1e293b' }}>"{deletingDocument.document_name}"</strong>?
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => { setDeleteModalOpen(false); setDeletingDocument(null) }}
                  style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontWeight: 600, fontSize: 13.5, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)', color: '#fff', fontWeight: 700, fontSize: 13.5, cursor: 'pointer', boxShadow: '0 2px 8px rgba(220,38,38,0.35)' }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
