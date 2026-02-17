"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePayslipPdf = generatePayslipPdf;
const pdfkit_1 = __importDefault(require("pdfkit"));
const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];
function formatCurrency(amount) {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
    }).format(num);
}
async function generatePayslipPdf(payslipData, signatures, res) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new pdfkit_1.default({ margin: 50, size: 'A4' });
            // Set response headers for PDF download
            const fileName = `Payslip_${payslipData.employee_number}_${MONTHS[payslipData.payslip_month - 1]}_${payslipData.payslip_year}.pdf`;
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            // Pipe the PDF directly to the response
            doc.pipe(res);
            // Header section with company logo placeholder
            doc.fontSize(24)
                .fillColor('#2563eb')
                .text('BLOOMTECH ERP', { align: 'center' })
                .moveDown(0.3);
            doc.fontSize(12)
                .fillColor('#666666')
                .text('Payroll Management System', { align: 'center' })
                .moveDown(0.5);
            // Payslip title
            doc.fontSize(18)
                .fillColor('#333333')
                .text(`PAY SLIP - ${MONTHS[payslipData.payslip_month - 1].toUpperCase()} ${payslipData.payslip_year}`, {
                align: 'center',
                underline: true
            })
                .moveDown(1);
            // Employee information box
            const startY = doc.y;
            doc.fontSize(11)
                .fillColor('#333333');
            doc.rect(50, startY, 495, 120)
                .stroke();
            doc.text('Employee Information', 60, startY + 10, { underline: true });
            doc.moveDown(0.5);
            const leftColumnX = 60;
            const rightColumnX = 300;
            let currentY = doc.y;
            doc.text(`Employee Name:`, leftColumnX, currentY);
            doc.text(`${payslipData.first_name} ${payslipData.last_name}`, leftColumnX + 120, currentY);
            currentY += 20;
            doc.text(`Employee Number:`, leftColumnX, currentY);
            doc.text(payslipData.employee_number, leftColumnX + 120, currentY);
            currentY += 20;
            doc.text(`Department:`, leftColumnX, currentY);
            doc.text(payslipData.employee_department || 'N/A', leftColumnX + 120, currentY);
            currentY += 20;
            doc.text(`Designation:`, leftColumnX, currentY);
            doc.text(payslipData.designation || 'N/A', leftColumnX + 120, currentY);
            doc.moveDown(2);
            // Earnings section
            doc.fontSize(13)
                .fillColor('#2563eb')
                .text('EARNINGS', { underline: true })
                .moveDown(0.5);
            doc.fontSize(10)
                .fillColor('#333333');
            const earningsY = doc.y;
            doc.rect(50, earningsY, 495, 25)
                .fillAndStroke('#f3f4f6', '#cccccc');
            doc.fillColor('#000000')
                .text('Description', 60, earningsY + 8)
                .text('Amount', 450, earningsY + 8);
            let tableY = earningsY + 30;
            // Basic Salary
            doc.fillColor('#333333')
                .text('Basic Salary', 60, tableY)
                .text(formatCurrency(payslipData.basic_salary), 400, tableY, { align: 'right' });
            tableY += 20;
            // Allowances
            const allowances = payslipData.allowances || {};
            if (Object.keys(allowances).length > 0) {
                for (const [key, value] of Object.entries(allowances)) {
                    const allowanceName = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
                    doc.text(allowanceName, 60, tableY)
                        .text(formatCurrency(value), 400, tableY, { align: 'right' });
                    tableY += 20;
                }
            }
            // Gross Salary line
            doc.rect(50, tableY, 495, 1).fillAndStroke('#cccccc');
            tableY += 10;
            doc.fontSize(11)
                .fillColor('#000000')
                .font('Helvetica-Bold')
                .text('Gross Salary', 60, tableY)
                .text(formatCurrency(payslipData.gross_salary), 400, tableY, { align: 'right' })
                .font('Helvetica');
            tableY += 30;
            // Deductions section
            doc.fontSize(13)
                .fillColor('#2563eb')
                .text('DEDUCTIONS', 50, tableY, { underline: true });
            tableY += 25;
            doc.fontSize(10);
            const deductionsHeaderY = tableY;
            doc.rect(50, deductionsHeaderY, 495, 25)
                .fillAndStroke('#f3f4f6', '#cccccc');
            doc.fillColor('#000000')
                .text('Description', 60, deductionsHeaderY + 8)
                .text('Amount', 450, deductionsHeaderY + 8);
            tableY = deductionsHeaderY + 30;
            // EPF Deduction
            if (parseFloat(payslipData.epf_employee_deduction) > 0) {
                doc.fillColor('#333333')
                    .text(`EPF (${payslipData.epf_employee_rate}%)`, 60, tableY)
                    .text(formatCurrency(payslipData.epf_employee_deduction), 400, tableY, { align: 'right' });
                tableY += 20;
            }
            // Other Deductions
            const otherDeductions = payslipData.other_deductions || {};
            if (Object.keys(otherDeductions).length > 0) {
                for (const [key, value] of Object.entries(otherDeductions)) {
                    const deductionName = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
                    doc.text(deductionName, 60, tableY)
                        .text(formatCurrency(value), 400, tableY, { align: 'right' });
                    tableY += 20;
                }
            }
            // Total Deductions line
            doc.rect(50, tableY, 495, 1).fillAndStroke('#cccccc');
            tableY += 10;
            doc.fontSize(11)
                .fillColor('#000000')
                .font('Helvetica-Bold')
                .text('Total Deductions', 60, tableY)
                .text(formatCurrency(payslipData.total_deductions), 400, tableY, { align: 'right' })
                .font('Helvetica');
            tableY += 30;
            // Net Salary (highlighted)
            doc.rect(50, tableY, 495, 40)
                .fillAndStroke('#dcfce7', '#22c55e');
            doc.fontSize(14)
                .fillColor('#166534')
                .font('Helvetica-Bold')
                .text('NET SALARY (Take Home)', 60, tableY + 12)
                .text(formatCurrency(payslipData.net_salary), 400, tableY + 12, { align: 'right' })
                .font('Helvetica');
            tableY += 50;
            // Employer Contributions
            if (parseFloat(payslipData.epf_employer_contribution) > 0 || parseFloat(payslipData.etf_employer_contribution) > 0) {
                doc.fontSize(13)
                    .fillColor('#2563eb')
                    .text('EMPLOYER CONTRIBUTIONS', 50, tableY, { underline: true });
                tableY += 25;
                doc.fontSize(10)
                    .fillColor('#333333');
                if (parseFloat(payslipData.epf_employer_contribution) > 0) {
                    doc.text('EPF Employer Contribution (12%)', 60, tableY)
                        .text(formatCurrency(payslipData.epf_employer_contribution), 400, tableY, { align: 'right' });
                    tableY += 20;
                }
                if (parseFloat(payslipData.etf_employer_contribution) > 0) {
                    doc.text('ETF Employer Contribution (3%)', 60, tableY)
                        .text(formatCurrency(payslipData.etf_employer_contribution), 400, tableY, { align: 'right' });
                    tableY += 20;
                }
                tableY += 10;
            }
            // Add new page if needed for signatures
            if (tableY > 650) {
                doc.addPage();
                tableY = 50;
            }
            // Digital Signatures section
            if (signatures.length > 0) {
                doc.moveDown(2);
                doc.fontSize(13)
                    .fillColor('#2563eb')
                    .text('DIGITAL SIGNATURES', 50, tableY, { underline: true });
                tableY += 25;
                signatures.forEach((sig) => {
                    doc.fontSize(9)
                        .fillColor('#333333')
                        .text(`${sig.signer_role.replace(/_/g, ' ')}:`, 60, tableY);
                    tableY += 15;
                    doc.fontSize(8)
                        .fillColor('#666666')
                        .text(`Signed by: ${sig.signer_name}`, 70, tableY);
                    tableY += 12;
                    doc.text(`Date: ${new Date(sig.signed_at).toLocaleString()}`, 70, tableY);
                    tableY += 12;
                    doc.text(`Hash: ${sig.signature_hash.substring(0, 40)}...`, 70, tableY);
                    tableY += 20;
                });
            }
            // Footer
            doc.fontSize(8)
                .fillColor('#999999')
                .text('This is a computer-generated payslip and does not require a physical signature.', 50, doc.page.height - 80, { align: 'center', width: 495 })
                .text(`Generated on ${new Date().toLocaleString()}`, 50, doc.page.height - 65, { align: 'center', width: 495 })
                .text(`Payslip ID: ${payslipData.payslip_id}`, 50, doc.page.height - 50, { align: 'center', width: 495 });
            // Finalize the PDF
            doc.end();
            doc.on('finish', () => {
                resolve();
            });
            doc.on('error', (err) => {
                reject(err);
            });
        }
        catch (error) {
            reject(error);
        }
    });
}
