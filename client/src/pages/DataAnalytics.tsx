import { useState, useEffect, useCallback } from 'react'
import { API_URL } from '../config/api'
import { fetchWithAuth } from '../utils/apiClient'
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Area, AreaChart,
} from 'recharts'
import {
  TrendingUp, TrendingDown, DollarSign, Users, FolderOpen, Building2,
  Wallet, Package, Percent, Clock, Target, Activity, BarChart3,
  PieChart as PieChartIcon,
} from 'lucide-react'

type TimePeriod = 'daily' | 'weekly' | 'monthly' | 'yearly'

type ProjectProfitabilityData = {
  summary: {
    total_contracts: number
    average_margin_percentage: number
    total_wip: number
    total_revenue: number
    total_costs: number
    total_margin: number
  }
  contracts: Array<{
    contract_id: number
    contract_name: string
    customer_name: string
    status: string
    revenue: number
    direct_costs: number
    items_cost: number
    total_costs: number
    margin: number
    margin_percentage: number
    budget: number
    actual_cost: number
    variance: number
    variance_percentage: number
    wip_value: number
  }>
}

type ARAgingData = {
  dso_days: number
  avg_days_outstanding: number
  total_outstanding: number
  aging_buckets: Array<{ bucket: string; count: number; amount: number; avg_days: number }>
}

type RecurringRevenueData = {
  mrr: number
  arr: number
  breakdown: Array<{ frequency: string; count: number; amount: number; monthly_normalized: number }>
}

type PipelineData = {
  total_pipeline_value: number
  pending_contracts_count: number
  contracts: Array<{ contract_id: number; contract_name: string; customer_name: string; estimated_value: number; status: string }>
}

type ProfitLossData = {
  total_revenue: number
  cost_breakdown: { contract_costs: number; operating_costs: number; items_costs: number; total_costs: number }
  gross_profit: number
  net_profit_margin_percentage: number
}

type AnalyticsData = {
  period: string
  dateRange: { start: string; end: string }
  summary: {
    accounts: { total_balance: number; account_count: number }
    contracts: {
      period: Array<{ status: string; count: string; total_budget: string }>
      overall: Array<{ status: string; count: string; total_budget: string }>
    }
    payables:    { period: { total: number; count: number }; overall: { total: number; count: number } }
    receivables: { period: { total: number; count: number }; overall: { total: number; count: number } }
    petty_cash:  { balance: number; transactions: Array<{ transaction_type: string; total: string }> }
    employees:   Array<{ role: string; count: string }>
    vendors:     Array<{ is_active: boolean; count: string }>
    assets:      { total_value: number; count: number }
    transaction_trends: Array<{ date: string; type: string; amount: string }>
  }
}

/* ── Theme ── */
const SKY       = '#0ea5e9'
const SKY_DARK  = '#0284c7'
const SKY_DEEP  = '#0c4a6e'
const CHART_COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

/* ── Helpers ── */
function sectionHeader(icon: React.ReactNode, title: string) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <div style={{ width: 4, height: 20, borderRadius: 2, background: `linear-gradient(${SKY_DARK}, ${SKY})` }} />
      <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(14,165,233,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: SKY }}>
        {icon}
      </div>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{title}</span>
    </div>
  )
}

