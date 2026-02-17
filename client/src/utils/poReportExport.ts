import type { PurchaseOrder } from '../types/purchaseOrders'

export const exportToCSV = (purchaseOrders: PurchaseOrder[], filename: string = 'purchase_orders.csv') => {
  // Define headers
  const headers = [
    'PO Number',
    'Date Created',
    'Requested By',
    'Vendor',
    'Project',
    'Subtotal',
    'Tax',
    'Shipping',
    'Banking Fee',
    'Total Amount',
    'Status',
    'Payment Method',
    'Approved By',
    'Approved Date',
    'Rejection Reason'
  ]

  // Convert data to CSV rows
  const rows = purchaseOrders.map(po => [
    po.po_number,
    new Date(po.created_at).toLocaleDateString(),
    po.requested_by_name,
    po.vendor_name || '',
    po.project_name || '',
    Number(po.subtotal).toFixed(2),
    Number(po.sales_tax).toFixed(2),
    Number(po.shipping_handling).toFixed(2),
    Number(po.banking_fee).toFixed(2),
    Number(po.total_amount).toFixed(2),
    po.status,
    po.payment_method || '',
    po.approved_by_name || '',
    po.approved_at ? new Date(po.approved_at).toLocaleDateString() : '',
    po.rejection_reason || ''
  ])

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export const exportSummaryReport = (
  purchaseOrders: PurchaseOrder[],
  dateFrom: string,
  dateTo: string
) => {
  const filename = `po_summary_${dateFrom}_to_${dateTo}.csv`
  
  // Calculate summary statistics
  const total = purchaseOrders.length
  const pending = purchaseOrders.filter(po => po.status === 'PENDING').length
  const approved = purchaseOrders.filter(po => po.status === 'APPROVED').length
  const rejected = purchaseOrders.filter(po => po.status === 'REJECTED').length
  const paid = purchaseOrders.filter(po => po.status === 'PAID').length
  
  const totalAmount = purchaseOrders.reduce((sum, po) => sum + Number(po.total_amount), 0)
  const approvedAmount = purchaseOrders
    .filter(po => po.status !== 'REJECTED')
    .reduce((sum, po) => sum + Number(po.total_amount), 0)
  
  const summaryContent = [
    'Purchase Order Summary Report',
    `Period: ${dateFrom} to ${dateTo}`,
    '',
    'Summary Statistics',
    `Total Purchase Orders,${total}`,
    `Pending,${pending}`,
    `Approved,${approved}`,
    `Rejected,${rejected}`,
    `Paid,${paid}`,
    '',
    'Financial Summary',
    `Total Amount,${totalAmount.toFixed(2)}`,
    `Approved Amount,${approvedAmount.toFixed(2)}`,
    `Average PO Amount,${(totalAmount / (total || 1)).toFixed(2)}`,
    '',
    '',
    'Detailed Purchase Orders',
    'PO Number,Date,Requested By,Vendor,Project,Total Amount,Status'
  ]

  const detailRows = purchaseOrders.map(po => [
    po.po_number,
    new Date(po.created_at).toLocaleDateString(),
    po.requested_by_name,
    po.vendor_name || '',
    po.project_name || '',
    Number(po.total_amount).toFixed(2),
    po.status
  ].map(cell => `"${cell}"`).join(','))

  const csvContent = [...summaryContent, ...detailRows].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export const exportVendorSpendingReport = (
  purchaseOrders: PurchaseOrder[],
  vendors: Array<{ vendor_id: number; vendor_name: string }>
) => {
  const filename = `vendor_spending_analysis_${new Date().toISOString().split('T')[0]}.csv`
  
  // Group by vendor
  const vendorSpending = vendors.map(vendor => {
    const vendorPOs = purchaseOrders.filter(po => po.vendor_id === vendor.vendor_id)
    const totalSpent = vendorPOs.reduce((sum, po) => sum + Number(po.total_amount), 0)
    const approvedSpent = vendorPOs
      .filter(po => po.status !== 'REJECTED')
      .reduce((sum, po) => sum + Number(po.total_amount), 0)
    
    return {
      vendor: vendor.vendor_name,
      totalPOs: vendorPOs.length,
      pending: vendorPOs.filter(po => po.status === 'PENDING').length,
      approved: vendorPOs.filter(po => po.status === 'APPROVED').length,
      paid: vendorPOs.filter(po => po.status === 'PAID').length,
      rejected: vendorPOs.filter(po => po.status === 'REJECTED').length,
      totalSpent,
      approvedSpent
    }
  }).filter(v => v.totalPOs > 0)
    .sort((a, b) => b.totalSpent - a.totalSpent)

  const headers = [
    'Vendor Name',
    'Total POs',
    'Pending',
    'Approved',
    'Paid',
    'Rejected',
    'Total Spent',
    'Approved Spent'
  ]

  const rows = vendorSpending.map(v => [
    v.vendor,
    v.totalPOs,
    v.pending,
    v.approved,
    v.paid,
    v.rejected,
    v.totalSpent.toFixed(2),
    v.approvedSpent.toFixed(2)
  ])

  const csvContent = [
    'Vendor Spending Analysis Report',
    `Generated: ${new Date().toLocaleDateString()}`,
    '',
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export const exportProjectCostReport = (
  purchaseOrders: PurchaseOrder[],
  projects: Array<{ contract_id: number; contract_name: string }>
) => {
  const filename = `project_cost_tracking_${new Date().toISOString().split('T')[0]}.csv`
  
  // Group by project
  const projectCosts = projects.map(project => {
    const projectPOs = purchaseOrders.filter(po => po.project_id === project.contract_id)
    const totalCost = projectPOs.reduce((sum, po) => sum + Number(po.total_amount), 0)
    const approvedCost = projectPOs
      .filter(po => po.status !== 'REJECTED')
      .reduce((sum, po) => sum + Number(po.total_amount), 0)
    
    return {
      project: project.contract_name,
      totalPOs: projectPOs.length,
      pending: projectPOs.filter(po => po.status === 'PENDING').length,
      approved: projectPOs.filter(po => po.status === 'APPROVED').length,
      paid: projectPOs.filter(po => po.status === 'PAID').length,
      rejected: projectPOs.filter(po => po.status === 'REJECTED').length,
      totalCost,
      approvedCost
    }
  }).filter(p => p.totalPOs > 0)
    .sort((a, b) => b.totalCost - a.totalCost)

  const headers = [
    'Project Name',
    'Total POs',
    'Pending',
    'Approved',
    'Paid',
    'Rejected',
    'Total Cost',
    'Approved Cost'
  ]

  const rows = projectCosts.map(p => [
    p.project,
    p.totalPOs,
    p.pending,
    p.approved,
    p.paid,
    p.rejected,
    p.totalCost.toFixed(2),
    p.approvedCost.toFixed(2)
  ])

  const csvContent = [
    'Project Cost Tracking Report',
    `Generated: ${new Date().toLocaleDateString()}`,
    '',
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
