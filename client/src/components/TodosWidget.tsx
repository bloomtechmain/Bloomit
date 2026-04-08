import { useState, useEffect } from 'react'
import { API_URL } from '../config/api'
import { CheckSquare, Plus, X, Edit2, Circle, CheckCircle2, Clock, Share2, UserPlus } from 'lucide-react'

type Todo = {
  id: number
  user_id: number
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'completed'
  priority: 'low' | 'medium' | 'high'
  due_date: string | null
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

type TodoShare = {
  id: number
  todo_id: number
  shared_with_user_id: number
  permission: 'read' | 'write'
  user_name?: string
  user_email?: string
}

export default function TodosWidget({ userId, accessToken }: { userId: number; accessToken: string }) {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)
  const [sharingTodo, setSharingTodo] = useState<Todo | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [shares, setShares] = useState<TodoShare[]>([])
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [sharePermission, setSharePermission] = useState<'read' | 'write'>('read')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<'pending' | 'in_progress' | 'completed'>('pending')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [dueDate, setDueDate] = useState('')

  const fetchTodos = async () => {
    setLoading(true)
    try {
      const r = await fetch(`${API_URL}/todos?user_id=${userId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
      if (r.ok) setTodos((await r.json()) || [])
    } catch (err) { console.error('Error fetching todos:', err) }
    finally { setLoading(false) }
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
    } catch (err) { console.error('Error fetching users:', err) }
  }

  const fetchShares = async (todoId: number) => {
    try {
      const r = await fetch(`${API_URL}/todos/${todoId}/shares?user_id=${userId}`)
      setShares(r.ok ? (await r.json()).shares || [] : [])
    } catch { setShares([]) }
  }

  useEffect(() => { fetchTodos(); fetchUsers() }, [userId])

  const handleSave = async () => {
    if (!title.trim()) { alert('Please enter a title'); return }
    try {
      const payload = { user_id: userId, title: title.trim(), description: description.trim(), status, priority, due_date: dueDate || null }
      const url = editingTodo ? `${API_URL}/todos/${editingTodo.id}` : `${API_URL}/todos`
      const r = await fetch(url, { method: editingTodo ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (r.ok) { fetchTodos(); resetForm() }
    } catch (err) { console.error('Error saving todo:', err) }
  }

  const handleDelete = async (todoId: number) => {
    if (!confirm('Delete this todo?')) return
    try {
      const r = await fetch(`${API_URL}/todos/${todoId}?user_id=${userId}`, { method: 'DELETE' })
      if (r.ok) fetchTodos()
    } catch (err) { console.error('Error deleting todo:', err) }
  }

  const handleShareClick = async (todo: Todo) => {
    setSharingTodo(todo); setSelectedUserId(null); setSharePermission('read')
    await fetchShares(todo.id)
  }

  const handleAddShare = async () => {
    if (!sharingTodo || !selectedUserId) { alert('Please select a user to share with'); return }
    try {
      const r = await fetch(`${API_URL}/todos/${sharingTodo.id}/share`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, shared_with_user_id: selectedUserId, permission: sharePermission })
      })
      if (r.ok) { await fetchShares(sharingTodo.id); setSelectedUserId(null); setSharePermission('read') }
      else { const err = await r.json(); alert(err.error || 'Failed to share todo') }
    } catch { alert('Failed to share todo') }
  }

  const handleRemoveShare = async (shareId: number) => {
    if (!sharingTodo || !confirm('Remove this share?')) return
    try {
      const r = await fetch(`${API_URL}/todos/${sharingTodo.id}/share/${shareId}?user_id=${userId}`, { method: 'DELETE' })
      if (r.ok) await fetchShares(sharingTodo.id)
    } catch { console.error('Error removing share') }
  }

  const handleEdit = (todo: Todo) => {
    setEditingTodo(todo); setTitle(todo.title); setDescription(todo.description)
    setStatus(todo.status); setPriority(todo.priority)
    setDueDate(todo.due_date ? todo.due_date.split('T')[0] : '')
    setIsAdding(true)
  }

  const toggleStatus = async (todo: Todo) => {
    const newStatus = todo.status === 'completed' ? 'pending' : 'completed'
    try {
      const r = await fetch(`${API_URL}/todos/${todo.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, title: todo.title, description: todo.description, status: newStatus, priority: todo.priority, due_date: todo.due_date })
      })
      if (r.ok) fetchTodos()
    } catch (err) { console.error('Error toggling status:', err) }
  }

  const resetForm = () => {
    setTitle(''); setDescription(''); setStatus('pending')
    setPriority('medium'); setDueDate(''); setIsAdding(false); setEditingTodo(null)
  }

  const getStatusIcon = (s: string) => {
    if (s === 'completed') return <CheckCircle2 size={17} color="#10b981" />
    if (s === 'in_progress') return <Clock size={17} color="#f59e0b" />
    return <Circle size={17} color="#94a3b8" />
  }

  const getPriorityConfig = (p: string) => {
    if (p === 'high')   return { color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   label: 'HIGH' }
    if (p === 'medium') return { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  label: 'MED'  }
    return                     { color: '#10b981', bg: 'rgba(16,185,129,0.08)',  label: 'LOW'  }
  }

  const completedCount = todos.filter(t => t.status === 'completed').length
  const totalCount     = todos.length

  return (
    <div className="glass-card" style={{ padding: 22, height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckSquare size={16} color="#10b981" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-main)', lineHeight: 1 }}>To-Do List</h2>
            {totalCount > 0 && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
                {completedCount}/{totalCount} completed
              </span>
            )}
          </div>
        </div>
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
          <Plus size={13} /> Add Task
        </button>
      </div>

      {/* Progress bar */}
      {totalCount > 0 && !isAdding && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ height: 4, background: 'rgba(0,0,0,0.06)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${(completedCount / totalCount) * 100}%`,
              background: 'linear-gradient(90deg, #059669, #34d399)',
              borderRadius: 4,
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>
      )}

      {isAdding ? (
        <div style={{ background: '#f8fafc', borderRadius: 12, padding: 18, border: '1px solid rgba(0,0,0,0.07)', flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <h3 style={{ marginTop: 0, color: 'var(--text-main)', fontSize: 14, fontWeight: 700, marginBottom: 14 }}>
            {editingTodo ? 'Edit Task' : 'New Task'}
          </h3>
          <div style={{ display: 'grid', gap: 12, flex: 1 }}>
            <label style={{ display: 'grid', gap: 4 }}>
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Title *</span>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Task title" autoFocus />
            </label>
            <label style={{ display: 'grid', gap: 4 }}>
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Description</span>
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Task description..." rows={3} style={{ resize: 'vertical' }} />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <label style={{ display: 'grid', gap: 4 }}>
                <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status</span>
                <select value={status} onChange={e => setStatus(e.target.value as 'pending' | 'in_progress' | 'completed')}>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </label>
              <label style={{ display: 'grid', gap: 4 }}>
                <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Priority</span>
                <select value={priority} onChange={e => setPriority(e.target.value as 'low' | 'medium' | 'high')}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
            </div>
            <label style={{ display: 'grid', gap: 4 }}>
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Due Date</span>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
            <button onClick={resetForm} style={{ padding: '7px 16px', fontSize: 12, fontWeight: 600, background: 'transparent', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-secondary)' }}>Cancel</button>
            <button onClick={handleSave} style={{ padding: '7px 16px', fontSize: 12, fontWeight: 600, background: '#1e293b', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>{editingTodo ? 'Update' : 'Save'}</button>
          </div>
        </div>
      ) : loading ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading tasks…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', flex: 1 }}>
          {todos.map(todo => {
            const pc = getPriorityConfig(todo.priority)
            const isCompleted = todo.status === 'completed'
            return (
              <div
                key={todo.id}
                style={{
                  background: isCompleted ? 'rgba(0,0,0,0.02)' : '#fff',
                  borderRadius: 10,
                  padding: '11px 14px',
                  border: '1px solid rgba(0,0,0,0.07)',
                  borderLeft: `3px solid ${isCompleted ? 'rgba(0,0,0,0.10)' : pc.color}`,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  transition: 'box-shadow 0.15s, background 0.15s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  opacity: isCompleted ? 0.65 : 1,
                }}
                onMouseEnter={e => { if (!isCompleted) e.currentTarget.style.boxShadow = '0 3px 10px rgba(0,0,0,0.08)' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)' }}
              >
                <button
                  onClick={() => toggleStatus(todo)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '1px 0 0', flexShrink: 0 }}
                >
                  {getStatusIcon(todo.status)}
                </button>

                <div onClick={() => handleEdit(todo)} style={{ cursor: 'pointer', flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 14, fontWeight: 600,
                    textDecoration: isCompleted ? 'line-through' : 'none',
                    color: isCompleted ? 'var(--text-muted)' : 'var(--text-main)',
                    marginBottom: 2, lineHeight: 1.3,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                  }}>
                    {todo.title}
                  </div>
                  {todo.description && (
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, textDecoration: isCompleted ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {todo.description}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 5, background: pc.bg, color: pc.color, fontWeight: 700, letterSpacing: '0.03em' }}>
                      {pc.label}
                    </span>
                    {todo.status === 'in_progress' && (
                      <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 5, background: 'rgba(245,158,11,0.08)', color: '#d97706', fontWeight: 600 }}>In Progress</span>
                    )}
                    {todo.due_date && (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
                        Due {new Date(todo.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                    {todo.access_level && todo.access_level !== 'owner' && (
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic' }}>via {todo.owner_name}</span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                  {todo.access_level === 'owner' && (
                    <button onClick={() => handleShareClick(todo)}
                      style={{ padding: '5px 7px', background: '#eff6ff', border: 'none', borderRadius: 7, cursor: 'pointer', display: 'flex', transition: 'background 0.12s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#dbeafe' }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#eff6ff' }}
                      title="Share"
                    ><Share2 size={13} color="#3b82f6" /></button>
                  )}
                  <button onClick={() => handleEdit(todo)}
                    style={{ padding: '5px 7px', background: '#f8fafc', border: 'none', borderRadius: 7, cursor: 'pointer', display: 'flex', opacity: todo.access_level === 'read' ? 0.4 : 1, transition: 'background 0.12s' }}
                    disabled={todo.access_level === 'read'}
                    onMouseEnter={e => { if (todo.access_level !== 'read') e.currentTarget.style.background = '#e2e8f0' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc' }}
                    title="Edit"
                  ><Edit2 size={13} color="#475569" /></button>
                  {todo.access_level === 'owner' && (
                    <button onClick={() => handleDelete(todo.id)}
                      style={{ padding: '5px 7px', background: '#fef2f2', border: 'none', borderRadius: 7, cursor: 'pointer', display: 'flex', transition: 'background 0.12s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2' }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#fef2f2' }}
                      title="Delete"
                    ><X size={13} color="#ef4444" /></button>
                  )}
                </div>
              </div>
            )
          })}
          {todos.length === 0 && (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(52,211,153,0.10)', border: '1px solid rgba(52,211,153,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <CheckSquare size={22} color="#10b981" style={{ opacity: 0.6 }} />
              </div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>No tasks yet</p>
              <p style={{ margin: '4px 0 0', fontSize: 12, opacity: 0.7 }}>Click "Add Task" to get started</p>
            </div>
          )}
        </div>
      )}

      {/* Share Dialog */}
      {sharingTodo && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10002, padding: 20 }}
          onClick={() => setSharingTodo(null)}
        >
          <div
            style={{ width: 'min(560px, 95vw)', maxHeight: '80vh', padding: 28, borderRadius: 16, background: '#fff', boxShadow: '0 20px 60px rgba(0,0,0,0.18)', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, color: '#1e293b' }}>
              <Share2 size={18} /> Share Task: {sharingTodo.title}
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
              <button onClick={() => setSharingTodo(null)} style={{ padding: '7px 18px', fontSize: 13, fontWeight: 600, background: 'transparent', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8, cursor: 'pointer', color: '#475569' }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