function cardHead(icon: React.ReactNode, title: string) {
  return (
    <div style={{ background: `linear-gradient(90deg, ${SKY_DEEP} 0%, #075985 55%, ${SKY} 100%)`, padding: '13px 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ color: 'rgba(255,255,255,0.75)', display: 'flex' }}>{icon}</span>
      <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>{title}</span>
    </div>
  )
}

function chartCard(title: string, icon: React.ReactNode, children: React.ReactNode) {
  return (
    <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.05)' }}>
      <div style={{ padding: '16px 20px 0', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(14,165,233,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: SKY }}>
          {icon}
        </div>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{title}</span>
      </div>
      <div style={{ padding: '0 16px 16px' }}>{children}</div>
    </div>
  )
}

export default function DataAnalytics() {
  const [period, setPeriod]                           = useState<TimePeriod>('monthly')
  const [loading, setLoading]                         = useState(true)
  const [data, setData]                               = useState<AnalyticsData | null>(null)
  const [profitabilityData, setProfitabilityData]     = useState<ProjectProfitabilityData | null>(null)
  const [arAgingData, setArAgingData]                 = useState<ARAgingData | null>(null)
  const [recurringRevenueData, setRecurringRevenueData] = useState<RecurringRevenueData | null>(null)
  const [pipelineData, setPipelineData]               = useState<PipelineData | null>(null)
  const [profitLossData, setProfitLossData]           = useState<ProfitLossData | null>(null)

  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchWithAuth(`${API_URL}/analytics/summary?period=${period}`)
      if (res.ok) {
        setData(await res.json())
      } else {
        const errBody = await res.json().catch(() => ({}))
        console.error('Analytics summary failed:', res.status, errBody)
      }
    } catch (err) {
      console.error('Error fetching analytics:', err)
    } finally {
      setLoading(false)
    }
  }, [period])

  const fetchEnhancedMetrics = useCallback(async () => {
    try {
      const [profitability, arAging, recurring, pipeline, profitLoss] = await Promise.all([
        fetchWithAuth(`${API_URL}/analytics/project-profitability`).then(r => r.ok ? r.json() : null),
        fetchWithAuth(`${API_URL}/analytics/ar-aging`).then(r => r.ok ? r.json() : null),
        fetchWithAuth(`${API_URL}/analytics/recurring-revenue`).then(r => r.ok ? r.json() : null),
        fetchWithAuth(`${API_URL}/analytics/pipeline`).then(r => r.ok ? r.json() : null),
        fetchWithAuth(`${API_URL}/analytics/profit-loss`).then(r => r.ok ? r.json() : null),
      ])
      setProfitabilityData(profitability)
      setArAgingData(arAging)
      setRecurringRevenueData(recurring)
      setPipelineData(pipeline)
      setProfitLossData(profitLoss)
    } catch (err) {
      console.error('Error fetching enhanced metrics:', err)
    }
  }, [])

  useEffect(() => {
    fetchAnalytics()
    fetchEnhancedMetrics()
  }, [fetchAnalytics, fetchEnhancedMetrics])

  /* ── Loading ── */
  if (loading) {
    return (
      <div style={{ padding: 56, textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
        <div style={{ width: 38, height: 38, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.08)', borderTop: `3px solid ${SKY}`, animation: 'ql-spin 0.8s linear infinite', margin: '0 auto 14px' }} />
        Loading analytics…
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{ padding: 56, textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
        <BarChart3 size={44} style={{ marginBottom: 14, opacity: 0.4 }} />
        <div style={{ fontWeight: 600, fontSize: 15.5 }}>No analytics data available</div>
      </div>
    )
  }

  /* ── Chart data ── */
  const projectStatusData = data.summary.contracts.overall.map(p => ({
    name:   p.status.charAt(0).toUpperCase() + p.status.slice(1),
    value:  Number(p.count),
    budget: Number(p.total_budget || 0),
  }))

  const employeeRoleData = data.summary.employees.map(e => ({ name: e.role, value: Number(e.count) }))

  const cashFlowData = [
    { name: 'Receivables', amount: Number(data.summary.receivables.overall.total), color: '#10b981' },
    { name: 'Payables',    amount: Number(data.summary.payables.overall.total),    color: '#ef4444' },
    { name: 'Net Flow',    amount: Number(data.summary.receivables.overall.total) - Number(data.summary.payables.overall.total), color: SKY },
  ]

  const groupedTrends = data.summary.transaction_trends.reduce((acc: Record<string, { date: string; payable: number; receivable: number }>, t) => {
    if (!acc[t.date]) acc[t.date] = { date: t.date, payable: 0, receivable: 0 }
    if (t.type === 'payable') acc[t.date].payable += Number(t.amount)
    else acc[t.date].receivable += Number(t.amount)
    return acc
  }, {})
  const transactionTrendsData = Object.values(groupedTrends).slice(0, 15).reverse()

  const periodLabels: Record<TimePeriod, string> = { daily: 'Today', weekly: 'This Week', monthly: 'This Month', yearly: 'This Year' }

  const netFlow = Number(data.summary.receivables.overall.total) - Number(data.summary.payables.overall.total)

  /* ── KPI card definitions ── */
  type KpiCard = { label: string; value: string; icon: React.ReactNode; color: string; bg: string; sub?: string }
  const kpiCards: KpiCard[] = [
    { label: 'Total Balance',   value: `LKR ${Number(data.summary.accounts.total_balance).toLocaleString()}`,                icon: <DollarSign size={19} />, color: SKY,       bg: 'rgba(14,165,233,0.1)'  },
    { label: 'Receivables',     value: `LKR ${Number(data.summary.receivables.overall.total).toLocaleString()}`,             icon: <TrendingUp size={19} />, color: '#10b981',  bg: 'rgba(16,185,129,0.1)' },
    { label: 'Payables',        value: `LKR ${Number(data.summary.payables.overall.total).toLocaleString()}`,                icon: <TrendingDown size={19} />, color: '#ef4444', bg: 'rgba(239,68,68,0.1)'  },
    { label: 'Net Cash Flow',   value: `LKR ${netFlow.toLocaleString()}`,                                                    icon: <Package size={19} />,    color: netFlow >= 0 ? '#10b981' : '#ef4444', bg: netFlow >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)' },
    { label: 'Active Projects', value: String(projectStatusData.reduce((s, p) => s + p.value, 0)),                          icon: <FolderOpen size={19} />, color: '#8b5cf6',  bg: 'rgba(139,92,246,0.1)' },
    { label: 'Total Employees', value: String(employeeRoleData.reduce((s, e) => s + e.value, 0)),                           icon: <Users size={19} />,      color: '#06b6d4',  bg: 'rgba(6,182,212,0.1)'  },
    { label: 'Petty Cash',      value: `LKR ${Number(data.summary.petty_cash.balance).toLocaleString()}`,                   icon: <Wallet size={19} />,     color: '#f59e0b',  bg: 'rgba(245,158,11,0.1)' },
    { label: 'Total Assets',    value: `LKR ${Number(data.summary.assets.total_value).toLocaleString()}`,                   icon: <Building2 size={19} />,  color: '#64748b',  bg: 'rgba(100,116,139,0.1)' },
    ...(profitabilityData ? [
      { label: 'Avg Project Margin', value: `${profitabilityData.summary.average_margin_percentage.toFixed(1)}%`, icon: <Percent size={19} />,  color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' } as KpiCard,
      { label: 'Work In Progress',   value: `LKR ${profitabilityData.summary.total_wip.toLocaleString()}`,        icon: <Activity size={19} />, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' } as KpiCard,
    ] : []),
    ...(arAgingData ? [
      { label: 'Days Sales Outstanding', value: `${arAgingData.dso_days}d`, icon: <Clock size={19} />, color: '#ef4444', bg: 'rgba(239,68,68,0.1)' } as KpiCard,
    ] : []),
    ...(recurringRevenueData && recurringRevenueData.mrr > 0 ? [
      { label: 'Monthly Recurring Revenue', value: `LKR ${recurringRevenueData.mrr.toLocaleString()}`, icon: <TrendingUp size={19} />, color: '#10b981', bg: 'rgba(16,185,129,0.1)' } as KpiCard,
    ] : []),
    ...(recurringRevenueData && recurringRevenueData.arr > 0 ? [
      { label: 'Annual Recurring Revenue', value: `LKR ${recurringRevenueData.arr.toLocaleString()}`, icon: <TrendingUp size={19} />, color: SKY, bg: 'rgba(14,165,233,0.1)' } as KpiCard,
    ] : []),
    ...(pipelineData ? [
      { label: 'Sales Pipeline', value: `LKR ${pipelineData.total_pipeline_value.toLocaleString()}`, icon: <Target size={19} />, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', sub: `${pipelineData.pending_contracts_count} pending contracts` } as KpiCard,
    ] : []),
    ...(profitLossData ? [
      { label: 'Gross Profit', value: `LKR ${profitLossData.gross_profit.toLocaleString()}`, icon: <DollarSign size={19} />, color: profitLossData.gross_profit >= 0 ? '#10b981' : '#ef4444', bg: profitLossData.gross_profit >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', sub: `Margin: ${profitLossData.net_profit_margin_percentage.toFixed(1)}%` } as KpiCard,
    ] : []),
  ]

  /* ── Axis tick style ── */
  const axisTick = { fontSize: 11, fill: '#94a3b8' }
  const gridStroke = '#f1f5f9'

  return (
    <div style={{ display: 'grid', gap: 22 }}>

      {/* ── Period selector ── */}
      <div style={{ background: '#fff', borderRadius: 14, padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.07)', border: '1px solid rgba(0,0,0,0.05)', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Period</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['daily', 'weekly', 'monthly', 'yearly'] as TimePeriod[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: '6px 16px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', border: 'none', transition: 'all 0.15s', textTransform: 'capitalize',
                background: period === p ? SKY : `rgba(14,165,233,0.07)`,
                color:      period === p ? '#fff' : SKY,
              }}
            >
              {p}
            </button>
          ))}
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>
          {data.dateRange.start} — {data.dateRange.end}
        </span>
      </div>

      {/* ── KPI Cards ── */}
      <div>
        {sectionHeader(<BarChart3 size={14} />, 'Key Performance Indicators')}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 12 }}>
          {kpiCards.map(card => (
            <div key={card.label} style={{ background: '#fff', borderRadius: 14, padding: '15px 17px', display: 'flex', alignItems: 'center', gap: 13, boxShadow: '0 1px 6px rgba(0,0,0,0.07)', border: '1px solid rgba(0,0,0,0.05)' }}>
              <div style={{ width: 42, height: 42, borderRadius: 11, background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: card.color, flexShrink: 0 }}>
                {card.icon}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.value}</div>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginTop: 2 }}>{card.label}</div>
                {card.sub && <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 1 }}>{card.sub}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Quick tables ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(380px, 100%), 1fr))', gap: 16 }}>
        {/* Project Summary */}
        <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.05)' }}>
          {cardHead(<FolderOpen size={14} />, 'Project Summary')}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['Status', 'Count', 'Total Budget'].map((h, i) => (
                  <th key={h} style={{ padding: '9px 16px', textAlign: i > 0 ? 'right' : 'left', fontWeight: 700, color: '#475569', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projectStatusData.map((p, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.12s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f0f9ff')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '11px 16px', color: '#1e293b', fontWeight: 600 }}>{p.name}</td>
                  <td style={{ padding: '11px 16px', textAlign: 'right', fontWeight: 800, color: SKY }}>{p.value}</td>
                  <td style={{ padding: '11px 16px', textAlign: 'right', color: '#475569' }}>LKR {p.budget.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Summary */}
        <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.05)' }}>
          {cardHead(<DollarSign size={14} />, `Financial Summary — ${periodLabels[period]}`)}
          <div style={{ padding: '16px' }}>
            {[
              { label: 'Receivables',   value: `LKR ${Number(data.summary.receivables.period.total).toLocaleString()}`,  color: '#10b981', bg: 'rgba(16,185,129,0.06)',  border: 'rgba(16,185,129,0.2)' },
              { label: 'Payables',      value: `LKR ${Number(data.summary.payables.period.total).toLocaleString()}`,    color: '#ef4444', bg: 'rgba(239,68,68,0.06)',   border: 'rgba(239,68,68,0.2)' },
              { label: 'Net Cash Flow', value: `LKR ${(Number(data.summary.receivables.period.total) - Number(data.summary.payables.period.total)).toLocaleString()}`,
                color: Number(data.summary.receivables.period.total) - Number(data.summary.payables.period.total) >= 0 ? '#10b981' : '#ef4444',
                bg:    Number(data.summary.receivables.period.total) - Number(data.summary.payables.period.total) >= 0 ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
                border: Number(data.summary.receivables.period.total) - Number(data.summary.payables.period.total) >= 0 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
              },
              { label: 'Projects Added', value: String(data.summary.contracts.period.reduce((s, p) => s + Number(p.count), 0)), color: SKY, bg: 'rgba(14,165,233,0.06)', border: 'rgba(14,165,233,0.2)' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 13px', background: row.bg, borderRadius: 10, border: `1px solid ${row.border}`, marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>{row.label}</span>
                <span style={{ fontSize: 13.5, fontWeight: 800, color: row.color }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── P&L Statement ── */}
      {profitLossData && (
        <div>
          {sectionHeader(<DollarSign size={14} />, 'Profit & Loss Statement')}
          <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.05)', maxWidth: 640 }}>
            {/* Revenue */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: 'rgba(16,185,129,0.06)', borderBottom: '1px solid rgba(16,185,129,0.15)' }}>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: '#065f46' }}>Total Revenue</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#10b981' }}>LKR {profitLossData.total_revenue.toLocaleString()}</span>
            </div>
            {/* Cost breakdown */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Cost Breakdown</div>
              {[
                { label: 'Contract Costs',  value: profitLossData.cost_breakdown.contract_costs  },
                { label: 'Operating Costs', value: profitLossData.cost_breakdown.operating_costs },
                { label: 'Items Costs',     value: profitLossData.cost_breakdown.items_costs     },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed #f1f5f9' }}>
                  <span style={{ fontSize: 13, color: '#64748b', paddingLeft: 12 }}>• {row.label}</span>
                  <span style={{ fontSize: 13, color: '#475569', fontWeight: 600 }}>LKR {row.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
            {/* Total costs */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: 'rgba(239,68,68,0.05)', borderBottom: '2px solid #e2e8f0' }}>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: '#7f1d1d' }}>Total Costs</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#ef4444' }}>LKR {profitLossData.cost_breakdown.total_costs.toLocaleString()}</span>
            </div>
            {/* Gross profit */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: profitLossData.gross_profit >= 0 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#1e293b' }}>Gross Profit</div>
                <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>Net margin: <strong style={{ color: profitLossData.net_profit_margin_percentage >= 0 ? '#10b981' : '#ef4444' }}>{profitLossData.net_profit_margin_percentage.toFixed(2)}%</strong></div>
              </div>
              <span style={{ fontSize: 20, fontWeight: 900, color: profitLossData.gross_profit >= 0 ? '#10b981' : '#ef4444' }}>LKR {profitLossData.gross_profit.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Project Profitability ── */}
      {profitabilityData && profitabilityData.contracts.length > 0 && (
        <div>
          {sectionHeader(<Activity size={14} />, 'Project Profitability & Cost Tracking')}
          <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.05)' }}>
            {/* Summary bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: '1px solid #f1f5f9' }}>
              {[
                { label: 'Contracts',  value: profitabilityData.summary.total_contracts, fmt: (v: number) => String(v), color: SKY },
                { label: 'Revenue',    value: profitabilityData.summary.total_revenue, fmt: (v: number) => `LKR ${v.toLocaleString()}`, color: '#10b981' },
                { label: 'Total Costs',value: profitabilityData.summary.total_costs,   fmt: (v: number) => `LKR ${v.toLocaleString()}`, color: '#ef4444' },
                { label: 'Avg Margin', value: profitabilityData.summary.average_margin_percentage, fmt: (v: number) => `${v.toFixed(1)}%`, color: profitabilityData.summary.average_margin_percentage >= 0 ? '#10b981' : '#ef4444' },
              ].map(s => (
                <div key={s.label} style={{ padding: '14px 16px', borderRight: '1px solid #f1f5f9', textAlign: 'center' }}>
                  <div style={{ fontSize: 17, fontWeight: 800, color: s.color }}>{s.fmt(s.value)}</div>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, minWidth: 860 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    {['Project', 'Customer', 'Status', 'Revenue', 'Costs', 'Margin', 'Margin %', 'Budget', 'Variance'].map((h, i) => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: i < 3 ? 'left' : 'right', fontWeight: 700, color: '#475569', fontSize: 10.5, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {profitabilityData.contracts.slice(0, 10).map((proj, idx) => {
                    const statusMeta: Record<string, { bg: string; color: string }> = {
                      ongoing: { bg: 'rgba(14,165,233,0.1)',  color: SKY       },
                      end:     { bg: 'rgba(16,185,129,0.1)', color: '#10b981' },
                      pending: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
                    }
                    const sm = statusMeta[proj.status] || { bg: 'rgba(100,116,139,0.1)', color: '#64748b' }
                    return (
                      <tr key={proj.contract_id}
                        style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #f1f5f9', transition: 'background 0.12s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f0f9ff')}
                        onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafafa')}
                      >
                        <td style={{ padding: '11px 14px', fontWeight: 700, color: '#1e293b', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{proj.contract_name}</td>
                        <td style={{ padding: '11px 14px', color: '#64748b', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{proj.customer_name}</td>
                        <td style={{ padding: '11px 14px' }}>
                          <span style={{ padding: '3px 10px', borderRadius: 99, background: sm.bg, color: sm.color, fontSize: 11, fontWeight: 700 }}>{proj.status}</span>
                        </td>
                        <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 600, color: '#1e293b' }}>{proj.revenue.toLocaleString()}</td>
                        <td style={{ padding: '11px 14px', textAlign: 'right', color: '#64748b' }}>{proj.total_costs.toLocaleString()}</td>
                        <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 700, color: proj.margin >= 0 ? '#10b981' : '#ef4444' }}>{proj.margin.toLocaleString()}</td>
                        <td style={{ padding: '11px 14px', textAlign: 'right' }}>
                          <span style={{ fontWeight: 800, color: proj.margin_percentage >= 0 ? '#10b981' : '#ef4444' }}>{proj.margin_percentage.toFixed(1)}%</span>
                        </td>
                        <td style={{ padding: '11px 14px', textAlign: 'right', color: '#64748b' }}>{proj.budget.toLocaleString()}</td>
                        <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 700, color: proj.variance >= 0 ? '#10b981' : '#ef4444' }}>
                          {proj.variance.toLocaleString()} <span style={{ fontSize: 11, opacity: 0.7 }}>({proj.variance_percentage.toFixed(1)}%)</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Charts ── */}
      <div>
        {sectionHeader(<PieChartIcon size={14} />, 'Visual Insights')}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(340px, 100%), 1fr))', gap: 16 }}>

          {/* Transaction Trends */}
          {transactionTrendsData.length > 0 && chartCard(
            'Transaction Trends (Last 15 Days)',
            <TrendingUp size={16} />,
            <ResponsiveContainer width="100%" height={270}>
              <AreaChart data={transactionTrendsData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradRec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradPay" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="date" tick={axisTick} />
                <YAxis tick={axisTick} />
                <Tooltip formatter={(v: number) => `LKR ${Number(v).toLocaleString()}`} contentStyle={{ borderRadius: 10, fontSize: 12, border: '1px solid #e2e8f0' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="receivable" stroke="#10b981" fill="url(#gradRec)" strokeWidth={2} name="Receivables" />
                <Area type="monotone" dataKey="payable"    stroke="#ef4444" fill="url(#gradPay)" strokeWidth={2} name="Payables"    />
              </AreaChart>
            </ResponsiveContainer>
          )}

          {/* Cash Flow */}
          {chartCard(
            'Cash Flow Overview',
            <DollarSign size={16} />,
            <ResponsiveContainer width="100%" height={270}>
              <BarChart data={cashFlowData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="name" tick={axisTick} />
                <YAxis tick={axisTick} />
                <Tooltip formatter={(v: number) => `LKR ${Number(v).toLocaleString()}`} contentStyle={{ borderRadius: 10, fontSize: 12, border: '1px solid #e2e8f0' }} />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                  {cashFlowData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}

          {/* Project Status Distribution */}
          {projectStatusData.length > 0 && chartCard(
            'Project Status Distribution',
            <PieChartIcon size={16} />,
            <ResponsiveContainer width="100%" height={270}>
              <PieChart>
                <Pie
                  data={projectStatusData}
                  cx="50%" cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={100}
                  dataKey="value"
                >
                  {projectStatusData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12, border: '1px solid #e2e8f0' }} />
              </PieChart>
            </ResponsiveContainer>
          )}

          {/* Employee Distribution */}
          {employeeRoleData.length > 0 && chartCard(
            'Employee Distribution by Role',
            <Users size={16} />,
            <ResponsiveContainer width="100%" height={270}>
              <BarChart data={employeeRoleData} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis type="number" tick={axisTick} />
                <YAxis dataKey="name" type="category" tick={axisTick} width={90} />
                <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12, border: '1px solid #e2e8f0' }} />
                <Bar dataKey="value" fill={SKY} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}

          {/* AR Aging */}
          {arAgingData && arAgingData.aging_buckets.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.05)' }}>
              <div style={{ padding: '16px 20px 0', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                  <Clock size={16} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>Accounts Receivable Aging</span>
              </div>
              {/* Mini stats */}
              <div style={{ display: 'flex', gap: 12, padding: '0 20px 12px' }}>
                {[
                  { label: 'DSO',          value: `${arAgingData.dso_days}d`,                                       color: '#ef4444' },
                  { label: 'Avg Days',     value: `${arAgingData.avg_days_outstanding}d`,                           color: '#f59e0b' },
                  { label: 'Outstanding',  value: `LKR ${arAgingData.total_outstanding.toLocaleString()}`,          color: SKY      },
                ].map(s => (
                  <div key={s.label} style={{ flex: 1, background: '#f8fafc', borderRadius: 10, padding: '8px 12px', border: '1px solid #f1f5f9', textAlign: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 10.5, color: '#94a3b8', fontWeight: 600 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ padding: '0 16px 16px' }}>
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={arAgingData.aging_buckets} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                    <XAxis dataKey="bucket" tick={axisTick} />
                    <YAxis tick={axisTick} />
                    <Tooltip formatter={(v: number) => `LKR ${Number(v).toLocaleString()}`} contentStyle={{ borderRadius: 10, fontSize: 12, border: '1px solid #e2e8f0' }} />
                    <Bar dataKey="amount" fill="#ef4444" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
