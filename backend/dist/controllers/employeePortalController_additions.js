"use strict";
/**
 * Additional Employee Portal Controller Functions
 * Phase 17 & 18 Implementation
 *
 * These functions should be added to employeePortalController.ts:
 * - uploadDocument (Phase 17)
 * - getNotifications (Phase 18)
 * - markNotificationRead (Phase 18)
 * - markAllNotificationsRead (Phase 18)
 * - archiveNotification (Phase 18)
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadDocument = uploadDocument;
exports.getPersonalDocuments = getPersonalDocuments;
exports.downloadPersonalDocument = downloadPersonalDocument;
exports.getNotifications = getNotifications;
exports.markNotificationRead = markNotificationRead;
exports.markAllNotificationsRead = markAllNotificationsRead;
exports.archiveNotification = archiveNotification;
exports.getUnreadNotificationCount = getUnreadNotificationCount;
const db_1 = require("../db");
const path = __importStar(require("path"));
const employeeAuditLog_1 = require("../utils/employeeAuditLog");
const fileValidation_1 = require("../utils/fileValidation");
const notificationService_1 = require("../utils/notificationService");
const notificationService_2 = require("../utils/notificationService");
/**
 * POST /api/employee-portal/documents/:employeeId/upload
 *
 * Upload employee personal document
 * Phase 17 implementation
 *
 * Allowed file types: PDF and JPEG only
 * Max file size: 10MB
 * Validates file signature to prevent spoofing
 */
async function uploadDocument(req, res) {
    const employeeId = parseInt(req.params.employeeId);
    // Check if file was uploaded
    if (!req.file) {
        return res.status(400).json({
            error: 'no_file_uploaded',
            message: 'No file was uploaded'
        });
    }
    const file = req.file;
    const { documentType, description } = req.body;
    // Validate document type
    const validTypes = ['resume', 'certificate', 'tax_form', 'training', 'personal', 'other'];
    if (!documentType || !validTypes.includes(documentType)) {
        // Clean up uploaded file
        (0, fileValidation_1.deleteFile)(file.path);
        return res.status(400).json({
            error: 'invalid_document_type',
            message: `Document type must be one of: ${validTypes.join(', ')}`
        });
    }
    try {
        // Comprehensive file validation
        const validation = await (0, fileValidation_1.validateUploadedFile)(file);
        if (!validation.valid) {
            // Clean up uploaded file
            (0, fileValidation_1.deleteFile)(file.path);
            return res.status(400).json({
                error: 'file_validation_failed',
                message: 'File validation failed',
                errors: validation.errors
            });
        }
        // Generate unique filename
        const uniqueFilename = (0, fileValidation_1.generateUniqueFilename)(file.originalname);
        const sanitizedOriginalName = (0, fileValidation_1.sanitizeFilename)(file.originalname);
        // Construct storage path
        const uploadDir = path.join(process.cwd(), 'uploads', 'employee_documents', employeeId.toString(), new Date().getFullYear().toString(), (new Date().getMonth() + 1).toString().padStart(2, '0'));
        // Ensure directory exists
        (0, fileValidation_1.ensureUploadDirectory)(uploadDir);
        // Move file to permanent location
        const fs = await Promise.resolve().then(() => __importStar(require('fs')));
        const finalPath = path.join(uploadDir, uniqueFilename);
        fs.renameSync(file.path, finalPath);
        // Save metadata to database
        const insertQuery = `
      INSERT INTO employee_documents (
        employee_id,
        document_type,
        document_category,
        file_name,
        original_name,
        file_path,
        file_size,
        mime_type,
        description,
        uploaded_by,
        uploaded_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      RETURNING *
    `;
        const values = [
            employeeId,
            documentType,
            'personal', // category
            uniqueFilename,
            sanitizedOriginalName,
            finalPath,
            file.size,
            file.mimetype,
            description || null,
            employeeId // uploaded_by
        ];
        const result = await db_1.pool.query(insertQuery, values);
        const document = result.rows[0];
        // Log the upload
        await (0, employeeAuditLog_1.logEmployeeActionFromRequest)(employeeId, employeeAuditLog_1.EmployeeAuditActions.DOCUMENT_UPLOADED, req, {
            resourceType: 'employee_document',
            resourceId: document.document_id,
            newValue: {
                fileName: sanitizedOriginalName,
                fileSize: file.size,
                documentType: documentType
            }
        });
        // Create notification
        await (0, notificationService_1.notifyDocumentUploaded)(employeeId, sanitizedOriginalName);
        return res.status(201).json({
            success: true,
            message: 'Document uploaded successfully',
            document: {
                documentId: document.document_id,
                fileName: document.original_name,
                fileSize: document.file_size,
                documentType: document.document_type,
                description: document.description,
                uploadedAt: document.uploaded_at
            }
        });
    }
    catch (error) {
        console.error('Error uploading document:', error);
        // Clean up file on error
        if (req.file) {
            (0, fileValidation_1.deleteFile)(req.file.path);
        }
        // Log the error
        await (0, employeeAuditLog_1.logEmployeeActionFromRequest)(employeeId, employeeAuditLog_1.EmployeeAuditActions.DOCUMENT_UPLOADED, req, {
            resourceType: 'employee_document',
            status: 'failure',
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
        });
        return res.status(500).json({
            error: 'server_error',
            message: 'Failed to upload document'
        });
    }
}
/**
 * GET /api/employee-portal/documents/:employeeId/personal
 *
 * Get employee's personal uploaded documents
 * Phase 17 implementation
 */
