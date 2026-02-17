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

import { Request, Response } from 'express'
import { pool } from '../db'
import * as path from 'path'
import { logEmployeeActionFromRequest, EmployeeAuditActions } from '../utils/employeeAuditLog'
import { 
  validateUploadedFile, 
  ensureUploadDirectory, 
  generateUniqueFilename,
  sanitizeFilename,
  deleteFile
} from '../utils/fileValidation'
import { notifyDocumentUploaded } from '../utils/notificationService'
import { 
  getNotifications as getNotificationsService,
  markNotificationAsRead,
  markAllNotificationsAsRead as markAllAsRead,
  archiveNotification as archiveNotificationService,
  getUnreadCount
} from '../utils/notificationService'

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
export async function uploadDocument(req: Request, res: Response) {
  const employeeId = parseInt(req.params.employeeId)
  
  // Check if file was uploaded
  if (!req.file) {
    return res.status(400).json({
      error: 'no_file_uploaded',
      message: 'No file was uploaded'
    })
  }

  const file = req.file as Express.Multer.File
  const { documentType, description } = req.body

  // Validate document type
  const validTypes = ['resume', 'certificate', 'tax_form', 'training', 'personal', 'other']
  if (!documentType || !validTypes.includes(documentType)) {
    // Clean up uploaded file
    deleteFile(file.path)
    return res.status(400).json({
      error: 'invalid_document_type',
      message: `Document type must be one of: ${validTypes.join(', ')}`
    })
  }

  try {
    // Comprehensive file validation
    const validation = await validateUploadedFile(file)
    
    if (!validation.valid) {
      // Clean up uploaded file
      deleteFile(file.path)
      return res.status(400).json({
        error: 'file_validation_failed',
        message: 'File validation failed',
        errors: validation.errors
      })
    }

    // Generate unique filename
    const uniqueFilename = generateUniqueFilename(file.originalname)
    const sanitizedOriginalName = sanitizeFilename(file.originalname)

    // Construct storage path
    const uploadDir = path.join(
      process.cwd(),
      'uploads',
      'employee_documents',
      employeeId.toString(),
      new Date().getFullYear().toString(),
      (new Date().getMonth() + 1).toString().padStart(2, '0')
    )

    // Ensure directory exists
    ensureUploadDirectory(uploadDir)

    // Move file to permanent location
    const fs = await import('fs')
    const finalPath = path.join(uploadDir, uniqueFilename)
    fs.renameSync(file.path, finalPath)

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
    `

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
    ]

    const result = await pool.query(insertQuery, values)
    const document = result.rows[0]

    // Log the upload
    await logEmployeeActionFromRequest(
      employeeId,
      EmployeeAuditActions.DOCUMENT_UPLOADED,
      req,
      {
        resourceType: 'employee_document',
        resourceId: document.document_id,
        newValue: {
          fileName: sanitizedOriginalName,
          fileSize: file.size,
          documentType: documentType
        }
      }
    )

    // Create notification
    await notifyDocumentUploaded(employeeId, sanitizedOriginalName)

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
    })

  } catch (error) {
    console.error('Error uploading document:', error)
    
    // Clean up file on error
    if (req.file) {
      deleteFile(req.file.path)
    }
    
    // Log the error
    await logEmployeeActionFromRequest(
      employeeId,
      EmployeeAuditActions.DOCUMENT_UPLOADED,
      req,
      {
        resourceType: 'employee_document',
        status: 'failure',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }
    )

    return res.status(500).json({ 
      error: 'server_error', 
      message: 'Failed to upload document' 
    })
  }
}

/**
 * GET /api/employee-portal/documents/:employeeId/personal
 * 
 * Get employee's personal uploaded documents
 * Phase 17 implementation
 */
export async function getPersonalDocuments(req: Request, res: Response) {
  const employeeId = parseInt(req.params.employeeId)
  
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
    `
    
    const result = await pool.query(query, [employeeId])
    
    return res.status(200).json({
      documents: result.rows,
      total: result.rows.length
    })
    
  } catch (error) {
    console.error('Error fetching personal documents:', error)
    return res.status(500).json({ 
      error: 'server_error', 
      message: 'Failed to fetch personal documents' 
    })
  }
}

/**
 * GET /api/employee-portal/documents/:employeeId/personal/:documentId/download
 * 
 * Download employee's personal document
 * Phase 17 implementation
 */
