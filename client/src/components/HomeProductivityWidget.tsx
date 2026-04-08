import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Plus, X, Pin, StickyNote, CheckSquare, CheckCircle2, Circle, Clock, Trash2 } from 'lucide-react'
import { API_URL } from '../config/api'

// ─── Types ────────────────────────────────────────────────────────────────────
type CalEvent  = { id: string; date: string; name: string; type: 'holiday' | 'event' }
type Note      = { id: number; user_id: number; title: string; content: string; color: string; is_pinned: boolean; created_at: string; updated_at: string; owner_name?: string; access_level?: 'owner' | 'read' | 'write' }
type ApiTodo   = { id: number; user_id: number; title: string; description: string; status: 'pending' | 'in_progress' | 'completed'; priority: 'low' | 'medium' | 'high'; due_date: string | null; created_at: string; updated_at: string; owner_name?: string; access_level?: 'owner' | 'read' | 'write' }
type RightTab  = 'notes' | 'tasks'

// ─── Constants ────────────────────────────────────────────────────────────────
const HOLIDAYS: CalEvent[] = [
  { id: 'h1',  date: '2025-01-14', name: 'Tamil Thai Pongal',        type: 'holiday' },
  { id: 'h2',  date: '2025-02-04', name: 'Independence Day',         type: 'holiday' },
  { id: 'h3',  date: '2025-04-13', name: 'Sinhala & Tamil New Year', type: 'holiday' },
  { id: 'h4',  date: '2025-04-14', name: 'New Year Holiday',         type: 'holiday' },
  { id: 'h5',  date: '2025-05-01', name: 'May Day',                  type: 'holiday' },
  { id: 'h6',  date: '2025-12-25', name: 'Christmas Day',            type: 'holiday' },
  { id: 'h7',  date: '2026-01-14', name: 'Tamil Thai Pongal',        type: 'holiday' },
  { id: 'h8',  date: '2026-02-04', name: 'Independence Day',         type: 'holiday' },
  { id: 'h9',  date: '2026-04-13', name: 'Sinhala & Tamil New Year', type: 'holiday' },
  { id: 'h10', date: '2026-04-14', name: 'New Year Holiday',         type: 'holiday' },
]

const NOTE_COLORS = [
  { value: '#fef9c3' }, { value: '#fce7f3' }, { value: '#dbeafe' },
  { value: '#dcfce7' }, { value: '#ede9fe' }, { value: '#ffedd5' },
]

const DAY_HEADERS  = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
const toDateStr    = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const uid          = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6)

