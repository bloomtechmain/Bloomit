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

// Pastel palette that reads clearly on light backgrounds
const NOTE_COLORS = [
  { value: '#fef9c3', label: 'Yellow'  },
  { value: '#fce7f3', label: 'Pink'    },
  { value: '#dbeafe', label: 'Blue'    },
  { value: '#dcfce7', label: 'Green'   },
  { value: '#ede9fe', label: 'Purple'  },
  { value: '#ffedd5', label: 'Orange'  },
]

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
  const [color, setColor] = useState(NOTE_COLORS[0].value)
  const [isPinned, setIsPinned] = useState(false)

  const fetchNotes = async () => {
    setLoading(true)
    try {
      const r = await fetch(`${API_URL}/notes?user_id=${userId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
      if (r.ok) setNotes((await r.json()) || [])
    } catch (err) {
      console.error('Error fetching notes:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const r = await fetch(`${API_URL}/rbac/users/for-sharing`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
      if (r.ok) {
        const data = await r.json()
        setUsers((data.users || []).filter((u: User) => u.id !== userId))
      }
    } catch (err) {
      console.error('Error fetching users:', err)
    }
  }

  const fetchShares = async (noteId: number) => {
    try {
      const r = await fetch(`${API_URL}/notes/${noteId}/shares?user_id=${userId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
      setShares(r.ok ? (await r.json()).shares || [] : [])
    } catch {
      setShares([])
    }
  }

  useEffect(() => {
    fetchNotes()
    fetchUsers()
  }, [userId])

  const handleSave = async () => {
    if (!title.trim()) { alert('Please enter a title'); return }
    try {
      const payload = { user_id: userId, title: title.trim(), content: content.trim(), color, is_pinned: isPinned }
      const url = editingNote ? `${API_URL}/notes/${editingNote.id}` : `${API_URL}/notes`
      const r = await fetch(url, { method: editingNote ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` }, body: JSON.stringify(payload) })
      if (r.ok) { fetchNotes(); resetForm() }
    } catch (err) { console.error('Error saving note:', err) }
  }

  const handleDelete = async (noteId: number) => {
    if (!confirm('Delete this note?')) return
    try {
      const r = await fetch(`${API_URL}/notes/${noteId}?user_id=${userId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${accessToken}` } })
      if (r.ok) fetchNotes()
    } catch (err) { console.error('Error deleting note:', err) }
  }

  const handleShareClick = async (note: Note) => {
    setSharingNote(note)
    setSelectedUserId(null)
    setSharePermission('read')
    await fetchShares(note.id)
  }

  const handleAddShare = async () => {
    if (!sharingNote || !selectedUserId) { alert('Please select a user to share with'); return }
    try {
      const r = await fetch(`${API_URL}/notes/${sharingNote.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
        body: JSON.stringify({ user_id: userId, shared_with_user_id: selectedUserId, permission: sharePermission })
      })
      if (r.ok) { await fetchShares(sharingNote.id); setSelectedUserId(null); setSharePermission('read') }
      else { const err = await r.json(); alert(err.error || 'Failed to share note') }
    } catch { alert('Failed to share note') }
  }

  const handleRemoveShare = async (shareId: number) => {
    if (!sharingNote || !confirm('Remove this share?')) return
    try {
      const r = await fetch(`${API_URL}/notes/${sharingNote.id}/share/${shareId}?user_id=${userId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${accessToken}` } })
      if (r.ok) await fetchShares(sharingNote.id)
    } catch { console.error('Error removing share') }
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
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
        body: JSON.stringify({ user_id: userId, title: note.title, content: note.content, color: note.color, is_pinned: !note.is_pinned })
      })
      if (r.ok) fetchNotes()
    } catch { console.error('Error toggling pin') }
  }

  const resetForm = () => {
    setTitle(''); setContent(''); setColor(NOTE_COLORS[0].value)
    setIsPinned(false); setIsAdding(false); setEditingNote(null)
  }

  const pinnedNotes  = notes.filter(n => n.is_pinned)
  const regularNotes = notes.filter(n => !n.is_pinned)
  const sortedNotes  = [...pinnedNotes, ...regularNotes]

  return (
    <div className="glass-card" style={{ padding: 22, height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <StickyNote size={16} color="#f59e0b" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-main)', lineHeight: 1 }}>Notes</h2>
            {notes.length > 0 && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
                {notes.length} {notes.length === 1 ? 'note' : 'notes'}{pinnedNotes.length > 0 ? ` · ${pinnedNotes.length} pinned` : ''}
              </span>
            )}
          </div>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 12px', fontSize: 12, fontWeight: 600,
              background: '#1e293b', color: '#fff',
              border: 'none', borderRadius: 8, cursor: 'pointer',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.85' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
          >
            <Plus size={13} /> Add Note
          </button>
        )}
      </div>

      {isAdding ? (
        <div style={{
          background: '#f8fafc',
          borderRadius: 12,
          padding: 18,
          border: '1px solid rgba(0,0,0,0.07)',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto'
        }}>
          <h3 style={{ marginTop: 0, color: 'var(--text-main)', fontSize: 14, fontWeight: 700, marginBottom: 14 }}>
            {editingNote ? 'Edit Note' : 'New Note'}
          </h3>
          <div style={{ display: 'grid', gap: 12, flex: 1 }}>
            <label style={{ display: 'grid', gap: 4 }}>
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Title *</span>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Note title" autoFocus />
            </label>
            <label style={{ display: 'grid', gap: 4, flex: 1 }}>
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Content</span>
              <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Note content..." style={{ minHeight: 80, resize: 'vertical' }} />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Color</span>
              <div style={{ display: 'flex', gap: 7 }}>
                {NOTE_COLORS.map(c => (
                  <button
                    key={c.value}
                    onClick={() => setColor(c.value)}
                    title={c.label}
                    style={{
                      width: 28, height: 28, borderRadius: 7,
                      background: c.value,
                      border: color === c.value ? '2.5px solid #1e293b' : '1.5px solid rgba(0,0,0,0.12)',
                      cursor: 'pointer', padding: 0, transition: 'transform 0.1s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.15)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
                  />
                ))}
              </div>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={isPinned} onChange={e => setIsPinned(e.target.checked)} style={{ width: 15, height: 15 }} />
              <span style={{ fontWeight: 500, color: 'var(--text-main)', fontSize: 13 }}>Pin this note</span>
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
            <button onClick={resetForm} style={{ padding: '7px 16px', fontSize: 12, fontWeight: 600, background: 'transparent', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-secondary)' }}>
              Cancel
            </button>
            <button onClick={handleSave} style={{ padding: '7px 16px', fontSize: 12, fontWeight: 600, background: '#1e293b', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
              {editingNote ? 'Update' : 'Save'}
            </button>
          </div>
        </div>
      ) : loading ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading notes…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, overflowY: 'auto', flex: 1 }}>
          {sortedNotes.map(note => (
            <div
              key={note.id}
              style={{
                background: note.color,
                borderRadius: 12,
                padding: '14px 14px 10px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                border: '1px solid rgba(0,0,0,0.06)',
                position: 'relative',
                minHeight: 140,
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
              onClick={() => handleEdit(note)}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLDivElement
                el.style.transform = 'translateY(-2px)'
                el.style.boxShadow = '0 6px 16px rgba(0,0,0,0.12)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLDivElement
                el.style.transform = 'translateY(0)'
                el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)'
              }}
            >
              {note.is_pinned && (
                <Pin size={13} style={{ position: 'absolute', top: 10, right: 12, fill: 'rgba(0,0,0,0.35)', opacity: 0.6 }} />
              )}
              <h3 style={{ margin: '0 0 6px 0', fontSize: 14, fontWeight: 700, color: '#1e293b', paddingRight: note.is_pinned ? 18 : 0, lineHeight: 1.3 }}>{note.title}</h3>
              <p style={{ margin: 0, fontSize: 12, color: '#374151', flex: 1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                {note.content || <span style={{ opacity: 0.45 }}>No content</span>}
              </p>
              {note.access_level && note.access_level !== 'owner' && (
                <div style={{ fontSize: 10, color: '#6b7280', marginTop: 6, fontStyle: 'italic' }}>
                  Shared by {note.owner_name}
                </div>
              )}
              <div style={{ marginTop: 10, display: 'flex', gap: 5, justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
                {[
                  note.access_level !== 'read' && (
                    <button key="pin" onClick={e => { e.stopPropagation(); togglePin(note) }}
                      style={{ padding: '4px 6px', background: 'rgba(0,0,0,0.08)', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', transition: 'background 0.12s' }}
                      title={note.is_pinned ? 'Unpin' : 'Pin'}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.15)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.08)' }}
                    ><Pin size={12} color="#374151" /></button>
                  ),
                  note.access_level === 'owner' && (
                    <button key="share" onClick={e => { e.stopPropagation(); handleShareClick(note) }}
                      style={{ padding: '4px 6px', background: 'rgba(0,0,0,0.08)', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', transition: 'background 0.12s' }}
                      title="Share"
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.15)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.08)' }}
                    ><Share2 size={12} color="#374151" /></button>
                  ),
                  note.access_level !== 'read' && (
                    <button key="edit" onClick={e => { e.stopPropagation(); handleEdit(note) }}
                      style={{ padding: '4px 6px', background: 'rgba(0,0,0,0.08)', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', transition: 'background 0.12s' }}
                      title="Edit"
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.15)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.08)' }}
                    ><Edit2 size={12} color="#374151" /></button>
                  ),
                  note.access_level === 'owner' && (
                    <button key="del" onClick={e => { e.stopPropagation(); handleDelete(note.id) }}
                      style={{ padding: '4px 6px', background: 'rgba(239,68,68,0.10)', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', transition: 'background 0.12s' }}
                      title="Delete"
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.20)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.10)' }}
                    ><X size={12} color="#ef4444" /></button>
                  ),
                ]}
              </div>
            </div>
          ))}
          {notes.length === 0 && (
            <div style={{ padding: '40px 20px', textAlign: 'center', gridColumn: '1 / -1', color: 'var(--text-muted)' }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <StickyNote size={22} color="#f59e0b" style={{ opacity: 0.6 }} />
              </div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>No notes yet</p>
              <p style={{ margin: '4px 0 0', fontSize: 12, opacity: 0.7 }}>Click "Add Note" to create your first one</p>
            </div>
          )}
        </div>
      )}

      {/* Share Dialog */}
      {sharingNote && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10002, padding: 20 }}
          onClick={() => setSharingNote(null)}
        >
          <div
            style={{ width: 'min(560px, 95vw)', maxHeight: '80vh', padding: 28, borderRadius: 16, background: '#fff', boxShadow: '0 20px 60px rgba(0,0,0,0.18)', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, color: '#1e293b' }}>
              <Share2 size={18} /> Share Note: {sharingNote.title}
            </h3>

            <div style={{ marginBottom: 20, padding: 14, background: '#f8fafc', borderRadius: 10, border: '1px solid rgba(0,0,0,0.07)' }}>
              <h4 style={{ marginTop: 0, marginBottom: 10, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                <UserPlus size={14} /> Share with user
              </h4>
              <div style={{ display: 'grid', gap: 10 }}>
                <label style={{ display: 'grid', gap: 4 }}>
                  <span style={{ fontWeight: 500, fontSize: 12, color: '#475569' }}>Select User</span>
                  <select value={selectedUserId || ''} onChange={e => setSelectedUserId(Number(e.target.value))} style={{ padding: '7px 10px', borderRadius: 7, border: '1px solid rgba(0,0,0,0.12)', fontSize: 13 }}>
                    <option value="">-- Select a user --</option>
                    {users.map(user => <option key={user.id} value={user.id}>{user.name} ({user.email})</option>)}
                  </select>
                </label>
                <label style={{ display: 'grid', gap: 4 }}>
                  <span style={{ fontWeight: 500, fontSize: 12, color: '#475569' }}>Permission</span>
                  <select value={sharePermission} onChange={e => setSharePermission(e.target.value as 'read' | 'write')} style={{ padding: '7px 10px', borderRadius: 7, border: '1px solid rgba(0,0,0,0.12)', fontSize: 13 }}>
                    <option value="read">Read Only</option>
                    <option value="write">Can Edit</option>
                  </select>
                </label>
                <button onClick={handleAddShare} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, background: '#1e293b', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                  Add Share
                </button>
              </div>
            </div>

            <div>
              <h4 style={{ marginTop: 0, marginBottom: 10, fontSize: 13, fontWeight: 600 }}>Shared with ({shares.length})</h4>
              {shares.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {shares.map(share => {
                    const user = users.find(u => u.id === share.shared_with_user_id)
                    return (
                      <div key={share.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#f8fafc', borderRadius: 9, border: '1px solid rgba(0,0,0,0.07)' }}>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: 13 }}>{user?.name || 'Unknown User'}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>{user?.email || ''}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 5, background: share.permission === 'write' ? '#dbeafe' : '#f1f5f9', color: share.permission === 'write' ? '#1e40af' : '#475569', fontWeight: 600 }}>
                            {share.permission === 'write' ? 'Can Edit' : 'Read Only'}
                          </span>
                          <button onClick={() => handleRemoveShare(share.id)} style={{ padding: '4px 6px', background: '#fee2e2', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                            <X size={13} color="#ef4444" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div style={{ padding: '16px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>Not shared with anyone yet</div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setSharingNote(null)} style={{ padding: '7px 18px', fontSize: 13, fontWeight: 600, background: 'transparent', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8, cursor: 'pointer', color: '#475569' }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
