import React, { useState, useEffect } from 'react'
import {
  FileText, DollarSign, Calculator, FileSignature, Briefcase, TrendingUp,
  X, Plus, Save, Zap, ArrowLeft,
} from 'lucide-react'
import type { TemplateType, QuoteItem, QuoteAdditionalService, QuoteStatus, Quote, ServiceSuggestion } from '../types/quotes'
import { createQuote, getServiceSuggestions } from '../services/quotesApi'
import QuoteList from '../components/quotes/QuoteList'
import QuoteDetail from '../components/quotes/QuoteDetail'
import QuoteReminderModal from '../components/quotes/QuoteReminderModal'
import { useToast } from '../context/ToastContext'

type ViewMode = 'list' | 'create' | 'edit' | 'view'

const TEMPLATE_FIXED_ITEMS: Record<TemplateType, QuoteItem[]> = {
  RESTAURANT: [
    { description: 'PC System Full Set Up (1 Year Warranty)',  quantity: 1, unit_price: 0, total: 0 },
    { description: 'Printer',                                   quantity: 1, unit_price: 0, total: 0 },
    { description: 'POS software',                              quantity: 1, unit_price: 0, total: 0 },
    { description: 'Delivery Fee & Setup and Maintenance',      quantity: 1, unit_price: 0, total: 0 },
  ],
  RETAIL: [
    { description: 'PC System Set up  (1 Year Warranty)',       quantity: 1, unit_price: 0, total: 0 },
    { description: 'Printer (1 Year Warranty)',                  quantity: 1, unit_price: 0, total: 0 },
    { description: 'Barcode Scanner',                           quantity: 1, unit_price: 0, total: 0 },
    { description: 'POS software',                              quantity: 1, unit_price: 0, total: 0 },
    { description: 'Delivery Fee & Setup and Maintenance',      quantity: 1, unit_price: 0, total: 0 },
  ],
  CUSTOM: [],
}

const TEMPLATE_META: Record<TemplateType, { icon: string; label: string; desc: string }> = {
  RESTAURANT: { icon: '🍽️', label: 'Restaurant', desc: 'POS + PC + printer setup' },
  RETAIL:     { icon: '🏪', label: 'Retail',     desc: 'POS + scanner + barcode'  },
  CUSTOM:     { icon: '✏️', label: 'Custom',     desc: 'Build from scratch'        },
}

// ── Shared input / label styles ───────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.07)',
  border: '1.5px solid rgba(255,255,255,0.12)', borderRadius: 8,
  color: '#f0f6ff', padding: '9px 12px', fontSize: '0.875rem',
  fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.15s',
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.68rem', fontWeight: 700,
  color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase',
  letterSpacing: '0.09em', marginBottom: 5,
}
const sectionTitle: React.CSSProperties = {
  fontSize: '0.75rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)',
  textTransform: 'uppercase', letterSpacing: '0.1em',
  paddingBottom: '0.6rem',
  borderBottom: '1px solid rgba(255,255,255,0.07)',
  marginBottom: '0.85rem',
  paddingLeft: '0.6rem',
  borderLeft: '3px solid rgba(234,88,12,0.55)',
}