export async function downloadPersonalDocument(req: Request, res: Response) {
  const employeeId = parseInt(req.params.employeeId)
  const documentId = parseInt(req.params.documentId)
  
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
    `
    
    const result = await pool.query(query, [documentId, employeeId])
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'document_not_found',
        message: 'Document not found or does not belong to this employee'
      })
    }
    
    const document = result.rows[0]
    const fs = await import('fs')
    
    // Check if file exists
    if (!fs.existsSync(document.file_path)) {
      return res.status(404).json({
        error: 'file_not_found',
        message: 'Document file not found on server'
      })
    }
    
    // Set headers and stream file
    res.setHeader('Content-Type', document.mime_type || 'application/octet-stream')
    res.setHeader('Content-Disposition', `attachment; filename="${document.original_name}"`)
    res.setHeader('Content-Length', document.file_size || 0)
    
    const fileStream = fs.createReadStream(document.file_path)
    fileStream.pipe(res)
    
  } catch (error) {
    console.error('Error downloading personal document:', error)
    return res.status(500).json({ 
      error: 'server_error', 
      message: 'Failed to download document' 
    })
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
export async function getNotifications(req: Request, res: Response) {
  const employeeId = parseInt(req.params.employeeId)
  const unreadOnly = req.query.unreadOnly === 'true'
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 50
  const offset = req.query.offset ? parseInt(req.query.offset as string) : 0

  try {
    const result = await getNotificationsService(employeeId, {
      unreadOnly,
      limit,
      offset
    })

    return res.status(200).json(result)

  } catch (error) {
    console.error('Error fetching notifications:', error)
    return res.status(500).json({ 
      error: 'server_error', 
      message: 'Failed to fetch notifications' 
    })
  }
}

/**
 * PUT /api/employee-portal/notifications/:employeeId/:notificationId/read
 * 
 * Mark a notification as read
 * Phase 18 implementation
 */
export async function markNotificationRead(req: Request, res: Response) {
  const employeeId = parseInt(req.params.employeeId)
  const notificationId = parseInt(req.params.notificationId)

  try {
    const success = await markNotificationAsRead(notificationId, employeeId)

    if (!success) {
      return res.status(404).json({
        error: 'notification_not_found',
        message: 'Notification not found'
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read'
    })

  } catch (error) {
    console.error('Error marking notification as read:', error)
    return res.status(500).json({ 
      error: 'server_error', 
      message: 'Failed to mark notification as read' 
    })
  }
}

/**
 * PUT /api/employee-portal/notifications/:employeeId/read-all
 * 
 * Mark all notifications as read for an employee
 * Phase 18 implementation
 */
export async function markAllNotificationsRead(req: Request, res: Response) {
  const employeeId = parseInt(req.params.employeeId)

  try {
    const count = await markAllAsRead(employeeId)

    return res.status(200).json({
      success: true,
      message: `${count} notification(s) marked as read`,
      count: count
    })

  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    return res.status(500).json({ 
      error: 'server_error', 
      message: 'Failed to mark notifications as read' 
    })
  }
}

/**
 * DELETE /api/employee-portal/notifications/:employeeId/:notificationId
 * 
 * Archive (soft delete) a notification
 * Phase 18 implementation
 */
export async function archiveNotification(req: Request, res: Response) {
  const employeeId = parseInt(req.params.employeeId)
  const notificationId = parseInt(req.params.notificationId)

  try {
    const success = await archiveNotificationService(notificationId, employeeId)

    if (!success) {
      return res.status(404).json({
        error: 'notification_not_found',
        message: 'Notification not found'
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Notification archived'
    })

  } catch (error) {
    console.error('Error archiving notification:', error)
    return res.status(500).json({ 
      error: 'server_error', 
      message: 'Failed to archive notification' 
    })
  }
}

/**
 * GET /api/employee-portal/notifications/:employeeId/unread-count
 * 
 * Get count of unread notifications
 * Phase 18 implementation
 */
export async function getUnreadNotificationCount(req: Request, res: Response) {
  const employeeId = parseInt(req.params.employeeId)

  try {
    const count = await getUnreadCount(employeeId)

    return res.status(200).json({
      employeeId: employeeId,
      unreadCount: count
    })

  } catch (error) {
    console.error('Error fetching unread count:', error)
    return res.status(500).json({ 
      error: 'server_error', 
      message: 'Failed to fetch unread count' 
    })
  }
}
