import { Download, ExternalLink } from 'lucide-react'
import { POHeaderDisplay } from './POHeaderDisplay'
import { POVendorProjectDisplay } from './POVendorProjectDisplay'
import { POLineItemsDisplay } from './POLineItemsDisplay'
import { POFinancialDisplay } from './POFinancialDisplay'
import { POStatusTimeline } from './POStatusTimeline'
import type { PurchaseOrder } from '../../../types/purchaseOrders'
import { generatePurchaseOrderPDF } from '../../../utils/poPdfExport'

interface ViewPOModalProps {
  purchaseOrder: PurchaseOrder
  isAdmin: boolean
  onClose: () => void
}

export const ViewPOModal: React.FC<ViewPOModalProps> = ({
  purchaseOrder,
  isAdmin,
  onClose
}) => {
  const handleExportPDF = () => {
    generatePurchaseOrderPDF(purchaseOrder)
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          maxWidth: '900px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <POHeaderDisplay
          poNumber={purchaseOrder.po_number}
          status={purchaseOrder.status}
          createdAt={purchaseOrder.created_at}
          requestedBy={purchaseOrder.requested_by_name}
          onClose={onClose}
        />

        {/* Scrollable Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.5rem'
          }}
        >
          {/* Export PDF Button */}
          <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleExportPDF}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.25rem',
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#2563eb'
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#3b82f6'
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)'
              }}
            >
              <Download size={18} />
              Export as PDF
            </button>

            {/* Receipt Link if available */}
            {purchaseOrder.receipt_document_url && (
              <a
                href={purchaseOrder.receipt_document_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.25rem',
                  backgroundColor: '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#059669'
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.15)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#10b981'
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)'
                }}
              >
                <ExternalLink size={18} />
                View Receipt
              </a>
            )}
          </div>

          {/* Vendor and Project Information */}
          <POVendorProjectDisplay
            vendorName={purchaseOrder.vendor_name || 'Not Specified'}
            vendorInvoiceNumber={purchaseOrder.vendor_invoice_number}
            projectName={purchaseOrder.project_name || 'Not Specified'}
            createdAt={purchaseOrder.created_at}
            updatedAt={purchaseOrder.updated_at}
          />

          {/* Line Items */}
          <div style={{ marginTop: '1.5rem' }}>
            <h3
              style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#1f2937',
                margin: '0 0 1rem 0'
              }}
            >
              Line Items
            </h3>
            <POLineItemsDisplay items={purchaseOrder.items || []} />
          </div>

          {/* Financial Summary */}
          <div style={{ marginTop: '1.5rem' }}>
            <POFinancialDisplay
              subtotal={purchaseOrder.subtotal}
              salesTax={purchaseOrder.sales_tax}
              shippingHandling={purchaseOrder.shipping_handling}
              bankingFee={purchaseOrder.banking_fee}
              total={purchaseOrder.total_amount}
              paymentMethod={purchaseOrder.payment_method}
              checkNumber={purchaseOrder.check_number}
              paymentDate={purchaseOrder.payment_date}
            />
          </div>

          {/* Status Timeline */}
          <div style={{ marginTop: '1.5rem' }}>
            <POStatusTimeline
              purchaseOrder={purchaseOrder}
              isAdmin={isAdmin}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
