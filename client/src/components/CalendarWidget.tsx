import { useState, useEffect } from 'react'

type Holiday = {
  date: string // YYYY-MM-DD
  name: string
  type: 'holiday' | 'event'
}

const SAMPLE_HOLIDAYS: Holiday[] = [
  { date: '2025-01-14', name: 'Tamil Thai Pongal', type: 'holiday' },
  { date: '2025-02-04', name: 'Independence Day', type: 'holiday' },
  { date: '2025-04-13', name: 'Sinhala & Tamil New Year', type: 'holiday' },
  { date: '2025-04-14', name: 'New Year Holiday', type: 'holiday' },
  { date: '2025-05-01', name: 'May Day', type: 'holiday' },
  { date: '2025-12-25', name: 'Christmas Day', type: 'holiday' },
  { date: '2026-01-14', name: 'Tamil Thai Pongal', type: 'holiday' },
  { date: '2026-02-04', name: 'Independence Day', type: 'holiday' },
  { date: '2026-04-13', name: 'Sinhala & Tamil New Year', type: 'holiday' },
  { date: '2026-04-14', name: 'New Year Holiday', type: 'holiday' },
]

export default function CalendarWidget() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [userEvents, setUserEvents] = useState<Holiday[]>([])
  const [newEventName, setNewEventName] = useState('')
  const [isAddingEvent, setIsAddingEvent] = useState(false)

  // Load events from localStorage on mount
  useEffect(() => {
    const savedEvents = localStorage.getItem('calendar_events')
    if (savedEvents) {
      try {
        setUserEvents(JSON.parse(savedEvents))
      } catch (e) {
        console.error('Failed to parse events', e)
      }
    }
  }, [])

  // Save events to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('calendar_events', JSON.stringify(userEvents))
  }, [userEvents])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  
  const daysInMonth = lastDay.getDate()
  const startDayOfWeek = firstDay.getDay() // 0 = Sunday

  const days = []
  // Padding for start
  for (let i = 0; i < startDayOfWeek; i++) {
    days.push(null)
  }
  // Days
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i))
  }

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))

  const isToday = (d: Date) => {
    const today = new Date()
    return d.getDate() === today.getDate() && 
           d.getMonth() === today.getMonth() && 
           d.getFullYear() === today.getFullYear()
  }

  const getEventsForDate = (d: Date) => {
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const holidays = SAMPLE_HOLIDAYS.filter(h => h.date === dateStr)
    const customEvents = userEvents.filter(e => e.date === dateStr)
    return [...holidays, ...customEvents]
  }

  const handleAddEvent = () => {
    if (!selectedDate || !newEventName.trim()) return
    
    const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
    
    const newEvent: Holiday = {
      date: dateStr,
      name: newEventName.trim(),
      type: 'event'
    }

    setUserEvents([...userEvents, newEvent])
    setNewEventName('')
    setIsAddingEvent(false)
  }

  return (
    <div className="glass-panel" style={{ padding: 20, height: 'fit-content', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
          {currentDate.toLocaleString('default', { month: 'long' })} {year}
        </h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={prevMonth} className="btn-secondary" style={{ padding: '4px 8px' }}>&lt;</button>
          <button onClick={nextMonth} className="btn-secondary" style={{ padding: '4px 8px' }}>&gt;</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, marginBottom: 8, textAlign: 'center', fontWeight: 600, fontSize: 13, opacity: 0.8 }}>
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <div key={d}>{d}</div>)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
        {days.map((d, i) => {
          if (!d) return <div key={i} />
          
          const events = getEventsForDate(d)
          const hasEvents = events.length > 0
          const isSelected = selectedDate && d.toDateString() === selectedDate.toDateString()
          const today = isToday(d)

          return (
            <div 
              key={i}
              onClick={() => {
                setSelectedDate(d)
                setIsAddingEvent(false)
                setNewEventName('')
              }}
              style={{
                aspectRatio: '1/1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: today || hasEvents ? 700 : 500,
                background: isSelected ? 'var(--accent)' : today ? 'rgba(255,255,255,0.2)' : hasEvents ? 'rgba(234, 88, 12, 0.3)' : 'transparent',
                color: '#fff',
                border: today && !isSelected ? '1px solid rgba(255,255,255,0.5)' : 'none',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
              onMouseEnter={e => !isSelected && !today && !hasEvents && (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
              onMouseLeave={e => !isSelected && !today && !hasEvents && (e.currentTarget.style.background = 'transparent')}
            >
              {d.getDate()}
              {hasEvents && (
                <div style={{ position: 'absolute', bottom: 4, width: 4, height: 4, borderRadius: '50%', background: isSelected ? 'white' : 'var(--accent)' }} />
              )}
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: 20, minHeight: 60, padding: 12, background: 'rgba(0,0,0,0.2)', borderRadius: 12 }}>
         {selectedDate ? (
           <>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent)' }}>
                  {selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                </div>
                {!isAddingEvent && (
                  <button 
                    onClick={() => setIsAddingEvent(true)}
                    style={{ padding: '2px 8px', fontSize: 11, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, color: 'white', cursor: 'pointer' }}
                  >
                    + Add
                  </button>
                )}
             </div>
             
             {isAddingEvent ? (
               <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                 <input 
                   autoFocus
                   type="text" 
                   placeholder="Event name..." 
                   value={newEventName}
                   onChange={e => setNewEventName(e.target.value)}
                   onKeyDown={e => e.key === 'Enter' && handleAddEvent()}
                   style={{ 
                     background: 'rgba(255,255,255,0.1)', 
                     border: '1px solid rgba(255,255,255,0.2)', 
                     borderRadius: 4, 
                     padding: '6px 8px',
                     color: 'white',
                     fontSize: 13,
                     outline: 'none'
                   }}
                 />
                 <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                   <button 
                     onClick={() => setIsAddingEvent(false)}
                     style={{ padding: '4px 8px', fontSize: 11, background: 'transparent', border: 'none', color: '#ccc', cursor: 'pointer' }}
                   >
                     Cancel
                   </button>
                   <button 
                     onClick={handleAddEvent}
                     disabled={!newEventName.trim()}
                     style={{ padding: '4px 8px', fontSize: 11, background: 'var(--accent)', border: 'none', borderRadius: 4, color: 'white', cursor: 'pointer', opacity: newEventName.trim() ? 1 : 0.5 }}
                   >
                     Save
                   </button>
                 </div>
               </div>
             ) : (
               <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                 {getEventsForDate(selectedDate).length > 0 ? (
                   getEventsForDate(selectedDate).map((evt, idx) => (
                     <div key={idx} style={{ fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                       <span style={{ fontSize: 10 }}>{evt.type === 'holiday' ? '🎉' : '•'}</span>
                       {evt.name}
                     </div>
                   ))
                 ) : (
                   <div style={{ fontSize: 13, opacity: 0.7 }}>No events scheduled</div>
                 )}
               </div>
             )}
           </>
         ) : (
           <div style={{ fontSize: 13, opacity: 0.7, textAlign: 'center', paddingTop: 8 }}>Select a date to view details</div>
         )}
      </div>
    </div>
  )
}
