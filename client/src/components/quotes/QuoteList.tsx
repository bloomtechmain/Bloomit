import React, { useState, useEffect, useMemo } from 'react'
import {
  Check, X, Download, Eye, Pencil, Trash2,
  FileText, FileSignature, DollarSign, Calculator, Briefcase, TrendingUp, Plus,
  CheckCircle, XCircle, Clock,
} from 'lucide-react'
import { getAllQuotes, updateQuoteStatus, getQuoteById } from '../../services/quotesApi'
import type { Quote, QuoteStatus } from '../../types/quotes'
import QuoteFilters from './QuoteFilters'
import type { FilterState } from './QuoteFilters'
import QuoteViewModal from './QuoteViewModal'
import QuoteEditModal from './QuoteEditModal'
import QuoteDeleteModal from './QuoteDeleteModal'
import { generateQuotePDF } from '../../utils/pdfExport'
import { useToast } from '../../context/ToastContext'
import { useConfirm } from '../../context/ConfirmContext'

interface QuoteListProps {
  onCreateNew: () => void
}

type SortField = 'quote_number' | 'company_name' | 'date_of_issue' | 'total_due' | 'status'
type SortDirection = 'asc' | 'desc'

// Inline status badge styles — no Tailwind required
const STATUS_STYLES: Record<QuoteStatus, React.CSSProperties> = {
  DRAFT:     { background: 'rgba(100,116,139,0.18)', color: '#94a3b8', border: '1px solid rgba(100,116,139,0.3)' },
  SENT:      { background: 'rgba(59,130,246,0.18)',  color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)'  },
  ACCEPTED:  { background: 'rgba(34,197,94,0.18)',   color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)'   },
  REJECTED:  { background: 'rgba(239,68,68,0.18)',   color: '#f87171', border: '1px solid rgba(239,68,68,0.3)'   },
  FOLLOW_UP: { background: 'rgba(245,158,11,0.18)',  color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)'  },
}

