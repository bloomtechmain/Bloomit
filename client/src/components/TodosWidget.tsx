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
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
      if (r.ok) {
        const data = await r.json()
        setTodos(data || [])
      }
    } catch (err) {
      console.error('Error fetching todos:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      console.log('Fetching users from:', `${API_URL}/rbac/users/for-sharing`)
      const r = await fetch(`${API_URL}/rbac/users/for-sharing`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
      console.log('Response status:', r.status, r.statusText)
      
      if (r.ok) {
        const data = await r.json()
        console.log('Raw user data received:', data)
        console.log('Current userId:', userId)
        
        const filteredUsers = (data.users || []).filter((u: User) => u.id !== userId)
        console.log('Filtered users (excluding current user):', filteredUsers)
        setUsers(filteredUsers)
      } else {
        console.error('Failed to fetch users. Status:', r.status)
        const errorText = await r.text()
        console.error('Error response:', errorText)
      }
    } catch (err) {
      console.error('Error fetching users:', err)
    }
  }

  const fetchShares = async (todoId: number) => {
    try {
      const r = await fetch(`${API_URL}/todos/${todoId}/shares?user_id=${userId}`)
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
    fetchTodos()
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
        description: description.trim(),
        status,
        priority,
        due_date: dueDate || null
      }

      if (editingTodo) {
        // Update
        const r = await fetch(`${API_URL}/todos/${editingTodo.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        if (r.ok) {
          fetchTodos()
          resetForm()
        }
      } else {
        // Create
        const r = await fetch(`${API_URL}/todos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        if (r.ok) {
          fetchTodos()
          resetForm()
        }
      }
    } catch (err) {
      console.error('Error saving todo:', err)
    }
  }

  const handleDelete = async (todoId: number) => {
    if (!confirm('Delete this todo?')) return
    
    try {
      const r = await fetch(`${API_URL}/todos/${todoId}?user_id=${userId}`, {
        method: 'DELETE'
      })
      if (r.ok) {
        fetchTodos()
      }
    } catch (err) {
      console.error('Error deleting todo:', err)
    }
  }

  const handleShareClick = async (todo: Todo) => {
    setSharingTodo(todo)
    setSelectedUserId(null)
    setSharePermission('read')
    await fetchShares(todo.id)
  }

  const handleAddShare = async () => {
    if (!sharingTodo || !selectedUserId) {
      alert('Please select a user to share with')
      return
    }

    try {
      const r = await fetch(`${API_URL}/todos/${sharingTodo.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          shared_with_user_id: selectedUserId,
          permission: sharePermission
        })
      })
      
      if (r.ok) {
        await fetchShares(sharingTodo.id)
        setSelectedUserId(null)
        setSharePermission('read')
      } else {
        const error = await r.json()
        alert(error.error || 'Failed to share todo')
      }
    } catch (err) {
      console.error('Error sharing todo:', err)
      alert('Failed to share todo')
    }
  }

  const handleRemoveShare = async (shareId: number) => {
    if (!sharingTodo) return
    
    if (!confirm('Remove this share?')) return

    try {
      const r = await fetch(`${API_URL}/todos/${sharingTodo.id}/share/${shareId}?user_id=${userId}`, {
        method: 'DELETE'
      })
      
      if (r.ok) {
        await fetchShares(sharingTodo.id)
      }
    } catch (err) {
      console.error('Error removing share:', err)
    }
  }

  const handleEdit = (todo: Todo) => {
    setEditingTodo(todo)
    setTitle(todo.title)
    setDescription(todo.description)
    setStatus(todo.status)
    setPriority(todo.priority)
    setDueDate(todo.due_date ? todo.due_date.split('T')[0] : '')
    setIsAdding(true)
  }

  const toggleStatus = async (todo: Todo) => {
    const newStatus = todo.status === 'completed' ? 'pending' : 'completed'
    
    try {
      const r = await fetch(`${API_URL}/todos/${todo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          title: todo.title,
          description: todo.description,
          status: newStatus,
          priority: todo.priority,
          due_date: todo.due_date
        })
      })
      if (r.ok) {
        fetchTodos()
      }
    } catch (err) {
      console.error('Error toggling status:', err)
    }
  }

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setStatus('pending')
    setPriority('medium')
    setDueDate('')
    setIsAdding(false)
    setEditingTodo(null)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 size={18} color="#10b981" />
      case 'in_progress':
        return <Clock size={18} color="#f59e0b" />
      default:
        return <Circle size={18} color="#6b7280" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return '#ef4444'
      case 'medium':
        return '#f59e0b'
      case 'low':
        return '#10b981'
      default:
        return '#6b7280'
    }
  }

  return (
    <div className="glass-card" style={{ padding: 24, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckSquare size={16} color="#34d399" />
          </div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>To-Do List</h2>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: '13px' }}
        >
          <Plus size={14} /> Add Task
        </button>
      </div>

      {isAdding ? (
        <div style={{
          background: 'var(--surface-2)',
          borderRadius: 12,
          padding: 20,
          border: '1px solid var(--border)',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto'
        }}>
          <h3 style={{ marginTop: 0, color: 'var(--text-main)', fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
            {editingTodo ? 'Edit Task' : 'New Task'}
          </h3>
          <div style={{ display: 'grid', gap: 14, flex: 1 }}>
            <label style={{ display: 'grid', gap: 5 }}>
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Title *</span>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Task title"
                autoFocus
              />
            </label>
            <label style={{ display: 'grid', gap: 5 }}>
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Description</span>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Task description..."
                rows={3}
                style={{ resize: 'vertical' }}
              />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label style={{ display: 'grid', gap: 5 }}>
                <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status</span>
                <select value={status} onChange={e => setStatus(e.target.value as 'pending' | 'in_progress' | 'completed')}>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </label>
              <label style={{ display: 'grid', gap: 5 }}>
                <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Priority</span>
                <select value={priority} onChange={e => setPriority(e.target.value as 'low' | 'medium' | 'high')}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
            </div>
            <label style={{ display: 'grid', gap: 5 }}>
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Due Date</span>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </label>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
            <button onClick={resetForm} className="btn-secondary" style={{ padding: '8px 18px', fontSize: 13 }}>
              Cancel
            </button>
            <button onClick={handleSave} className="btn-primary" style={{ padding: '8px 18px', fontSize: 13 }}>
              {editingTodo ? 'Update' : 'Save'}
            </button>
          </div>
        </div>
      ) : loading ? (
        <div style={{ padding: 24, textAlign: 'center' }}>Loading todos...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', flex: 1 }}>
          {todos.map(todo => (
            <div
              key={todo.id}
              style={{
                background: 'var(--surface-2)',
                borderRadius: 10,
                padding: '14px 16px',
                border: '1px solid var(--border)',
                borderLeft: `3px solid ${getPriorityColor(todo.priority)}`,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12
              }}
            >
              <button
                onClick={() => toggleStatus(todo)}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer', 
                  padding: 0,
                  marginTop: 2
                }}
              >
                {getStatusIcon(todo.status)}
              </button>
              
              <div onClick={() => handleEdit(todo)} style={{ cursor: 'pointer', flex: 1 }}>
                <h3 style={{ 
                  margin: '0 0 4px 0', 
                  fontSize: 16, 
                  fontWeight: 600, 
                  textDecoration: todo.status === 'completed' ? 'line-through' : 'none',
                  color: todo.status === 'completed' ? 'var(--text-muted)' : 'var(--text-main)'
                }}>
                  {todo.title}
                </h3>
                {todo.description && (
                  <p style={{ 
                    margin: '0 0 8px 0',
                    fontSize: 14,
                    color: 'var(--text-secondary)',
                    textDecoration: todo.status === 'completed' ? 'line-through' : 'none'
                  }}>
                    {todo.description}
                  </p>
                )}
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ 
                    fontSize: 11, 
                    padding: '2px 8px', 
                    borderRadius: 4, 
                    background: todo.status === 'completed' ? '#d1fae5' : todo.status === 'in_progress' ? '#fef3c7' : '#f3f4f6',
                    color: todo.status === 'completed' ? '#065f46' : todo.status === 'in_progress' ? '#92400e' : '#374151',
                    fontWeight: 600,
                    textTransform: 'uppercase'
                  }}>
                    {todo.status.replace('_', ' ')}
                  </span>
                  <span style={{ 
                    fontSize: 11, 
                    padding: '2px 8px', 
                    borderRadius: 4, 
                    background: getPriorityColor(todo.priority) + '20',
                    color: getPriorityColor(todo.priority),
                    fontWeight: 600,
                    textTransform: 'uppercase'
                  }}>
                    {todo.priority}
                  </span>
                  {todo.due_date && (
                    <span style={{ fontSize: 12, color: '#666' }}>
                      Due: {new Date(todo.due_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {todo.access_level && todo.access_level !== 'owner' && (
                  <div style={{ fontSize: 11, color: '#666', marginTop: 8, fontStyle: 'italic' }}>
                    Shared by {todo.owner_name}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                {todo.access_level === 'owner' && (
                  <button
                    onClick={() => handleShareClick(todo)}
                    style={{ 
                      padding: 6, 
                      background: '#dbeafe', 
                      border: 'none', 
                      borderRadius: 6, 
                      cursor: 'pointer' 
                    }}
                    title="Share"
                  >
                    <Share2 size={16} color="#1e40af" />
                  </button>
                )}
                <button
                  onClick={() => handleEdit(todo)}
                  style={{ 
                    padding: 6, 
                    background: '#f3f4f6', 
                    border: 'none', 
                    borderRadius: 6, 
                    cursor: 'pointer',
                    opacity: todo.access_level === 'read' ? 0.5 : 1
                  }}
                  title="Edit"
                  disabled={todo.access_level === 'read'}
                >
                  <Edit2 size={16} />
                </button>
                {todo.access_level === 'owner' && (
                  <button
                    onClick={() => handleDelete(todo.id)}
                    style={{ 
                      padding: 6, 
                      background: '#fee2e2', 
                      border: 'none', 
                      borderRadius: 6, 
                      cursor: 'pointer' 
                    }}
                    title="Delete"
                  >
                    <X size={16} color="#ef4444" />
                  </button>
                )}
              </div>
            </div>
          ))}
          {todos.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              <CheckSquare size={40} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.3 }} />
              <p style={{ margin: 0, fontSize: 13 }}>No tasks yet. Click "Add Task" to create one!</p>
            </div>
          )}
        </div>
      )}

      {/* Share Dialog */}
      {sharingTodo && (
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
          onClick={() => setSharingTodo(null)}
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
              Share Task: {sharingTodo.title}
            </h3>

            {/* Add new share */}
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

            {/* Current shares */}
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
              <button onClick={() => setSharingTodo(null)} className="btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