const QuoteGenerator: React.FC = () => {
  const { toast } = useToast()

  // View state
  const [viewMode,        setViewMode]        = useState<ViewMode>('list')
  const [selectedQuoteId, setSelectedQuoteId] = useState<number | null>(null)

  // Form state
  const [templateType,   setTemplateType]   = useState<TemplateType>('RESTAURANT')
  const [companyName,    setCompanyName]    = useState('')
  const [companyAddress, setCompanyAddress] = useState('')
  const [dateOfIssue,    setDateOfIssue]    = useState(new Date().toISOString().split('T')[0])
  const [notes,          setNotes]          = useState('')
  const [status,         setStatus]         = useState<QuoteStatus>('DRAFT')

  // Line items
  const [items, setItems] = useState<QuoteItem[]>([{ description: '', quantity: 1, unit_price: 0, total: 0 }])

  // Additional services
  const [additionalServices, setAdditionalServices] = useState<QuoteAdditionalService[]>([])
  const [serviceSuggestions, setServiceSuggestions] = useState<ServiceSuggestion[]>([])
  const [newServiceName,     setNewServiceName]     = useState('')
  const [newServicePrice,    setNewServicePrice]    = useState('')

  // UI state
  const [loading, setLoading]           = useState(false)
  const [error,   setError]             = useState<string | null>(null)
  const [showReminderModal, setShowReminderModal] = useState(false)
  const [createdQuote,      setCreatedQuote]      = useState<Quote | null>(null)

  useEffect(() => { loadServiceSuggestions() }, [])

  useEffect(() => {
    const fixed = TEMPLATE_FIXED_ITEMS[templateType]
    setItems(fixed.length > 0 ? [...fixed] : [{ description: '', quantity: 1, unit_price: 0, total: 0 }])
  }, [templateType])

  const loadServiceSuggestions = async () => {
    try { setServiceSuggestions(await getServiceSuggestions()) }
    catch (err) { console.error('Failed to load service suggestions:', err) }
  }

  const isFixed = (desc: string) => TEMPLATE_FIXED_ITEMS[templateType].some(i => i.description === desc)

  const calcTotal = (qty: number, price: number) => qty * price

  const calcSubtotal = () =>
    items.reduce((s, i) => s + i.total, 0) + additionalServices.reduce((s, a) => s + a.price, 0)

  const fmtCurrency = (n: number | string | null | undefined) => {
    const v = parseFloat(String(n ?? 0))
    return isNaN(v) ? '0.00' : v.toFixed(2)
  }

  const handleItemChange = (idx: number, field: keyof QuoteItem, value: string | number) => {
    const next = [...items]
    next[idx] = { ...next[idx], [field]: value }
    if (field === 'quantity' || field === 'unit_price')
      next[idx].total = calcTotal(Number(next[idx].quantity), Number(next[idx].unit_price))
    setItems(next)
  }

  const addItem    = () => setItems([...items, { description: '', quantity: 1, unit_price: 0, total: 0 }])
  const removeItem = (idx: number) => { if (items.length > 1) setItems(items.filter((_, i) => i !== idx)) }

  const addService = () => {
    if (newServiceName && newServicePrice) {
      setAdditionalServices([...additionalServices, { service_name: newServiceName, price: parseFloat(newServicePrice) }])
      setNewServiceName(''); setNewServicePrice('')
    }
  }
  const addServiceFromSuggestion = (s: ServiceSuggestion) =>
    setAdditionalServices([...additionalServices, { service_name: s.service_name, price: s.price }])
  const removeService = (idx: number) => setAdditionalServices(additionalServices.filter((_, i) => i !== idx))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!companyName.trim()) { setError('Company name is required'); return }
    if (items.every(i => !i.description.trim())) { setError('At least one line item is required'); return }
    setLoading(true)
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      const newQuote = await createQuote({
        template_type:       templateType,
        company_name:        companyName,
        company_address:     companyAddress || undefined,
        date_of_issue:       dateOfIssue,
        notes:               notes || undefined,
        status,
        created_by:          user.id || undefined,
        items:               items.filter(i => i.description.trim()),
        additional_services: additionalServices.length > 0 ? additionalServices : undefined,
      })
      toast.success('Quote created successfully!')
      setCreatedQuote(newQuote)
      setTimeout(() => setShowReminderModal(true), 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create quote')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setCompanyName(''); setCompanyAddress('')
    setDateOfIssue(new Date().toISOString().split('T')[0])
    setNotes(''); setStatus('DRAFT')
    setItems([{ description: '', quantity: 1, unit_price: 0, total: 0 }])
    setAdditionalServices([]); setSelectedQuoteId(null)
  }

  const handleCreateNew  = () => { resetForm(); setViewMode('create') }
  const handleBackToList = () => { resetForm(); setViewMode('list') }

  const canSubmit = companyName.trim() !== '' && items.some(i => i.description.trim())

  // ── List view ──────────────────────────────────────────────────────────────
  if (viewMode === 'list') return (
    <div style={{ width: '100%', display: 'grid', gap: 16 }}>
      <QuoteList onCreateNew={handleCreateNew} />
    </div>
  )

  // ── View / edit detail ────────────────────────────────────────────────────
  if (viewMode === 'view' || viewMode === 'edit') {
    if (!selectedQuoteId) return (
      <div className="glass-panel" style={{ padding: 24, maxWidth: 600 }}>
        <p style={{ margin: 0, color: 'var(--accent)', fontWeight: 600 }}>No quote selected</p>
        <button onClick={handleBackToList} className="btn-primary" style={{ marginTop: 16 }}>Go Back</button>
      </div>
    )
    return (
      <div style={{ width: '100%', display: 'grid', gap: 16 }}>
        <QuoteDetail quoteId={selectedQuoteId} onBack={handleBackToList} isEditMode={viewMode === 'edit'} />
      </div>
    )
  }

  // ── Create form ────────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'relative' }}>

      <style>{`
        @keyframes qg-orb-drift  { 0%,100% { transform: translate(0,0) scale(1) } 50% { transform: translate(18px,-14px) scale(1.06) } }
        @keyframes qg-orb-drift2 { 0%,100% { transform: translate(0,0) scale(1) } 50% { transform: translate(-14px,12px) scale(1.04) } }
        @keyframes qg-shimmer-btn { 0% { left:-100% } 100% { left:160% } }
        .qg-submit-btn { position: relative; overflow: hidden; transition: transform 0.18s ease, box-shadow 0.18s ease !important; }
        .qg-submit-btn:hover { transform: translateY(-2px) !important; box-shadow: 0 0 40px rgba(234,88,12,0.65), 0 8px 24px rgba(234,88,12,0.45) !important; }
        .qg-submit-btn:hover .qg-btn-sweep { animation: qg-shimmer-btn 0.5s ease forwards !important; }
        .qg-submit-btn:active { transform: translateY(0) !important; }
        .qg-btn-sweep { position:absolute; top:0; left:-100%; width:55%; height:100%; background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.18) 50%,transparent 100%); pointer-events:none; transform:skewX(-12deg); }
        .qg-back-btn { transition: background 0.15s, color 0.15s, transform 0.15s !important; }
        .qg-back-btn:hover { background: rgba(255,255,255,0.13) !important; color: #f0f6ff !important; transform: translateX(-2px) !important; }
      `}</style>

      {/* Decorative background */}
      <div aria-hidden="true" style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: 460, height: 460, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%)', filter: 'blur(50px)', animation: 'qg-orb-drift 14s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: '-8%', left: '-4%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(234,88,12,0.14) 0%, transparent 70%)', filter: 'blur(55px)', animation: 'qg-orb-drift2 17s ease-in-out infinite' }} />
        <FileSignature size={520} strokeWidth={0.5} style={{ position: 'absolute', right: -120, top: -100, opacity: 0.055, color: '#3b82f6', transform: 'rotate(-12deg)' }} />
        <FileText      size={380} strokeWidth={0.5} style={{ position: 'absolute', left: -80,  bottom: -60,  opacity: 0.05,  color: '#6366f1', transform: 'rotate(10deg)'  }} />
        <DollarSign    size={320} strokeWidth={0.5} style={{ position: 'absolute', left: '42%', top: '22%',  opacity: 0.04,  color: '#3b82f6', transform: 'translateX(-50%) rotate(-5deg)' }} />
        <Calculator    size={240} strokeWidth={0.5} style={{ position: 'absolute', left: '3%', top: '6%',    opacity: 0.05,  color: '#818cf8', transform: 'rotate(-8deg)'   }} />
        <Briefcase     size={260} strokeWidth={0.5} style={{ position: 'absolute', right: '4%', top: '35%',  opacity: 0.04,  color: '#6366f1', transform: 'rotate(-10deg)'  }} />
        <TrendingUp    size={240} strokeWidth={0.5} style={{ position: 'absolute', right: '6%', bottom: '8%',opacity: 0.05,  color: '#3b82f6', transform: 'rotate(7deg)'    }} />
      </div>

      {/* Page header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.1rem', position: 'relative', zIndex: 1 }}>
        <div>
          <h1 style={{
            margin: '0 0 4px', fontSize: '1.75rem', fontWeight: 900, lineHeight: 1,
            background: 'linear-gradient(120deg, #f0f6ff 0%, #bfdbfe 55%, #818cf8 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            filter: 'drop-shadow(0 0 16px rgba(99,102,241,0.32))',
          }}>
            Create Quote
          </h1>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.32)', fontStyle: 'italic' }}>
            Fill in the details below to generate a new quote
          </div>
        </div>
        <button onClick={handleBackToList} className="qg-back-btn" style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '9px 18px', background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.14)', borderRadius: 10,
          color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontWeight: 600, fontSize: '0.84rem',
        }}>
          <ArrowLeft size={14} /> Back to List
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ marginBottom: '1rem', padding: '10px 16px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* Two-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '270px 1fr', gap: '1rem', alignItems: 'start', position: 'relative', zIndex: 1 }}>

        {/* ── LEFT: Setup panel ── */}
        <div style={{
          background: 'linear-gradient(160deg, #080f1e 0%, #0d1e38 55%, #0f2347 100%)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 'var(--card-radius)',
          padding: '1.25rem',
          display: 'flex', flexDirection: 'column', gap: '1.1rem',
          position: 'sticky', top: '1rem',
        }}>

          {/* Title */}
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f0f6ff' }}>Quote Setup</div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>Choose a template to begin</div>
          </div>

          {/* Template cards */}
          <div>
            <div style={{ ...labelStyle, marginBottom: 8 }}>Template Type</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(Object.keys(TEMPLATE_META) as TemplateType[]).map(t => {
                const { icon, label, desc } = TEMPLATE_META[t]
                const selected = templateType === t
                return (
                  <button key={t} type="button" onClick={() => setTemplateType(t)} style={{
                    width: '100%', padding: '10px 13px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                    background: selected ? 'rgba(234,88,12,0.14)' : 'rgba(255,255,255,0.04)',
                    border: selected ? '1.5px solid rgba(234,88,12,0.48)' : '1px solid rgba(255,255,255,0.08)',
                    display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.15s',
                  }}>
                    <span style={{ fontSize: '1.25rem', lineHeight: 1, flexShrink: 0 }}>{icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: selected ? '#fdba74' : 'rgba(255,255,255,0.7)' }}>{label}</div>
                      <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{desc}</div>
                    </div>
                    {selected && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ea580c', flexShrink: 0 }} />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Status */}
          <div>
            <label style={labelStyle}>Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as QuoteStatus)}
              style={inputStyle}
              className="timer-panel-input"
            >
              <option value="DRAFT">Draft</option>
              <option value="SENT">Sent</option>
              <option value="FOLLOW_UP">Follow Up</option>
            </select>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.07)' }} />

          {/* Live summary */}
          <div>
            <div style={labelStyle}>Live Summary</div>

            {/* Total tile */}
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'rgba(255,255,255,0.32)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Total</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fbbf24', lineHeight: 1 }}>
                LKR {fmtCurrency(calcSubtotal())}
              </div>
            </div>

            {/* Item / service counts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#60a5fa' }}>
                  {items.filter(i => i.description.trim()).length}
                </div>
                <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.32)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>Items</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#a78bfa' }}>
                  {additionalServices.length}
                </div>
                <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.32)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>Services</div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.07)' }} />

          {/* ── Live Quote Preview ── */}
          <div>
            <div style={{ ...labelStyle, marginBottom: 8 }}>Document Preview</div>

            {/* Paper card */}
            <div style={{
              background: 'linear-gradient(160deg, #f8fafc 0%, #f1f5f9 100%)',
              borderRadius: 10, overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
              position: 'relative',
            }}>
              {/* Corner fold */}
              <div style={{
                position: 'absolute', top: 0, right: 0, width: 0, height: 0,
                borderStyle: 'solid', borderWidth: '0 18px 18px 0',
                borderColor: 'transparent #cbd5e1 transparent transparent',
                zIndex: 1,
              }} />

              {/* Header bar */}
              <div style={{
                background: 'linear-gradient(135deg, #063062 0%, #1e40af 100%)',
                padding: '9px 12px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontSize: '0.55rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.2em' }}>QUOTATION</div>
                  <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#fff', letterSpacing: '0.04em', marginTop: 1 }}>Bloomtech Systems</div>
                </div>
                <span style={{
                  background: 'rgba(255,255,255,0.15)', borderRadius: 6,
                  padding: '2px 8px', fontSize: '0.58rem', fontWeight: 700, color: '#fff',
                }}>
                  {TEMPLATE_META[templateType].icon} {TEMPLATE_META[templateType].label}
                </span>
              </div>

              {/* Body */}
              <div style={{ padding: '10px 12px' }}>
                {/* Client info */}
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: '0.58rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Bill To</div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
                    {companyName.trim() || <span style={{ color: '#cbd5e1', fontStyle: 'italic', fontWeight: 400 }}>Company name…</span>}
                  </div>
                  {companyAddress.trim() && (
                    <div style={{ fontSize: '0.58rem', color: '#64748b', marginTop: 2, lineHeight: 1.3 }}>
                      {companyAddress.split('\n')[0]}
                    </div>
                  )}
                  <div style={{ fontSize: '0.6rem', color: '#94a3b8', marginTop: 3 }}>
                    {dateOfIssue
                      ? new Date(dateOfIssue + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : '—'}
                  </div>
                </div>

                {/* Items divider */}
                <div style={{ height: 1, background: '#e2e8f0', marginBottom: 7 }} />

                {/* Line items preview */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8, minHeight: 32 }}>
                  {items.filter(i => i.description.trim()).length === 0 ? (
                    <div style={{ fontSize: '0.6rem', color: '#cbd5e1', fontStyle: 'italic', paddingTop: 4 }}>No items yet…</div>
                  ) : items.filter(i => i.description.trim()).slice(0, 3).map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: '0.6rem', color: '#475569', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.description}
                      </span>
                      <span style={{ fontSize: '0.6rem', fontWeight: 700, color: item.total > 0 ? '#1e293b' : '#cbd5e1', flexShrink: 0 }}>
                        {item.total > 0 ? `${item.total.toLocaleString()}` : '—'}
                      </span>
                    </div>
                  ))}
                  {items.filter(i => i.description.trim()).length > 3 && (
                    <div style={{ fontSize: '0.55rem', color: '#94a3b8' }}>
                      +{items.filter(i => i.description.trim()).length - 3} more item{items.filter(i => i.description.trim()).length - 3 !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>

                {/* Total bar */}
                <div style={{
                  borderTop: '2px solid #e2e8f0', paddingTop: 7,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Total Due</span>
                  <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#063062' }}>
                    LKR {fmtCurrency(calcSubtotal())}
                  </span>
                </div>
              </div>

              {/* Status watermark */}
              <div style={{
                position: 'absolute', bottom: 10, right: 12,
                fontSize: '0.48rem', fontWeight: 800,
                color: status === 'DRAFT' ? 'rgba(100,116,139,0.25)' : status === 'SENT' ? 'rgba(37,99,235,0.25)' : 'rgba(245,158,11,0.25)',
                border: `1.5px solid ${status === 'DRAFT' ? 'rgba(100,116,139,0.2)' : status === 'SENT' ? 'rgba(37,99,235,0.2)' : 'rgba(245,158,11,0.2)'}`,
                borderRadius: 4, padding: '1px 5px', letterSpacing: '0.15em',
                transform: 'rotate(-12deg)',
              }}>
                {status}
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Form ── */}
        <form onSubmit={handleSubmit}>
          <div style={{
            background: 'linear-gradient(160deg, #0c1524 0%, #0f2040 55%, #122848 100%)',
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: 'var(--card-radius)',
            padding: '1.25rem',
            display: 'flex', flexDirection: 'column', gap: '1.25rem',
          }}>

            {/* ── Company info ── */}
            <div>
              <div style={sectionTitle}>Company Information</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={labelStyle}>Company Name <span style={{ color: '#f87171' }}>*</span></label>
                  <input
                    type="text" value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="Enter company name"
                    style={inputStyle} className="timer-panel-input"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Date of Issue <span style={{ color: '#f87171' }}>*</span></label>
                  <input
                    type="date" value={dateOfIssue}
                    onChange={e => setDateOfIssue(e.target.value)}
                    style={inputStyle} className="timer-panel-input"
                  />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Company Address <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>(Optional)</span></label>
                <textarea
                  value={companyAddress}
                  onChange={e => setCompanyAddress(e.target.value)}
                  rows={2} placeholder="Enter company address"
                  style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }}
                  className="timer-panel-input"
                />
              </div>
            </div>

            {/* ── Line items ── */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', ...sectionTitle, paddingLeft: '0.6rem' }}>
                <span>Line Items</span>
                <button type="button" onClick={addItem} style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px',
                  background: 'rgba(37,99,235,0.18)', border: '1px solid rgba(37,99,235,0.35)',
                  borderRadius: 7, color: '#93c5fd', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700,
                }}>
                  <Plus size={12} /> Add Item
                </button>
              </div>

              {/* Column headers */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 72px 108px 110px 32px', gap: 6, padding: '0 2px 6px', marginTop: 2 }}>
                {['Description', 'Qty', 'Unit Price', 'Total', ''].map((h, i) => (
                  <span key={i} style={{ fontSize: '0.62rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: i >= 2 ? 'right' : 'left' }}>{h}</span>
                ))}
              </div>

              {/* Item rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {items.map((item, idx) => {
                  const fixed = isFixed(item.description)
                  return (
                    <div key={idx} style={{
                      display: 'grid', gridTemplateColumns: '1fr 72px 108px 110px 32px',
                      gap: 6, alignItems: 'center',
                      background: fixed ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.05)',
                      padding: '8px 10px', borderRadius: 8,
                      border: fixed ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(255,255,255,0.08)',
                    }}>
                      <input
                        type="text" value={item.description}
                        onChange={e => handleItemChange(idx, 'description', e.target.value)}
                        placeholder="Item description"
                        readOnly={fixed}
                        style={{ ...inputStyle, opacity: fixed ? 0.6 : 1, cursor: fixed ? 'not-allowed' : 'text' }}
                        className="timer-panel-input"
                      />
                      <input
                        type="number" value={item.quantity} min="1"
                        onChange={e => handleItemChange(idx, 'quantity', parseInt(e.target.value) || 0)}
                        style={{ ...inputStyle, textAlign: 'center' }}
                        className="timer-panel-input"
                      />
                      <input
                        type="number" value={item.unit_price} step="0.01" min="0"
                        onChange={e => handleItemChange(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                        style={{ ...inputStyle, textAlign: 'right' }}
                        className="timer-panel-input"
                      />
                      {/* Total (read-only) */}
                      <div style={{
                        background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.07)',
                        borderRadius: 8, padding: '9px 10px', textAlign: 'right',
                        fontSize: '0.875rem', fontWeight: 700, color: '#fbbf24',
                      }}>
                        {fmtCurrency(item.total)}
                      </div>
                      {items.length > 1 ? (
                        <button type="button" onClick={() => removeItem(idx)} style={{
                          width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                          border: '1.5px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.1)',
                          color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <X size={12} />
                        </button>
                      ) : <div style={{ width: 28 }} />}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── Additional services ── */}
            <div>
              <div style={sectionTitle}>Additional Services <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400, textTransform: 'none', fontSize: '0.68rem' }}>(Optional)</span></div>

              {/* Quick-add suggestions */}
              {serviceSuggestions.length > 0 && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
                    <Zap size={11} color="#fbbf24" />
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Quick Add</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {serviceSuggestions.slice(0, 5).map((s, i) => (
                      <button key={i} type="button" onClick={() => addServiceFromSuggestion(s)} style={{
                        padding: '4px 11px', background: 'rgba(59,130,246,0.12)', color: '#93c5fd',
                        border: '1px solid rgba(59,130,246,0.28)', borderRadius: 99,
                        fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                      }}>
                        {s.service_name} · LKR {fmtCurrency(s.price)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Add new service row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px auto', gap: 8, alignItems: 'end', marginBottom: '0.6rem' }}>
                <div>
                  <label style={labelStyle}>Service Name</label>
                  <input type="text" value={newServiceName} onChange={e => setNewServiceName(e.target.value)}
                    placeholder="e.g. Training Session" style={inputStyle} className="timer-panel-input" />
                </div>
                <div>
                  <label style={labelStyle}>Price (LKR)</label>
                  <input type="number" value={newServicePrice} onChange={e => setNewServicePrice(e.target.value)}
                    step="0.01" min="0" placeholder="0.00" style={inputStyle} className="timer-panel-input" />
                </div>
                <button type="button" onClick={addService} style={{
                  padding: '9px 16px', background: 'rgba(37,99,235,0.18)', border: '1px solid rgba(37,99,235,0.35)',
                  borderRadius: 8, color: '#93c5fd', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem',
                  display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
                }}>
                  <Plus size={13} /> Add
                </button>
              </div>

              {/* Added services list */}
              {additionalServices.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {additionalServices.map((svc, idx) => (
                    <div key={idx} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)',
                      padding: '8px 12px', borderRadius: 8,
                    }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{svc.service_name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fbbf24' }}>LKR {fmtCurrency(svc.price)}</span>
                        <button type="button" onClick={() => removeService(idx)} style={{
                          width: 24, height: 24, borderRadius: 6, border: '1.5px solid rgba(239,68,68,0.35)',
                          background: 'rgba(239,68,68,0.1)', color: '#f87171', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <X size={11} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Notes ── */}
            <div>
              <div style={sectionTitle}>Notes <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400, textTransform: 'none', fontSize: '0.68rem' }}>(Optional)</span></div>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3} placeholder="Additional notes or terms..."
                style={{ ...inputStyle, resize: 'vertical', minHeight: 68 }}
                className="timer-panel-input"
              />
            </div>

            {/* ── Total + Submit ── */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '1.1rem' }}>
              {/* Total display */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(251,191,36,0.1) 0%, rgba(234,88,12,0.07) 100%)',
                border: '1px solid rgba(251,191,36,0.25)',
                boxShadow: '0 0 24px rgba(251,191,36,0.08)',
                borderRadius: 12, padding: '14px 20px', marginBottom: '1rem',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>Total Due</div>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)' }}>
                    {items.filter(i => i.description.trim()).length} item{items.filter(i => i.description.trim()).length !== 1 ? 's' : ''}
                    {additionalServices.length > 0 ? ` · ${additionalServices.length} service${additionalServices.length !== 1 ? 's' : ''}` : ''}
                  </div>
                </div>
                <span style={{ fontSize: '2rem', fontWeight: 900, color: '#fbbf24', letterSpacing: '-0.02em', lineHeight: 1 }}>
                  LKR {fmtCurrency(calcSubtotal())}
                </span>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="submit"
                  disabled={loading || !canSubmit}
                  className={canSubmit ? 'qg-submit-btn' : ''}
                  style={{
                    flex: 1, padding: '0.95rem',
                    background: canSubmit
                      ? 'linear-gradient(135deg, #f97316 0%, #ea580c 50%, #dc2626 100%)'
                      : 'rgba(255,255,255,0.07)',
                    color: canSubmit ? '#fff' : 'rgba(255,255,255,0.28)',
                    border: 'none', borderRadius: 10, cursor: canSubmit ? 'pointer' : 'not-allowed',
                    fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, fontSize: '0.95rem',
                    boxShadow: canSubmit ? '0 0 22px rgba(234,88,12,0.4), 0 4px 16px rgba(234,88,12,0.3)' : 'none',
                    letterSpacing: '0.01em',
                  }}
                >
                  {canSubmit && <span className="qg-btn-sweep" />}
                  <Save size={16} />
                  {loading ? 'Creating…' : 'Create Quote'}
                </button>
                <button type="button" onClick={resetForm} style={{
                  padding: '0.95rem 1.25rem', background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10,
                  color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem',
                  transition: 'background 0.15s, color 0.15s',
                }}>
                  Clear
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Reminder Modal */}
      {showReminderModal && createdQuote && (
        <QuoteReminderModal
          quoteId={createdQuote.quote_id}
          quoteNumber={createdQuote.quote_number}
          companyName={createdQuote.company_name}
          isOpen={showReminderModal}
          onClose={() => { setShowReminderModal(false); resetForm(); handleBackToList() }}
          onSuccess={() => { setShowReminderModal(false); resetForm(); handleBackToList() }}
        />
      )}
    </div>
  )
}

export default QuoteGenerator
