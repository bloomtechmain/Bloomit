import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2, Circle, CheckCircle2 } from 'lucide-react'

type CalEvent = {
  id: string
  date: string
  name: string
  note?: string
  type: 'holiday' | 'event'
}

type Todo = {
  id: string
  title: string
  done: boolean
  priority: 'low' | 'medium' | 'high'
}

type Reminder = {
  id: string
  date: string
  text: string
}

type ActiveTab = 'events' | 'reminders' | 'todos'

const SAMPLE_HOLIDAYS: CalEvent[] = [
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

const EVENT_COLORS = [
  { bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.25)', accent: '#f87171' },
  { bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.25)',  accent: '#60a5fa' },
  { bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.25)',  accent: '#fbbf24' },
  { bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.25)', accent: '#a78bfa' },
]
const HOLIDAY_COLOR = { bg: 'rgba(74,222,128,0.12)', border: 'rgba(74,222,128,0.25)', accent: '#4ade80' }

const PRIORITY = {
  low:    { bg: 'rgba(74,222,128,0.11)',  border: 'rgba(74,222,128,0.24)',  dot: '#4ade80'  },
  medium: { bg: 'rgba(251,191,36,0.11)',  border: 'rgba(251,191,36,0.24)',  dot: '#fbbf24'  },
  high:   { bg: 'rgba(248,113,113,0.11)', border: 'rgba(248,113,113,0.24)', dot: '#f87171'  },
}

const DAY_HEADERS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

const toDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6)

const inputStyle: React.CSSProperties = {
  fontSize: 11, padding: '5px 9px', borderRadius: 6,
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.13)',
  color: 'var(--text-main)', outline: 'none', width: '100%', boxSizing: 'border-box',
}

