import { useState, useEffect, useMemo } from 'react'
import type { PurchaseOrder, PurchaseOrderItem } from '../../../types/purchaseOrders'
import { purchaseOrdersApi } from '../../../services/purchaseOrdersApi'
import { useToast } from '../../../context/ToastContext'
import { POModalHeader } from './POModalHeader'
import { POBasicInfoSection } from './POBasicInfoSection'
import { POLineItemsTable } from './POLineItemsTable'
import { POFinancialSummary } from './POFinancialSummary'
import { POPaymentInfoSection } from './POPaymentInfoSection'
import { POFormActions } from './POFormActions'

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

interface CreateEditPOModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  purchaseOrder?: PurchaseOrder | null
  mode: 'create' | 'edit'
  currentUser: User
  vendors: Vendor[]
  projects: Project[]
}

export const CreateEditPOModal: React.FC<CreateEditPOModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  purchaseOrder,
  mode,
  currentUser,
  vendors,
  projects
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const [formData, setFormData] = useState<Partial<PurchaseOrder>>({
    po_number: '',
    requested_by_name: currentUser.name,
    requested_by_title: '',
    vendor_id: undefined,
    vendor_invoice_number: '',
    project_id: undefined,
    sales_tax: 0,
    shipping_handling: 0,
    banking_fee: 0,
    payment_method: undefined,
    check_number: '',
    payment_date: undefined,
    notes: ''
  })
  const [lineItems, setLineItems] = useState<PurchaseOrderItem[]>([])

  // Fetch next PO number when creating
  useEffect(() => {
    if (isOpen && mode === 'create') {
      fetchNextPoNumber()
    }
  }, [isOpen, mode])

  // Load existing PO data when editing
  useEffect(() => {
    if (isOpen && mode === 'edit' && purchaseOrder) {
      setFormData({
        po_number: purchaseOrder.po_number,
        requested_by_name: purchaseOrder.requested_by_name,
        requested_by_title: purchaseOrder.requested_by_title || '',
        vendor_id: purchaseOrder.vendor_id,
        vendor_invoice_number: purchaseOrder.vendor_invoice_number || '',
        project_id: purchaseOrder.project_id,
        sales_tax: purchaseOrder.sales_tax || 0,
        shipping_handling: purchaseOrder.shipping_handling || 0,
        banking_fee: purchaseOrder.banking_fee || 0,
        payment_method: purchaseOrder.payment_method,
        check_number: purchaseOrder.check_number || '',
        payment_date: purchaseOrder.payment_date,
        notes: purchaseOrder.notes || '',
        created_at: purchaseOrder.created_at
      })
      setLineItems(purchaseOrder.items || [])
    }
  }, [isOpen, mode, purchaseOrder])

  const fetchNextPoNumber = async () => {
    try {
      const response = await purchaseOrdersApi.getNextPoNumber()
      setFormData(prev => ({
        ...prev,
        po_number: response.data.po_number
      }))
    } catch (error) {
      console.error('Failed to fetch next PO number:', error)
      toast.error('Failed to generate PO number. Please try again.')
    }
  }

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleAddLineItem = () => {
    const newItem: PurchaseOrderItem = {
      description: '',
      quantity: 1,
      unit_price: 0,
      total: 0,
      line_order: lineItems.length + 1
    }
    setLineItems(prev => [...prev, newItem])
  }

  const handleUpdateLineItem = (index: number, updates: Partial<PurchaseOrderItem>) => {
    setLineItems(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], ...updates }
      
      // Auto-calculate total for this line item
      const quantity = updated[index].quantity || 0
      const unitPrice = updated[index].unit_price || 0
      updated[index].total = quantity * unitPrice
      
      return updated
    })
  }

  const handleRemoveLineItem = (index: number) => {
    if (confirm('Are you sure you want to remove this line item?')) {
      setLineItems(prev => prev.filter((_, i) => i !== index))
    }
  }

  // Calculate subtotal
  const subtotal = useMemo(() => {
    return lineItems.reduce((sum, item) => sum + (item.total || 0), 0)
  }, [lineItems])

  // Calculate total amount
  const totalAmount = useMemo(() => {
    return subtotal + (formData.sales_tax || 0) + (formData.shipping_handling || 0) + (formData.banking_fee || 0)
  }, [subtotal, formData.sales_tax, formData.shipping_handling, formData.banking_fee])

  // Validation
  const { isValid, validationErrors } = useMemo(() => {
    const errors: string[] = []

    // Check if PO number exists
    if (!formData.po_number) {
      errors.push('PO number is required')
    }

    // Check if requested by name exists
    if (!formData.requested_by_name) {
      errors.push('Requested by name is required')
    }

    // Check if at least one line item exists
    if (lineItems.length === 0) {
      errors.push('At least one line item is required')
    }

    // Validate all line items
    lineItems.forEach((item, index) => {
      if (!item.description || item.description.trim() === '') {
        errors.push(`Line item ${index + 1}: Description is required`)
      }
      if (item.quantity <= 0) {
        errors.push(`Line item ${index + 1}: Quantity must be greater than 0`)
      }
      if (item.unit_price < 0) {
        errors.push(`Line item ${index + 1}: Unit price cannot be negative`)
      }
    })

    // Check if total amount is greater than 0
    if (totalAmount <= 0 && lineItems.length > 0) {
      errors.push('Total amount must be greater than $0.00')
    }

    return {
      isValid: errors.length === 0,
      validationErrors: errors
    }
  }, [formData, lineItems, totalAmount])

  const handleSubmit = async () => {
    if (!isValid) return

    setIsSubmitting(true)

    try {
      const payload = {
        po_number: formData.po_number!,
        requested_by_user_id: currentUser.id,
        requested_by_name: formData.requested_by_name!,
        requested_by_title: formData.requested_by_title || undefined,
        vendor_id: formData.vendor_id,
        vendor_invoice_number: formData.vendor_invoice_number || undefined,
        project_id: formData.project_id,
        subtotal: subtotal,
        sales_tax: formData.sales_tax || 0,
        shipping_handling: formData.shipping_handling || 0,
        banking_fee: formData.banking_fee || 0,
        total_amount: totalAmount,
        payment_method: formData.payment_method || undefined,
        check_number: formData.check_number || undefined,
        payment_date: formData.payment_date || undefined,
        notes: formData.notes || undefined,
        items: lineItems.map((item, index) => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total,
          line_order: index + 1
        }))
      }

      if (mode === 'create') {
        await purchaseOrdersApi.create(payload)
        toast.success('Purchase order created successfully!')
      } else {
        await purchaseOrdersApi.update(purchaseOrder!.id, payload)
        toast.success('Purchase order updated successfully!')
      }

      onSuccess()
      handleClose()
    } catch (error: any) {
      console.error('Failed to save purchase order:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Failed to save purchase order'
      toast.error(`Error: ${errorMessage}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (isSubmitting) return
    
    if (mode === 'create' || JSON.stringify(formData) !== JSON.stringify(purchaseOrder)) {
      if (confirm('Are you sure you want to close? Any unsaved changes will be lost.')) {
        resetForm()
        onClose()
      }
    } else {
      resetForm()
      onClose()
    }
  }

  const resetForm = () => {
    setFormData({
      po_number: '',
      requested_by_name: currentUser.name,
      requested_by_title: '',
      vendor_id: undefined,
      vendor_invoice_number: '',
      project_id: undefined,
      sales_tax: 0,
      shipping_handling: 0,
      banking_fee: 0,
      payment_method: undefined,
      check_number: '',
      payment_date: undefined,
      notes: ''
    })
    setLineItems([])
  }

  const isAdmin = useMemo(() => {
    return currentUser.roleNames?.includes('Admin') || 
           currentUser.roleNames?.includes('Super Admin') ||
           currentUser.roleName === 'Admin' ||
           currentUser.roleName === 'Super Admin'
  }, [currentUser])

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose()
        }
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '900px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <POModalHeader
          mode={mode}
          poNumber={formData.po_number}
          onClose={handleClose}
        />

        {/* Scrollable Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.5rem'
          }}
        >
          {/* Basic Info Section */}
          <POBasicInfoSection
            formData={formData}
            currentUser={currentUser}
            vendors={vendors}
            projects={projects}
            onChange={handleFieldChange}
            mode={mode}
          />

          {/* Line Items Table */}
          <POLineItemsTable
            items={lineItems}
            onAddItem={handleAddLineItem}
            onUpdateItem={handleUpdateLineItem}
            onRemoveItem={handleRemoveLineItem}
          />

          {/* Financial Summary */}
          <POFinancialSummary
            lineItems={lineItems}
            salesTax={formData.sales_tax || 0}
            shippingHandling={formData.shipping_handling || 0}
            bankingFee={formData.banking_fee || 0}
            onSalesTaxChange={(value) => handleFieldChange('sales_tax', value)}
            onShippingHandlingChange={(value) => handleFieldChange('shipping_handling', value)}
            onBankingFeeChange={(value) => handleFieldChange('banking_fee', value)}
          />

          {/* Payment Info Section */}
          <POPaymentInfoSection
            formData={formData}
            onChange={handleFieldChange}
            isAdmin={isAdmin}
          />

          {/* Form Actions */}
          <POFormActions
            onSubmit={handleSubmit}
            onCancel={handleClose}
            isSubmitting={isSubmitting}
            isValid={isValid}
            validationErrors={validationErrors}
            mode={mode}
          />
        </div>
      </div>
    </div>
  )
}