const priorityCfg = (p: string) => {
  if (p === 'high')   return { color: '#ef4444', label: 'HIGH', bg: 'rgba(239,68,68,0.09)'  }
  if (p === 'medium') return { color: '#f59e0b', label: 'MED',  bg: 'rgba(245,158,11,0.09)' }
  return                     { color: '#10b981', label: 'LOW',  bg: 'rgba(16,185,129,0.09)' }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function HomeProductivityWidget({ userId, accessToken }: { userId: number; accessToken: string }) {

  // ── Calendar state ──────────────────────────────────────────────────────────
  const [currentDate,   setCurrentDate]   = useState(new Date())
  const [selectedDate,  setSelectedDate]  = useState(new Date())
  const [userEvents,    setUserEvents]    = useState<CalEvent[]>([])
  const [addingEvent,   setAddingEvent]   = useState(false)
  const [newEventName,  setNewEventName]  = useState('')

  // ── Panel state ─────────────────────────────────────────────────────────────
  const [rightTab, setRightTab] = useState<RightTab>('notes')

  // ── Notes state ─────────────────────────────────────────────────────────────
  const [notes,        setNotes]        = useState<Note[]>([])
  const [notesLoading, setNotesLoading] = useState(false)
  const [addingNote,   setAddingNote]   = useState(false)
  const [editingNote,  setEditingNote]  = useState<Note | null>(null)
  const [noteTitle,    setNoteTitle]    = useState('')
  const [noteContent,  setNoteContent]  = useState('')
  const [noteColor,    setNoteColor]    = useState(NOTE_COLORS[0].value)
  const [notePinned,   setNotePinned]   = useState(false)

  // ── Tasks state ─────────────────────────────────────────────────────────────
  const [todos,        setTodos]        = useState<ApiTodo[]>([])
  const [todosLoading, setTodosLoading] = useState(false)
  const [addingTodo,   setAddingTodo]   = useState(false)
  const [editingTodo,  setEditingTodo]  = useState<ApiTodo | null>(null)
  const [todoTitle,    setTodoTitle]    = useState('')
  const [todoDesc,     setTodoDesc]     = useState('')
  const [todoPriority, setTodoPriority] = useState<'low'|'medium'|'high'>('medium')
  const [todoStatus,   setTodoStatus]   = useState<'pending'|'in_progress'|'completed'>('pending')
  const [todoDue,      setTodoDue]      = useState('')

  // ── Load / persist localStorage events ──────────────────────────────────────
  useEffect(() => {
    try { const ev = localStorage.getItem('cal_events'); if (ev) setUserEvents(JSON.parse(ev)) } catch { /* */ }
  }, [])
  useEffect(() => { localStorage.setItem('cal_events', JSON.stringify(userEvents)) }, [userEvents])

  // ── Fetch from API ───────────────────────────────────────────────────────────
  const fetchNotes = async () => {
    setNotesLoading(true)
    try {
      const r = await fetch(`${API_URL}/notes?user_id=${userId}`, { headers: { Authorization: `Bearer ${accessToken}` } })
      if (r.ok) setNotes((await r.json()) || [])
    } catch { /* */ } finally { setNotesLoading(false) }
  }
  const fetchTodos = async () => {
    setTodosLoading(true)
    try {
      const r = await fetch(`${API_URL}/todos?user_id=${userId}`, { headers: { Authorization: `Bearer ${accessToken}` } })
      if (r.ok) setTodos((await r.json()) || [])
    } catch { /* */ } finally { setTodosLoading(false) }
  }
  useEffect(() => { fetchNotes(); fetchTodos() }, [userId])

  // ── Calendar helpers ─────────────────────────────────────────────────────────
  const year        = currentDate.getFullYear()
  const month       = currentDate.getMonth()
  const firstDay    = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startOffset = (firstDay.getDay() + 6) % 7

  const calDays: (Date | null)[] = []
  for (let i = 0; i < startOffset; i++) calDays.push(null)
  for (let i = 1; i <= daysInMonth; i++) calDays.push(new Date(year, month, i))

  const isToday   = (d: Date) => { const t = new Date(); return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear() }
  const isSameDay = (a: Date, b: Date) => a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
  const hasAct    = (d: Date) => { const ds = toDateStr(d); return HOLIDAYS.some(h => h.date === ds) || userEvents.some(e => e.date === ds) }

  const selDateStr    = toDateStr(selectedDate)
  const selEvents     = [...HOLIDAYS.filter(h => h.date === selDateStr), ...userEvents.filter(e => e.date === selDateStr)]
  const monthLabel    = currentDate.toLocaleString('default', { month: 'long' })
  const selLabel      = selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  // ── Calendar event handlers ──────────────────────────────────────────────────
  const addCalEvent = () => {
    if (!newEventName.trim()) return
    setUserEvents(p => [...p, { id: uid(), date: selDateStr, name: newEventName.trim(), type: 'event' }])
    setNewEventName(''); setAddingEvent(false)
  }

  // ── Note handlers ────────────────────────────────────────────────────────────
  const saveNote = async () => {
    if (!noteTitle.trim()) return
    const payload = { user_id: userId, title: noteTitle.trim(), content: noteContent.trim(), color: noteColor, is_pinned: notePinned }
    const url = editingNote ? `${API_URL}/notes/${editingNote.id}` : `${API_URL}/notes`
    try {
      const r = await fetch(url, { method: editingNote ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }, body: JSON.stringify(payload) })
      if (r.ok) { fetchNotes(); resetNote() }
    } catch { /* */ }
  }
  const deleteNote = async (id: number) => {
    if (!confirm('Delete this note?')) return
    try { const r = await fetch(`${API_URL}/notes/${id}?user_id=${userId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } }); if (r.ok) fetchNotes() } catch { /* */ }
  }
  const openEditNote = (n: Note) => { setEditingNote(n); setNoteTitle(n.title); setNoteContent(n.content); setNoteColor(n.color); setNotePinned(n.is_pinned); setAddingNote(true) }
  const togglePin = async (n: Note) => {
    try {
      const r = await fetch(`${API_URL}/notes/${n.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ user_id: userId, title: n.title, content: n.content, color: n.color, is_pinned: !n.is_pinned }) })
      if (r.ok) fetchNotes()
    } catch { /* */ }
  }
  const resetNote = () => { setAddingNote(false); setEditingNote(null); setNoteTitle(''); setNoteContent(''); setNoteColor(NOTE_COLORS[0].value); setNotePinned(false) }

  // ── Todo handlers ────────────────────────────────────────────────────────────
  const saveTodo = async () => {
    if (!todoTitle.trim()) return
    const payload = { user_id: userId, title: todoTitle.trim(), description: todoDesc.trim(), status: todoStatus, priority: todoPriority, due_date: todoDue || null }
    const url = editingTodo ? `${API_URL}/todos/${editingTodo.id}` : `${API_URL}/todos`
    try {
      const r = await fetch(url, { method: editingTodo ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }, body: JSON.stringify(payload) })
      if (r.ok) { fetchTodos(); resetTodo() }
    } catch { /* */ }
  }
  const deleteTodo = async (id: number) => {
    if (!confirm('Delete this task?')) return
    try { const r = await fetch(`${API_URL}/todos/${id}?user_id=${userId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } }); if (r.ok) fetchTodos() } catch { /* */ }
  }
  const openEditTodo = (t: ApiTodo) => { setEditingTodo(t); setTodoTitle(t.title); setTodoDesc(t.description); setTodoStatus(t.status); setTodoPriority(t.priority); setTodoDue(t.due_date ? t.due_date.split('T')[0] : ''); setAddingTodo(true) }
  const toggleStatus = async (t: ApiTodo) => {
    const newStatus = t.status === 'completed' ? 'pending' : 'completed'
    try {
      const r = await fetch(`${API_URL}/todos/${t.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ user_id: userId, title: t.title, description: t.description, status: newStatus, priority: t.priority, due_date: t.due_date }) })
      if (r.ok) fetchTodos()
    } catch { /* */ }
  }
  const resetTodo = () => { setAddingTodo(false); setEditingTodo(null); setTodoTitle(''); setTodoDesc(''); setTodoStatus('pending'); setTodoPriority('medium'); setTodoDue('') }

  const switchTab = (tab: RightTab) => { setRightTab(tab); resetNote(); resetTodo() }
  const isFormOpen = rightTab === 'notes' ? addingNote : addingTodo

  const completedCount = todos.filter(t => t.status === 'completed').length
  const sortedNotes    = [...notes.filter(n => n.is_pinned), ...notes.filter(n => !n.is_pinned)]

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e8edf3', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', overflow: 'hidden', display: 'flex', height: 520, fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ══════════ LEFT: Calendar ══════════ */}
      <div style={{ flex: '0 0 44%', borderRight: '1px solid #f0f4f8', display: 'flex', flexDirection: 'column', background: '#fff', overflow: 'hidden', position: 'relative' }}>

        {/* ── Dark gradient header ── */}
        <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', padding: '20px 18px 16px', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
          {/* Header orbs */}
          <div style={{ position: 'absolute', top: -30, right: -20, width: 110, height: 110, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.35) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -20, left: 20, width: 80, height: 80, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.25) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: 10, left: '40%', width: 55, height: 55, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />
          {/* Month + Year */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', lineHeight: 1 }}>{monthLabel}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: 500, marginTop: 2 }}>{year}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                onClick={() => { const t = new Date(); setCurrentDate(new Date(t.getFullYear(), t.getMonth(), 1)); setSelectedDate(t) }}
                style={{ padding: '4px 10px', fontSize: 10, fontWeight: 700, borderRadius: 20, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)', cursor: 'pointer', letterSpacing: '0.3px', backdropFilter: 'blur(4px)', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
              >TODAY</button>
              <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', cursor: 'pointer', color: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
              ><ChevronLeft size={13} /></button>
              <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', cursor: 'pointer', color: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
              ><ChevronRight size={13} /></button>
            </div>
          </div>

          {/* Day headers inside header */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {DAY_HEADERS.map((d, i) => (
              <div key={d} style={{ textAlign: 'center', fontSize: 9, fontWeight: 700, letterSpacing: '0.5px', color: i === 6 ? 'rgba(252,165,165,0.7)' : 'rgba(255,255,255,0.35)', padding: '2px 0' }}>{d}</div>
            ))}
          </div>
        </div>

        {/* ── Day cells ── */}
        <div style={{ padding: '10px 12px 8px', flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', background: 'linear-gradient(180deg, #f8faff 0%, #ffffff 100%)' }}>

          {/* Dot-grid texture */}
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(99,102,241,0.12) 1px, transparent 1px)', backgroundSize: '18px 18px', pointerEvents: 'none', zIndex: 0 }} />

          {/* Ambient orbs behind the grid */}
          <div style={{ position: 'absolute', top: '20%', left: '60%', width: 90, height: 90, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
          <div style={{ position: 'absolute', bottom: '15%', left: '10%', width: 70, height: 70, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.09) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px 0', flex: 1, alignContent: 'start', position: 'relative', zIndex: 1 }}>
            {calDays.map((d, i) => {
              if (!d) return <div key={i} />
              const today    = isToday(d)
              const selected = isSameDay(d, selectedDate)
              const act      = hasAct(d)
              const isSun    = d.getDay() === 0

              let bg        = 'transparent'
              let textColor = isSun ? '#f87171' : '#1e293b'
              let fw        = 500
              let shadow    = 'none'

              if (selected && today) {
                bg = 'linear-gradient(135deg, #6366f1, #3b82f6)'; textColor = '#fff'; fw = 800; shadow = '0 4px 12px rgba(99,102,241,0.45)'
              } else if (selected) {
                bg = '#1e293b'; textColor = '#fff'; fw = 700; shadow = '0 3px 10px rgba(15,23,42,0.3)'
              } else if (today) {
                bg = 'linear-gradient(135deg, #6366f1, #3b82f6)'; textColor = '#fff'; fw = 700; shadow = '0 3px 10px rgba(99,102,241,0.35)'
              }

              return (
                <div key={i} onClick={() => setSelectedDate(d)}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3px 0', cursor: 'pointer' }}
                >
                  <div
                    style={{ width: 30, height: 30, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg, fontSize: 12, fontWeight: fw, color: textColor, transition: 'all 0.15s', boxShadow: shadow }}
                    onMouseEnter={e => { if (!selected && !today) { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#1e293b' } }}
                    onMouseLeave={e => { if (!selected && !today) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = isSun ? '#f87171' : '#1e293b' } }}
                  >{d.getDate()}</div>
                  <div style={{ height: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                    {act && <div style={{ width: 4, height: 4, borderRadius: '50%', background: selected ? 'rgba(255,255,255,0.7)' : 'linear-gradient(135deg, #6366f1, #3b82f6)', boxShadow: selected ? 'none' : '0 1px 4px rgba(99,102,241,0.4)' }} />}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Events panel ── */}
        <div style={{ borderTop: '1px solid rgba(99,102,241,0.1)', padding: '10px 14px 14px', flexShrink: 0, position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #f5f3ff 0%, #eff6ff 100%)' }}>
          {/* Events panel orbs */}
          <div style={{ position: 'absolute', top: -18, right: -10, width: 70, height: 70, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -10, left: 30, width: 50, height: 50, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', lineHeight: 1 }}>{selLabel}</div>
              <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{selEvents.length} {selEvents.length === 1 ? 'event' : 'events'}</div>
            </div>
            {!addingEvent && (
              <button onClick={() => setAddingEvent(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', fontSize: 10, fontWeight: 700, borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #6366f1, #3b82f6)', color: '#fff', cursor: 'pointer', boxShadow: '0 2px 8px rgba(99,102,241,0.3)', transition: 'opacity 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.88' }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
              ><Plus size={10} />Add</button>
            )}
          </div>

          {addingEvent && (
            <div style={{ display: 'flex', gap: 5, marginBottom: 8 }}>
              <input autoFocus value={newEventName} onChange={e => setNewEventName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addCalEvent(); if (e.key === 'Escape') { setAddingEvent(false); setNewEventName('') } }}
                placeholder="Event name…"
                style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: '1.5px solid #6366f1', fontSize: 11, background: '#fff', outline: 'none', color: '#1e293b', boxShadow: '0 0 0 3px rgba(99,102,241,0.12)' }}
              />
              <button onClick={addCalEvent}
                style={{ padding: '5px 10px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #6366f1, #3b82f6)', color: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 6px rgba(99,102,241,0.3)' }}
              >Save</button>
              <button onClick={() => { setAddingEvent(false); setNewEventName('') }}
                style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              ><X size={12} /></button>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 72, overflowY: 'auto' }}>
            {selEvents.length === 0 && !addingEvent
              ? <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 0' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Plus size={12} color="#cbd5e1" />
                  </div>
                  <span style={{ fontSize: 11, color: '#cbd5e1' }}>No events — tap Add</span>
                </div>
              : selEvents.map((ev, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 9, background: ev.type === 'holiday' ? 'rgba(16,185,129,0.07)' : 'rgba(99,102,241,0.07)', border: `1px solid ${ev.type === 'holiday' ? 'rgba(16,185,129,0.2)' : 'rgba(99,102,241,0.18)'}` }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: ev.type === 'holiday' ? '#10b981' : '#6366f1', flexShrink: 0, boxShadow: `0 1px 4px ${ev.type === 'holiday' ? 'rgba(16,185,129,0.5)' : 'rgba(99,102,241,0.5)'}` }} />
                  <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.name}</span>
                  <span style={{ fontSize: 8, fontWeight: 700, color: ev.type === 'holiday' ? '#059669' : '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.5px', background: ev.type === 'holiday' ? 'rgba(16,185,129,0.12)' : 'rgba(99,102,241,0.12)', padding: '2px 5px', borderRadius: 4 }}>{ev.type}</span>
                  {ev.type === 'event' && (
                    <button onClick={() => setUserEvents(p => p.filter(e => e.id !== ev.id))
                    } style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', padding: '1px', display: 'flex', transition: 'color 0.12s' }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#ef4444' }}
                      onMouseLeave={e => { e.currentTarget.style.color = '#cbd5e1' }}
                    ><Trash2 size={10} /></button>
                  )}
                </div>
              ))
            }
          </div>
          </div>{/* end zIndex wrapper */}
        </div>
      </div>

      {/* ══════════ RIGHT: Notes / Tasks ══════════ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: rightTab === 'notes' ? 'linear-gradient(180deg, #fdf4ff 0%, #f5f3ff 40%, #f0f4ff 100%)' : 'linear-gradient(180deg, #f0fdf4 0%, #eff6ff 40%, #f0f9ff 100%)', transition: 'background 0.4s ease' }}>

        {/* ── Header with gradient bg + orbs ── */}
        <div style={{ position: 'relative', overflow: 'hidden', flexShrink: 0, padding: '18px 18px 16px', background: rightTab === 'notes' ? 'linear-gradient(135deg, #fdf4ff 0%, #f5f3ff 50%, #eff6ff 100%)' : 'linear-gradient(135deg, #f0fdf4 0%, #eff6ff 50%, #f0f9ff 100%)', borderBottom: '1px solid rgba(0,0,0,0.05)', transition: 'background 0.4s ease' }}>

          {/* Decorative orbs */}
          <div style={{ position: 'absolute', top: -28, right: -20, width: 100, height: 100, borderRadius: '50%', background: rightTab === 'notes' ? 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(16,185,129,0.18) 0%, transparent 70%)', pointerEvents: 'none', transition: 'background 0.4s ease' }} />
          <div style={{ position: 'absolute', bottom: -20, right: 60, width: 70, height: 70, borderRadius: '50%', background: rightTab === 'notes' ? 'radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(59,130,246,0.14) 0%, transparent 70%)', pointerEvents: 'none', transition: 'background 0.4s ease' }} />
          <div style={{ position: 'absolute', top: 10, right: 90, width: 44, height: 44, borderRadius: '50%', background: rightTab === 'notes' ? 'radial-gradient(circle, rgba(167,139,250,0.12) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(52,211,153,0.12) 0%, transparent 70%)', pointerEvents: 'none', transition: 'background 0.4s ease' }} />

          {/* Section title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, position: 'relative' }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: rightTab === 'notes' ? 'linear-gradient(135deg, #a78bfa, #818cf8)' : 'linear-gradient(135deg, #34d399, #3b82f6)', boxShadow: rightTab === 'notes' ? '0 4px 12px rgba(139,92,246,0.35)' : '0 4px 12px rgba(52,211,153,0.35)', transition: 'all 0.3s ease', flexShrink: 0 }}>
              {rightTab === 'notes' ? <StickyNote size={15} color="#fff" /> : <CheckSquare size={15} color="#fff" />}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px', lineHeight: 1 }}>
                {rightTab === 'notes' ? 'My Notes' : 'My Tasks'}
              </div>
              <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500, marginTop: 2 }}>
                {rightTab === 'notes'
                  ? `${notes.filter(n => n.is_pinned).length} pinned · ${notes.length} total`
                  : `${completedCount} done · ${todos.length - completedCount} remaining`}
              </div>
            </div>
          </div>

          {/* Segmented toggle */}
          <div style={{ position: 'relative', display: 'flex', background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(8px)', borderRadius: 14, padding: 4, gap: 4, border: '1px solid rgba(255,255,255,0.9)', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', width: '100%' }}>
            {([
              ['notes', 'Notes', <StickyNote size={12} />, notes.length],
              ['tasks', 'Tasks', <CheckSquare size={12} />, todos.length],
            ] as [RightTab, string, React.ReactNode, number][]).map(([key, label, icon, count]) => {
              const active = rightTab === key
              const activeGrad = key === 'notes' ? 'linear-gradient(135deg, #8b5cf6, #6366f1)' : 'linear-gradient(135deg, #10b981, #3b82f6)'
              const activeShadow = key === 'notes' ? '0 3px 14px rgba(139,92,246,0.38)' : '0 3px 14px rgba(16,185,129,0.35)'
              return (
                <button key={key} onClick={() => switchTab(key)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 0', fontSize: 12, fontWeight: 700, borderRadius: 10, cursor: 'pointer', border: 'none', transition: 'all 0.22s cubic-bezier(0.34,1.56,0.64,1)', background: active ? activeGrad : 'transparent', color: active ? '#fff' : '#94a3b8', boxShadow: active ? activeShadow : 'none', transform: active ? 'scale(1.02)' : 'scale(1)' }}>
                  {icon}
                  {label}
                  <span style={{ fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 20, background: active ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.07)', color: active ? '#fff' : '#94a3b8', minWidth: 18, textAlign: 'center', lineHeight: '14px' }}>{count}</span>
                </button>
              )
            })}
          </div>

          {/* Task progress bar */}
          {rightTab === 'tasks' && todos.length > 0 && !addingTodo && (
            <div style={{ marginTop: 12, position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: '#64748b' }}>Progress</span>
                <span style={{ fontSize: 10, fontWeight: 800, color: '#10b981' }}>{Math.round((completedCount / todos.length) * 100)}%</span>
              </div>
              <div style={{ height: 6, background: 'rgba(0,0,0,0.07)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(completedCount / todos.length) * 100}%`, background: 'linear-gradient(90deg, #10b981, #3b82f6)', borderRadius: 99, transition: 'width 0.5s cubic-bezier(0.34,1.56,0.64,1)', boxShadow: '0 1px 6px rgba(16,185,129,0.4)' }} />
              </div>
            </div>
          )}
        </div>

        {/* Scrollable list area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 16px 8px', background: 'transparent' }}>

          {/* ── Notes list ── */}
          {rightTab === 'notes' && !addingNote && (
            notesLoading
              ? <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, padding: '24px 0' }}>Loading…</div>
              : notes.length === 0
                ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8, padding: '20px 0' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 13, background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <StickyNote size={20} color="#f59e0b" />
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>No notes yet</p>
                    <p style={{ margin: 0, fontSize: 11, color: '#cbd5e1' }}>Click "Add Note" to get started</p>
                  </div>
                )
                : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {sortedNotes.map(note => (
                      <div key={note.id}
                        onClick={() => openEditNote(note)}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: note.color, border: '1px solid rgba(255,255,255,0.8)', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', cursor: 'pointer', transition: 'transform 0.14s, box-shadow 0.14s' }}
                        onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(-2px)'; el.style.boxShadow = '0 6px 20px rgba(0,0,0,0.13)' }}
                        onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(0)'; el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)' }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{note.title}</div>
                          {note.content && <div style={{ fontSize: 11, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2, opacity: 0.7 }}>{note.content}</div>}
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                          {note.is_pinned && <Pin size={11} color="#64748b" style={{ opacity: 0.5 }} />}
                          {note.access_level !== 'read' && (
                            <button onClick={e => { e.stopPropagation(); togglePin(note) }}
                              style={{ padding: '3px 5px', background: 'rgba(0,0,0,0.07)', border: 'none', borderRadius: 5, cursor: 'pointer', display: 'flex' }}
                            ><Pin size={10} color="#374151" /></button>
                          )}
                          {note.access_level === 'owner' && (
                            <button onClick={e => { e.stopPropagation(); deleteNote(note.id) }}
                              style={{ padding: '3px 5px', background: 'rgba(239,68,68,0.10)', border: 'none', borderRadius: 5, cursor: 'pointer', display: 'flex' }}
                            ><X size={10} color="#ef4444" /></button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )
          )}

          {/* ── Note form ── */}
          {rightTab === 'notes' && addingNote && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{editingNote ? 'Edit Note' : 'New Note'}</h3>
                <button onClick={resetNote} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: 2 }}><X size={15} /></button>
              </div>
              <input value={noteTitle} onChange={e => setNoteTitle(e.target.value)} placeholder="Note title *" autoFocus
                style={{ padding: '8px 11px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)', fontSize: 13, outline: 'none', background: '#f8fafc', color: '#0f172a' }}
              />
              <textarea value={noteContent} onChange={e => setNoteContent(e.target.value)} placeholder="Content (optional)…"
                style={{ padding: '8px 11px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)', fontSize: 12, outline: 'none', resize: 'none', height: 80, background: '#f8fafc', color: '#0f172a' }}
              />
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Color</div>
                <div style={{ display: 'flex', gap: 7 }}>
                  {NOTE_COLORS.map(c => (
                    <button key={c.value} onClick={() => setNoteColor(c.value)}
                      style={{ width: 24, height: 24, borderRadius: 6, background: c.value, border: noteColor === c.value ? '2.5px solid #1e293b' : '1.5px solid rgba(0,0,0,0.10)', cursor: 'pointer', padding: 0, transition: 'transform 0.12s' }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.18)' }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
                    />
                  ))}
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={notePinned} onChange={e => setNotePinned(e.target.checked)} style={{ width: 14, height: 14 }} />
                <span style={{ fontSize: 12, fontWeight: 500, color: '#475569' }}>Pin this note</span>
              </label>
              <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                <button onClick={resetNote} style={{ flex: 1, padding: '8px', fontSize: 12, fontWeight: 600, background: 'transparent', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8, cursor: 'pointer', color: '#475569' }}>Cancel</button>
                <button onClick={saveNote} disabled={!noteTitle.trim()} style={{ flex: 1, padding: '8px', fontSize: 12, fontWeight: 600, background: '#1e293b', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', opacity: noteTitle.trim() ? 1 : 0.45 }}>{editingNote ? 'Update' : 'Save'}</button>
              </div>
            </div>
          )}

          {/* ── Tasks list ── */}
          {rightTab === 'tasks' && !addingTodo && (
            todosLoading
              ? <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, padding: '24px 0' }}>Loading…</div>
              : todos.length === 0
                ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8, padding: '20px 0' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 13, background: 'rgba(16,185,129,0.09)', border: '1px solid rgba(16,185,129,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckSquare size={20} color="#10b981" />
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>No tasks yet</p>
                    <p style={{ margin: 0, fontSize: 11, color: '#cbd5e1' }}>Click "Add Task" to get started</p>
                  </div>
                )
                : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {todos.map(todo => {
                      const p    = priorityCfg(todo.priority)
                      const done = todo.status === 'completed'
                      return (
                        <div key={todo.id}
                          style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px', borderRadius: 12, background: done ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.85)', border: `1px solid rgba(255,255,255,0.9)`, borderLeft: `3px solid ${done ? '#e2e8f0' : p.color}`, boxShadow: '0 2px 10px rgba(0,0,0,0.07)', opacity: done ? 0.6 : 1, transition: 'box-shadow 0.14s, transform 0.14s', backdropFilter: 'blur(6px)' }}
                          onMouseEnter={e => { if (!done) { e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.12)'; e.currentTarget.style.transform = 'translateY(-1px)' } }}
                          onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.07)'; e.currentTarget.style.transform = 'translateY(0)' }}
                        >
                          <button onClick={() => toggleStatus(todo)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '1px 0 0', flexShrink: 0 }}>
                            {done
                              ? <CheckCircle2 size={16} color="#10b981" />
                              : todo.status === 'in_progress'
                                ? <Clock size={16} color="#f59e0b" />
                                : <Circle size={16} color="#cbd5e1" />}
                          </button>
                          <div onClick={() => openEditTodo(todo)} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: done ? '#94a3b8' : '#0f172a', textDecoration: done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
                              {todo.title}
                            </div>
                            <div style={{ display: 'flex', gap: 5, marginTop: 2, alignItems: 'center' }}>
                              <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: p.bg, color: p.color, fontWeight: 700 }}>{p.label}</span>
                              {todo.status === 'in_progress' && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: 'rgba(245,158,11,0.09)', color: '#d97706', fontWeight: 600 }}>In Progress</span>}
                              {todo.due_date && <span style={{ fontSize: 10, color: '#94a3b8' }}>Due {new Date(todo.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                            </div>
                          </div>
                          <button onClick={() => deleteTodo(todo.id)}
                            style={{ padding: '4px 5px', background: '#fef2f2', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', flexShrink: 0, transition: 'background 0.12s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2' }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#fef2f2' }}
                          ><X size={11} color="#ef4444" /></button>
                        </div>
                      )
                    })}
                  </div>
                )
          )}

          {/* ── Task form ── */}
          {rightTab === 'tasks' && addingTodo && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{editingTodo ? 'Edit Task' : 'New Task'}</h3>
                <button onClick={resetTodo} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: 2 }}><X size={15} /></button>
              </div>
              <input value={todoTitle} onChange={e => setTodoTitle(e.target.value)} placeholder="Task title *" autoFocus
                style={{ padding: '8px 11px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)', fontSize: 13, outline: 'none', background: '#f8fafc', color: '#0f172a' }}
              />
              <textarea value={todoDesc} onChange={e => setTodoDesc(e.target.value)} placeholder="Description (optional)…"
                style={{ padding: '8px 11px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)', fontSize: 12, outline: 'none', resize: 'none', height: 56, background: '#f8fafc', color: '#0f172a' }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Priority</div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {(['low', 'medium', 'high'] as const).map(p => {
                      const cfg = priorityCfg(p)
                      return (
                        <button key={p} onClick={() => setTodoPriority(p)}
                          style={{ flex: 1, padding: '5px 0', fontSize: 9, fontWeight: 700, borderRadius: 6, cursor: 'pointer', border: `1.5px solid ${todoPriority === p ? cfg.color : 'rgba(0,0,0,0.09)'}`, background: todoPriority === p ? cfg.bg : 'transparent', color: cfg.color, transition: 'all 0.12s' }}
                        >{p === 'medium' ? 'MED' : p.toUpperCase()}</button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Status</div>
                  <select value={todoStatus} onChange={e => setTodoStatus(e.target.value as typeof todoStatus)}
                    style={{ width: '100%', padding: '5px 8px', borderRadius: 7, border: '1px solid rgba(0,0,0,0.12)', fontSize: 11, background: '#f8fafc', color: '#0f172a', outline: 'none' }}
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Due Date</div>
                <input type="date" value={todoDue} onChange={e => setTodoDue(e.target.value)}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: 7, border: '1px solid rgba(0,0,0,0.12)', fontSize: 12, background: '#f8fafc', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                <button onClick={resetTodo} style={{ flex: 1, padding: '8px', fontSize: 12, fontWeight: 600, background: 'transparent', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8, cursor: 'pointer', color: '#475569' }}>Cancel</button>
                <button onClick={saveTodo} disabled={!todoTitle.trim()} style={{ flex: 1, padding: '8px', fontSize: 12, fontWeight: 600, background: '#1e293b', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', opacity: todoTitle.trim() ? 1 : 0.45 }}>{editingTodo ? 'Update' : 'Save'}</button>
              </div>
            </div>
          )}

        </div>

        {/* Bottom: Add button */}
        {!isFormOpen && (
          <div style={{ padding: '10px 18px 16px', borderTop: '1px solid rgba(255,255,255,0.6)', flexShrink: 0 }}>
            <button
              onClick={() => { if (rightTab === 'notes') setAddingNote(true); else setAddingTodo(true) }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', borderRadius: 11, border: 'none', background: 'linear-gradient(135deg, #6366f1, #3b82f6)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'opacity 0.15s', boxShadow: '0 3px 12px rgba(99,102,241,0.35)' }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.88' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
            >
              <Plus size={14} />
              {rightTab === 'notes' ? 'Add Note' : 'Add Task'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