async function getPersonalDocuments(req, res) {
    const employeeId = parseInt(req.params.employeeId);
    try {
        const query = `
      SELECT 
        document_id,
        document_type,
        original_name as file_name,
        file_size,
        mime_type,
        description,
        uploaded_at
      FROM employee_documents
      WHERE employee_id = $1
      ORDER BY uploaded_at DESC
    `;
        const result = await db_1.pool.query(query, [employeeId]);
        return res.status(200).json({
            documents: result.rows,
            total: result.rows.length
        });
    }
    catch (error) {
        console.error('Error fetching personal documents:', error);
        return res.status(500).json({
            error: 'server_error',
            message: 'Failed to fetch personal documents'
        });
    }
}
/**
 * GET /api/employee-portal/documents/:employeeId/personal/:documentId/download
 *
 * Download employee's personal document
 * Phase 17 implementation
 */
async function downloadPersonalDocument(req, res) {
    const employeeId = parseInt(req.params.employeeId);
    const documentId = parseInt(req.params.documentId);
    try {
        // Verify document belongs to employee
        const query = `
      SELECT 
        document_id,
        original_name,
        file_path,
        file_size,
        mime_type
      FROM employee_documents
      WHERE document_id = $1 AND employee_id = $2
    `;
        const result = await db_1.pool.query(query, [documentId, employeeId]);
        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'document_not_found',
                message: 'Document not found or does not belong to this employee'
            });
        }
        const document = result.rows[0];
        const fs = await Promise.resolve().then(() => __importStar(require('fs')));
        // Check if file exists
        if (!fs.existsSync(document.file_path)) {
            return res.status(404).json({
                error: 'file_not_found',
                message: 'Document file not found on server'
            });
        }
        // Set headers and stream file
        res.setHeader('Content-Type', document.mime_type || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${document.original_name}"`);
        res.setHeader('Content-Length', document.file_size || 0);
        const fileStream = fs.createReadStream(document.file_path);
        fileStream.pipe(res);
    }
    catch (error) {
        console.error('Error downloading personal document:', error);
        return res.status(500).json({
            error: 'server_error',
            message: 'Failed to download document'
        });
    }
}
/**
 * GET /api/employee-portal/notifications/:employeeId
 *
 * Get notifications for an employee
 * Phase 18 implementation
 *
 * Query params:
 * - unreadOnly: boolean (default: false)
 * - limit: number (default: 50)
 * - offset: number (default: 0)
 */
async function getNotifications(req, res) {
    const employeeId = parseInt(req.params.employeeId);
    const unreadOnly = req.query.unreadOnly === 'true';
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset) : 0;
    try {
        const result = await (0, notificationService_2.getNotifications)(employeeId, {
            unreadOnly,
            limit,
            offset
        });
        return res.status(200).json(result);
    }
    catch (error) {
        console.error('Error fetching notifications:', error);
        return res.status(500).json({
            error: 'server_error',
            message: 'Failed to fetch notifications'
        });
    }
}
/**
 * PUT /api/employee-portal/notifications/:employeeId/:notificationId/read
 *
 * Mark a notification as read
 * Phase 18 implementation
 */
async function markNotificationRead(req, res) {
    const employeeId = parseInt(req.params.employeeId);
    const notificationId = parseInt(req.params.notificationId);
    try {
        const success = await (0, notificationService_2.markNotificationAsRead)(notificationId, employeeId);
        if (!success) {
            return res.status(404).json({
                error: 'notification_not_found',
                message: 'Notification not found'
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Notification marked as read'
        });
    }
    catch (error) {
        console.error('Error marking notification as read:', error);
        return res.status(500).json({
            error: 'server_error',
            message: 'Failed to mark notification as read'
        });
    }
}
/**
 * PUT /api/employee-portal/notifications/:employeeId/read-all
 *
 * Mark all notifications as read for an employee
 * Phase 18 implementation
 */
async function markAllNotificationsRead(req, res) {
    const employeeId = parseInt(req.params.employeeId);
    try {
        const count = await (0, notificationService_2.markAllNotificationsAsRead)(employeeId);
        return res.status(200).json({
            success: true,
            message: `${count} notification(s) marked as read`,
            count: count
        });
    }
    catch (error) {
        console.error('Error marking all notifications as read:', error);
        return res.status(500).json({
            error: 'server_error',
            message: 'Failed to mark notifications as read'
        });
    }
}
/**
 * DELETE /api/employee-portal/notifications/:employeeId/:notificationId
 *
 * Archive (soft delete) a notification
 * Phase 18 implementation
 */
async function archiveNotification(req, res) {
    const employeeId = parseInt(req.params.employeeId);
    const notificationId = parseInt(req.params.notificationId);
    try {
        const success = await (0, notificationService_2.archiveNotification)(notificationId, employeeId);
        if (!success) {
            return res.status(404).json({
                error: 'notification_not_found',
                message: 'Notification not found'
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Notification archived'
        });
    }
    catch (error) {
        console.error('Error archiving notification:', error);
        return res.status(500).json({
            error: 'server_error',
            message: 'Failed to archive notification'
        });
    }
}
/**
 * GET /api/employee-portal/notifications/:employeeId/unread-count
 *
 * Get count of unread notifications
 * Phase 18 implementation
 */
async function getUnreadNotificationCount(req, res) {
    const employeeId = parseInt(req.params.employeeId);
    try {
        const count = await (0, notificationService_2.getUnreadCount)(employeeId);
        return res.status(200).json({
            employeeId: employeeId,
            unreadCount: count
        });
    }
    catch (error) {
        console.error('Error fetching unread count:', error);
        return res.status(500).json({
            error: 'server_error',
            message: 'Failed to fetch unread count'
        });
    }
}