export default function CalendarWidget() {
  const [currentDate, setCurrentDate]     = useState(new Date())
  const [selectedDate, setSelectedDate]   = useState<Date>(new Date())
  const [userEvents, setUserEvents]       = useState<CalEvent[]>([])
  const [todos, setTodos]                 = useState<Todo[]>([])
  const [reminders, setReminders]         = useState<Reminder[]>([])
  const [activeTab, setActiveTab]         = useState<ActiveTab>('events')

  // Event form
  const [isAddingEvent, setIsAddingEvent]   = useState(false)
  const [newEventName, setNewEventName]     = useState('')
  const [newEventNote, setNewEventNote]     = useState('')

  // Reminder form
  const [isAddingReminder, setIsAddingReminder] = useState(false)
  const [newReminderText, setNewReminderText]   = useState('')

  // Todo form
  const [isAddingTodo, setIsAddingTodo]         = useState(false)
  const [newTodoTitle, setNewTodoTitle]         = useState('')
  const [newTodoPriority, setNewTodoPriority]   = useState<Todo['priority']>('medium')

  // Load
  useEffect(() => {
    try {
      const ev = localStorage.getItem('cal_events'); if (ev) setUserEvents(JSON.parse(ev))
      const td = localStorage.getItem('cal_todos');  if (td) setTodos(JSON.parse(td))
      const rm = localStorage.getItem('cal_reminders'); if (rm) setReminders(JSON.parse(rm))
    } catch { /* ignore */ }
  }, [])

  // Persist
  useEffect(() => { localStorage.setItem('cal_events',    JSON.stringify(userEvents)) }, [userEvents])
  useEffect(() => { localStorage.setItem('cal_todos',     JSON.stringify(todos))      }, [todos])
  useEffect(() => { localStorage.setItem('cal_reminders', JSON.stringify(reminders))  }, [reminders])

  // Calendar math
  const year  = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay    = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startOffset = (firstDay.getDay() + 6) % 7 // Mon-based

  const days: (Date | null)[] = []
  for (let i = 0; i < startOffset; i++) days.push(null)
  for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i))

  const isToday = (d: Date) => {
    const t = new Date()
    return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear()
  }
  const isSameDay = (a: Date, b: Date) =>
    a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()

  const hasActivity = (d: Date) => {
    const ds = toDateStr(d)
    return SAMPLE_HOLIDAYS.some(h => h.date === ds) ||
           userEvents.some(e => e.date === ds) ||
           reminders.some(r => r.date === ds)
  }

  const eventsForDate  = (d: Date) => {
    const ds = toDateStr(d)
    return [...SAMPLE_HOLIDAYS.filter(h => h.date === ds), ...userEvents.filter(e => e.date === ds)]
  }
  const remindersForDate = (d: Date) => {
    const ds = toDateStr(d)
    return [
      ...SAMPLE_HOLIDAYS.filter(h => h.date === ds),
      ...reminders.filter(r => r.date === ds),
    ]
  }

  // Handlers
  const addEvent = () => {
    if (!newEventName.trim()) return
    setUserEvents(p => [...p, { id: uid(), date: toDateStr(selectedDate), name: newEventName.trim(), note: newEventNote.trim() || undefined, type: 'event' }])
    setNewEventName(''); setNewEventNote(''); setIsAddingEvent(false)
  }
  const deleteEvent = (id: string) => setUserEvents(p => p.filter(e => e.id !== id))

  const addReminder = () => {
    if (!newReminderText.trim()) return
    setReminders(p => [...p, { id: uid(), date: toDateStr(selectedDate), text: newReminderText.trim() }])
    setNewReminderText(''); setIsAddingReminder(false)
  }
  const deleteReminder = (id: string) => setReminders(p => p.filter(r => r.id !== id))

  const addTodo = () => {
    if (!newTodoTitle.trim()) return
    setTodos(p => [...p, { id: uid(), title: newTodoTitle.trim(), done: false, priority: newTodoPriority }])
    setNewTodoTitle(''); setNewTodoPriority('medium'); setIsAddingTodo(false)
  }
  const toggleTodo = (id: string) => setTodos(p => p.map(t => t.id === id ? { ...t, done: !t.done } : t))
  const deleteTodo = (id: string) => setTodos(p => p.filter(t => t.id !== id))

  const cancelForms = () => {
    setIsAddingEvent(false);   setNewEventName('');    setNewEventNote('')
    setIsAddingReminder(false); setNewReminderText('')
    setIsAddingTodo(false);    setNewTodoTitle('')
  }

  const isFormOpen = isAddingEvent || isAddingReminder || isAddingTodo

  const monthLabel   = currentDate.toLocaleString('default', { month: 'short' }).toUpperCase()
  const selDayNum    = selectedDate.getDate()
  const selMonthStr  = selectedDate.toLocaleString('default', { month: 'short' }).toUpperCase()
  const selWeekday   = selectedDate.toLocaleDateString('en-US', { weekday: 'long' })
  const pendingTodos = todos.filter(t => !t.done)
  const doneTodos    = todos.filter(t => t.done)

  return (
    <div className="glass-card" style={{ display: 'flex', overflow: 'hidden', height: 370, fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif" }}>

      {/* ── LEFT: Calendar Grid ── */}
      <div style={{ flex: '0 0 54%', padding: '12px 10px 10px 14px', borderRight: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column' }}>

        {/* View switcher + Today */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', borderRadius: 6, border: '1px solid rgba(255,255,255,0.09)', overflow: 'hidden' }}>
            {(['Day', 'Week', 'Month', 'Year'] as const).map((v, i, arr) => (
              <button key={v} style={{
                padding: '3px 8px', fontSize: 10, fontWeight: 600, border: 'none', cursor: 'pointer',
                borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.09)' : 'none',
                background: v === 'Month' ? 'var(--text-main)' : 'transparent',
                color: v === 'Month' ? 'var(--surface-3, #0a1628)' : 'var(--text-secondary)',
              }}>{v}</button>
            ))}
          </div>
          <button
            onClick={() => { const t = new Date(); setCurrentDate(new Date(t.getFullYear(), t.getMonth(), 1)); setSelectedDate(t) }}
            style={{ padding: '3px 9px', fontSize: 10, fontWeight: 600, borderRadius: 5, border: '1px solid rgba(255,255,255,0.09)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >Today</button>
        </div>

        {/* Month nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 10 }}>
          <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', padding: 3, borderRadius: 4 }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
          ><ChevronLeft size={13} /></button>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-main)', letterSpacing: '1.2px' }}>
            {monthLabel} {year}
          </span>
          <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', padding: 3, borderRadius: 4 }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
          ><ChevronRight size={13} /></button>
        </div>

        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 2 }}>
          {DAY_HEADERS.map((d, i) => (
            <div key={d} style={{ textAlign: 'center', fontSize: 8, fontWeight: 700, letterSpacing: '0.3px', padding: '1px 0', color: i === 6 ? 'rgba(248,113,113,0.60)' : 'var(--text-muted)' }}>{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flex: 1, alignContent: 'start' }}>
          {days.map((d, i) => {
            if (!d) return <div key={i} />
            const today    = isToday(d)
            const selected = isSameDay(d, selectedDate)
            const hasAct   = hasActivity(d)
            const isSun    = d.getDay() === 0

            let bg        = 'transparent'
            let textColor = isSun ? '#f87171' : 'var(--text-main)'
            let fw        = 400
            if (selected) { bg = 'var(--text-main)'; textColor = 'var(--surface-3, #0a1628)'; fw = 700 }
            else if (today) { bg = 'rgba(255,255,255,0.12)'; fw = 600 }

            return (
              <div key={i} onClick={() => setSelectedDate(d)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: 2, cursor: 'pointer' }}
              >
                <div
                  style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg, fontSize: 11, fontWeight: fw, color: textColor, transition: 'background 0.12s' }}
                  onMouseEnter={e => { if (!selected) e.currentTarget.style.background = 'rgba(255,255,255,0.09)' }}
                  onMouseLeave={e => { if (!selected) e.currentTarget.style.background = today ? 'rgba(255,255,255,0.12)' : 'transparent' }}
                >{d.getDate()}</div>
                <div style={{ height: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {hasAct && <div style={{ width: 3, height: 3, borderRadius: '50%', background: selected ? 'rgba(255,255,255,0.4)' : '#60a5fa', opacity: 0.8 }} />}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── RIGHT: Tabbed Panel ── */}
      <div style={{ flex: 1, padding: '12px 14px 10px 12px', display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Selected date */}
        <div style={{ flexShrink: 0, marginBottom: 8 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.5px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {selDayNum} <span style={{ opacity: 0.60 }}>{selMonthStr}</span>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 400, marginTop: 2, letterSpacing: '0.2px' }}>{selWeekday}</div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', flexShrink: 0, marginBottom: 8 }} />

        {/* 3 Tab toggles */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexShrink: 0 }}>
          {([['events', 'Events'], ['reminders', 'Reminders'], ['todos', 'To-do']] as [ActiveTab, string][]).map(([key, label]) => (
            <button key={key}
              onClick={() => { setActiveTab(key); cancelForms() }}
              style={{
                padding: '3px 9px', fontSize: 10, fontWeight: 600, borderRadius: 20, cursor: 'pointer', transition: 'all 0.12s',
                border: '1px solid rgba(255,255,255,0.09)',
                background: activeTab === key ? 'var(--text-main)' : 'transparent',
                color: activeTab === key ? 'var(--surface-3, #0a1628)' : 'var(--text-secondary)',
              }}
            >{label}</button>
          ))}
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>

          {/* ── EVENTS ── */}
          {activeTab === 'events' && (<>
            {eventsForDate(selectedDate).length === 0 && !isAddingEvent && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>No events for this day</span>
              </div>
            )}
            {eventsForDate(selectedDate).map((evt, idx) => {
              const c = evt.type === 'holiday' ? HOLIDAY_COLOR : EVENT_COLORS[idx % EVENT_COLORS.length]
              return (
                <div key={evt.id} style={{ padding: '6px 9px', borderRadius: 7, background: c.bg, border: `1px solid ${c.border}`, borderLeft: `2px solid ${c.accent}`, position: 'relative', flexShrink: 0 }}>
                  <div style={{ fontSize: 8, fontWeight: 700, color: c.accent, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 1 }}>
                    {evt.type === 'holiday' ? 'Holiday' : 'Event'}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-main)', paddingRight: evt.type === 'event' ? 16 : 0 }}>{evt.name}</div>
                  {evt.note && <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 1 }}>{evt.note}</div>}
                  {evt.type === 'event' && (
                    <button onClick={() => deleteEvent(evt.id)} style={{ position: 'absolute', top: 6, right: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 1, display: 'flex' }}>
                      <Trash2 size={10} />
                    </button>
                  )}
                </div>
              )
            })}
            {isAddingEvent && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
                <input autoFocus type="text" placeholder="Event name..." value={newEventName}
                  onChange={e => setNewEventName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addEvent(); if (e.key === 'Escape') cancelForms() }}
                  style={inputStyle}
                />
                <input type="text" placeholder="Note (optional)..." value={newEventNote}
                  onChange={e => setNewEventNote(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addEvent(); if (e.key === 'Escape') cancelForms() }}
                  style={inputStyle}
                />
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={cancelForms} className="btn-secondary" style={{ flex: 1, padding: '4px', fontSize: 10 }}>Cancel</button>
                  <button onClick={addEvent} className="btn-primary" style={{ flex: 1, padding: '4px', fontSize: 10 }} disabled={!newEventName.trim()}>Save</button>
                </div>
              </div>
            )}
          </>)}

          {/* ── REMINDERS ── */}
          {activeTab === 'reminders' && (<>
            {remindersForDate(selectedDate).length === 0 && !isAddingReminder && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>No reminders for this day</span>
              </div>
            )}
            {remindersForDate(selectedDate).map((item, idx) => {
              const isHoliday = 'type' in item && item.type === 'holiday'
              const label = isHoliday ? item.name : (item as Reminder).text
              return (
                <div key={idx} style={{ padding: '6px 9px', borderRadius: 7, background: 'rgba(139,92,246,0.10)', border: '1px solid rgba(139,92,246,0.20)', borderLeft: '2px solid #a78bfa', position: 'relative', flexShrink: 0 }}>
                  <div style={{ fontSize: 8, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 1 }}>
                    {isHoliday ? 'Holiday' : 'Reminder'}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-main)', paddingRight: !isHoliday ? 16 : 0 }}>{label}</div>
                  {!isHoliday && (
                    <button onClick={() => deleteReminder((item as Reminder).id)} style={{ position: 'absolute', top: 6, right: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 1, display: 'flex' }}>
                      <Trash2 size={10} />
                    </button>
                  )}
                </div>
              )
            })}
            {isAddingReminder && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
                <input autoFocus type="text" placeholder="Reminder..." value={newReminderText}
                  onChange={e => setNewReminderText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addReminder(); if (e.key === 'Escape') cancelForms() }}
                  style={inputStyle}
                />
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={cancelForms} className="btn-secondary" style={{ flex: 1, padding: '4px', fontSize: 10 }}>Cancel</button>
                  <button onClick={addReminder} className="btn-primary" style={{ flex: 1, padding: '4px', fontSize: 10 }} disabled={!newReminderText.trim()}>Save</button>
                </div>
              </div>
            )}
          </>)}

          {/* ── TO-DO ── */}
          {activeTab === 'todos' && (<>
            {pendingTodos.length === 0 && doneTodos.length === 0 && !isAddingTodo && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>No tasks yet</span>
              </div>
            )}
            {pendingTodos.map(todo => {
              const pc = PRIORITY[todo.priority]
              return (
                <div key={todo.id} style={{ padding: '5px 8px', borderRadius: 7, background: pc.bg, border: `1px solid ${pc.border}`, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => toggleTodo(todo.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: pc.dot, padding: 0, display: 'flex', flexShrink: 0 }}>
                    <Circle size={12} />
                  </button>
                  <span style={{ flex: 1, fontSize: 11, fontWeight: 500, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{todo.title}</span>
                  <span style={{ fontSize: 8, fontWeight: 700, color: pc.dot, textTransform: 'capitalize', flexShrink: 0 }}>{todo.priority}</span>
                  <button onClick={() => deleteTodo(todo.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex', flexShrink: 0 }}>
                    <Trash2 size={10} />
                  </button>
                </div>
              )
            })}
            {doneTodos.length > 0 && (
              <div style={{ fontSize: 8, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase', marginTop: 3, flexShrink: 0 }}>Done</div>
            )}
            {doneTodos.map(todo => (
              <div key={todo.id} style={{ padding: '5px 8px', borderRadius: 7, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 6, opacity: 0.5, flexShrink: 0 }}>
                <button onClick={() => toggleTodo(todo.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', flexShrink: 0 }}>
                  <CheckCircle2 size={12} color="#4ade80" />
                </button>
                <span style={{ flex: 1, fontSize: 11, fontWeight: 400, color: 'var(--text-secondary)', textDecoration: 'line-through', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{todo.title}</span>
                <button onClick={() => deleteTodo(todo.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex', flexShrink: 0 }}>
                  <Trash2 size={10} />
                </button>
              </div>
            ))}
            {isAddingTodo && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
                <input autoFocus type="text" placeholder="Task title..." value={newTodoTitle}
                  onChange={e => setNewTodoTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addTodo(); if (e.key === 'Escape') cancelForms() }}
                  style={inputStyle}
                />
                <div style={{ display: 'flex', gap: 4 }}>
                  {(['low', 'medium', 'high'] as Todo['priority'][]).map(p => (
                    <button key={p} onClick={() => setNewTodoPriority(p)} style={{
                      flex: 1, padding: '3px', fontSize: 9, fontWeight: 700, borderRadius: 5, cursor: 'pointer', textTransform: 'capitalize',
                      border: `1px solid ${PRIORITY[p].border}`,
                      background: newTodoPriority === p ? PRIORITY[p].bg : 'transparent',
                      color: PRIORITY[p].dot, transition: 'all 0.12s',
                    }}>{p}</button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={cancelForms} className="btn-secondary" style={{ flex: 1, padding: '4px', fontSize: 10 }}>Cancel</button>
                  <button onClick={addTodo} className="btn-primary" style={{ flex: 1, padding: '4px', fontSize: 10 }} disabled={!newTodoTitle.trim()}>Save</button>
                </div>
              </div>
            )}
          </>)}
        </div>

        {/* Dashed add button */}
        {!isFormOpen && (
          <button
            onClick={() => {
              if (activeTab === 'events') setIsAddingEvent(true)
              else if (activeTab === 'reminders') setIsAddingReminder(true)
              else setIsAddingTodo(true)
            }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              width: '100%', padding: '5px', borderRadius: 7, marginTop: 7, flexShrink: 0,
              border: '1px dashed rgba(255,255,255,0.15)', background: 'transparent',
              color: 'var(--text-muted)', fontSize: 10, fontWeight: 600, cursor: 'pointer', transition: 'all 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.30)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            <Plus size={11} />
            {activeTab === 'events' ? 'Add Event' : activeTab === 'reminders' ? 'Add Reminder' : 'Add Task'}
          </button>
        )}
      </div>
    </div>
  )
}
