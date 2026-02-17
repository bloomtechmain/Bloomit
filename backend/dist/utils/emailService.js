"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWelcomeEmail = sendWelcomeEmail;
exports.sendPasswordResetEmail = sendPasswordResetEmail;
exports.sendTestEmail = sendTestEmail;
exports.sendEmail = sendEmail;
exports.sendPOCreatedEmail = sendPOCreatedEmail;
exports.sendPOPendingApprovalEmail = sendPOPendingApprovalEmail;
exports.sendPOApprovedEmail = sendPOApprovedEmail;
exports.sendPayslipNotification = sendPayslipNotification;
exports.sendPORejectedEmail = sendPORejectedEmail;
exports.sendPayslipSignedConfirmation = sendPayslipSignedConfirmation;
const nodemailer_1 = __importDefault(require("nodemailer"));
// Email configuration from environment variables
const SMTP_CONFIG = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
};
const FROM_EMAIL = process.env.SMTP_FROM || 'Bloomtech ERP <noreply@erpbloom.com>';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
/**
 * Creates a nodemailer transporter instance
 */
function createTransporter() {
    // Check if SMTP is configured
    if (!SMTP_CONFIG.auth.user || !SMTP_CONFIG.auth.pass) {
        console.warn('⚠️  SMTP credentials not configured. Email sending will be disabled.');
        return null;
    }
    return nodemailer_1.default.createTransport(SMTP_CONFIG);
}
/**
 * Sends a welcome email to a newly created user with their temporary credentials
 */
