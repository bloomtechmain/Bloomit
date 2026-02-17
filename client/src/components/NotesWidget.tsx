import { useState, useEffect } from 'react'
import { API_URL } from '../config/api'
import { StickyNote, Plus, Pin, X, Edit2, Share2, UserPlus } from 'lucide-react'

type Note = {
  id: number
  user_id: number
  title: string
  content: string
  color: string
  is_pinned: boolean
  created_at: string
  updated_at: string
  owner_name?: string
  access_level?: 'owner' | 'read' | 'write'
}

type User = {
  id: number
  name: string
  email: string
}

type NoteShare = {
  id: number
  note_id: number
  shared_with_user_id: number
  permission: 'read' | 'write'
  user_name?: string
  user_email?: string
}

export default function NotesWidget({ userId, accessToken }: { userId: number; accessToken: string }) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [sharingNote, setSharingNote] = useState<Note | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [shares, setShares] = useState<NoteShare[]>([])
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [sharePermission, setSharePermission] = useState<'read' | 'write'>('read')
  
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [color, setColor] = useState('#fff475')
  const [isPinned, setIsPinned] = useState(false)

  const noteColors = [
    '#fff475', // Yellow
    '#ff8a80', // Red
    '#80d8ff', // Blue
    '#b9f6ca', // Green
    '#ea80fc', // Purple
    '#ffab91', // Orange
  ]

  const fetchNotes = async () => {
    setLoading(true)
    try {
      const r = await fetch(`${API_URL}/notes?user_id=${userId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
      if (r.ok) {
        const data = await r.json()
        setNotes(data || [])
      }
    } catch (err) {
      console.error('Error fetching notes:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const r = await fetch(`${API_URL}/rbac/users/for-sharing`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
      
      if (r.ok) {
        const data = await r.json()
        const filteredUsers = (data.users || []).filter((u: User) => u.id !== userId)
        setUsers(filteredUsers)
      }
    } catch (err) {
      console.error('Error fetching users:', err)
    }
  }

  const fetchShares = async (noteId: number) => {
    try {
      const r = await fetch(`${API_URL}/notes/${noteId}/shares?user_id=${userId}`)
      if (r.ok) {
        const data = await r.json()
        setShares(data.shares || [])
      } else {
        setShares([])
      }
    } catch (err) {
      console.error('Error fetching shares:', err)
      setShares([])
    }
  }

  useEffect(() => {
    fetchNotes()
    fetchUsers()
  }, [userId])

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Please enter a title')
      return
    }

    try {
      const payload = {
        user_id: userId,
        title: title.trim(),
        content: content.trim(),
        color,
        is_pinned: isPinned
      }

      if (editingNote) {
        const r = await fetch(`${API_URL}/notes/${editingNote.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        if (r.ok) {
          fetchNotes()
          resetForm()
        }
      } else {
        const r = await fetch(`${API_URL}/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        if (r.ok) {
          fetchNotes()
          resetForm()
        }
      }
    } catch (err) {
      console.error('Error saving note:', err)
    }
  }

  const handleDelete = async (noteId: number) => {
    if (!confirm('Delete this note?')) return
    
    try {
      const r = await fetch(`${API_URL}/notes/${noteId}?user_id=${userId}`, {
        method: 'DELETE'
      })
      if (r.ok) {
        fetchNotes()
      }
    } catch (err) {
      console.error('Error deleting note:', err)
    }
  }

  const handleShareClick = async (note: Note) => {
    setSharingNote(note)
    setSelectedUserId(null)
    setSharePermission('read')
    await fetchShares(note.id)
  }

  const handleAddShare = async () => {
    if (!sharingNote || !selectedUserId) {
      alert('Please select a user to share with')
      return
    }

    try {
      const r = await fetch(`${API_URL}/notes/${sharingNote.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          shared_with_user_id: selectedUserId,
          permission: sharePermission
        })
      })
      
      if (r.ok) {
        await fetchShares(sharingNote.id)
        setSelectedUserId(null)
        setSharePermission('read')
      } else {
        const error = await r.json()
        alert(error.error || 'Failed to share note')
      }
    } catch (err) {
      console.error('Error sharing note:', err)
      alert('Failed to share note')
    }
  }

  const handleRemoveShare = async (shareId: number) => {
    if (!sharingNote) return
    
    if (!confirm('Remove this share?')) return

    try {
      const r = await fetch(`${API_URL}/notes/${sharingNote.id}/share/${shareId}?user_id=${userId}`, {
        method: 'DELETE'
      })
      
      if (r.ok) {
        await fetchShares(sharingNote.id)
      }
    } catch (err) {
      console.error('Error removing share:', err)
    }
  }

  const handleEdit = (note: Note) => {
    setEditingNote(note)
    setTitle(note.title)
    setContent(note.content)
    setColor(note.color)
    setIsPinned(note.is_pinned)
    setIsAdding(true)
  }

  const togglePin = async (note: Note) => {
    try {
      const r = await fetch(`${API_URL}/notes/${note.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          title: note.title,
          content: note.content,
          color: note.color,
          is_pinned: !note.is_pinned
        })
      })
      if (r.ok) {
        fetchNotes()
      }
    } catch (err) {
      console.error('Error toggling pin:', err)
    }
  }

  const resetForm = () => {
    setTitle('')
    setContent('')
    setColor('#fff475')
    setIsPinned(false)
    setIsAdding(false)
    setEditingNote(null)
  }

  return (
    <div className="glass-card" style={{ padding: 24, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <StickyNote size={24} color="var(--primary)" />
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Notes</h2>
        </div>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 6, 
              padding: '8px 16px', 
              borderRadius: 8, 
              background: 'var(--primary)', 
              color: '#fff', 
              border: 'none', 
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            <Plus size={16} /> Add Note
          </button>
        )}
      </div>

      {isAdding ? (
        // Inline form view with dark blue styling
        <div style={{ 
          background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', 
          borderRadius: 12, 
          padding: 24,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto'
        }}>
          <h3 style={{ marginTop: 0, color: '#ff6b3d', fontSize: 18, fontWeight: 700 }}>
            {editingNote ? 'Edit Note' : 'New Note'}
          </h3>
          <div style={{ display: 'grid', gap: 16, flex: 1 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontWeight: 500, color: '#fff' }}>Title *</span>
              <input 
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Note title"
                style={{ padding: '10px 12px', borderRadius: 8, border: 'none', background: '#fff' }}
                autoFocus
              />
            </label>
            <label style={{ display: 'grid', gap: 6, flex: 1 }}>
              <span style={{ fontWeight: 500, color: '#fff' }}>Content</span>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Note content..."
                style={{ padding: '10px 12px', borderRadius: 8, border: 'none', background: '#fff', resize: 'vertical', minHeight: 100, flex: 1 }}
              />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontWeight: 500, color: '#fff' }}>Color</span>
              <div style={{ display: 'flex', gap: 8 }}>
                {noteColors.map(c => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    style={{ 
                      width: 40, 
                      height: 40, 
                      borderRadius: 8, 
                      background: c, 
                      border: color === c ? '3px solid #fff' : '1px solid rgba(255,255,255,0.3)',
                      cursor: 'pointer'
                    }}
                  />
                ))}
              </div>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input 
                type="checkbox"
                checked={isPinned}
                onChange={e => setIsPinned(e.target.checked)}
                style={{ width: 18, height: 18 }}
              />
              <span style={{ fontWeight: 500, color: '#fff' }}>Pin this note</span>
            </label>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
            <button 
              onClick={resetForm} 
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                border: 'none',
                background: 'rgba(255,255,255,0.2)',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                border: 'none',
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              {editingNote ? 'Update' : 'Save'}
            </button>
          </div>
        </div>
      ) : loading ? (
        <div style={{ padding: 24, textAlign: 'center' }}>Loading notes...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, overflowY: 'auto', flex: 1 }}>
          {notes.map(note => (
            <div 
              key={note.id}
              style={{ 
                background: note.color, 
                borderRadius: 12, 
                padding: 16, 
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                position: 'relative',
                minHeight: 150,
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer'
              }}
              onClick={() => handleEdit(note)}
            >
              {note.is_pinned && (
                <Pin size={16} style={{ position: 'absolute', top: 8, right: 8, fill: '#000', opacity: 0.4 }} />
              )}
              <h3 style={{ margin: '0 0 8px 0', fontSize: 16, fontWeight: 700, color: '#000' }}>{note.title}</h3>
              <p style={{ margin: 0, fontSize: 14, color: '#333', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {note.content || 'No content'}
              </p>
              <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
                <button
                  onClick={(e) => { e.stopPropagation(); togglePin(note) }}
                  style={{ padding: 4, background: 'rgba(255,255,255,0.7)', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                  title={note.is_pinned ? 'Unpin' : 'Pin'}
                  disabled={note.access_level !== 'owner' && note.access_level !== 'write'}
                >
                  <Pin size={14} />
                </button>
                {note.access_level === 'owner' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleShareClick(note) }}
                    style={{ padding: 4, background: 'rgba(255,255,255,0.7)', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                    title="Share"
                  >
                    <Share2 size={14} />
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); handleEdit(note) }}
                  style={{ padding: 4, background: 'rgba(255,255,255,0.7)', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                  title="Edit"
                  disabled={note.access_level === 'read'}
                >
                  <Edit2 size={14} />
                </button>
                {note.access_level === 'owner' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(note.id) }}
                    style={{ padding: 4, background: 'rgba(255,255,255,0.7)', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                    title="Delete"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              {note.access_level && note.access_level !== 'owner' && (
                <div style={{ fontSize: 11, color: '#666', marginTop: 8, fontStyle: 'italic' }}>
                  Shared by {note.owner_name}
                </div>
              )}
            </div>
          ))}
          {notes.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', gridColumn: '1 / -1', color: '#999' }}>
              <StickyNote size={48} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <p>No notes yet. Click "Add Note" to create one!</p>
            </div>
          )}
        </div>
      )}

      {/* Share Dialog - keep as modal */}
      {sharingNote && (
        <div 
          style={{ 
            position: 'fixed', 
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.75)', 
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10002,
            padding: 20,
            overflowY: 'auto'
          }}
          onClick={() => setSharingNote(null)}
        >
          <div 
            className="glass-panel"
            style={{ 
              width: 'min(600px, 95vw)', 
              maxHeight: '80vh',
              padding: 32, 
              borderRadius: 16,
              background: '#fff',
              boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
              position: 'relative',
              overflowY: 'auto',
              margin: 'auto'
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Share2 size={20} />
              Share Note: {sharingNote.title}
            </h3>

            <div style={{ marginBottom: 24, padding: 16, background: '#f9fafb', borderRadius: 8 }}>
              <h4 style={{ marginTop: 0, marginBottom: 12, fontSize: 14, fontWeight: 600 }}>
                <UserPlus size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                Share with user
              </h4>
              <div style={{ display: 'grid', gap: 12 }}>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontWeight: 500, fontSize: 13 }}>Select User</span>
                  <select
                    value={selectedUserId || ''}
                    onChange={e => setSelectedUserId(Number(e.target.value))}
                    style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #ccc', fontSize: 14 }}
                  >
                    <option value="">-- Select a user --</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontWeight: 500, fontSize: 13 }}>Permission</span>
                  <select
                    value={sharePermission}
                    onChange={e => setSharePermission(e.target.value as 'read' | 'write')}
                    style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #ccc', fontSize: 14 }}
                  >
                    <option value="read">Read Only</option>
                    <option value="write">Can Edit</option>
                  </select>
                </label>
                <button 
                  onClick={handleAddShare}
                  className="btn-primary"
                  style={{ padding: '8px 16px', fontSize: 14 }}
                >
                  Add Share
                </button>
              </div>
            </div>

            <div>
              <h4 style={{ marginTop: 0, marginBottom: 12, fontSize: 14, fontWeight: 600 }}>
                Shared with ({shares.length})
              </h4>
              {shares.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {shares.map(share => {
                    const user = users.find(u => u.id === share.shared_with_user_id)
                    return (
                      <div 
                        key={share.id}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          padding: 12,
                          background: '#fff',
                          borderRadius: 8,
                          border: '1px solid #e5e7eb'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 500, fontSize: 14 }}>
                            {user?.name || 'Unknown User'}
                          </div>
                          <div style={{ fontSize: 12, color: '#666' }}>
                            {user?.email || ''}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ 
                            fontSize: 11, 
                            padding: '4px 8px', 
                            borderRadius: 4,
                            background: share.permission === 'write' ? '#dbeafe' : '#f3f4f6',
                            color: share.permission === 'write' ? '#1e40af' : '#374151',
                            fontWeight: 600
                          }}>
                            {share.permission === 'write' ? 'Can Edit' : 'Read Only'}
                          </span>
                          <button
                            onClick={() => handleRemoveShare(share.id)}
                            style={{ 
                              padding: 4, 
                              background: '#fee2e2', 
                              border: 'none', 
                              borderRadius: 4, 
                              cursor: 'pointer' 
                            }}
                            title="Remove share"
                          >
                            <X size={14} color="#ef4444" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div style={{ padding: 20, textAlign: 'center', color: '#999', fontSize: 13 }}>
                  Not shared with anyone yet
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
              <button onClick={() => setSharingNote(null)} className="btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