const QuoteList: React.FC<QuoteListProps> = ({ onCreateNew }) => {
  const { toast }  = useToast()
  const confirm    = useConfirm()

  const [quotes,  setQuotes]  = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const [viewModalQuoteId, setViewModalQuoteId] = useState<number | null>(null)
  const [editModalQuoteId, setEditModalQuoteId] = useState<number | null>(null)
  const [deleteModalQuote, setDeleteModalQuote] = useState<{ id: number; number: string } | null>(null)

  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '', status: 'ALL', dateFrom: '', dateTo: '', assignedTo: '',
  })
  const [sortField]     = useState<SortField>('date_of_issue')
  const [sortDirection] = useState<SortDirection>('desc')

  useEffect(() => { loadQuotes() }, [])

  const loadQuotes = async () => {
    try {
      setLoading(true); setError(null)
      setQuotes(await getAllQuotes())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quotes')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (quote: Quote) => {
    if (!(await confirm(`Approve quote ${quote.quote_number}?`))) return
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      await updateQuoteStatus(quote.quote_id, { status: 'ACCEPTED', changed_by: user.id, notes: 'Quote approved' })
      toast.success(`Quote ${quote.quote_number} approved`)
      loadQuotes()
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to approve quote') }
  }

  const handleDeny = async (quote: Quote) => {
    if (!(await confirm(`Deny quote ${quote.quote_number}?`, { destructive: true, confirmLabel: 'Deny' }))) return
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      await updateQuoteStatus(quote.quote_id, { status: 'REJECTED', changed_by: user.id, notes: 'Quote denied' })
      toast.success(`Quote ${quote.quote_number} denied`)
      loadQuotes()
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to deny quote') }
  }

  const handleDownloadPDF = async (quoteId: number) => {
    try { generateQuotePDF(await getQuoteById(quoteId)) }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to generate PDF') }
  }

  // ── Filtering & sorting ────────────────────────────────────────────────────
  const filteredQuotes = useMemo(() => {
    let r = [...quotes]
    if (filters.searchTerm) {
      const s = filters.searchTerm.toLowerCase()
      r = r.filter(q => q.company_name.toLowerCase().includes(s) || q.quote_number.toLowerCase().includes(s))
    }
    if (filters.status !== 'ALL') r = r.filter(q => q.status === filters.status)
    if (filters.dateFrom) r = r.filter(q => new Date(q.date_of_issue) >= new Date(filters.dateFrom))
    if (filters.dateTo)   r = r.filter(q => new Date(q.date_of_issue) <= new Date(filters.dateTo))
    if (filters.assignedTo) r = r.filter(q => q.assigned_to_name?.toLowerCase().includes(filters.assignedTo.toLowerCase()))
    return r
  }, [quotes, filters])

  const sortedQuotes = useMemo(() => (
    [...filteredQuotes].sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'quote_number':  cmp = a.quote_number.localeCompare(b.quote_number); break
        case 'company_name':  cmp = a.company_name.localeCompare(b.company_name); break
        case 'date_of_issue': cmp = new Date(a.date_of_issue).getTime() - new Date(b.date_of_issue).getTime(); break
        case 'total_due':     cmp = (parseFloat(String(a.total_due)) || 0) - (parseFloat(String(b.total_due)) || 0); break
        case 'status':        cmp = a.status.localeCompare(b.status); break
      }
      return sortDirection === 'asc' ? cmp : -cmp
    })
  ), [filteredQuotes, sortField, sortDirection])

  const categorized = useMemo(() => ({
    approved: sortedQuotes.filter(q => q.status === 'ACCEPTED'),
    denied:   sortedQuotes.filter(q => q.status === 'REJECTED'),
    active:   sortedQuotes.filter(q => ['DRAFT', 'SENT', 'FOLLOW_UP'].includes(q.status)),
  }), [sortedQuotes])

  // ── Dashboard stats (computed from ALL quotes, not filtered) ─────────────
  const stats = useMemo(() => {
    const total      = quotes.length
    const approved   = quotes.filter(q => q.status === 'ACCEPTED').length
    const denied     = quotes.filter(q => q.status === 'REJECTED').length
    const active     = quotes.filter(q => ['DRAFT', 'SENT', 'FOLLOW_UP'].includes(q.status)).length
    const totalValue = quotes.reduce((s, q) => s + (parseFloat(String(q.total_due)) || 0), 0)
    const approvedPct = total ? Math.round(approved / total * 100) : 0
    const activePct   = total ? Math.round(active   / total * 100) : 0
    const deniedPct   = total ? Math.max(0, 100 - approvedPct - activePct) : 0
    return { total, approved, denied, active, totalValue, approvedPct, activePct, deniedPct }
  }, [quotes])

  // ── Helpers ───────────────────────────────────────────────────────────────
  const fmtDate = (s: string) =>
    new Date(s).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

  const fmtAmt = (a: number | string | null | undefined) => {
    const n = parseFloat(String(a ?? 0))
    return `LKR ${isNaN(n) ? '0.00' : n.toFixed(2)}`
  }

  // Small icon action button
  const iconBtn = (onClick: () => void, icon: React.ReactNode, title: string, rgb: string) => (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 30, height: 30, borderRadius: 7, cursor: 'pointer', flexShrink: 0,
        background: `rgba(${rgb},0.1)`, border: `1.5px solid rgba(${rgb},0.25)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = `rgba(${rgb},0.22)`; e.currentTarget.style.transform = 'scale(1.08)' }}
      onMouseLeave={e => { e.currentTarget.style.background = `rgba(${rgb},0.1)`;  e.currentTarget.style.transform = 'scale(1)' }}
    >
      {icon}
    </button>
  )

  const renderActions = (q: Quote) => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 5 }}>
      {q.status !== 'ACCEPTED' && iconBtn(() => handleApprove(q),   <Check    size={13} color="rgb(34,197,94)"  />, 'Approve',      '34,197,94'  )}
      {q.status !== 'REJECTED' && iconBtn(() => handleDeny(q),       <X        size={13} color="rgb(239,68,68)"  />, 'Deny',         '239,68,68'  )}
      {iconBtn(() => handleDownloadPDF(q.quote_id),                   <Download size={13} color="rgb(168,85,247)" />, 'Download PDF', '168,85,247' )}
      {iconBtn(() => setViewModalQuoteId(q.quote_id),                 <Eye      size={13} color="rgb(96,165,250)" />, 'View',         '96,165,250' )}
      {q.status === 'DRAFT' && iconBtn(() => setEditModalQuoteId(q.quote_id), <Pencil size={13} color="rgb(74,222,128)" />, 'Edit', '74,222,128')}
      {iconBtn(() => setDeleteModalQuote({ id: q.quote_id, number: q.quote_number }), <Trash2 size={13} color="rgb(220,38,38)" />, 'Delete', '220,38,38')}
    </div>
  )

  // ── Section renderer ──────────────────────────────────────────────────────
  const renderSection = (list: Quote[], title: string, grad1: string, grad2: string) => {
    if (!list.length) return null
    return (
      <div style={{ borderRadius: 'var(--card-radius)', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
        {/* Header */}
        <div style={{ background: `linear-gradient(135deg, ${grad1}, ${grad2})`, padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>{title}</span>
          <span style={{ background: 'rgba(255,255,255,0.2)', padding: '1px 10px', borderRadius: 12, fontSize: '0.72rem', fontWeight: 700, color: '#fff' }}>
            {list.length}
          </span>
        </div>
        {/* Table */}
        <div style={{ overflowX: 'auto', background: 'rgba(0,0,0,0.18)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.22)' }}>
                {['Quote #', 'Company', 'Date', 'Amount', 'Status', 'Assigned To', ''].map((h, i) => (
                  <th key={i} style={{
                    padding: '8px 14px', textAlign: i === 6 ? 'right' : 'left',
                    fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem',
                    color: 'rgba(255,255,255,0.38)', letterSpacing: '0.07em', whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((q, idx) => (
                <tr key={q.quote_id}
                  style={{ borderBottom: idx < list.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', transition: 'background 0.12s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: '#f0f6ff', whiteSpace: 'nowrap' }}>{q.quote_number}</td>
                  <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.85)', whiteSpace: 'nowrap' }}>{q.company_name}</td>
                  <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.5)',  whiteSpace: 'nowrap' }}>{fmtDate(q.date_of_issue)}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: '#fbbf24', whiteSpace: 'nowrap' }}>{fmtAmt(q.total_due)}</td>
                  <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: 99, fontSize: '0.65rem',
                      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                      ...STATUS_STYLES[q.status],
                    }}>
                      {q.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>{q.assigned_to_name || '—'}</td>
                  <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>{renderActions(q)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // ── States ────────────────────────────────────────────────────────────────
  if (loading) return (
    <>
      <style>{`@keyframes ql-spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.08)', borderTop: '3px solid #f97316', animation: 'ql-spin 0.8s linear infinite' }} />
      </div>
    </>
  )

  if (error) return (
    <div style={{ padding: '16px 20px', borderRadius: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Error loading quotes</div>
      <div style={{ fontSize: '0.85rem', marginBottom: 14, opacity: 0.8 }}>{error}</div>
      <button onClick={loadQuotes} style={{ padding: '7px 16px', background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 8, color: '#f87171', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}>
        Retry
      </button>
    </div>
  )

  if (quotes.length === 0) return (
    <>
      <style>{`
        @keyframes ql-empty-shimmer {
          0%   { background-position: -400px 0 }
          100% { background-position: 400px 0 }
        }
        @keyframes ql-empty-float {
          0%,100% { transform: translateY(0px) }
          50%      { transform: translateY(-8px) }
        }
        @keyframes ql-empty-glow-pulse {
          0%,100% { opacity: 0.55; transform: scale(1) }
          50%      { opacity: 0.85; transform: scale(1.08) }
        }
        @keyframes ql-sweep {
          0%   { left: -100% }
          100% { left: 160% }
        }
        .ql-empty-cta {
          position: relative; overflow: hidden;
          transition: transform 0.2s ease, box-shadow 0.2s ease !important;
        }
        .ql-empty-cta:hover {
          transform: translateY(-3px) scale(1.03) !important;
          box-shadow: 0 0 48px rgba(234,88,12,0.75), 0 10px 32px rgba(234,88,12,0.5) !important;
        }
        .ql-empty-cta:hover .ql-sweep-bar { animation: ql-sweep 0.55s ease forwards !important; }
        .ql-empty-cta:active { transform: translateY(-1px) scale(1.01) !important; }
        .ql-sweep-bar {
          position: absolute; top: 0; left: -100%; width: 60%; height: 100%;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%);
          pointer-events: none; transform: skewX(-12deg);
        }
      `}</style>

      {/* Decorative background */}
      <div aria-hidden="true" style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%)', filter: 'blur(50px)' }} />
        <div style={{ position: 'absolute', bottom: '-8%', left: '-4%', width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(234,88,12,0.14) 0%, transparent 70%)', filter: 'blur(55px)' }} />
        <FileSignature size={480} strokeWidth={0.5} style={{ position: 'absolute', right: -90, top: -70,  opacity: 0.05, color: '#3b82f6', transform: 'rotate(-12deg)' }} />
        <FileText      size={340} strokeWidth={0.5} style={{ position: 'absolute', left: -60, bottom: -40, opacity: 0.04, color: '#6366f1', transform: 'rotate(10deg)'  }} />
        <Calculator    size={200} strokeWidth={0.5} style={{ position: 'absolute', left: '3%', top: '6%',  opacity: 0.05, color: '#818cf8', transform: 'rotate(-8deg)'  }} />
        <TrendingUp    size={200} strokeWidth={0.5} style={{ position: 'absolute', right: '5%', bottom: '8%', opacity: 0.05, color: '#3b82f6', transform: 'rotate(7deg)' }} />
      </div>

      {/* Hero empty-state card */}
      <div style={{
        position: 'relative', zIndex: 1,
        borderRadius: 20, overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.1)',
        background: 'linear-gradient(160deg, #080f1e 0%, #0d1e38 55%, #0f2347 100%)',
        boxShadow: '0 8px 48px rgba(0,0,0,0.45)',
      }}>

        {/* Shimmer stripe across top */}
        <div style={{
          height: 3,
          background: 'linear-gradient(90deg, transparent 0%, rgba(234,88,12,0.6) 30%, rgba(251,191,36,0.5) 55%, rgba(99,102,241,0.5) 80%, transparent 100%)',
          backgroundSize: '800px 100%',
          animation: 'ql-empty-shimmer 3s linear infinite',
        }} />

        <div style={{ padding: '64px 48px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

          {/* Floating icon stack */}
          <div style={{ position: 'relative', marginBottom: 32, animation: 'ql-empty-float 4s ease-in-out infinite' }}>
            {/* Outer glow halo */}
            <div style={{
              position: 'absolute', inset: -20, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(234,88,12,0.22) 0%, transparent 70%)',
              animation: 'ql-empty-glow-pulse 3s ease-in-out infinite',
            }} />
            {/* Icon backdrop */}
            <div style={{
              width: 96, height: 96, borderRadius: 24,
              background: 'linear-gradient(135deg, rgba(234,88,12,0.22) 0%, rgba(99,102,241,0.18) 100%)',
              border: '1.5px solid rgba(234,88,12,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 32px rgba(234,88,12,0.25), inset 0 1px 0 rgba(255,255,255,0.1)',
              position: 'relative',
            }}>
              <FileSignature size={44} color="#f97316" strokeWidth={1.4} />
            </div>
            {/* Orbiting dot top-right */}
            <div style={{
              position: 'absolute', top: -6, right: -6, width: 18, height: 18,
              borderRadius: '50%', background: 'linear-gradient(135deg, #fbbf24, #f97316)',
              boxShadow: '0 0 12px rgba(251,191,36,0.6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Plus size={10} strokeWidth={3} color="#fff" />
            </div>
          </div>

          {/* Heading */}
          <h2 style={{
            margin: '0 0 12px', fontSize: '1.9rem', fontWeight: 900, lineHeight: 1.1,
            background: 'linear-gradient(120deg, #f0f6ff 0%, #bfdbfe 55%, #818cf8 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            filter: 'drop-shadow(0 0 14px rgba(99,102,241,0.3))',
          }}>
            No quotes yet
          </h2>

          <p style={{ margin: '0 0 36px', fontSize: '0.95rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, maxWidth: 360 }}>
            Create your first quote in seconds. Choose a template, fill in the details, and send it to your client.
          </p>

          {/* CTA button */}
          <button
            onClick={onCreateNew}
            className="ql-empty-cta"
            style={{
              padding: '14px 36px',
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 50%, #dc2626 100%)',
              border: 'none', borderRadius: 14, color: '#fff',
              fontWeight: 800, cursor: 'pointer', fontSize: '1rem',
              display: 'inline-flex', alignItems: 'center', gap: 12,
              boxShadow: '0 0 28px rgba(234,88,12,0.5), 0 6px 20px rgba(234,88,12,0.35)',
              letterSpacing: '0.01em', marginBottom: 28,
            }}
          >
            <span className="ql-sweep-bar" />
            <span style={{
              width: 26, height: 26, borderRadius: '50%',
              background: 'rgba(255,255,255,0.22)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Plus size={15} strokeWidth={2.8} />
            </span>
            Create First Quote
          </button>

          {/* Feature hint chips */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            {[
              { icon: '🍽️', label: 'Restaurant template' },
              { icon: '🏪', label: 'Retail template'     },
              { icon: '📄', label: 'PDF export'          },
              { icon: '🔔', label: 'Follow-up reminders' },
            ].map(({ icon, label }) => (
              <span key={label} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 99, padding: '5px 13px',
                fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.45)',
              }}>
                <span style={{ fontSize: '0.82rem' }}>{icon}</span> {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </>
  )

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div style={{ width: '100%', display: 'grid', gap: 14, position: 'relative' }}>

      {/* Keyframe animations */}
      <style>{`
        @keyframes ql-spin       { from { transform: rotate(0deg) }   to { transform: rotate(360deg) } }
        @keyframes ql-orb-drift  { 0%,100% { transform: translate(0,0) scale(1) } 50% { transform: translate(18px,-14px) scale(1.06) } }
        @keyframes ql-orb-drift2 { 0%,100% { transform: translate(0,0) scale(1) } 50% { transform: translate(-14px,12px) scale(1.04) } }
        @keyframes ql-orb-drift3 { 0%,100% { transform: translate(0,0) scale(1) } 50% { transform: translate(10px,18px) scale(1.08) } }
        @keyframes ql-btn-glow   { 0%,100% { box-shadow: 0 0 18px rgba(234,88,12,0.45), 0 4px 16px rgba(234,88,12,0.3), inset 0 1px 0 rgba(255,255,255,0.18) }
                                   50%     { box-shadow: 0 0 32px rgba(234,88,12,0.65), 0 6px 22px rgba(234,88,12,0.45), inset 0 1px 0 rgba(255,255,255,0.18) } }
        .ql-create-btn { transition: transform 0.18s ease, box-shadow 0.18s ease !important; }
        .ql-create-btn:hover { transform: translateY(-2px) !important; box-shadow: 0 0 40px rgba(234,88,12,0.7), 0 8px 28px rgba(234,88,12,0.5), inset 0 1px 0 rgba(255,255,255,0.22) !important; }
        .ql-create-btn:active { transform: translateY(0px) !important; }
      `}</style>

      {/* ── Decorative background ── */}
      <div aria-hidden="true" style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>

        {/* Gradient orbs */}
        <div style={{
          position: 'absolute', top: '-10%', right: '-5%',
          width: 480, height: 480, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.22) 0%, rgba(99,102,241,0.12) 50%, transparent 75%)',
          filter: 'blur(40px)', animation: 'ql-orb-drift 12s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', bottom: '-8%', left: '-4%',
          width: 420, height: 420, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(234,88,12,0.18) 0%, rgba(251,191,36,0.08) 50%, transparent 75%)',
          filter: 'blur(50px)', animation: 'ql-orb-drift2 15s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', top: '38%', left: '28%',
          width: 320, height: 320, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, rgba(99,102,241,0.06) 55%, transparent 75%)',
          filter: 'blur(55px)', animation: 'ql-orb-drift3 18s ease-in-out infinite',
        }} />

        {/* Ghost icons */}
        <FileSignature size={500} strokeWidth={0.5} style={{ position: 'absolute', right: -100, top: -80,   opacity: 0.055, color: '#3b82f6', transform: 'rotate(-12deg)' }} />
        <FileText      size={360} strokeWidth={0.5} style={{ position: 'absolute', left:  -70, bottom: -50,  opacity: 0.05,  color: '#6366f1', transform: 'rotate(10deg)'  }} />
        <DollarSign    size={300} strokeWidth={0.5} style={{ position: 'absolute', left: '44%', top: '20%',  opacity: 0.04,  color: '#3b82f6', transform: 'translateX(-50%) rotate(-5deg)' }} />
        <Calculator    size={220} strokeWidth={0.5} style={{ position: 'absolute', left:  '2%', top:  '5%',  opacity: 0.05,  color: '#818cf8', transform: 'rotate(-8deg)'  }} />
        <Briefcase     size={240} strokeWidth={0.5} style={{ position: 'absolute', right: '3%', top: '36%',  opacity: 0.04,  color: '#6366f1', transform: 'rotate(-10deg)' }} />
        <TrendingUp    size={220} strokeWidth={0.5} style={{ position: 'absolute', right: '5%', bottom: '7%',opacity: 0.05,  color: '#3b82f6', transform: 'rotate(7deg)'   }} />
      </div>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

        {/* Title + tagline */}
        <div>
          <h1 style={{
            margin: 0, fontSize: '1.75rem', fontWeight: 900, lineHeight: 1,
            background: 'linear-gradient(120deg, #f0f6ff 0%, #bfdbfe 55%, #818cf8 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 0 18px rgba(99,102,241,0.35))',
          }}>
            Quotes
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 99, padding: '3px 10px',
              fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.55)',
            }}>
              <FileText size={10} color="rgba(255,255,255,0.4)" />
              {quotes.length} quote{quotes.length !== 1 ? 's' : ''}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.28)' }}>·</span>
            <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.32)', fontStyle: 'italic' }}>
              Manage and track your client proposals
            </span>
          </div>
        </div>

        {/* Create button */}
        <button
          onClick={onCreateNew}
          className="ql-create-btn"
          style={{
            padding: '11px 22px',
            background: 'linear-gradient(135deg, #f97316 0%, #ea580c 50%, #dc2626 100%)',
            border: 'none', borderRadius: 12, color: '#fff',
            fontWeight: 800, cursor: 'pointer', fontSize: '0.875rem',
            display: 'flex', alignItems: 'center', gap: 10,
            animation: 'ql-btn-glow 3s ease-in-out infinite',
            letterSpacing: '0.01em',
          }}
        >
          {/* Icon bubble */}
          <span style={{
            width: 22, height: 22, borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Plus size={13} strokeWidth={2.5} />
          </span>
          Create New Quote
        </button>
      </div>

      {/* ── Stats dashboard ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>

        {/* Total Quotes */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f0f6ff', lineHeight: 1 }}>{stats.total}</div>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(99,102,241,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FileText size={15} color="#818cf8" />
            </div>
          </div>
          <div style={{ fontSize: '0.66rem', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total Quotes</div>
        </div>

        {/* Total Value */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>LKR</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fbbf24', lineHeight: 1 }}>
                {stats.totalValue >= 1000
                  ? `${(stats.totalValue / 1000).toFixed(1)}K`
                  : stats.totalValue.toFixed(0)}
              </div>
            </div>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(251,191,36,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <DollarSign size={15} color="#fbbf24" />
            </div>
          </div>
          <div style={{ fontSize: '0.66rem', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total Value</div>
        </div>

        {/* Approved */}
        <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.18)', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#4ade80', lineHeight: 1 }}>{stats.approved}</div>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(34,197,94,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CheckCircle size={15} color="#4ade80" />
            </div>
          </div>
          {/* Mini approval rate bar */}
          <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: 6 }}>
            <div style={{ width: `${stats.approvedPct}%`, height: '100%', background: '#22c55e', borderRadius: 99, transition: 'width 0.5s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.66rem', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Approved</div>
            <div style={{ fontSize: '0.66rem', fontWeight: 700, color: '#4ade80' }}>{stats.approvedPct}%</div>
          </div>
        </div>

        {/* Active / Pending */}
        <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.18)', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#60a5fa', lineHeight: 1 }}>{stats.active}</div>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(59,130,246,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Clock size={15} color="#60a5fa" />
            </div>
          </div>
          <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: 6 }}>
            <div style={{ width: `${stats.activePct}%`, height: '100%', background: '#3b82f6', borderRadius: 99, transition: 'width 0.5s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.66rem', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Active</div>
            <div style={{ fontSize: '0.66rem', fontWeight: 700, color: '#60a5fa' }}>{stats.activePct}%</div>
          </div>
        </div>

        {/* Denied */}
        <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f87171', lineHeight: 1 }}>{stats.denied}</div>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(239,68,68,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <XCircle size={15} color="#f87171" />
            </div>
          </div>
          <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: 6 }}>
            <div style={{ width: `${stats.deniedPct}%`, height: '100%', background: '#ef4444', borderRadius: 99, transition: 'width 0.5s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.66rem', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Denied</div>
            <div style={{ fontSize: '0.66rem', fontWeight: 700, color: '#f87171' }}>{stats.deniedPct}%</div>
          </div>
        </div>
      </div>

      {/* ── Status distribution bar ── */}
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 18px' }}>
        <div style={{ fontSize: '0.64rem', fontWeight: 700, color: 'rgba(255,255,255,0.32)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
          Status Distribution
        </div>
        {/* Segmented bar */}
        <div style={{ height: 8, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', display: 'flex', marginBottom: 10, gap: 1 }}>
          {stats.approved > 0 && <div style={{ width: `${stats.approvedPct}%`, background: 'linear-gradient(90deg, #16a34a, #22c55e)', borderRadius: stats.active === 0 && stats.denied === 0 ? 99 : '99px 0 0 99px', transition: 'width 0.5s ease' }} />}
          {stats.active   > 0 && <div style={{ width: `${stats.activePct}%`,   background: 'linear-gradient(90deg, #1d4ed8, #3b82f6)', transition: 'width 0.5s ease' }} />}
          {stats.denied   > 0 && <div style={{ width: `${stats.deniedPct}%`,   background: 'linear-gradient(90deg, #dc2626, #ef4444)', borderRadius: stats.approved === 0 && stats.active === 0 ? 99 : '0 99px 99px 0', transition: 'width 0.5s ease' }} />}
        </div>
        {/* Legend */}
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {[
            { color: '#22c55e', label: 'Approved', count: stats.approved, pct: stats.approvedPct },
            { color: '#3b82f6', label: 'Active',   count: stats.active,   pct: stats.activePct   },
            { color: '#ef4444', label: 'Denied',   count: stats.denied,   pct: stats.deniedPct   },
          ].map(({ color, label, count, pct }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)' }}>{label}</span>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>{count}</span>
              <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)' }}>({pct}%)</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <QuoteFilters onFilterChange={setFilters} totalCount={quotes.length} filteredCount={sortedQuotes.length} />

      {/* Empty filtered result */}
      {sortedQuotes.length === 0 && quotes.length > 0 && (
        <div style={{ padding: 40, textAlign: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: 16, border: '1px dashed rgba(255,255,255,0.12)' }}>
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>🔍</div>
          <div style={{ fontWeight: 700, color: 'rgba(255,255,255,0.65)', marginBottom: 6 }}>No quotes match your filters</div>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.875rem', margin: 0 }}>Try adjusting your search or filter criteria</p>
        </div>
      )}

      {/* Quote sections */}
      {sortedQuotes.length > 0 && (
        <div style={{ display: 'grid', gap: 16 }}>
          {renderSection(categorized.approved, 'Approved Quotes',       '#16a34a', '#15803d')}
          {renderSection(categorized.denied,   'Denied Quotes',         '#dc2626', '#b91c1c')}
          {renderSection(categorized.active,   'Active / Pending Quotes', '#1d4ed8', '#1e40af')}
        </div>
      )}

      {/* Modals */}
      {viewModalQuoteId && <QuoteViewModal   quoteId={viewModalQuoteId}  onClose={() => setViewModalQuoteId(null)} />}
      {editModalQuoteId && <QuoteEditModal   quoteId={editModalQuoteId}  onClose={() => setEditModalQuoteId(null)} onSuccess={loadQuotes} />}
      {deleteModalQuote && <QuoteDeleteModal quoteId={deleteModalQuote.id} quoteNumber={deleteModalQuote.number} onClose={() => setDeleteModalQuote(null)} onSuccess={loadQuotes} />}
    </div>
  )
}

export default QuoteList
