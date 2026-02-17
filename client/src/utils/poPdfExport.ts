import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { PurchaseOrder } from '../types/purchaseOrders'
// import { COMPANY_INFO } from '../constants/companyInfo'

export const generatePurchaseOrderPDF = (po: PurchaseOrder): void => {
  // Create new PDF document (A4 size)
  const doc = new jsPDF()
  
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  let yPosition = 30 // Start position for content below letterhead logo
  
  // Add letterhead as background
  const letterheadImg = new Image()
  letterheadImg.src = '/letterhead.png'
  // Add letterhead to cover full page
  doc.addImage(letterheadImg, 'PNG', 0, 0, pageWidth, pageHeight)

  // Helper function to format currency
  const formatCurrency = (amount: number | string | null | undefined): string => {
    if (amount == null) {
      return 'LKR 0.00'
    }
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
    if (isNaN(numAmount)) {
      return 'LKR 0.00'
    }
    return `LKR ${numAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
  }

  // Helper function to format date
  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Helper function to format date with time
  const formatDateTime = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // ==================== PO HEADER ====================
  yPosition += 10
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('PURCHASE ORDER', margin, yPosition)

  // Status Badge
  yPosition += 8
  const statusConfig = {
    PENDING: { color: [251, 191, 36], text: 'PENDING APPROVAL' },
    APPROVED: { color: [34, 197, 94], text: 'APPROVED' },
    REJECTED: { color: [239, 68, 68], text: 'REJECTED' },
    PAID: { color: [59, 130, 246], text: 'PAID' }
  }
  const config = statusConfig[po.status] || statusConfig.PENDING
  doc.setFillColor(config.color[0], config.color[1], config.color[2])
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  const statusWidth = doc.getTextWidth(config.text) + 8
  doc.roundedRect(margin, yPosition - 4, statusWidth, 7, 2, 2, 'F')
  doc.text(config.text, margin + 4, yPosition)

  // PO Details (Right side)
  yPosition = 38 // Reset to header level for right column
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)
  doc.text(`PO Number: ${po.po_number}`, pageWidth - margin, yPosition, { align: 'right' })
  
  yPosition += 5
  doc.text(`Date: ${formatDate(po.created_at)}`, pageWidth - margin, yPosition, { align: 'right' })

  // ==================== VENDOR & PROJECT INFORMATION ====================
  yPosition = 60
  
  // Left Column - Vendor Information
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('VENDOR:', margin, yPosition)

  yPosition += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text(po.vendor_name || 'Not Specified', margin, yPosition)

  if (po.vendor_invoice_number) {
    yPosition += 5
    doc.setFontSize(9)
    doc.setTextColor(60, 60, 60)
    doc.text(`Invoice #: ${po.vendor_invoice_number}`, margin, yPosition)
  }

  // Right Column - Project Information
  const rightColX = pageWidth - margin - 70
  let rightYPosition = 60
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('PROJECT:', rightColX, rightYPosition)

  rightYPosition += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text(po.project_name || 'Not Specified', rightColX, rightYPosition)

  // Requested By Information
  yPosition += 10
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('REQUESTED BY:', margin, yPosition)

  yPosition += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text(po.requested_by_name, margin, yPosition)

  if (po.requested_by_title) {
    yPosition += 5
    doc.setFontSize(9)
    doc.setTextColor(60, 60, 60)
    doc.text(po.requested_by_title, margin, yPosition)
  }

  // ==================== LINE ITEMS TABLE ====================
  yPosition += 15

  // Prepare table data
  const tableData = po.items?.map((item) => [
    item.description,
    item.quantity.toString(),
    formatCurrency(item.unit_price),
    formatCurrency(item.total)
  ]) || []

  // Generate table
  autoTable(doc, {
    startY: yPosition,
    head: [['Description', 'Quantity', 'Unit Price', 'Line Total']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [40, 40, 40]
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 30, halign: 'center' },
      2: { cellWidth: 40, halign: 'right' },
      3: { cellWidth: 40, halign: 'right', fontStyle: 'bold' }
    },
    margin: { left: margin, right: margin },
    tableLineColor: [200, 200, 200],
    tableLineWidth: 0.1
  })

  yPosition = (doc as any).lastAutoTable.finalY + 10

  // ==================== FINANCIAL SUMMARY ====================
  // Check if we need a new page
  if (yPosition > pageHeight - 100) {
    doc.addPage()
    // Add letterhead to new page
    doc.addImage(letterheadImg, 'PNG', 0, 0, pageWidth, pageHeight)
    yPosition = 30
  }

  // Financial summary box
  const summaryBoxX = pageWidth - margin - 80
  const summaryBoxY = yPosition
  const summaryBoxWidth = 80

  doc.setDrawColor(59, 130, 246)
  doc.setLineWidth(0.5)

  // Subtotal
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 60, 60)
  doc.text('Subtotal:', summaryBoxX, summaryBoxY)
  doc.text(formatCurrency(po.subtotal), summaryBoxX + summaryBoxWidth, summaryBoxY, { align: 'right' })

  // Sales Tax
  let currentY = summaryBoxY + 5
  doc.text('Sales Tax:', summaryBoxX, currentY)
  doc.text(formatCurrency(po.sales_tax), summaryBoxX + summaryBoxWidth, currentY, { align: 'right' })

  // Shipping & Handling
  currentY += 5
  doc.text('Shipping & Handling:', summaryBoxX, currentY)
  doc.text(formatCurrency(po.shipping_handling), summaryBoxX + summaryBoxWidth, currentY, { align: 'right' })

  // Banking Fee
  currentY += 5
  doc.text('Banking Fee:', summaryBoxX, currentY)
  doc.text(formatCurrency(po.banking_fee), summaryBoxX + summaryBoxWidth, currentY, { align: 'right' })

  // Draw line before total
  currentY += 3
  doc.setLineWidth(0.8)
  doc.line(summaryBoxX, currentY, summaryBoxX + summaryBoxWidth, currentY)

  // Total Amount (Bold, larger)
  currentY += 7
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(59, 130, 246)
  doc.text('TOTAL AMOUNT:', summaryBoxX, currentY)
  doc.text(formatCurrency(po.total_amount), summaryBoxX + summaryBoxWidth, currentY, { align: 'right' })

  // Draw box around financial summary
  const summaryBoxHeight = currentY - summaryBoxY + 5
  doc.setDrawColor(59, 130, 246)
  doc.setLineWidth(0.5)
  doc.rect(summaryBoxX - 2, summaryBoxY - 5, summaryBoxWidth + 4, summaryBoxHeight)

  yPosition = currentY + 10

  // ==================== PAYMENT INFORMATION ====================
  if (po.payment_method) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('PAYMENT INFORMATION:', margin, yPosition)
    
    yPosition += 6
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 60)
    
    doc.text(`Payment Method: ${po.payment_method}`, margin, yPosition)
    
    if (po.check_number) {
      yPosition += 5
      doc.text(`Check Number: ${po.check_number}`, margin, yPosition)
    }
    
    if (po.payment_amount) {
      yPosition += 5
      doc.text(`Payment Amount: ${formatCurrency(po.payment_amount)}`, margin, yPosition)
    }
    
    if (po.payment_date) {
      yPosition += 5
      doc.text(`Payment Date: ${formatDate(po.payment_date)}`, margin, yPosition)
    }
    
    yPosition += 8
  }

  // ==================== APPROVAL INFORMATION ====================
  if (po.status === 'APPROVED' && po.approved_by_name) {
    // Check if we need a new page
    if (yPosition > pageHeight - 60) {
      doc.addPage()
      doc.addImage(letterheadImg, 'PNG', 0, 0, pageWidth, pageHeight)
      yPosition = 30
    }

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(34, 197, 94) // Green for approval
    doc.text('✓ APPROVED', margin, yPosition)
    
    yPosition += 6
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 60)
    
    doc.text(`Approved by: ${po.approved_by_name}`, margin, yPosition)
    
    if (po.approved_by_title) {
      yPosition += 5
      doc.text(`Title: ${po.approved_by_title}`, margin, yPosition)
    }
    
    if (po.approved_at) {
      yPosition += 5
      doc.text(`Date: ${formatDateTime(po.approved_at)}`, margin, yPosition)
    }
    
    yPosition += 8
  }

  // ==================== REJECTION INFORMATION ====================
  if (po.status === 'REJECTED' && po.rejection_reason) {
    // Check if we need a new page
    if (yPosition > pageHeight - 60) {
      doc.addPage()
      doc.addImage(letterheadImg, 'PNG', 0, 0, pageWidth, pageHeight)
      yPosition = 30
    }

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(239, 68, 68) // Red for rejection
    doc.text('✗ REJECTED', margin, yPosition)
    
    yPosition += 6
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 60)
    
    doc.text('Reason:', margin, yPosition)
    yPosition += 5
    
    const reasonLines = doc.splitTextToSize(po.rejection_reason, pageWidth - 2 * margin)
    doc.setTextColor(239, 68, 68)
    doc.text(reasonLines, margin, yPosition)
    yPosition += reasonLines.length * 5 + 8
  }

  // ==================== RECEIPT INFORMATION ====================
  if (po.status === 'PAID' && po.receipt_document_url) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(59, 130, 246) // Blue for paid
    doc.text('✓ RECEIPT UPLOADED', margin, yPosition)
    
    yPosition += 6
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 60)
    
    if (po.receipt_uploaded_at) {
      doc.text(`Uploaded: ${formatDateTime(po.receipt_uploaded_at)}`, margin, yPosition)
      yPosition += 5
    }
    
    yPosition += 8
  }

  // ==================== NOTES SECTION ====================
  if (po.notes) {
    // Check if we need a new page
    if (yPosition > pageHeight - 40) {
      doc.addPage()
      doc.addImage(letterheadImg, 'PNG', 0, 0, pageWidth, pageHeight)
      yPosition = 30
    }

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('NOTES:', margin, yPosition)
    
    yPosition += 6
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 60)
    const notesLines = doc.splitTextToSize(po.notes, pageWidth - 2 * margin)
    doc.text(notesLines, margin, yPosition)
    yPosition += notesLines.length * 5 + 10
  }

  // ==================== FOOTER MESSAGE ====================
  const footerY = pageHeight - 20
  
  doc.setFontSize(8)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(120, 120, 120)
  doc.text(
    'This is an official purchase order document. Please retain for your records.',
    pageWidth / 2,
    footerY,
    { align: 'center' }
  )

  // Page number
  doc.setFontSize(7)
  doc.text(`Page 1 of 1`, pageWidth - margin, footerY + 5, { align: 'right' })

  // ==================== SAVE PDF ====================
  const fileName = `PurchaseOrder_${po.po_number}_${formatDate(po.created_at).replace(/[^a-z0-9]/gi, '_')}.pdf`
  doc.save(fileName)
}
