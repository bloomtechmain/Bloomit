import { Request, Response } from 'express'

// Helper to get date ranges
const getDateRange = (period: 'daily' | 'weekly' | 'monthly' | 'yearly') => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (period) {
    case 'daily':
      return {
        start: today.toISOString(),
        end: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString()
      }
    case 'weekly':
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - 7)
      return {
        start: weekStart.toISOString(),
        end: now.toISOString()
      }
    case 'monthly':
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      return {
        start: monthStart.toISOString(),
        end: now.toISOString()
      }
    case 'yearly':
      const yearStart = new Date(now.getFullYear(), 0, 1)
      return {
        start: yearStart.toISOString(),
        end: now.toISOString()
      }
  }
}

export const getProjectProfitability = async (req: Request, res: Response) => {
  try {
    // Get all contracts first
    const contractsQuery = `SELECT * FROM contracts ORDER BY contract_id DESC`
    const contractsResult = await req.dbClient!.query(contractsQuery)

    // Get receivables by contract
    const receivablesQuery = `
      SELECT contract_id, SUM(amount) as total_revenue
      FROM receivables
      WHERE is_active = true AND contract_id IS NOT NULL
      GROUP BY contract_id
    `
    const receivablesResult = await req.dbClient!.query(receivablesQuery)
    const receivablesMap = new Map(receivablesResult.rows.map(r => [r.contract_id, Number(r.total_revenue)]))

    // Get payables by contract
    const payablesQuery = `
      SELECT contract_id, SUM(amount) as total_costs
      FROM payables
      WHERE is_active = true AND contract_id IS NOT NULL
      GROUP BY contract_id
    `
    const payablesResult = await req.dbClient!.query(payablesQuery)
    const payablesMap = new Map(payablesResult.rows.map(p => [p.contract_id, Number(p.total_costs)]))

    // Get contract items by contract
    const itemsQuery = `
      SELECT contract_id, SUM(unit_cost) as total_items_cost
      FROM contract_items
      GROUP BY contract_id
    `
    const itemsResult = await req.dbClient!.query(itemsQuery)
    const itemsMap = new Map(itemsResult.rows.map(i => [i.contract_id, Number(i.total_items_cost)]))

    // Calculate margins and variances
    const contractsWithMetrics = contractsResult.rows.map(contract => {
      const revenue = receivablesMap.get(contract.contract_id) || 0
      const directCosts = payablesMap.get(contract.contract_id) || 0
      const itemsCost = itemsMap.get(contract.contract_id) || 0
      const totalCosts = directCosts + itemsCost
      const margin = revenue - totalCosts
      const marginPercentage = revenue > 0 ? (margin / revenue) * 100 : 0
      const totalBudget = Number(contract.initial_cost_budget) + Number(contract.extra_budget_allocation)
      const actualCost = totalCosts
      const variance = totalBudget - actualCost
      const variancePercentage = totalBudget > 0 ? (variance / totalBudget) * 100 : 0
      const wip = contract.status === 'ongoing' ? totalBudget - revenue : 0

      return {
        contract_id: contract.contract_id,
        contract_name: contract.contract_name,
        customer_name: contract.customer_name,
        status: contract.status,
        revenue: revenue,
        direct_costs: directCosts,
        items_cost: itemsCost,
        total_costs: totalCosts,
        margin: margin,
        margin_percentage: marginPercentage,
        budget: totalBudget,
        actual_cost: actualCost,
        variance: variance,
        variance_percentage: variancePercentage,
        wip_value: wip
      }
    })

    // Calculate summary metrics
    const summary = {
      total_contracts: contractsWithMetrics.length,
      average_margin_percentage: contractsWithMetrics.length > 0
        ? contractsWithMetrics.reduce((sum, p) => sum + p.margin_percentage, 0) / contractsWithMetrics.length
        : 0,
      total_wip: contractsWithMetrics.reduce((sum, p) => sum + p.wip_value, 0),
      total_revenue: contractsWithMetrics.reduce((sum, p) => sum + p.revenue, 0),
      total_costs: contractsWithMetrics.reduce((sum, p) => sum + p.total_costs, 0),
      total_margin: contractsWithMetrics.reduce((sum, p) => sum + p.margin, 0)
    }

    return res.json({
      summary,
      contracts: contractsWithMetrics
    })
  } catch (err) {
    console.error('Contract profitability error:', err)
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}

export const getARAgingReport = async (req: Request, res: Response) => {
  try {
    // Get aging buckets
    const agingQuery = `
      SELECT
        CASE
          WHEN CURRENT_DATE - created_at::date <= 30 THEN '0-30 days'
          WHEN CURRENT_DATE - created_at::date <= 60 THEN '31-60 days'
          WHEN CURRENT_DATE - created_at::date <= 90 THEN '61-90 days'
          ELSE '90+ days'
        END as age_bucket,
        COUNT(*) as count,
        SUM(amount) as total_amount,
        AVG(CURRENT_DATE - created_at::date) as avg_days
      FROM receivables
      WHERE is_active = true
      GROUP BY
        CASE
          WHEN CURRENT_DATE - created_at::date <= 30 THEN '0-30 days'
          WHEN CURRENT_DATE - created_at::date <= 60 THEN '31-60 days'
          WHEN CURRENT_DATE - created_at::date <= 90 THEN '61-90 days'
          ELSE '90+ days'
        END
      ORDER BY
        CASE
          WHEN CASE
            WHEN CURRENT_DATE - created_at::date <= 30 THEN '0-30 days'
            WHEN CURRENT_DATE - created_at::date <= 60 THEN '31-60 days'
            WHEN CURRENT_DATE - created_at::date <= 90 THEN '61-90 days'
            ELSE '90+ days'
          END = '0-30 days' THEN 1
          WHEN CASE
            WHEN CURRENT_DATE - created_at::date <= 30 THEN '0-30 days'
            WHEN CURRENT_DATE - created_at::date <= 60 THEN '31-60 days'
            WHEN CURRENT_DATE - created_at::date <= 90 THEN '61-90 days'
            ELSE '90+ days'
          END = '31-60 days' THEN 2
          WHEN CASE
            WHEN CURRENT_DATE - created_at::date <= 30 THEN '0-30 days'
            WHEN CURRENT_DATE - created_at::date <= 60 THEN '31-60 days'
            WHEN CURRENT_DATE - created_at::date <= 90 THEN '61-90 days'
            ELSE '90+ days'
          END = '61-90 days' THEN 3
          ELSE 4
        END
    `

    const agingResult = await req.dbClient!.query(agingQuery)

    // Calculate DSO (Days Sales Outstanding)
    const dsoQuery = `
      SELECT
        COALESCE(SUM(amount), 0) as total_receivables,
        COALESCE(AVG(CURRENT_DATE - created_at::date), 0) as avg_days_outstanding
      FROM receivables
      WHERE is_active = true
    `

    const dsoResult = await req.dbClient!.query(dsoQuery)

    // Get total revenue for DSO calculation
    const revenueQuery = `
      SELECT COALESCE(SUM(amount), 0) as total_revenue
      FROM receivables
      WHERE is_active = true
    `
    const revenueResult = await req.dbClient!.query(revenueQuery)

    const totalReceivables = Number(dsoResult.rows[0]?.total_receivables) || 0
    const totalRevenue = Number(revenueResult.rows[0]?.total_revenue) || 0
    const avgDaysOutstanding = Number(dsoResult.rows[0]?.avg_days_outstanding) || 0

    // DSO calculation: (Total Receivables / Total Revenue) * 365
    const dso = totalRevenue > 0 ? (totalReceivables / totalRevenue) * 365 : avgDaysOutstanding

    return res.json({
      dso_days: Math.round(dso),
      avg_days_outstanding: Math.round(avgDaysOutstanding),
      total_outstanding: totalReceivables,
      aging_buckets: agingResult.rows.map(row => ({
        bucket: row.age_bucket,
        count: Number(row.count),
        amount: Number(row.total_amount),
        avg_days: Math.round(Number(row.avg_days))
      }))
    })
  } catch (err) {
    console.error('AR Aging error:', err)
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}

export const getRecurringRevenue = async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT
        frequency,
        SUM(amount) as total_amount,
        COUNT(*) as count
      FROM receivables
      WHERE receivable_type = 'RECURRING' AND is_active = true
      GROUP BY frequency
    `

    const result = await req.dbClient!.query(query)

    // Calculate MRR (normalize all to monthly)
    let mrr = 0
    const breakdown: any[] = []

    result.rows.forEach(row => {
      const amount = Number(row.total_amount) || 0
      const count = Number(row.count)
      let monthlyAmount = 0

      switch (row.frequency) {
        case 'WEEKLY':
          monthlyAmount = amount * 4.33 // Average weeks per month
          break
        case 'MONTHLY':
          monthlyAmount = amount
          break
        case 'YEARLY':
          monthlyAmount = amount / 12
          break
        default:
          monthlyAmount = amount
      }

      mrr += monthlyAmount
      breakdown.push({
        frequency: row.frequency,
        count: count,
        amount: amount,
        monthly_normalized: monthlyAmount
      })
    })

    const arr = mrr * 12

    return res.json({
      mrr: Math.round(mrr * 100) / 100,
      arr: Math.round(arr * 100) / 100,
      breakdown: breakdown
    })
  } catch (err) {
    console.error('Recurring revenue error:', err)
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}

export const getSalesPipeline = async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT
        contract_id,
        contract_name,
        customer_name,
        (initial_cost_budget + extra_budget_allocation) as estimated_value,
        status
      FROM contracts
      WHERE status = 'pending'
      ORDER BY (initial_cost_budget + extra_budget_allocation) DESC
    `

    const result = await req.dbClient!.query(query)

    const totalValue = result.rows.reduce((sum, contract) =>
      sum + Number(contract.estimated_value), 0
    )

    return res.json({
      total_pipeline_value: totalValue,
      pending_contracts_count: result.rows.length,
      contracts: result.rows.map(row => ({
        contract_id: row.contract_id,
        contract_name: row.contract_name,
        customer_name: row.customer_name,
        estimated_value: Number(row.estimated_value),
        status: row.status
      }))
    })
  } catch (err) {
    console.error('Sales pipeline error:', err)
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}

export const getProfitLoss = async (req: Request, res: Response) => {
  try {
    // Total Revenue
    const revenueQuery = `
      SELECT COALESCE(SUM(amount), 0) as total_revenue
      FROM receivables
      WHERE is_active = true
    `
    const revenueResult = await req.dbClient!.query(revenueQuery)

    // Contract Costs
    const contractCostsQuery = `
      SELECT COALESCE(SUM(amount), 0) as contract_costs
      FROM payables
      WHERE contract_id IS NOT NULL AND is_active = true
    `
    const contractCostsResult = await req.dbClient!.query(contractCostsQuery)

    // Operating Costs (non-contract payables)
    const operatingCostsQuery = `
      SELECT COALESCE(SUM(amount), 0) as operating_costs
      FROM payables
      WHERE contract_id IS NULL AND is_active = true
    `
    const operatingCostsResult = await req.dbClient!.query(operatingCostsQuery)

    // Contract items costs
    const itemsCostsQuery = `
      SELECT COALESCE(SUM(unit_cost), 0) as items_costs
      FROM contract_items
    `
    const itemsCostsResult = await req.dbClient!.query(itemsCostsQuery)

    const totalRevenue = Number(revenueResult.rows[0]?.total_revenue) || 0
    const contractCosts = Number(contractCostsResult.rows[0]?.contract_costs) || 0
    const operatingCosts = Number(operatingCostsResult.rows[0]?.operating_costs) || 0
    const itemsCosts = Number(itemsCostsResult.rows[0]?.items_costs) || 0

    const totalCosts = contractCosts + operatingCosts + itemsCosts
    const grossProfit = totalRevenue - totalCosts
    const netProfitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0

    return res.json({
      total_revenue: totalRevenue,
      cost_breakdown: {
        contract_costs: contractCosts,
        operating_costs: operatingCosts,
        items_costs: itemsCosts,
        total_costs: totalCosts
      },
      gross_profit: grossProfit,
      net_profit_margin_percentage: netProfitMargin
    })
  } catch (err) {
    console.error('Profit & Loss error:', err)
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}

export const getAnalyticsSummary = async (req: Request, res: Response) => {
  const period = (req.query.period as string) || 'monthly'

  if (!['daily', 'weekly', 'monthly', 'yearly'].includes(period)) {
    return res.status(400).json({ error: 'Invalid period' })
  }

  const dateRange = getDateRange(period as 'daily' | 'weekly' | 'monthly' | 'yearly')

  try {
    // Get financial summary
    const accountsResult = await req.dbClient!.query(
      `SELECT
        SUM(current_balance) as total_balance,
        COUNT(*) as account_count
       FROM company_bank_accounts`
    )

    // Get contracts summary - contracts table has created_at, so we filter by period
    const contractsResult = await req.dbClient!.query(
      `SELECT
        status,
        COUNT(*) as count,
        SUM(initial_cost_budget + extra_budget_allocation) as total_budget
       FROM contracts
       WHERE created_at >= $1 AND created_at < $2
       GROUP BY status`,
      [dateRange.start, dateRange.end]
    )

    // Get all contracts for overall stats
    const allContractsResult = await req.dbClient!.query(
      `SELECT
        status,
        COUNT(*) as count,
        SUM(initial_cost_budget + extra_budget_allocation) as total_budget
       FROM contracts
       GROUP BY status`
    )

    // Get payables summary
    const payablesResult = await req.dbClient!.query(
      `SELECT
        SUM(amount) as total_payables,
        COUNT(*) as payable_count
       FROM payables
       WHERE created_at >= $1 AND created_at < $2 AND is_active = true`,
      [dateRange.start, dateRange.end]
    )

    // Get all payables for overall stats
    const allPayablesResult = await req.dbClient!.query(
      `SELECT
        SUM(amount) as total_payables,
        COUNT(*) as payable_count
       FROM payables
       WHERE is_active = true`
    )

    // Get receivables summary
    const receivablesResult = await req.dbClient!.query(
      `SELECT
        SUM(amount) as total_receivables,
        COUNT(*) as receivable_count
       FROM receivables
       WHERE created_at >= $1 AND created_at < $2 AND is_active = true`,
      [dateRange.start, dateRange.end]
    )

    // Get all receivables for overall stats
    const allReceivablesResult = await req.dbClient!.query(
      `SELECT
        SUM(amount) as total_receivables,
        COUNT(*) as receivable_count
       FROM receivables
       WHERE is_active = true`
    )

    // Get petty cash
    const pettyCashResult = await req.dbClient!.query(
      `SELECT current_balance FROM petty_cash_account LIMIT 1`
    )

    // Get petty cash transactions for period
    const pettyCashTransactionsResult = await req.dbClient!.query(
      `SELECT
        transaction_type,
        SUM(amount) as total
       FROM petty_cash_transactions
       WHERE created_at >= $1 AND created_at < $2
       GROUP BY transaction_type`,
      [dateRange.start, dateRange.end]
    )

    // Get employees summary
    const employeesResult = await req.dbClient!.query(
      `SELECT
        role,
        COUNT(*) as count
       FROM employees
       GROUP BY role`
    )

    // Get vendors summary
    const vendorsResult = await req.dbClient!.query(
      `SELECT
        is_active,
        COUNT(*) as count
       FROM vendors
       GROUP BY is_active`
    )

    // Get assets summary
    const assetsResult = await req.dbClient!.query(
      `SELECT
        SUM(value) as total_value,
        COUNT(*) as count
       FROM assets`
    )

    // Get daily transaction data for charts (last 30 days)
    const transactionTrendsResult = await req.dbClient!.query(
      `SELECT
        DATE(created_at) as date,
        'payable' as type,
        SUM(amount) as amount
       FROM payables
       WHERE created_at >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(created_at)
       UNION ALL
       SELECT
        DATE(created_at) as date,
        'receivable' as type,
        SUM(amount) as amount
       FROM receivables
       WHERE created_at >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(created_at)
       ORDER BY date DESC`
    )

    // Get enhanced metrics - Fix nested aggregate by using subquery
    // Now using contracts table since receivables/payables link to contract_id
    const profitabilityResult = await req.dbClient!.query(`
      SELECT
        COALESCE(AVG(margin_pct), 0) as avg_margin
      FROM (
        SELECT
          c.contract_id,
          CASE
            WHEN COALESCE(SUM(r.amount), 0) > 0
            THEN ((COALESCE(SUM(r.amount), 0) - COALESCE(SUM(pay.amount), 0)) / COALESCE(SUM(r.amount), 0)) * 100
            ELSE 0
          END as margin_pct
        FROM contracts c
        LEFT JOIN receivables r ON r.contract_id = c.contract_id AND r.is_active = true
        LEFT JOIN payables pay ON pay.contract_id = c.contract_id AND pay.is_active = true
        GROUP BY c.contract_id
      ) contract_margins
    `)

    return res.json({
      period,
      dateRange,
      summary: {
        accounts: {
          total_balance: accountsResult.rows[0]?.total_balance || 0,
          account_count: accountsResult.rows[0]?.account_count || 0
        },
        contracts: {
          period: contractsResult.rows,
          overall: allContractsResult.rows
        },
        payables: {
          period: {
            total: payablesResult.rows[0]?.total_payables || 0,
            count: payablesResult.rows[0]?.payable_count || 0
          },
          overall: {
            total: allPayablesResult.rows[0]?.total_payables || 0,
            count: allPayablesResult.rows[0]?.payable_count || 0
          }
        },
        receivables: {
          period: {
            total: receivablesResult.rows[0]?.total_receivables || 0,
            count: receivablesResult.rows[0]?.receivable_count || 0
          },
          overall: {
            total: allReceivablesResult.rows[0]?.total_receivables || 0,
            count: allReceivablesResult.rows[0]?.receivable_count || 0
          }
        },
        petty_cash: {
          balance: pettyCashResult.rows[0]?.current_balance || 0,
          transactions: pettyCashTransactionsResult.rows
        },
        employees: employeesResult.rows,
        vendors: vendorsResult.rows,
        assets: {
          total_value: assetsResult.rows[0]?.total_value || 0,
          count: assetsResult.rows[0]?.count || 0
        },
        transaction_trends: transactionTrendsResult.rows,
        enhanced_metrics: {
          avg_project_margin: Number(profitabilityResult.rows[0]?.avg_margin) || 0
        }
      }
    })
  } catch (err) {
    console.error('Analytics error:', err)
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}
