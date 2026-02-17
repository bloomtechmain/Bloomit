import { useState, useEffect, useCallback, useMemo } from 'react'
import { ShoppingCart, Plus, FileText, DollarSign, CheckCircle, Clock, Download } from 'lucide-react'
import { purchaseOrdersApi } from '../services/purchaseOrdersApi'
import type { PurchaseOrder, PurchaseOrderItem } from '../types/purchaseOrders'
import { ViewPOModal } from '../components/purchaseOrders/modals/ViewPOModal'
import { CreateEditPOModal } from '../components/purchaseOrders/modals/CreateEditPOModal'
import ApproveConfirmModal from '../components/purchaseOrders/modals/ApproveConfirmModal'
import RejectPOModal from '../components/purchaseOrders/modals/RejectPOModal'
import UploadReceiptModal from '../components/purchaseOrders/modals/UploadReceiptModal'
import DeletePOConfirmModal from '../components/purchaseOrders/modals/DeletePOConfirmModal'
import { AdvancedFilters } from '../components/purchaseOrders/filters/AdvancedFilters'
import { PODashboardWidgets } from '../components/purchaseOrders/widgets/PODashboardWidgets'
import { exportToCSV, exportSummaryReport, exportVendorSpendingReport, exportProjectCostReport } from '../utils/poReportExport'

type User = {
  id: number
  name: string
  email: string
  roleId: number | null
  roleName: string | null
  roleNames?: string[]
  permissions: string[]
}

type Vendor = {
  vendor_id: number
  vendor_name: string
}

type Project = {
  contract_id: number
  contract_name: string
}

