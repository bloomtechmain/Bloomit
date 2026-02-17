import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Quote } from '../types/quotes'
import { COMPANY_INFO } from '../constants/companyInfo'

export const generateQuotePDF = (quote: Quote): void => {
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
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // ==================== QUOTE HEADER ====================
  yPosition += 10
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('QUOTATION', margin, yPosition)

  // Quote Details (Right side)
  yPosition += 2
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Quote No: ${quote.quote_number}`, pageWidth - margin, yPosition, { align: 'right' })
  
  yPosition += 5
  doc.text(`Date: ${formatDate(quote.date_of_issue)}`, pageWidth - margin, yPosition, { align: 'right' })

  // ==================== BANK DETAILS ====================
  yPosition += 10
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(40, 40, 40)
  
  doc.text('Bloomtech (PVT)LTD is partnered with Commercial Bank', pageWidth - margin, yPosition, { align: 'right' })
  yPosition += 5
  doc.text('Account Number: 1001025511,', pageWidth - margin, yPosition, { align: 'right' })
  yPosition += 5
  doc.text('Branch: Borella, Colombo 8', pageWidth - margin, yPosition, { align: 'right' })

  // ==================== CLIENT INFORMATION ====================
  yPosition += 10
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('TO:', margin, yPosition)

  yPosition += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text(quote.company_name, margin, yPosition)

  if (quote.company_address) {
    yPosition += 5
    doc.setFontSize(9)
    doc.setTextColor(60, 60, 60)
    const addressLines = doc.splitTextToSize(quote.company_address, pageWidth - 2 * margin - 20)
    doc.text(addressLines, margin, yPosition)
    yPosition += addressLines.length * 5
  }

  // ==================== ITEMS TABLE ====================
  yPosition += 10

  // Prepare table data
  const tableData = quote.items?.map((item) => [
    item.description,
    item.quantity.toString(),
    formatCurrency(item.unit_price),
    formatCurrency(item.total)
  ]) || []

  // Generate table
  autoTable(doc, {
    startY: yPosition,
    head: [['Description', 'Quantity', 'Unit Price', 'Total']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [0, 97, 255],
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

  // ==================== ADDITIONAL SERVICES ====================
  if (quote.additional_services && quote.additional_services.length > 0) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('Additional Services:', margin, yPosition)
    
    yPosition += 6
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    
    quote.additional_services.forEach((service) => {
      doc.text(`• ${service.service_name}`, margin + 5, yPosition)
      doc.text(formatCurrency(service.price), pageWidth - margin, yPosition, { align: 'right' })
      yPosition += 5
    })
    
    yPosition += 5
  }

  // ==================== TOTALS SECTION ====================
  // Check if we need a new page
  if (yPosition > pageHeight - 80) {
    doc.addPage()
    // Add letterhead to new page
    doc.addImage(letterheadImg, 'PNG', 0, 0, pageWidth, pageHeight)
    yPosition = 30
  }

  // Subtotal and Total box
  const totalsBoxX = pageWidth - margin - 70
  const totalsBoxY = yPosition
  const totalsBoxWidth = 70
  const totalsBoxHeight = 25

  // Draw box
  doc.setDrawColor(0, 97, 255)
  doc.setLineWidth(0.5)
  doc.rect(totalsBoxX, totalsBoxY, totalsBoxWidth, totalsBoxHeight)

  // Subtotal
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 60, 60)
  doc.text('Subtotal:', totalsBoxX + 5, totalsBoxY + 8)
  doc.text(formatCurrency(quote.subtotal), totalsBoxX + totalsBoxWidth - 5, totalsBoxY + 8, { align: 'right' })

  // Total Due (Bold, larger)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 97, 255)
  doc.text('Total Due:', totalsBoxX + 5, totalsBoxY + 18)
  doc.text(formatCurrency(quote.total_due), totalsBoxX + totalsBoxWidth - 5, totalsBoxY + 18, { align: 'right' })

  yPosition = totalsBoxY + totalsBoxHeight + 15

  // ==================== NOTES SECTION ====================
  if (quote.notes) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('Notes:', margin, yPosition)
    
    yPosition += 6
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 60)
    const notesLines = doc.splitTextToSize(quote.notes, pageWidth - 2 * margin)
    doc.text(notesLines, margin, yPosition)
    yPosition += notesLines.length * 5 + 10
  }

  // ==================== THANK YOU MESSAGE ====================
  yPosition += 8
  doc.setFontSize(8)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(120, 120, 120)
  doc.text(COMPANY_INFO.footer, pageWidth / 2, yPosition, { align: 'center' })

  // ==================== FOOTER ====================
  const footerY = pageHeight - 15
  
  // Page number
  doc.setFontSize(7)
  doc.setTextColor(120, 120, 120)
  doc.text(`Page 1 of 1`, pageWidth - margin, footerY, { align: 'right' })

  // ==================== SAVE PDF ====================
  const fileName = `Quote_${quote.quote_number}_${quote.company_name.replace(/[^a-z0-9]/gi, '_')}.pdf`
  doc.save(fileName)
}
