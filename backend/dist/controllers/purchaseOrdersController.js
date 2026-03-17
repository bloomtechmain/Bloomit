"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePurchaseOrder = exports.downloadReceipt = exports.uploadReceipt = exports.rejectPurchaseOrder = exports.approvePurchaseOrder = exports.updatePurchaseOrder = exports.createPurchaseOrder = exports.getPurchaseOrderById = exports.getAllPurchaseOrders = exports.getNextPoNumber = void 0;
const emailService_1 = require("../utils/emailService");
// Generate next PO number
const getNextPoNumber = async (req, res) => {
    try {
        const year = new Date().getFullYear();
        const prefix = `PO-${year}-`;
        const result = await req.dbClient.query(`SELECT po_number FROM purchase_orders
       WHERE po_number LIKE $1
       ORDER BY po_number DESC
       LIMIT 1`, [`${prefix}%`]);
        let nextNumber = 1;
        if (result.rows.length > 0) {
            const lastPoNumber = result.rows[0].po_number;
            const lastNumber = parseInt(lastPoNumber.split('-')[2]);
            nextNumber = lastNumber + 1;
        }
        const poNumber = `${prefix}${String(nextNumber).padStart(4, '0')}`;
        return res.status(200).json({ po_number: poNumber });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'server_error';
        return res.status(500).json({ error: message });
    }
};
exports.getNextPoNumber = getNextPoNumber;
// Get all purchase orders with filters
const getAllPurchaseOrders = async (req, res) => {
    try {
        const { status, vendor_id, search, start_date, end_date } = req.query;
        let query = `
      SELECT po.*,
             v.vendor_name,
             c.contract_name as project_name,
             ru.name as requested_by_user_name,
             au.name as approved_by_user_name
      FROM purchase_orders po
      LEFT JOIN vendors v ON po.vendor_id = v.vendor_id
      LEFT JOIN contracts c ON po.project_id = c.contract_id
      LEFT JOIN users ru ON po.requested_by_user_id = ru.id
      LEFT JOIN users au ON po.approved_by_user_id = au.id
      WHERE 1=1
    `;
        const params = [];
        let paramIndex = 1;
        if (status) {
            query += ` AND po.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }
        if (vendor_id) {
            query += ` AND po.vendor_id = $${paramIndex}`;
            params.push(vendor_id);
            paramIndex++;
        }
        if (search) {
            query += ` AND (po.po_number ILIKE $${paramIndex} OR po.requested_by_name ILIKE $${paramIndex} OR v.vendor_name ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }
        if (start_date) {
            query += ` AND po.created_at >= $${paramIndex}`;
            params.push(start_date);
            paramIndex++;
        }
        if (end_date) {
            query += ` AND po.created_at <= $${paramIndex}`;
            params.push(end_date);
            paramIndex++;
        }
        query += ` ORDER BY po.created_at DESC`;
        const result = await req.dbClient.query(query, params);
        return res.status(200).json({ purchase_orders: result.rows });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'server_error';
        return res.status(500).json({ error: message });
    }
};
exports.getAllPurchaseOrders = getAllPurchaseOrders;
// Get single purchase order by ID with items
const getPurchaseOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        // Get purchase order
        const poResult = await req.dbClient.query(`SELECT po.*,
              v.vendor_name,
              c.contract_name as project_name,
              ru.name as requested_by_user_name,
              au.name as approved_by_user_name
       FROM purchase_orders po
       LEFT JOIN vendors v ON po.vendor_id = v.vendor_id
       LEFT JOIN contracts c ON po.project_id = c.contract_id
       LEFT JOIN users ru ON po.requested_by_user_id = ru.id
       LEFT JOIN users au ON po.approved_by_user_id = au.id
       WHERE po.id = $1`, [id]);
        if (poResult.rows.length === 0) {
            return res.status(404).json({ error: 'purchase_order_not_found' });
        }
        // Get items
        const itemsResult = await req.dbClient.query(`SELECT * FROM purchase_order_items
       WHERE purchase_order_id = $1
       ORDER BY line_order, id`, [id]);
        const purchaseOrder = {
            ...poResult.rows[0],
            items: itemsResult.rows
        };
        return res.status(200).json({ purchase_order: purchaseOrder });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'server_error';
        return res.status(500).json({ error: message });
    }
};
exports.getPurchaseOrderById = getPurchaseOrderById;
// Create purchase order
const createPurchaseOrder = async (req, res) => {
    const { po_number, requested_by_user_id, requested_by_name, requested_by_title, vendor_id, vendor_invoice_number, project_id, subtotal, sales_tax, shipping_handling, banking_fee, total_amount, payment_method, check_number, payment_amount, payment_date, notes, items } = req.body;
    // Validation
    if (!po_number || !requested_by_name || !total_amount || !items || items.length === 0) {
        return res.status(400).json({ error: 'missing_required_fields' });
    }
    const client = req.dbClient;
    try {
        await client.query('BEGIN');
        // Insert purchase order
        const poResult = await client.query(`INSERT INTO purchase_orders (
        po_number, requested_by_user_id, requested_by_name, requested_by_title,
        vendor_id, vendor_invoice_number, project_id,
        subtotal, sales_tax, shipping_handling, banking_fee, total_amount,
        payment_method, check_number, payment_amount, payment_date, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`, [
            po_number,
            requested_by_user_id || null,
            requested_by_name,
            requested_by_title || null,
            vendor_id || null,
            vendor_invoice_number || null,
            project_id || null,
            subtotal || 0,
            sales_tax || 0,
            shipping_handling || 0,
            banking_fee || 0,
            total_amount,
            payment_method || null,
            check_number || null,
            payment_amount || null,
            payment_date || null,
            notes || null
        ]);
        const purchaseOrderId = poResult.rows[0].id;
        // Insert items
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            await client.query(`INSERT INTO purchase_order_items (
          purchase_order_id, quantity, description, unit_price, total, line_order
        ) VALUES ($1, $2, $3, $4, $5, $6)`, [purchaseOrderId, item.quantity, item.description, item.unit_price, item.total, i]);
        }
        await client.query('COMMIT');
        // Fetch complete purchase order with items
        const completePoResult = await client.query(`SELECT po.*,
              v.vendor_name,
              c.contract_name as project_name
       FROM purchase_orders po
       LEFT JOIN vendors v ON po.vendor_id = v.vendor_id
       LEFT JOIN contracts c ON po.project_id = c.contract_id
       WHERE po.id = $1`, [purchaseOrderId]);
        const itemsResult = await client.query(`SELECT * FROM purchase_order_items WHERE purchase_order_id = $1 ORDER BY line_order`, [purchaseOrderId]);
        const purchaseOrder = {
            ...completePoResult.rows[0],
            items: itemsResult.rows
        };
        // Send email notifications (async, don't wait)
        setImmediate(async () => {
            try {
                // Get requestor email
                if (requested_by_user_id) {
                    const userResult = await client.query('SELECT email FROM users WHERE id = $1', [requested_by_user_id]);
                    if (userResult.rows.length > 0) {
                        const requestorEmail = userResult.rows[0].email;
                        // Send creation confirmation to requestor
                        await (0, emailService_1.sendPOCreatedEmail)({
                            poNumber: purchaseOrder.po_number,
                            requestedByName: purchaseOrder.requested_by_name,
                            requestedByEmail: requestorEmail,
                            vendorName: purchaseOrder.vendor_name,
                            projectName: purchaseOrder.project_name,
                            totalAmount: `LKR ${parseFloat(purchaseOrder.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                            status: 'PENDING'
                        });
                        // Get admin emails for approval notification
                        const adminResult = await client.query(`
              SELECT DISTINCT u.email
              FROM users u
              JOIN user_roles ur ON u.id = ur.user_id
              JOIN roles r ON ur.role_id = r.id
              WHERE r.role_name IN ('Super Admin', 'Admin')
              AND u.email IS NOT NULL
            `);
                        const adminEmails = adminResult.rows.map((row) => row.email);
                        if (adminEmails.length > 0) {
                            // Send approval request to admins
                            await (0, emailService_1.sendPOPendingApprovalEmail)(adminEmails, {
                                poNumber: purchaseOrder.po_number,
                                requestedByName: purchaseOrder.requested_by_name,
                                requestedByEmail: requestorEmail,
                                vendorName: purchaseOrder.vendor_name,
                                projectName: purchaseOrder.project_name,
                                totalAmount: `LKR ${parseFloat(purchaseOrder.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                                status: 'PENDING'
                            });
                        }
                    }
                }
            }
            catch (emailErr) {
                console.error('Error sending PO creation emails:', emailErr);
                // Don't fail the request if email fails
            }
        });
        return res.status(201).json({ purchase_order: purchaseOrder });
    }
    catch (err) {
        await client.query('ROLLBACK');
        const message = err instanceof Error ? err.message : 'server_error';
        return res.status(500).json({ error: message });
    }
};
exports.createPurchaseOrder = createPurchaseOrder;
// Update purchase order (only if PENDING)
const updatePurchaseOrder = async (req, res) => {
    const { id } = req.params;
    const { requested_by_name, requested_by_title, vendor_id, vendor_invoice_number, project_id, subtotal, sales_tax, shipping_handling, banking_fee, total_amount, payment_method, check_number, payment_amount, payment_date, notes, items } = req.body;
    const client = req.dbClient;
    try {
        await client.query('BEGIN');
        // Check if PO exists and is PENDING
        const checkResult = await client.query('SELECT status FROM purchase_orders WHERE id = $1', [id]);
        if (checkResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'purchase_order_not_found' });
        }
        if (checkResult.rows[0].status !== 'PENDING') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'cannot_edit_non_pending_po' });
        }
        // Update purchase order
        await client.query(`UPDATE purchase_orders SET
        requested_by_name = $1,
        requested_by_title = $2,
        vendor_id = $3,
        vendor_invoice_number = $4,
        project_id = $5,
        subtotal = $6,
        sales_tax = $7,
        shipping_handling = $8,
        banking_fee = $9,
        total_amount = $10,
        payment_method = $11,
        check_number = $12,
        payment_amount = $13,
        payment_date = $14,
        notes = $15
      WHERE id = $16`, [
            requested_by_name,
            requested_by_title || null,
            vendor_id || null,
            vendor_invoice_number || null,
            project_id || null,
            subtotal || 0,
            sales_tax || 0,
            shipping_handling || 0,
            banking_fee || 0,
            total_amount,
            payment_method || null,
            check_number || null,
            payment_amount || null,
            payment_date || null,
            notes || null,
            id
        ]);
        // Delete existing items and re-insert
        await client.query('DELETE FROM purchase_order_items WHERE purchase_order_id = $1', [id]);
        if (items && items.length > 0) {
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                await client.query(`INSERT INTO purchase_order_items (
            purchase_order_id, quantity, description, unit_price, total, line_order
          ) VALUES ($1, $2, $3, $4, $5, $6)`, [id, item.quantity, item.description, item.unit_price, item.total, i]);
            }
        }
        await client.query('COMMIT');
        // Fetch updated purchase order
        const updatedPoResult = await client.query(`SELECT po.*,
              v.vendor_name,
              c.contract_name as project_name
       FROM purchase_orders po
       LEFT JOIN vendors v ON po.vendor_id = v.vendor_id
       LEFT JOIN contracts c ON po.project_id = c.contract_id
       WHERE po.id = $1`, [id]);
        const itemsResult = await client.query(`SELECT * FROM purchase_order_items WHERE purchase_order_id = $1 ORDER BY line_order`, [id]);
        const purchaseOrder = {
            ...updatedPoResult.rows[0],
            items: itemsResult.rows
        };
        return res.status(200).json({ purchase_order: purchaseOrder });
    }
    catch (err) {
        await client.query('ROLLBACK');
        const message = err instanceof Error ? err.message : 'server_error';
        return res.status(500).json({ error: message });
    }
};
exports.updatePurchaseOrder = updatePurchaseOrder;
// Approve purchase order
const approvePurchaseOrder = async (req, res) => {
    const { id } = req.params;
    const { approved_by_user_id, approved_by_name, approved_by_title } = req.body;
    try {
        // Check if PO exists and is PENDING
        const checkResult = await req.dbClient.query('SELECT status FROM purchase_orders WHERE id = $1', [id]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'purchase_order_not_found' });
        }
        if (checkResult.rows[0].status !== 'PENDING') {
            return res.status(400).json({ error: 'purchase_order_not_pending' });
        }
        // Approve the PO
        const result = await req.dbClient.query(`UPDATE purchase_orders SET
        status = 'APPROVED',
        approved_by_user_id = $1,
        approved_by_name = $2,
        approved_by_title = $3,
        approved_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *`, [approved_by_user_id, approved_by_name, approved_by_title || null, id]);
        const approvedPO = result.rows[0];
        // Send approval email notification (async, don't wait)
        const dbClient = req.dbClient;
        setImmediate(async () => {
            try {
                // Get complete PO details with vendor and project names
                const poDetailsResult = await dbClient.query(`
          SELECT po.*,
                 v.vendor_name,
                 c.contract_name as project_name,
                 u.email as requestor_email
          FROM purchase_orders po
          LEFT JOIN vendors v ON po.vendor_id = v.vendor_id
          LEFT JOIN contracts c ON po.project_id = c.contract_id
          LEFT JOIN users u ON po.requested_by_user_id = u.id
          WHERE po.id = $1
        `, [id]);
                if (poDetailsResult.rows.length > 0 && poDetailsResult.rows[0].requestor_email) {
                    const po = poDetailsResult.rows[0];
                    await (0, emailService_1.sendPOApprovedEmail)({
                        poNumber: po.po_number,
                        requestedByName: po.requested_by_name,
                        requestedByEmail: po.requestor_email,
                        vendorName: po.vendor_name,
                        projectName: po.project_name,
                        totalAmount: `LKR ${parseFloat(po.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                        approvedByName: approved_by_name,
                        status: 'APPROVED'
                    });
                }
            }
            catch (emailErr) {
                console.error('Error sending PO approval email:', emailErr);
                // Don't fail the request if email fails
            }
        });
        return res.status(200).json({ purchase_order: approvedPO });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'server_error';
        return res.status(500).json({ error: message });
    }
};
exports.approvePurchaseOrder = approvePurchaseOrder;
// Reject purchase order
const rejectPurchaseOrder = async (req, res) => {
    const { id } = req.params;
    const { rejection_reason } = req.body;
    if (!rejection_reason) {
        return res.status(400).json({ error: 'rejection_reason_required' });
    }
    try {
        // Check if PO exists and is PENDING
        const checkResult = await req.dbClient.query('SELECT status FROM purchase_orders WHERE id = $1', [id]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'purchase_order_not_found' });
        }
        if (checkResult.rows[0].status !== 'PENDING') {
            return res.status(400).json({ error: 'purchase_order_not_pending' });
        }
        // Reject the PO
        const result = await req.dbClient.query(`UPDATE purchase_orders SET
        status = 'REJECTED',
        rejection_reason = $1
      WHERE id = $2
      RETURNING *`, [rejection_reason, id]);
        const rejectedPO = result.rows[0];
        // Send rejection email notification (async, don't wait)
        const dbClient = req.dbClient;
        setImmediate(async () => {
            try {
                // Get complete PO details with vendor and project names
                const poDetailsResult = await dbClient.query(`
          SELECT po.*,
                 v.vendor_name,
                 c.contract_name as project_name,
                 u.email as requestor_email
          FROM purchase_orders po
          LEFT JOIN vendors v ON po.vendor_id = v.vendor_id
          LEFT JOIN contracts c ON po.project_id = c.contract_id
          LEFT JOIN users u ON po.requested_by_user_id = u.id
          WHERE po.id = $1
        `, [id]);
                if (poDetailsResult.rows.length > 0 && poDetailsResult.rows[0].requestor_email) {
                    const po = poDetailsResult.rows[0];
                    await (0, emailService_1.sendPORejectedEmail)({
                        poNumber: po.po_number,
                        requestedByName: po.requested_by_name,
                        requestedByEmail: po.requestor_email,
                        vendorName: po.vendor_name,
                        projectName: po.project_name,
                        totalAmount: `LKR ${parseFloat(po.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                        rejectionReason: rejection_reason,
                        status: 'REJECTED'
                    });
                }
            }
            catch (emailErr) {
                console.error('Error sending PO rejection email:', emailErr);
                // Don't fail the request if email fails
            }
        });
        return res.status(200).json({ purchase_order: rejectedPO });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'server_error';
        return res.status(500).json({ error: message });
    }
};
exports.rejectPurchaseOrder = rejectPurchaseOrder;
// Upload receipt document (with file upload support)
const uploadReceipt = async (req, res) => {
    const { id } = req.params;
    try {
        // Check if PO exists and is APPROVED
        const checkResult = await req.dbClient.query('SELECT status, po_number FROM purchase_orders WHERE id = $1', [id]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'purchase_order_not_found' });
        }
        if (checkResult.rows[0].status !== 'APPROVED') {
            return res.status(400).json({ error: 'purchase_order_not_approved' });
        }
        const poNumber = checkResult.rows[0].po_number;
        // Handle file upload (if file is provided)
        if (req.file) {
            // Validate file type (PDF and images only)
            const allowedTypes = [
                'application/pdf',
                'image/jpeg',
                'image/jpg',
                'image/png',
                'image/gif'
            ];
            if (!allowedTypes.includes(req.file.mimetype)) {
                return res.status(400).json({
                    error: 'Invalid file type. Only PDF and image files are allowed.'
                });
            }
            // Store file in database (similar to documents system)
            const userId = req.user?.userId;
            const documentName = `Receipt - ${poNumber}`;
            // Insert receipt document into documents table
            const docResult = await req.dbClient.query(`INSERT INTO documents
          (document_name, original_filename, file_type, file_size, file_data, uploaded_by, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`, [
                documentName,
                req.file.originalname,
                req.file.mimetype,
                req.file.size,
                req.file.buffer,
                userId || null,
                `Receipt for Purchase Order ${poNumber}`
            ]);
            const documentId = docResult.rows[0].id;
            // Update PO with receipt document reference and mark as PAID
            const result = await req.dbClient.query(`UPDATE purchase_orders SET
          receipt_document_id = $1,
          receipt_document_url = $2,
          receipt_uploaded_at = CURRENT_TIMESTAMP,
          status = 'PAID'
        WHERE id = $3
        RETURNING *`, [documentId, `/documents/${documentId}/download`, id]);
            return res.status(200).json({
                purchase_order: result.rows[0],
                document_id: documentId
            });
        }
        // Handle URL input (legacy support)
        else if (req.body.receipt_document_url) {
            const { receipt_document_url } = req.body;
            const result = await req.dbClient.query(`UPDATE purchase_orders SET
          receipt_document_url = $1,
          receipt_uploaded_at = CURRENT_TIMESTAMP,
          status = 'PAID'
        WHERE id = $2
        RETURNING *`, [receipt_document_url, id]);
            return res.status(200).json({ purchase_order: result.rows[0] });
        }
        else {
            return res.status(400).json({ error: 'receipt_file_or_url_required' });
        }
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'server_error';
        return res.status(500).json({ error: message });
    }
};
exports.uploadReceipt = uploadReceipt;
// Download receipt document
const downloadReceipt = async (req, res) => {
    const { id } = req.params;
    try {
        const poResult = await req.dbClient.query('SELECT receipt_document_id, po_number FROM purchase_orders WHERE id = $1', [id]);
        if (poResult.rows.length === 0) {
            return res.status(404).json({ error: 'purchase_order_not_found' });
        }
        const { receipt_document_id, po_number } = poResult.rows[0];
        if (!receipt_document_id) {
            return res.status(404).json({ error: 'receipt_not_found' });
        }
        // Fetch the receipt document
        const docResult = await req.dbClient.query('SELECT original_filename, file_type, file_data FROM documents WHERE id = $1', [receipt_document_id]);
        if (docResult.rows.length === 0) {
            return res.status(404).json({ error: 'receipt_document_not_found' });
        }
        const document = docResult.rows[0];
        // Set headers for file download
        res.setHeader('Content-Type', document.file_type);
        res.setHeader('Content-Disposition', `attachment; filename="Receipt-${po_number}-${document.original_filename}"`);
        // Send the binary data
        return res.send(document.file_data);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'server_error';
        return res.status(500).json({ error: message });
    }
};
exports.downloadReceipt = downloadReceipt;
// Delete purchase order (Admin/Super Admin only)
const deletePurchaseOrder = async (req, res) => {
    const { id } = req.params;
    try {
        // Check if PO exists
        const checkResult = await req.dbClient.query('SELECT po_number, status FROM purchase_orders WHERE id = $1', [id]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'purchase_order_not_found' });
        }
        const { po_number, status } = checkResult.rows[0];
        // Delete the purchase order (items will cascade delete automatically)
        await req.dbClient.query('DELETE FROM purchase_orders WHERE id = $1', [id]);
        return res.status(200).json({
            message: 'purchase_order_deleted',
            po_number,
            status
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'server_error';
        return res.status(500).json({ error: message });
    }
};
exports.deletePurchaseOrder = deletePurchaseOrder;