export default function PurchaseOrders({ 
  user,
  vendors = [],
  projects = [],
  accessToken = ''
}: { 
  user: User
  vendors?: Vendor[]
  projects?: Project[]
  accessToken?: string
}) {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null)
  const [viewingPO, setViewingPO] = useState<PurchaseOrder | null>(null)
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Form state
  const [poNumber, setPoNumber] = useState('')
  const [requestedByName, setRequestedByName] = useState(user.name)
  const [requestedByTitle, setRequestedByTitle] = useState('')
  const [vendorId, setVendorId] = useState('')
  const [vendorInvoiceNumber, setVendorInvoiceNumber] = useState('')
  const [projectId, setProjectId] = useState('')
  const [items, setItems] = useState<PurchaseOrderItem[]>([
    { quantity: 1, description: '', unit_price: 0, total: 0 }
  ])
  const [salesTax, setSalesTax] = useState('0')
  const [shippingHandling, setShippingHandling] = useState('0')
  const [bankingFee, setBankingFee] = useState('0')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [checkNumber, setCheckNumber] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState('')
  const [notes, setNotes] = useState('')

  // Approval state
  const [approvingPO, setApprovingPO] = useState<PurchaseOrder | null>(null)
  const [rejectingPO, setRejectingPO] = useState<PurchaseOrder | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  // Receipt upload state
  const [uploadingReceiptPO, setUploadingReceiptPO] = useState<PurchaseOrder | null>(null)
  const [receiptUrl, setReceiptUrl] = useState('')

  // Delete state
  const [deletingPO, setDeletingPO] = useState<PurchaseOrder | null>(null)

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID'>('ALL')
  const [filterVendor, setFilterVendor] = useState<'ALL' | string>('ALL')
  const [advancedFilters, setAdvancedFilters] = useState<any>({})
  const [showReportMenu, setShowReportMenu] = useState(false)

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  const fetchPurchaseOrders = useCallback(async () => {
    try {
      setLoading(true)
      const params: any = {}
      if (filterStatus !== 'ALL') params.status = filterStatus
      if (filterVendor !== 'ALL') params.vendor_id = filterVendor
      if (searchQuery) params.search = searchQuery

      const response = await purchaseOrdersApi.getAll(params)
      setPurchaseOrders(response.data.purchase_orders)
    } catch (error) {
      console.error('Error fetching purchase orders:', error)
      showNotification('Failed to load purchase orders', 'error')
    } finally {
      setLoading(false)
    }
  }, [filterStatus, filterVendor, searchQuery])

  // Filtered purchase orders with advanced filters
  const filteredPurchaseOrders = useMemo(() => {
    let filtered = [...purchaseOrders]

    // Apply advanced filters
    if (advancedFilters.statuses && advancedFilters.statuses.length > 0) {
      filtered = filtered.filter(po => advancedFilters.statuses.includes(po.status))
    }

    if (advancedFilters.vendors && advancedFilters.vendors.length > 0) {
      filtered = filtered.filter(po => 
        po.vendor_id && advancedFilters.vendors.includes(po.vendor_id.toString())
      )
    }

    if (advancedFilters.projects && advancedFilters.projects.length > 0) {
      filtered = filtered.filter(po => 
        po.project_id && advancedFilters.projects.includes(po.project_id.toString())
      )
    }

    if (advancedFilters.dateFrom) {
      filtered = filtered.filter(po => 
        new Date(po.created_at) >= new Date(advancedFilters.dateFrom)
      )
    }

    if (advancedFilters.dateTo) {
      filtered = filtered.filter(po => 
        new Date(po.created_at) <= new Date(advancedFilters.dateTo)
      )
    }

    if (advancedFilters.amountMin !== undefined) {
      filtered = filtered.filter(po => 
        Number(po.total_amount) >= advancedFilters.amountMin
      )
    }

    if (advancedFilters.amountMax !== undefined) {
      filtered = filtered.filter(po => 
        Number(po.total_amount) <= advancedFilters.amountMax
      )
    }

    return filtered
  }, [purchaseOrders, advancedFilters])

  const handleApplyAdvancedFilters = (filters: any) => {
    setAdvancedFilters(filters)
  }

  const handleExportCSV = () => {
    exportToCSV(filteredPurchaseOrders)
    showNotification('Purchase orders exported to CSV', 'success')
    setShowReportMenu(false)
  }

  const handleExportSummaryReport = () => {
    const dateFrom = advancedFilters.dateFrom || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
    const dateTo = advancedFilters.dateTo || new Date().toISOString().split('T')[0]
    exportSummaryReport(filteredPurchaseOrders, dateFrom, dateTo)
    showNotification('Summary report exported', 'success')
    setShowReportMenu(false)
  }

  const handleExportVendorReport = () => {
    exportVendorSpendingReport(filteredPurchaseOrders, vendors)
    showNotification('Vendor spending report exported', 'success')
    setShowReportMenu(false)
  }

  const handleExportProjectReport = () => {
    exportProjectCostReport(filteredPurchaseOrders, projects)
    showNotification('Project cost report exported', 'success')
    setShowReportMenu(false)
  }

  useEffect(() => {
    fetchPurchaseOrders()
  }, [fetchPurchaseOrders])

  const calculateSubtotal = useCallback(() => {
    return items.reduce((sum, item) => sum + Number(item.total || 0), 0)
  }, [items])

  const calculateTotal = useCallback(() => {
    const subtotal = calculateSubtotal()
    const tax = Number(salesTax) || 0
    const shipping = Number(shippingHandling) || 0
    const banking = Number(bankingFee) || 0
    return subtotal + tax + shipping + banking
  }, [calculateSubtotal, salesTax, shippingHandling, bankingFee])

  const resetForm = () => {
    setPoNumber('')
    setRequestedByName(user.name)
    setRequestedByTitle('')
    setVendorId('')
    setVendorInvoiceNumber('')
    setProjectId('')
    setItems([{ quantity: 1, description: '', unit_price: 0, total: 0 }])
    setSalesTax('0')
    setShippingHandling('0')
    setBankingFee('0')
    setPaymentMethod('')
    setCheckNumber('')
    setPaymentAmount('')
    setPaymentDate('')
    setNotes('')
    setEditingPO(null)
  }

  const handleCreateNew = async () => {
    try {
      const response = await purchaseOrdersApi.getNextPoNumber()
      setPoNumber(response.data.po_number)
      setIsCreating(true)
    } catch (error) {
      console.error('Error getting PO number:', error)
      showNotification('Failed to generate PO number', 'error')
    }
  }

  // @ts-expect-error - Function reserved for future use
  const handleItemChange = (index: number, field: keyof PurchaseOrderItem, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    
    // Auto-calculate total
    if (field === 'quantity' || field === 'unit_price') {
      const qty = field === 'quantity' ? Number(value) : Number(newItems[index].quantity)
      const price = field === 'unit_price' ? Number(value) : Number(newItems[index].unit_price)
      newItems[index].total = qty * price
    }
    
    setItems(newItems)
  }
  // @ts-expect-error - Function reserved for future use

  const addItem = () => {
    if (items.length < 10) {
      setItems([...items, { quantity: 1, description: '', unit_price: 0, total: 0 }])
    }
  }

  // @ts-expect-error - Reserved for future use
  const _removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  // @ts-expect-error - Reserved for future use
  const _handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!poNumber || !requestedByName || items.length === 0) {
      showNotification('Please fill in all required fields', 'error')
      return
    }

    // Validate items
    const validItems = items.filter(item => item.description && item.quantity > 0)
    if (validItems.length === 0) {
      showNotification('Please add at least one item', 'error')
      return
    }

    try {
      const data = {
        po_number: poNumber,
        requested_by_user_id: user.id,
        requested_by_name: requestedByName,
        requested_by_title: requestedByTitle || undefined,
        vendor_id: vendorId ? Number(vendorId) : undefined,
        vendor_invoice_number: vendorInvoiceNumber || undefined,
        project_id: projectId ? Number(projectId) : undefined,
        subtotal: calculateSubtotal(),
        sales_tax: Number(salesTax) || 0,
        shipping_handling: Number(shippingHandling) || 0,
        banking_fee: Number(bankingFee) || 0,
        total_amount: calculateTotal(),
        payment_method: paymentMethod || undefined,
        check_number: checkNumber || undefined,
        payment_amount: paymentAmount ? Number(paymentAmount) : undefined,
        payment_date: paymentDate || undefined,
        notes: notes || undefined,
        items: validItems
      }

      if (editingPO) {
        await purchaseOrdersApi.update(editingPO.id, data)
        showNotification('Purchase order updated successfully', 'success')
      } else {
        await purchaseOrdersApi.create(data)
        showNotification('Purchase order created successfully', 'success')
      }

      resetForm()
      setIsCreating(false)
      fetchPurchaseOrders()
    } catch (error: any) {
      console.error('Error saving purchase order:', error)
      const errorMsg = error.response?.data?.error || 'Failed to save purchase order'
      showNotification(errorMsg, 'error')
    }
  }

  const handleView = async (po: PurchaseOrder) => {
    try {
      const response = await purchaseOrdersApi.getById(po.id)
      setViewingPO(response.data.purchase_order)
    } catch (error) {
      console.error('Error fetching PO details:', error)
      showNotification('Failed to load purchase order details', 'error')
    }
  }

  const handleEdit = async (po: PurchaseOrder) => {
    if (po.status !== 'PENDING') {
      showNotification('Only pending purchase orders can be edited', 'error')
      return
    }

    try {
      const response = await purchaseOrdersApi.getById(po.id)
      const poData = response.data.purchase_order
      
      setEditingPO(poData)
      setPoNumber(poData.po_number)
      setRequestedByName(poData.requested_by_name)
      setRequestedByTitle(poData.requested_by_title || '')
      setVendorId(poData.vendor_id?.toString() || '')
      setVendorInvoiceNumber(poData.vendor_invoice_number || '')
      setProjectId(poData.project_id?.toString() || '')
      setItems(poData.items || [])
      setSalesTax(poData.sales_tax.toString())
      setShippingHandling(poData.shipping_handling.toString())
      setBankingFee(poData.banking_fee.toString())
      setPaymentMethod(poData.payment_method || '')
      setCheckNumber(poData.check_number || '')
      setPaymentAmount(poData.payment_amount?.toString() || '')
      setPaymentDate(poData.payment_date || '')
      setNotes(poData.notes || '')
      setIsCreating(true)
    } catch (error) {
      console.error('Error loading PO for edit:', error)
      showNotification('Failed to load purchase order', 'error')
    }
  }

  const handleApprove = async () => {
    if (!approvingPO) return

    try {
      await purchaseOrdersApi.approve(approvingPO.id, {
        approved_by_user_id: user.id,
        approved_by_name: user.name,
        approved_by_title: user.roleName || undefined
      })
      showNotification('Purchase order approved successfully', 'success')
      setApprovingPO(null)
      fetchPurchaseOrders()
    } catch (error) {
      console.error('Error approving PO:', error)
      showNotification('Failed to approve purchase order', 'error')
    }
  }

  // @ts-expect-error - Reserved for future use
  const _handleReject = async () => {
    if (!rejectingPO || !rejectionReason.trim()) {
      showNotification('Please provide a rejection reason', 'error')
      return
    }

    try {
      await purchaseOrdersApi.reject(rejectingPO.id, {
        rejection_reason: rejectionReason
      })
      showNotification('Purchase order rejected', 'success')
      setRejectingPO(null)
      setRejectionReason('')
      fetchPurchaseOrders()
    } catch (error) {
      console.error('Error rejecting PO:', error)
      showNotification('Failed to reject purchase order', 'error')
    }
  }

  // @ts-expect-error - Reserved for future use
  const _handleUploadReceipt = async () => {
    if (!uploadingReceiptPO || !receiptUrl.trim()) {
      showNotification('Please provide a receipt URL', 'error')
      return
    }

    try {
      await purchaseOrdersApi.uploadReceipt(uploadingReceiptPO.id, {
        receipt_document_url: receiptUrl
      })
      showNotification('Receipt uploaded successfully - PO marked as PAID', 'success')
      setUploadingReceiptPO(null)
      setReceiptUrl('')
      fetchPurchaseOrders()
    } catch (error) {
      console.error('Error uploading receipt:', error)
      showNotification('Failed to upload receipt', 'error')
    }
  }

  const handleDelete = async () => {
    if (!deletingPO) return

    try {
      await purchaseOrdersApi.delete(deletingPO.id)
      showNotification(`Purchase order ${deletingPO.po_number} deleted successfully`, 'success')
      setDeletingPO(null)
      fetchPurchaseOrders()
    } catch (error: any) {
      console.error('Error deleting PO:', error)
      const errorMsg = error.response?.data?.error || 'Failed to delete purchase order'
      showNotification(errorMsg, 'error')
    }
  }

  // Calculate statistics
  const stats = useMemo(() => {
    const total = purchaseOrders.length
    const pending = purchaseOrders.filter(po => po.status === 'PENDING').length
    const approved = purchaseOrders.filter(po => po.status === 'APPROVED').length
    const totalAmount = purchaseOrders
      .filter(po => po.status !== 'REJECTED')
      .reduce((sum, po) => sum + Number(po.total_amount), 0)

    return { total, pending, approved, totalAmount }
  }, [purchaseOrders])

  const isAdmin = user.roleNames?.includes('Admin') || user.roleNames?.includes('Super Admin')

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Notification */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '2rem',
          right: '2rem',
          padding: '1rem 1.5rem',
          backgroundColor: notification.type === 'success' ? '#dcfce7' : '#fee2e2',
          border: `1px solid ${notification.type === 'success' ? '#86efac' : '#fecaca'}`,
          borderRadius: '8px',
          color: notification.type === 'success' ? '#166534' : '#991b1b',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          zIndex: 9999
        }}>
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#1f2937', margin: '0 0 0.5rem 0' }}>
          Purchase Order System
        </h1>
        <p style={{ fontSize: '1rem', color: '#6b7280', margin: 0 }}>
          Create, manage, and track purchase orders with approval workflow
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '1.5rem', borderRadius: '12px', color: '#fff', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, opacity: 0.9 }}>Total POs</div>
            <ShoppingCart size={20} style={{ opacity: 0.8 }} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{stats.total}</div>
        </div>

        <div style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', padding: '1.5rem', borderRadius: '12px', color: '#fff', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, opacity: 0.9 }}>Pending Approval</div>
            <Clock size={20} style={{ opacity: 0.8 }} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{stats.pending}</div>
        </div>

        <div style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', padding: '1.5rem', borderRadius: '12px', color: '#fff', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, opacity: 0.9 }}>Approved</div>
            <CheckCircle size={20} style={{ opacity: 0.8 }} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{stats.approved}</div>
        </div>

        <div style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', padding: '1.5rem', borderRadius: '12px', color: '#fff', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, opacity: 0.9 }}>Total Amount</div>
            <DollarSign size={20} style={{ opacity: 0.8 }} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>
            LKR {stats.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Dashboard Widgets */}
      <PODashboardWidgets
        purchaseOrders={purchaseOrders}
        vendors={vendors}
        onViewPO={handleView}
      />

      {/* Advanced Filters */}
      <AdvancedFilters
        onApply={handleApplyAdvancedFilters}
        vendors={vendors}
        projects={projects}
      />

      {/* Action Bar */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={handleCreateNew}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            background: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          <Plus size={18} />
          Create Purchase Order
        </button>

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowReportMenu(!showReportMenu)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              background: '#10b981',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            <Download size={18} />
            Export Reports
          </button>

          {showReportMenu && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: '0.5rem',
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              zIndex: 10,
              minWidth: '200px'
            }}>
              <button
                onClick={handleExportCSV}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: 'transparent',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  color: '#374151'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                Export to CSV
              </button>
              <button
                onClick={handleExportSummaryReport}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: 'transparent',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  color: '#374151'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                Summary Report
              </button>
              <button
                onClick={handleExportVendorReport}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: 'transparent',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  color: '#374151'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                Vendor Spending Report
              </button>
              <button
                onClick={handleExportProjectReport}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: 'transparent',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  color: '#374151'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                Project Cost Report
              </button>
            </div>
          )}
        </div>

        <input
          type="text"
          placeholder="Search PO number, vendor, requester..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            minWidth: '200px',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            border: '1px solid #d1d5db',
            fontSize: '0.875rem'
          }}
        />

        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as any)}
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            border: '1px solid #d1d5db',
            fontSize: '0.875rem'
          }}
        >
          <option value="ALL">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="PAID">Paid</option>
        </select>

        <select
          value={filterVendor}
          onChange={e => setFilterVendor(e.target.value)}
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            border: '1px solid #d1d5db',
            fontSize: '0.875rem'
          }}
        >
          <option value="ALL">All Vendors</option>
          {vendors.map(v => (
            <option key={v.vendor_id} value={v.vendor_id}>{v.vendor_name}</option>
          ))}
        </select>
      </div>

      {/* Purchase Orders List */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
          Loading purchase orders...
        </div>
      ) : purchaseOrders.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280', background: '#f9fafb', borderRadius: '12px', border: '2px dashed #e5e7eb' }}>
          <FileText size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <p style={{ fontSize: '1.125rem', fontWeight: 600, margin: '0 0 0.5rem 0' }}>
            No purchase orders yet
          </p>
          <p style={{ margin: 0 }}>
            Create your first purchase order to get started.
          </p>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>PO Number</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>Date</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>Requested By</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>Vendor</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>Project</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>Total Amount</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.map((po, idx) => (
                  <tr key={po.id} style={{ borderBottom: idx < purchaseOrders.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#3b82f6', cursor: 'pointer' }} onClick={() => handleView(po)}>
                      {po.po_number}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                      {new Date(po.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{po.requested_by_name}</td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{po.vendor_name || '-'}</td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{po.project_name || '-'}</td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', textAlign: 'right', fontWeight: 600 }}>
                      LKR {Number(po.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: 
                          po.status === 'PENDING' ? '#fef3c7' :
                          po.status === 'APPROVED' ? '#d1fae5' :
                          po.status === 'REJECTED' ? '#fee2e2' :
                          '#dbeafe',
                        color:
                          po.status === 'PENDING' ? '#92400e' :
                          po.status === 'APPROVED' ? '#065f46' :
                          po.status === 'REJECTED' ? '#991b1b' :
                          '#1e40af'
                      }}>
                        {po.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleView(po)}
                          style={{
                            padding: '0.375rem 0.75rem',
                            borderRadius: '6px',
                            border: '1px solid #3b82f6',
                            background: '#3b82f6',
                            color: '#fff',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          View
                        </button>
                        {po.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleEdit(po)}
                              style={{
                                padding: '0.375rem 0.75rem',
                                borderRadius: '6px',
                                border: '1px solid #059669',
                                background: '#059669',
                                color: '#fff',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              Edit
                            </button>
                            {isAdmin && (
                              <>
                                <button
                                  onClick={() => setApprovingPO(po)}
                                  style={{
                                    padding: '0.375rem 0.75rem',
                                    borderRadius: '6px',
                                    border: '1px solid #10b981',
                                    background: '#10b981',
                                    color: '#fff',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                  }}
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => setRejectingPO(po)}
                                  style={{
                                    padding: '0.375rem 0.75rem',
                                    borderRadius: '6px',
                                    border: '1px solid #ef4444',
                                    background: '#ef4444',
                                    color: '#fff',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                  }}
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </>
                        )}
                        {po.status === 'APPROVED' && !po.receipt_document_url && (
                          <button
                            onClick={() => setUploadingReceiptPO(po)}
                            style={{
                              padding: '0.375rem 0.75rem',
                              borderRadius: '6px',
                              border: '1px solid #8b5cf6',
                              background: '#8b5cf6',
                              color: '#fff',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Upload Receipt
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => setDeletingPO(po)}
                            style={{
                              padding: '0.375rem 0.75rem',
                              borderRadius: '6px',
                              border: '1px solid #dc2626',
                              background: '#dc2626',
                              color: '#fff',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {(isCreating || editingPO) && (
        <CreateEditPOModal
          isOpen={isCreating || !!editingPO}
          onClose={() => {
            setIsCreating(false)
            setEditingPO(null)
            resetForm()
          }}
          onSuccess={() => {
            setIsCreating(false)
            setEditingPO(null)
            resetForm()
            fetchPurchaseOrders()
          }}
          purchaseOrder={editingPO}
          mode={editingPO ? 'edit' : 'create'}
          currentUser={user}
          vendors={vendors}
          projects={projects}
        />
      )}

      {viewingPO && (
        <ViewPOModal
          purchaseOrder={viewingPO}
          isAdmin={!!isAdmin}
          onClose={() => setViewingPO(null)}
        />
      )}

      {approvingPO && (
        <ApproveConfirmModal
          poNumber={approvingPO.po_number}
          totalAmount={Number(approvingPO.total_amount)}
          vendorName={approvingPO.vendor_name}
          onConfirm={handleApprove}
          onCancel={() => setApprovingPO(null)}
        />
      )}

      {rejectingPO && (
        <RejectPOModal
          isOpen={true}
          onClose={() => {
            setRejectingPO(null)
            setRejectionReason('')
          }}
          poNumber={rejectingPO.po_number}
          poId={rejectingPO.id}
          onReject={async (poId: number, reason: string) => {
            await purchaseOrdersApi.reject(poId, { rejection_reason: reason })
            showNotification('Purchase order rejected', 'success')
            setRejectingPO(null)
            setRejectionReason('')
            fetchPurchaseOrders()
          }}
        />
      )}

      {uploadingReceiptPO && (
        <UploadReceiptModal
          poId={uploadingReceiptPO.id}
          poNumber={uploadingReceiptPO.po_number}
          accessToken={accessToken}
          onSuccess={() => {
            showNotification('Receipt uploaded successfully - PO marked as PAID', 'success')
            setUploadingReceiptPO(null)
            fetchPurchaseOrders()
          }}
          onCancel={() => setUploadingReceiptPO(null)}
        />
      )}

      {deletingPO && (
        <DeletePOConfirmModal
          poNumber={deletingPO.po_number}
          status={deletingPO.status}
          totalAmount={Number(deletingPO.total_amount)}
          onConfirm={handleDelete}
          onCancel={() => setDeletingPO(null)}
        />
      )}
    </div>
  )
}