async function sendWelcomeEmail(userEmail, temporaryPassword) {
    try {
        const transporter = createTransporter();
        if (!transporter) {
            console.warn('Email not sent: SMTP not configured');
            return {
                success: false,
                error: 'SMTP not configured. Please set SMTP environment variables.'
            };
        }
        const mailOptions = {
            from: FROM_EMAIL,
            to: userEmail,
            subject: 'Welcome to Bloomtech ERP - Your Account Details',
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1a237e 0%, #283593 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .credentials { background: white; padding: 20px; border-left: 4px solid #ff6b35; margin: 20px 0; border-radius: 4px; }
            .credential-item { margin: 10px 0; }
            .credential-label { font-weight: bold; color: #555; }
            .credential-value { font-family: 'Courier New', monospace; background: #f0f0f0; padding: 8px 12px; border-radius: 4px; display: inline-block; margin-left: 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #ff6b35; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
            .footer { text-align: center; margin-top: 30px; color: #777; font-size: 12px; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Welcome to Bloomtech ERP</h1>
              <p style="margin: 10px 0 0;">Your account has been created successfully</p>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>Your Bloomtech ERP account has been created by an administrator. Below are your login credentials:</p>
              
              <div class="credentials">
                <div class="credential-item">
                  <span class="credential-label">Email:</span>
                  <span class="credential-value">${userEmail}</span>
                </div>
                <div class="credential-item">
                  <span class="credential-label">Temporary Password:</span>
                  <span class="credential-value">${temporaryPassword}</span>
                </div>
              </div>

              <div class="warning">
                <strong>⚠️ Important Security Notice</strong>
                <p style="margin: 5px 0 0;">This is a temporary password. Please log in and change your password immediately for security purposes.</p>
              </div>

              <center>
                <a href="${FRONTEND_URL}/login" class="button">Log In to Bloomtech ERP</a>
              </center>

              <p style="margin-top: 30px;">If you have any questions or need assistance, please contact your system administrator.</p>
              
              <p>Best regards,<br><strong>Bloomtech ERP Team</strong></p>
            </div>
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
              <p>&copy; ${new Date().getFullYear()} Bloomtech ERP. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
            text: `
Welcome to Bloomtech ERP

Your account has been created successfully!

Login Credentials:
Email: ${userEmail}
Temporary Password: ${temporaryPassword}

⚠️ IMPORTANT: This is a temporary password. Please log in and change your password immediately for security purposes.

Login at: ${FRONTEND_URL}/login

If you have any questions or need assistance, please contact your system administrator.

Best regards,
Bloomtech ERP Team

---
This is an automated message. Please do not reply to this email.
© ${new Date().getFullYear()} Bloomtech ERP. All rights reserved.
      `
        };
        await transporter.sendMail(mailOptions);
        console.log(`✅ Welcome email sent successfully to ${userEmail}`);
        return { success: true };
    }
    catch (error) {
        console.error('❌ Error sending welcome email:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error sending email'
        };
    }
}
/**
 * Sends a password reset email with temporary credentials
 */
async function sendPasswordResetEmail(userEmail, userName, temporaryPassword) {
    try {
        const transporter = createTransporter();
        if (!transporter) {
            console.warn('Email not sent: SMTP not configured');
            return {
                success: false,
                error: 'SMTP not configured. Please set SMTP environment variables.'
            };
        }
        const mailOptions = {
            from: FROM_EMAIL,
            to: userEmail,
            subject: 'Reset your BloomAudit password',
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1a237e; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .password-box { background: white; padding: 20px; border-left: 4px solid #ff6b35; margin: 20px 0; border-radius: 4px; }
            .password { font-family: 'Courier New', monospace; font-size: 18px; font-weight: bold; color: #1a237e; background: #f0f0f0; padding: 12px; border-radius: 4px; display: inline-block; }
            .footer { text-align: center; margin-top: 30px; color: #777; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Password Reset</h1>
            </div>
            <div class="content">
              <p>Hi ${userName},</p>
              <p>An administrator has reset the password for your BloomAudit account.</p>
              
              <div class="password-box">
                <p style="margin: 0 0 10px; font-weight: bold;">Your temporary password is:</p>
                <div class="password">${temporaryPassword}</div>
              </div>

              <p><strong>Please log in and change your password immediately.</strong></p>
              
              <p>Login at: <a href="${FRONTEND_URL}/login">${FRONTEND_URL}/login</a></p>

              <p style="margin-top: 20px;">If you didn't request this change, please contact your system administrator immediately.</p>
              
              <p>Best regards,<br><strong>The BloomAudit Team</strong></p>
            </div>
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
              <p>&copy; ${new Date().getFullYear()} BloomAudit. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
            text: `
Hi ${userName},

An administrator has reset the password for your BloomAudit account.

Your temporary password is: ${temporaryPassword}

Please log in and change your password immediately.

Login at: ${FRONTEND_URL}/login

If you didn't request this change, please contact your system administrator immediately.

Best regards,
The BloomAudit Team

---
This is an automated message. Please do not reply to this email.
© ${new Date().getFullYear()} BloomAudit. All rights reserved.
      `
        };
        await transporter.sendMail(mailOptions);
        console.log(`✅ Password reset email sent successfully to ${userEmail}`);
        return { success: true };
    }
    catch (error) {
        console.error('❌ Error sending password reset email:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error sending email'
        };
    }
}
/**
 * Sends a test email to verify SMTP configuration
 */
async function sendTestEmail(toEmail) {
    try {
        const transporter = createTransporter();
        if (!transporter) {
            return {
                success: false,
                error: 'SMTP not configured'
            };
        }
        await transporter.sendMail({
            from: FROM_EMAIL,
            to: toEmail,
            subject: 'Bloomtech ERP - Email Configuration Test',
            text: 'This is a test email to verify your SMTP configuration is working correctly.'
        });
        return { success: true };
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
/**
 * Generic email sending function
 * Can be used by any service to send custom emails
 */
async function sendEmail(to, subject, html, text) {
    try {
        const transporter = createTransporter();
        if (!transporter) {
            console.warn('Email not sent: SMTP not configured');
            return {
                success: false,
                error: 'SMTP not configured. Please set SMTP environment variables.'
            };
        }
        const mailOptions = {
            from: FROM_EMAIL,
            to,
            subject,
            html,
            text: text || '' // Use provided text or empty string
        };
        await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent successfully to ${to}`);
        return { success: true };
    }
    catch (error) {
        console.error('❌ Error sending email:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error sending email'
        };
    }
}
/**
 * Sends a notification when a new Purchase Order is created
 * Notifies the requestor with confirmation
 */
async function sendPOCreatedEmail(data) {
    const { poNumber, requestedByName, requestedByEmail, vendorName, projectName, totalAmount } = data;
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #1a237e 0%, #283593 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .po-box { background: white; padding: 20px; border-left: 4px solid #4caf50; margin: 20px 0; border-radius: 4px; }
        .po-number { font-size: 24px; font-weight: bold; color: #1a237e; margin: 10px 0; }
        .detail-row { margin: 8px 0; }
        .label { font-weight: bold; color: #555; display: inline-block; width: 140px; }
        .value { color: #333; }
        .status-badge { display: inline-block; padding: 6px 16px; background: #fff3cd; color: #856404; border-radius: 20px; font-weight: bold; font-size: 12px; margin: 10px 0; }
        .button { display: inline-block; padding: 12px 30px; background: #1a237e; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
        .footer { text-align: center; margin-top: 30px; color: #777; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">Purchase Order Created</h1>
          <p style="margin: 10px 0 0;">Your PO has been submitted successfully</p>
        </div>
        <div class="content">
          <p>Hi ${requestedByName},</p>
          <p>Your Purchase Order has been created successfully and is now pending approval.</p>
          
          <div class="po-box">
            <div class="po-number">${poNumber}</div>
            <div class="status-badge">⏳ PENDING APPROVAL</div>
            <div style="margin-top: 20px;">
              ${vendorName ? `<div class="detail-row"><span class="label">Vendor:</span><span class="value">${vendorName}</span></div>` : ''}
              ${projectName ? `<div class="detail-row"><span class="label">Project:</span><span class="value">${projectName}</span></div>` : ''}
              <div class="detail-row"><span class="label">Total Amount:</span><span class="value">${totalAmount}</span></div>
            </div>
          </div>

          <p><strong>Next Steps:</strong></p>
          <ul>
            <li>Your PO is now in the queue for admin approval</li>
            <li>You will receive an email notification when it's approved or if any changes are needed</li>
            <li>You can check the status anytime in the Purchase Orders section</li>
          </ul>

          <center>
            <a href="${FRONTEND_URL}" class="button">View Purchase Orders</a>
          </center>

          <p style="margin-top: 30px;">If you have any questions, please contact your administrator.</p>
          
          <p>Best regards,<br><strong>Bloomtech ERP Team</strong></p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>&copy; ${new Date().getFullYear()} Bloomtech ERP. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
    const text = `
Purchase Order Created

Hi ${requestedByName},

Your Purchase Order has been created successfully and is now pending approval.

PO Number: ${poNumber}
Status: PENDING APPROVAL
${vendorName ? `Vendor: ${vendorName}` : ''}
${projectName ? `Project: ${projectName}` : ''}
Total Amount: ${totalAmount}

Next Steps:
- Your PO is now in the queue for admin approval
- You will receive an email notification when it's approved or if any changes are needed
- You can check the status anytime in the Purchase Orders section

View Purchase Orders: ${FRONTEND_URL}

If you have any questions, please contact your administrator.

Best regards,
Bloomtech ERP Team

---
This is an automated message. Please do not reply to this email.
© ${new Date().getFullYear()} Bloomtech ERP. All rights reserved.
  `;
    return sendEmail(requestedByEmail, `Purchase Order ${poNumber} - Created`, html, text);
}
/**
 * Sends a notification to admins when a PO needs approval
 */
async function sendPOPendingApprovalEmail(adminEmails, data) {
    const { poNumber, requestedByName, vendorName, projectName, totalAmount } = data;
    if (adminEmails.length === 0) {
        return { success: false, error: 'No admin emails provided' };
    }
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .po-box { background: white; padding: 20px; border-left: 4px solid #ff6b35; margin: 20px 0; border-radius: 4px; }
        .po-number { font-size: 24px; font-weight: bold; color: #1a237e; margin: 10px 0; }
        .detail-row { margin: 8px 0; }
        .label { font-weight: bold; color: #555; display: inline-block; width: 140px; }
        .value { color: #333; }
        .urgent-badge { display: inline-block; padding: 6px 16px; background: #ff6b35; color: white; border-radius: 20px; font-weight: bold; font-size: 12px; margin: 10px 0; }
        .button { display: inline-block; padding: 12px 30px; background: #ff6b35; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
        .footer { text-align: center; margin-top: 30px; color: #777; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">⚠️ Purchase Order Awaiting Approval</h1>
          <p style="margin: 10px 0 0;">Action Required</p>
        </div>
        <div class="content">
          <p>Hello Admin,</p>
          <p>A new Purchase Order requires your review and approval.</p>
          
          <div class="po-box">
            <div class="po-number">${poNumber}</div>
            <div class="urgent-badge">⏳ PENDING YOUR APPROVAL</div>
            <div style="margin-top: 20px;">
              <div class="detail-row"><span class="label">Requested By:</span><span class="value">${requestedByName}</span></div>
              ${vendorName ? `<div class="detail-row"><span class="label">Vendor:</span><span class="value">${vendorName}</span></div>` : ''}
              ${projectName ? `<div class="detail-row"><span class="label">Project:</span><span class="value">${projectName}</span></div>` : ''}
              <div class="detail-row"><span class="label">Total Amount:</span><span class="value">${totalAmount}</span></div>
            </div>
          </div>

          <p><strong>Required Action:</strong></p>
          <ul>
            <li>Review the Purchase Order details carefully</li>
            <li>Verify vendor information and pricing</li>
            <li>Approve or reject with appropriate feedback</li>
          </ul>

          <center>
            <a href="${FRONTEND_URL}" class="button">Review Purchase Order</a>
          </center>

          <p style="margin-top: 30px; color: #666; font-size: 13px;">
            💡 Tip: Click the button above to access the PO directly in the system for quick approval.
          </p>
          
          <p>Best regards,<br><strong>Bloomtech ERP System</strong></p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>&copy; ${new Date().getFullYear()} Bloomtech ERP. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
    const text = `
⚠️ Purchase Order Awaiting Approval - Action Required

Hello Admin,

A new Purchase Order requires your review and approval.

PO Number: ${poNumber}
Status: PENDING YOUR APPROVAL
Requested By: ${requestedByName}
${vendorName ? `Vendor: ${vendorName}` : ''}
${projectName ? `Project: ${projectName}` : ''}
Total Amount: ${totalAmount}

Required Action:
- Review the Purchase Order details carefully
- Verify vendor information and pricing
- Approve or reject with appropriate feedback

Review Purchase Order: ${FRONTEND_URL}

Best regards,
Bloomtech ERP System

---
This is an automated message. Please do not reply to this email.
© ${new Date().getFullYear()} Bloomtech ERP. All rights reserved.
  `;
    // Send to all admin emails
    const results = await Promise.all(adminEmails.map(email => sendEmail(email, `🔔 PO ${poNumber} - Approval Needed`, html, text)));
    // Return success if at least one email sent successfully
    const anySuccess = results.some(r => r.success);
    return anySuccess
        ? { success: true }
        : { success: false, error: 'Failed to send to all admins' };
}
/**
 * Sends a notification when a PO is approved
 */
async function sendPOApprovedEmail(data) {
    const { poNumber, requestedByName, requestedByEmail, vendorName, projectName, totalAmount, approvedByName } = data;
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #4caf50 0%, #66bb6a 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .po-box { background: white; padding: 20px; border-left: 4px solid #4caf50; margin: 20px 0; border-radius: 4px; }
        .po-number { font-size: 24px; font-weight: bold; color: #1a237e; margin: 10px 0; }
        .detail-row { margin: 8px 0; }
        .label { font-weight: bold; color: #555; display: inline-block; width: 140px; }
        .value { color: #333; }
        .status-badge { display: inline-block; padding: 6px 16px; background: #4caf50; color: white; border-radius: 20px; font-weight: bold; font-size: 12px; margin: 10px 0; }
        .button { display: inline-block; padding: 12px 30px; background: #4caf50; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
        .footer { text-align: center; margin-top: 30px; color: #777; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">✅ Purchase Order Approved</h1>
          <p style="margin: 10px 0 0;">Good news - Your PO has been approved!</p>
        </div>
        <div class="content">
          <p>Hi ${requestedByName},</p>
          <p>Great news! Your Purchase Order has been approved and is ready to proceed.</p>
          
          <div class="po-box">
            <div class="po-number">${poNumber}</div>
            <div class="status-badge">✓ APPROVED</div>
            <div style="margin-top: 20px;">
              ${vendorName ? `<div class="detail-row"><span class="label">Vendor:</span><span class="value">${vendorName}</span></div>` : ''}
              ${projectName ? `<div class="detail-row"><span class="label">Project:</span><span class="value">${projectName}</span></div>` : ''}
              <div class="detail-row"><span class="label">Total Amount:</span><span class="value">${totalAmount}</span></div>
              ${approvedByName ? `<div class="detail-row"><span class="label">Approved By:</span><span class="value">${approvedByName}</span></div>` : ''}
            </div>
          </div>

          <p><strong>Next Steps:</strong></p>
          <ul>
            <li>You may proceed with the purchase from the vendor</li>
            <li>Once the items are received and paid for, upload the receipt document</li>
            <li>The PO status will be updated to PAID after receipt upload</li>
          </ul>

          <center>
            <a href="${FRONTEND_URL}" class="button">View Purchase Order</a>
          </center>

          <p style="margin-top: 30px;">If you have any questions about this approval, please contact your administrator.</p>
          
          <p>Best regards,<br><strong>Bloomtech ERP Team</strong></p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>&copy; ${new Date().getFullYear()} Bloomtech ERP. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
    const text = `
✅ Purchase Order Approved

Hi ${requestedByName},

Great news! Your Purchase Order has been approved and is ready to proceed.

PO Number: ${poNumber}
Status: APPROVED
${vendorName ? `Vendor: ${vendorName}` : ''}
${projectName ? `Project: ${projectName}` : ''}
Total Amount: ${totalAmount}
${approvedByName ? `Approved By: ${approvedByName}` : ''}

Next Steps:
- You may proceed with the purchase from the vendor
- Once the items are received and paid for, upload the receipt document
- The PO status will be updated to PAID after receipt upload

View Purchase Order: ${FRONTEND_URL}

If you have any questions about this approval, please contact your administrator.

Best regards,
Bloomtech ERP Team

---
This is an automated message. Please do not reply to this email.
© ${new Date().getFullYear()} Bloomtech ERP. All rights reserved.
  `;
    return sendEmail(requestedByEmail, `Purchase Order ${poNumber} - Approved ✅`, html, text);
}
/**
 * Sends a notification to employee when payslip is approved and ready for signature
 * Phase 11-12: Uses secure token from payslipTokens utility
 */
async function sendPayslipNotification(data, signatureToken) {
    const { payslipId, employeeName, employeeEmail, month, year, netSalary, grossSalary, approvedByName } = data;
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = monthNames[month - 1];
    const signatureLink = `${FRONTEND_URL}/payslip-signature/${payslipId}?token=${signatureToken}`;
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #1a237e 0%, #283593 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .payslip-box { background: white; padding: 20px; border-left: 4px solid #4caf50; margin: 20px 0; border-radius: 4px; }
        .payslip-title { font-size: 22px; font-weight: bold; color: #1a237e; margin: 10px 0; }
        .detail-row { margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee; }
        .label { font-weight: bold; color: #555; display: inline-block; width: 140px; }
        .value { color: #333; font-weight: 500; }
        .net-salary { font-size: 28px; font-weight: bold; color: #4caf50; margin: 15px 0; }
        .status-badge { display: inline-block; padding: 8px 18px; background: #4caf50; color: white; border-radius: 20px; font-weight: bold; font-size: 12px; margin: 10px 0; }
        .button { display: inline-block; padding: 14px 40px; background: #4caf50; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .button:hover { background: #45a049; }
        .important-note { background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .footer { text-align: center; margin-top: 30px; color: #777; font-size: 12px; }
        .security-note { background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 15px 0; border-radius: 4px; font-size: 13px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">💰 Your Payslip is Ready!</h1>
          <p style="margin: 10px 0 0;">Payslip for ${monthName} ${year}</p>
        </div>
        <div class="content">
          <p>Dear ${employeeName},</p>
          <p>Great news! Your payslip for <strong>${monthName} ${year}</strong> has been processed and approved by administration.</p>
          
          <div class="payslip-box">
            <div class="payslip-title">Payslip Summary</div>
            <div class="status-badge">✓ APPROVED - AWAITING YOUR SIGNATURE</div>
            <div style="margin-top: 20px;">
              <div class="detail-row">
                <span class="label">Month/Year:</span>
                <span class="value">${monthName} ${year}</span>
              </div>
              <div class="detail-row">
                <span class="label">Gross Salary:</span>
                <span class="value">${grossSalary}</span>
              </div>
              ${approvedByName ? `<div class="detail-row"><span class="label">Approved By:</span><span class="value">${approvedByName}</span></div>` : ''}
              <div style="margin-top: 20px; padding-top: 15px; border-top: 2px solid #4caf50;">
                <span class="label">Net Salary:</span>
                <div class="net-salary">${netSalary}</div>
              </div>
            </div>
          </div>

          <div class="important-note">
            <strong>📋 Action Required:</strong>
            <p style="margin: 10px 0 0;">Please review and digitally sign your payslip by clicking the button below. Once signed, you'll be able to download your official payslip document.</p>
          </div>

          <center>
            <a href="${signatureLink}" class="button">View & Sign Payslip →</a>
          </center>

          <div class="security-note">
            🔒 <strong>Security Notice:</strong> This link is unique to you and will expire after use. Do not share this link with anyone.
          </div>

          <p><strong>What happens next?</strong></p>
          <ul>
            <li>Click the button above to securely access your payslip</li>
            <li>Review all salary details and deductions</li>
            <li>Digitally sign to acknowledge receipt</li>
            <li>Download your signed payslip PDF for your records</li>
          </ul>

          <p style="margin-top: 30px;">If you have any questions about your payslip details, please contact the HR or Finance department.</p>
          
          <p>Best regards,<br><strong>Bloomtech ERP Payroll Team</strong></p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>&copy; ${new Date().getFullYear()} Bloomtech ERP. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
    const text = `
💰 Your Payslip is Ready!

Dear ${employeeName},

Great news! Your payslip for ${monthName} ${year} has been processed and approved by administration.

PAYSLIP SUMMARY
Month/Year: ${monthName} ${year}
Gross Salary: ${grossSalary}
${approvedByName ? `Approved By: ${approvedByName}` : ''}
Net Salary: ${netSalary}

Status: APPROVED - AWAITING YOUR SIGNATURE

ACTION REQUIRED:
Please review and digitally sign your payslip by visiting the link below. Once signed, you'll be able to download your official payslip document.

View & Sign Payslip: ${signatureLink}

🔒 SECURITY NOTICE: This link is unique to you and will expire after use. Do not share this link with anyone.

What happens next?
- Click the link above to securely access your payslip
- Review all salary details and deductions
- Digitally sign to acknowledge receipt
- Download your signed payslip PDF for your records

If you have any questions about your payslip details, please contact the HR or Finance department.

Best regards,
Bloomtech ERP Payroll Team

---
This is an automated message. Please do not reply to this email.
© ${new Date().getFullYear()} Bloomtech ERP. All rights reserved.
  `;
    return sendEmail(employeeEmail, `Your Payslip for ${monthName} ${year} is Ready 💰`, html, text);
}
// ==================== PURCHASE ORDER EMAIL NOTIFICATIONS ====================
/**
 * Sends a notification when a PO is rejected
 */
async function sendPORejectedEmail(data) {
    const { poNumber, requestedByName, requestedByEmail, vendorName, projectName, totalAmount, rejectionReason } = data;
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f44336 0%, #e57373 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .po-box { background: white; padding: 20px; border-left: 4px solid #f44336; margin: 20px 0; border-radius: 4px; }
        .po-number { font-size: 24px; font-weight: bold; color: #1a237e; margin: 10px 0; }
        .detail-row { margin: 8px 0; }
        .label { font-weight: bold; color: #555; display: inline-block; width: 140px; }
        .value { color: #333; }
        .status-badge { display: inline-block; padding: 6px 16px; background: #f44336; color: white; border-radius: 20px; font-weight: bold; font-size: 12px; margin: 10px 0; }
        .reason-box { background: #ffebee; padding: 15px; border-left: 4px solid #f44336; margin: 20px 0; border-radius: 4px; }
        .button { display: inline-block; padding: 12px 30px; background: #1a237e; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
        .footer { text-align: center; margin-top: 30px; color: #777; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">❌ Purchase Order Rejected</h1>
          <p style="margin: 10px 0 0;">Your PO requires revision</p>
        </div>
        <div class="content">
          <p>Hi ${requestedByName},</p>
          <p>Your Purchase Order has been reviewed and requires changes before it can be approved.</p>
          
          <div class="po-box">
            <div class="po-number">${poNumber}</div>
            <div class="status-badge">✗ REJECTED</div>
            <div style="margin-top: 20px;">
              ${vendorName ? `<div class="detail-row"><span class="label">Vendor:</span><span class="value">${vendorName}</span></div>` : ''}
              ${projectName ? `<div class="detail-row"><span class="label">Project:</span><span class="value">${projectName}</span></div>` : ''}
              <div class="detail-row"><span class="label">Total Amount:</span><span class="value">${totalAmount}</span></div>
            </div>
          </div>

          ${rejectionReason ? `
          <div class="reason-box">
            <strong style="color: #c62828;">Rejection Reason:</strong>
            <p style="margin: 10px 0 0; color: #333;">${rejectionReason}</p>
          </div>
          ` : ''}

          <p><strong>What to do next:</strong></p>
          <ul>
            <li>Review the rejection reason carefully</li>
            <li>Make the necessary corrections or adjustments</li>
            <li>Submit a new Purchase Order with the revised information</li>
            <li>Contact your administrator if you have questions about the rejection</li>
          </ul>

          <center>
            <a href="${FRONTEND_URL}" class="button">Create New PO</a>
          </center>

          <p style="margin-top: 30px;">If you need clarification on the rejection reason, please reach out to your administrator.</p>
          
          <p>Best regards,<br><strong>Bloomtech ERP Team</strong></p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>&copy; ${new Date().getFullYear()} Bloomtech ERP. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
    const text = `
❌ Purchase Order Rejected

Hi ${requestedByName},

Your Purchase Order has been reviewed and requires changes before it can be approved.

PO Number: ${poNumber}
Status: REJECTED
${vendorName ? `Vendor: ${vendorName}` : ''}
${projectName ? `Project: ${projectName}` : ''}
Total Amount: ${totalAmount}

${rejectionReason ? `Rejection Reason:\n${rejectionReason}\n` : ''}

What to do next:
- Review the rejection reason carefully
- Make the necessary corrections or adjustments
- Submit a new Purchase Order with the revised information
- Contact your administrator if you have questions about the rejection

Create New PO: ${FRONTEND_URL}

If you need clarification on the rejection reason, please reach out to your administrator.

Best regards,
Bloomtech ERP Team

---
This is an automated message. Please do not reply to this email.
© ${new Date().getFullYear()} Bloomtech ERP. All rights reserved.
  `;
    return sendEmail(requestedByEmail, `Purchase Order ${poNumber} - Rejected ❌`, html, text);
}
/**
 * Sends a confirmation email after employee signs payslip
 * Phase 12 implementation
 */
async function sendPayslipSignedConfirmation(data) {
    const { employeeName, employeeEmail, payslipId, month, year, netSalary, grossSalary } = data;
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = monthNames[month - 1];
    const downloadLink = `${FRONTEND_URL}/employee-portal/payroll`;
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981 0%, #34d399 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .success-icon { font-size: 48px; margin: 20px 0; }
        .payslip-box { background: white; padding: 20px; border-left: 4px solid #10b981; margin: 20px 0; border-radius: 4px; }
        .payslip-title { font-size: 20px; font-weight: bold; color: #1a237e; margin: 10px 0; }
        .detail-row { margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee; }
        .label { font-weight: bold; color: #555; display: inline-block; width: 140px; }
        .value { color: #333; font-weight: 500; }
        .net-salary { font-size: 24px; font-weight: bold; color: #10b981; margin: 15px 0; }
        .success-badge { display: inline-block; padding: 8px 18px; background: #10b981; color: white; border-radius: 20px; font-weight: bold; font-size: 12px; margin: 10px 0; }
        .button { display: inline-block; padding: 14px 40px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .button:hover { background: #059669; }
        .info-box { background: #e0f2fe; border-left: 4px solid #0284c7; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .footer { text-align: center; margin-top: 30px; color: #777; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="success-icon">✅</div>
          <h1 style="margin: 0;">Payslip Signed Successfully!</h1>
          <p style="margin: 10px 0 0;">Thank you for signing your payslip</p>
        </div>
        <div class="content">
          <p>Dear ${employeeName},</p>
          <p>Thank you! Your payslip for <strong>${monthName} ${year}</strong> has been successfully signed and is now complete.</p>
          
          <div class="payslip-box">
            <div class="payslip-title">Signed Payslip Summary</div>
            <div class="success-badge">✓ SIGNED & COMPLETED</div>
            <div style="margin-top: 20px;">
              <div class="detail-row">
                <span class="label">Period:</span>
                <span class="value">${monthName} ${year}</span>
              </div>
              <div class="detail-row">
                <span class="label">Gross Salary:</span>
                <span class="value">${grossSalary}</span>
              </div>
              <div class="detail-row">
                <span class="label">Payslip ID:</span>
                <span class="value">#${payslipId}</span>
              </div>
              <div style="margin-top: 20px; padding-top: 15px; border-top: 2px solid #10b981;">
                <span class="label">Net Salary:</span>
                <div class="net-salary">${netSalary}</div>
              </div>
            </div>
          </div>

          <div class="info-box">
            <strong>📄 Your Signed Payslip</strong>
            <p style="margin: 10px 0 0;">Your signed payslip is now available for download at any time from your employee portal. You can access it from the Payroll section.</p>
          </div>

          <center>
            <a href="${downloadLink}" class="button">Download Payslip →</a>
          </center>

          <p><strong>What's included in your signed payslip:</strong></p>
          <ul>
            <li>Complete salary breakdown with allowances</li>
            <li>Deductions including EPF and other contributions</li>
            <li>Your digital signature with timestamp</li>
            <li>All management signatures and approvals</li>
          </ul>

          <p style="margin-top: 30px;">If you have any questions about your payslip or need additional information, please contact the HR or Finance department.</p>
          
          <p>Best regards,<br><strong>Bloomtech ERP Payroll Team</strong></p>
        </div>
        <div class="footer">
          <p>This is an automated confirmation message.</p>
          <p>&copy; ${new Date().getFullYear()} Bloomtech ERP. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
    const text = `
✅ Payslip Signed Successfully!

Dear ${employeeName},

Thank you! Your payslip for ${monthName} ${year} has been successfully signed and is now complete.

SIGNED PAYSLIP SUMMARY
Period: ${monthName} ${year}
Gross Salary: ${grossSalary}
Net Salary: ${netSalary}
Payslip ID: #${payslipId}

Status: SIGNED & COMPLETED ✓

Your Signed Payslip:
Your signed payslip is now available for download at any time from your employee portal. You can access it from the Payroll section.

Download Payslip: ${downloadLink}

What's included in your signed payslip:
- Complete salary breakdown with allowances
- Deductions including EPF and other contributions
- Your digital signature with timestamp
- All management signatures and approvals

If you have any questions about your payslip or need additional information, please contact the HR or Finance department.

Best regards,
Bloomtech ERP Payroll Team

---
This is an automated confirmation message.
© ${new Date().getFullYear()} Bloomtech ERP. All rights reserved.
  `;
    return sendEmail(employeeEmail, `Payslip Signed Successfully - ${monthName} ${year} ✅`, html, text);
}
