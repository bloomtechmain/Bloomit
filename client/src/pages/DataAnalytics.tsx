import { useState, useEffect, useCallback } from 'react'
import { API_URL } from '../config/api'
import { fetchWithAuth } from '../utils/apiClient'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, Users, FolderOpen, Building2, Wallet, Package, Percent, Clock, Target, Activity } from 'lucide-react'

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
  aging_buckets: Array<{
    bucket: string
    count: number
    amount: number
    avg_days: number
  }>
}

type RecurringRevenueData = {
  mrr: number
  arr: number
  breakdown: Array<{
    frequency: string
    count: number
    amount: number
    monthly_normalized: number
  }>
}

type PipelineData = {
  total_pipeline_value: number
  pending_contracts_count: number
  contracts: Array<{
    contract_id: number
    contract_name: string
    customer_name: string
    estimated_value: number
    status: string
  }>
}

type ProfitLossData = {
  total_revenue: number
  cost_breakdown: {
    contract_costs: number
    operating_costs: number
    items_costs: number
    total_costs: number
  }
  gross_profit: number
  net_profit_margin_percentage: number
}

type AnalyticsData = {
  period: string
  dateRange: {
    start: string
    end: string
  }
  summary: {
    accounts: {
      total_balance: number
      account_count: number
    }
    contracts: {
      period: Array<{ status: string; count: string; total_budget: string }>
      overall: Array<{ status: string; count: string; total_budget: string }>
    }
    payables: {
      period: { total: number; count: number }
      overall: { total: number; count: number }
    }
    receivables: {
      period: { total: number; count: number }
      overall: { total: number; count: number }
    }
    petty_cash: {
      balance: number
      transactions: Array<{ transaction_type: string; total: string }>
    }
    employees: Array<{ role: string; count: string }>
    vendors: Array<{ is_active: boolean; count: string }>
    assets: {
      total_value: number
      count: number
    }
    transaction_trends: Array<{ date: string; type: string; amount: string }>
  }
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

export default function DataAnalytics() {
  const [period, setPeriod] = useState<TimePeriod>('monthly')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [profitabilityData, setProfitabilityData] = useState<ProjectProfitabilityData | null>(null)
  const [arAgingData, setArAgingData] = useState<ARAgingData | null>(null)
  const [recurringRevenueData, setRecurringRevenueData] = useState<RecurringRevenueData | null>(null)
  const [pipelineData, setPipelineData] = useState<PipelineData | null>(null)
  const [profitLossData, setProfitLossData] = useState<ProfitLossData | null>(null)

  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetchWithAuth(`${API_URL}/analytics/summary?period=${period}`)
      if (response.ok) {
        const result = await response.json()
        setData(result)
      }
    } catch (err) {
      console.error('Error fetching analytics:', err)
    } finally {
      setLoading(false)
    }
  }, [period])

  const fetchEnhancedMetrics = useCallback(async () => {
    try {
      // Fetch all enhanced metrics in parallel
      const [profitability, arAging, recurring, pipeline, profitLoss] = await Promise.all([
        fetchWithAuth(`${API_URL}/analytics/project-profitability`).then(r => r.ok ? r.json() : null),
        fetchWithAuth(`${API_URL}/analytics/ar-aging`).then(r => r.ok ? r.json() : null),
        fetchWithAuth(`${API_URL}/analytics/recurring-revenue`).then(r => r.ok ? r.json() : null),
        fetchWithAuth(`${API_URL}/analytics/pipeline`).then(r => r.ok ? r.json() : null),
        fetchWithAuth(`${API_URL}/analytics/profit-loss`).then(r => r.ok ? r.json() : null)
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

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 18, color: '#666' }}>Loading analytics...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 18, color: '#666' }}>No data available</div>
      </div>
    )
  }

  // Prepare chart data
  const projectStatusData = data.summary.contracts.overall.map(p => ({
    name: p.status.charAt(0).toUpperCase() + p.status.slice(1),
    value: Number(p.count),
    budget: Number(p.total_budget || 0)
  }))

  const employeeRoleData = data.summary.employees.map(e => ({
    name: e.role,
    value: Number(e.count)
  }))

  // Cash flow data
  const cashFlowData = [
    { name: 'Receivables', amount: Number(data.summary.receivables.overall.total), color: '#00C49F' },
    { name: 'Payables', amount: Number(data.summary.payables.overall.total), color: '#FF8042' },
    { name: 'Net Cash Flow', amount: Number(data.summary.receivables.overall.total) - Number(data.summary.payables.overall.total), color: '#0088FE' }
  ]

  // Transaction trends for line chart
  const groupedTrends = data.summary.transaction_trends.reduce((acc: any, t) => {
    if (!acc[t.date]) {
      acc[t.date] = { date: t.date, payable: 0, receivable: 0 }
    }
    if (t.type === 'payable') {
      acc[t.date].payable += Number(t.amount)
    } else {
      acc[t.date].receivable += Number(t.amount)
    }
    return acc
  }, {})
  
  const transactionTrendsData = Object.values(groupedTrends).slice(0, 15).reverse() as Array<{ date: string; payable: number; receivable: number }>

  const periodLabels = {
    daily: 'Today',
    weekly: 'This Week',
    monthly: 'This Month',
    yearly: 'This Year'
  }

  return (
    <div style={{ padding: 24, maxWidth: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, color: 'var(--text-main)' }}>Data Analytics</h1>
          <p style={{ margin: '8px 0 0', color: '#666' }}>Comprehensive business insights and trends</p>
        </div>
        
        {/* Period Selector */}
        <div style={{ display: 'flex', gap: 8, background: 'rgba(255,255,255,0.5)', padding: 4, borderRadius: 12, border: '1px solid #e0e0e0' }}>
          {(['daily', 'weekly', 'monthly', 'yearly'] as TimePeriod[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: 'none',
                background: period === p ? 'var(--primary)' : 'transparent',
                color: period === p ? '#fff' : '#666',
                fontWeight: period === p ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.2s',
                textTransform: 'capitalize'
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards - All Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16, marginBottom: 32 }}>
        <div className="glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ padding: 12, borderRadius: 12, background: 'rgba(0, 136, 254, 0.1)' }}>
              <DollarSign size={24} color="#0088FE" />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#888', fontWeight: 600, textTransform: 'uppercase' }}>Total Balance</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#0088FE' }}>
                LKR {Number(data.summary.accounts.total_balance).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ padding: 12, borderRadius: 12, background: 'rgba(255, 128, 66, 0.1)' }}>
              <TrendingDown size={24} color="#FF8042" />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#888', fontWeight: 600, textTransform: 'uppercase' }}>Payables</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#FF8042' }}>
                LKR {Number(data.summary.payables.overall.total).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ padding: 12, borderRadius: 12, background: 'rgba(0, 196, 159, 0.1)' }}>
              <TrendingUp size={24} color="#00C49F" />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#888', fontWeight: 600, textTransform: 'uppercase' }}>Receivables</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#00C49F' }}>
                LKR {Number(data.summary.receivables.overall.total).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ padding: 12, borderRadius: 12, background: 'rgba(136, 132, 216, 0.1)' }}>
              <FolderOpen size={24} color="#8884D8" />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#888', fontWeight: 600, textTransform: 'uppercase' }}>Active Projects</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#8884D8' }}>
                {projectStatusData.reduce((sum, p) => sum + p.value, 0)}
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ padding: 12, borderRadius: 12, background: 'rgba(130, 202, 157, 0.1)' }}>
              <Users size={24} color="#82CA9D" />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#888', fontWeight: 600, textTransform: 'uppercase' }}>Total Employees</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#82CA9D' }}>
                {employeeRoleData.reduce((sum, e) => sum + e.value, 0)}
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ padding: 12, borderRadius: 12, background: 'rgba(255, 187, 40, 0.1)' }}>
              <Wallet size={24} color="#FFBB28" />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#888', fontWeight: 600, textTransform: 'uppercase' }}>Petty Cash</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#FFBB28' }}>
                LKR {Number(data.summary.petty_cash.balance).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ padding: 12, borderRadius: 12, background: 'rgba(136, 132, 216, 0.1)' }}>
              <Building2 size={24} color="#8884D8" />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#888', fontWeight: 600, textTransform: 'uppercase' }}>Total Assets</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#8884D8' }}>
                LKR {Number(data.summary.assets.total_value).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ padding: 12, borderRadius: 12, background: 'rgba(0, 196, 159, 0.1)' }}>
              <Package size={24} color="#00C49F" />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#888', fontWeight: 600, textTransform: 'uppercase' }}>Net Cash Flow</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: Number(data.summary.receivables.overall.total) - Number(data.summary.payables.overall.total) >= 0 ? '#00C49F' : '#FF8042' }}>
                LKR {(Number(data.summary.receivables.overall.total) - Number(data.summary.payables.overall.total)).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Project Margin */}
        {profitabilityData && (
          <div className="glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ padding: 12, borderRadius: 12, background: 'rgba(136, 132, 216, 0.1)' }}>
                <Percent size={24} color="#8884D8" />
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#888', fontWeight: 600, textTransform: 'uppercase' }}>Avg Project Margin</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#8884D8' }}>
                  {profitabilityData.summary.average_margin_percentage.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* WIP */}
        {profitabilityData && (
          <div className="glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ padding: 12, borderRadius: 12, background: 'rgba(255, 187, 40, 0.1)' }}>
                <Activity size={24} color="#FFBB28" />
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#888', fontWeight: 600, textTransform: 'uppercase' }}>Work in Progress</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#FFBB28' }}>
                  LKR {profitabilityData.summary.total_wip.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* DSO */}
        {arAgingData && (
          <div className="glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ padding: 12, borderRadius: 12, background: 'rgba(255, 128, 66, 0.1)' }}>
                <Clock size={24} color="#FF8042" />
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#888', fontWeight: 600, textTransform: 'uppercase' }}>DSO (Days)</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#FF8042' }}>
                  {arAgingData.dso_days} days
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* MRR */}
        {recurringRevenueData && recurringRevenueData.mrr > 0 && (
          <div className="glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ padding: 12, borderRadius: 12, background: 'rgba(0, 196, 159, 0.1)' }}>
                <TrendingUp size={24} color="#00C49F" />
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#888', fontWeight: 600, textTransform: 'uppercase' }}>Monthly Recurring Revenue</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#00C49F' }}>
                  LKR {recurringRevenueData.mrr.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* ARR */}
        {recurringRevenueData && recurringRevenueData.arr > 0 && (
          <div className="glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ padding: 12, borderRadius: 12, background: 'rgba(0, 136, 254, 0.1)' }}>
                <TrendingUp size={24} color="#0088FE" />
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#888', fontWeight: 600, textTransform: 'uppercase' }}>Annual Recurring Revenue</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#0088FE' }}>
                  LKR {recurringRevenueData.arr.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Pipeline */}
        {pipelineData && (
          <div className="glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ padding: 12, borderRadius: 12, background: 'rgba(136, 132, 216, 0.1)' }}>
                <Target size={24} color="#8884D8" />
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#888', fontWeight: 600, textTransform: 'uppercase' }}>Sales Pipeline</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#8884D8' }}>
                  LKR {pipelineData.total_pipeline_value.toLocaleString()}
                </div>
                <div style={{ fontSize: 12, color: '#888' }}>{pipelineData.pending_contracts_count} pending contracts</div>
              </div>
            </div>
          </div>
        )}
        
        {/* Gross Profit */}
        {profitLossData && (
          <div className="glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ padding: 12, borderRadius: 12, background: profitLossData.gross_profit >= 0 ? 'rgba(0, 196, 159, 0.1)' : 'rgba(255, 128, 66, 0.1)' }}>
                <DollarSign size={24} color={profitLossData.gross_profit >= 0 ? '#00C49F' : '#FF8042'} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#888', fontWeight: 600, textTransform: 'uppercase' }}>Gross Profit</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: profitLossData.gross_profit >= 0 ? '#00C49F' : '#FF8042' }}>
                  LKR {profitLossData.gross_profit.toLocaleString()}
                </div>
                <div style={{ fontSize: 12, color: '#888' }}>Margin: {profitLossData.net_profit_margin_percentage.toFixed(1)}%</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Data Tables */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24, marginBottom: 32 }}>
        {/* Project Summary */}
        <div className="glass-panel" style={{ padding: 24, borderRadius: 16 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, color: '#fff', fontWeight: 600 }}>Project Summary</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                <th style={{ padding: '8px', textAlign: 'left', fontSize: 14, fontWeight: 600 }}>Status</th>
                <th style={{ padding: '8px', textAlign: 'right', fontSize: 14, fontWeight: 600 }}>Count</th>
                <th style={{ padding: '8px', textAlign: 'right', fontSize: 14, fontWeight: 600 }}>Total Budget</th>
              </tr>
            </thead>
            <tbody>
              {projectStatusData.map((p, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '12px 8px', fontSize: 14 }}>{p.name}</td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 600 }}>{p.value}</td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 600 }}>LKR {p.budget.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Summary */}
        <div className="glass-panel" style={{ padding: 24, borderRadius: 16 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, color: '#fff', fontWeight: 600 }}>Financial Summary ({periodLabels[period]})</h3>
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(0, 196, 159, 0.05)', borderRadius: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>Receivables</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#00C49F' }}>
                LKR {Number(data.summary.receivables.period.total).toLocaleString()}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(255, 128, 66, 0.05)', borderRadius: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>Payables</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#FF8042' }}>
                LKR {Number(data.summary.payables.period.total).toLocaleString()}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(0, 136, 254, 0.05)', borderRadius: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>Net Flow</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: Number(data.summary.receivables.period.total) - Number(data.summary.payables.period.total) >= 0 ? '#00C49F' : '#FF8042' }}>
                LKR {(Number(data.summary.receivables.period.total) - Number(data.summary.payables.period.total)).toLocaleString()}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(136, 132, 216, 0.05)', borderRadius: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>Projects Added</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#8884D8' }}>
                {data.summary.contracts.period.reduce((sum, p) => sum + Number(p.count), 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Project Profitability Table */}
      {profitabilityData && profitabilityData.contracts.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-main)', marginBottom: 16 }}>Project Profitability & Cost Tracking</h2>
          <div className="glass-panel" style={{ padding: 24, borderRadius: 16, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: 14, fontWeight: 600, color: '#fff' }}>Project</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: 14, fontWeight: 600, color: '#fff' }}>Status</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: 14, fontWeight: 600, color: '#fff' }}>Revenue</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: 14, fontWeight: 600, color: '#fff' }}>Costs</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: 14, fontWeight: 600, color: '#fff' }}>Margin</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: 14, fontWeight: 600, color: '#fff' }}>Margin %</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: 14, fontWeight: 600, color: '#fff' }}>Budget</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: 14, fontWeight: 600, color: '#fff' }}>Actual</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: 14, fontWeight: 600, color: '#fff' }}>Variance</th>
                </tr>
              </thead>
              <tbody>
                {profitabilityData.contracts.slice(0, 10).map((proj, idx) => (
                  <tr key={proj.contract_id} style={{ borderBottom: idx < Math.min(profitabilityData.contracts.length, 10) - 1 ? '1px solid #f0f0f0' : 'none' }}>
                    <td style={{ padding: '12px 8px', fontSize: 13 }}>{proj.contract_name}</td>
                    <td style={{ padding: '12px 8px', fontSize: 12 }}>
                      <span style={{ 
                        padding: '4px 8px', 
                        borderRadius: 4, 
                        background: proj.status === 'ongoing' ? 'rgba(0, 136, 254, 0.1)' : proj.status === 'end' ? 'rgba(0, 196, 159, 0.1)' : 'rgba(255, 187, 40, 0.1)',
                        color: proj.status === 'ongoing' ? '#0088FE' : proj.status === 'end' ? '#00C49F' : '#FFBB28',
                        fontSize: 11,
                        fontWeight: 600
                      }}>
                        {proj.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', fontSize: 13, fontWeight: 600 }}>
                      {proj.revenue.toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', fontSize: 13 }}>
                      {proj.total_costs.toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: proj.margin >= 0 ? '#00C49F' : '#FF8042' }}>
                      {proj.margin.toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: proj.margin_percentage >= 0 ? '#00C49F' : '#FF8042' }}>
                      {proj.margin_percentage.toFixed(1)}%
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', fontSize: 13 }}>
                      {proj.budget.toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', fontSize: 13 }}>
                      {proj.actual_cost.toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: proj.variance >= 0 ? '#00C49F' : '#FF8042' }}>
                      {proj.variance.toLocaleString()} ({proj.variance_percentage.toFixed(1)}%)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* P&L Section */}
      {profitLossData && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-main)', marginBottom: 16 }}>Profit & Loss Statement</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: 24 }}>
            <div className="glass-panel" style={{ padding: 24, borderRadius: 16 }}>
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(0, 196, 159, 0.1)', borderRadius: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Total Revenue</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#00C49F' }}>
                    LKR {profitLossData.total_revenue.toLocaleString()}
                  </span>
                </div>
                <div style={{ padding: '8px 12px', borderLeft: '3px solid #888' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                    <span style={{ fontSize: 13, color: '#ccc' }}>Contract Costs</span>
                    <span style={{ fontSize: 13, color: '#ccc' }}>
                      {profitLossData.cost_breakdown.contract_costs.toLocaleString()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                    <span style={{ fontSize: 13, color: '#ccc' }}>Operating Costs</span>
                    <span style={{ fontSize: 13, color: '#ccc' }}>
                      {profitLossData.cost_breakdown.operating_costs.toLocaleString()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                    <span style={{ fontSize: 13, color: '#ccc' }}>Items Costs</span>
                    <span style={{ fontSize: 13, color: '#ccc' }}>
                      {profitLossData.cost_breakdown.items_costs.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(255, 128, 66, 0.1)', borderRadius: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Total Costs</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#FF8042' }}>
                    LKR {profitLossData.cost_breakdown.total_costs.toLocaleString()}
                  </span>
                </div>
                <div style={{ height: 2, background: 'rgba(255,255,255,0.2)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: profitLossData.gross_profit >= 0 ? 'rgba(0, 196, 159, 0.2)' : 'rgba(255, 128, 66, 0.2)', borderRadius: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Gross Profit</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: profitLossData.gross_profit >= 0 ? '#00C49F' : '#FF8042' }}>
                    LKR {profitLossData.gross_profit.toLocaleString()}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px' }}>
                  <span style={{ fontSize: 13, color: '#888' }}>Net Profit Margin</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: profitLossData.net_profit_margin_percentage >= 0 ? '#00C49F' : '#FF8042' }}>
                    {profitLossData.net_profit_margin_percentage.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: 24, marginBottom: 32 }}>
        {/* Transaction Trends */}
        {transactionTrendsData.length > 0 && (
          <div className="glass-panel" style={{ padding: 24, borderRadius: 16 }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 18, color: '#fff', fontWeight: 600 }}>Transaction Trends (Last 15 Days)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={transactionTrendsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#fff' }} />
                <YAxis tick={{ fontSize: 12, fill: '#fff' }} />
                <Tooltip formatter={(value: any) => `LKR ${Number(value).toLocaleString()}`} />
                <Legend />
                <Area type="monotone" dataKey="receivable" stackId="1" stroke="#00C49F" fill="#00C49F" name="Receivables" />
                <Area type="monotone" dataKey="payable" stackId="1" stroke="#FF8042" fill="#FF8042" name="Payables" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Cash Flow Comparison */}
        <div className="glass-panel" style={{ padding: 24, borderRadius: 16 }}>
          <h3 style={{ margin: '0 0 20px', fontSize: 18, color: '#fff', fontWeight: 600 }}>Cash Flow Overview</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={cashFlowData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#fff' }} />
              <YAxis tick={{ fontSize: 12, fill: '#fff' }} />
              <Tooltip formatter={(value: any) => `LKR ${Number(value).toLocaleString()}`} />
              <Bar dataKey="amount">
                {cashFlowData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Project Status Distribution */}
        {projectStatusData.length > 0 && (
          <div className="glass-panel" style={{ padding: 24, borderRadius: 16 }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 18, color: '#fff', fontWeight: 600 }}>Project Status Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={projectStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {projectStatusData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Employee Distribution */}
        {employeeRoleData.length > 0 && (
          <div className="glass-panel" style={{ padding: 24, borderRadius: 16 }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 18, color: '#fff', fontWeight: 600 }}>Employee Distribution by Role</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={employeeRoleData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis type="number" tick={{ fontSize: 12, fill: '#fff' }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: '#fff' }} />
                <Tooltip />
                <Bar dataKey="value" fill="#82CA9D" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* AR Aging Chart */}
        {arAgingData && arAgingData.aging_buckets.length > 0 && (
          <div className="glass-panel" style={{ padding: 24, borderRadius: 16 }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 18, color: '#fff', fontWeight: 600 }}>Accounts Receivable Aging</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={arAgingData.aging_buckets}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="bucket" tick={{ fontSize: 12, fill: '#fff' }} />
                <YAxis tick={{ fontSize: 12, fill: '#fff' }} />
                <Tooltip formatter={(value: any) => `LKR ${Number(value).toLocaleString()}`} />
                <Bar dataKey="amount" fill="#FF8042" />
              </BarChart>
            </ResponsiveContainer>
            <div style={{ marginTop: 16, padding: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
              <div style={{ fontSize: 13, color: '#888' }}>Total Outstanding: <span style={{ fontWeight: 700, color: '#fff' }}>LKR {arAgingData.total_outstanding.toLocaleString()}</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
