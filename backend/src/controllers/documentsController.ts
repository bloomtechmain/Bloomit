import { Request, Response } from 'express'
import { pool } from '../db'

// Get all documents (metadata only, not the file data)
export async function getAllDocuments(req: Request, res: Response) {
  const { tenantId } = req.user!;
  try {
    const result = await pool.query(`
      SELECT 
        d.id,
        d.document_name,
        d.original_filename,
        d.file_type,
        d.file_size,
        d.uploaded_by,
        d.upload_date,
        d.description,
        u.name as uploaded_by_name
      FROM documents d
      LEFT JOIN users u ON d.uploaded_by = u.id
      WHERE d.tenant_id = $1
      ORDER BY d.upload_date DESC
    `, [tenantId])
    
    return res.json({ documents: result.rows })
  } catch (error) {
    console.error('Error fetching documents:', error)
    return res.status(500).json({ error: 'Failed to fetch documents' })
  }
}

// Get single document for download
export async function downloadDocument(req: Request, res: Response) {
  const { tenantId } = req.user!;
  try {
    const { id } = req.params
    
    const result = await pool.query(
      'SELECT original_filename, file_type, file_data FROM documents WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' })
    }
    
    const document = result.rows[0]
    
    // Set headers for file download
    res.setHeader('Content-Type', document.file_type)
    res.setHeader('Content-Disposition', `attachment; filename="${document.original_filename}"`)
    
    // Send the binary data
    return res.send(document.file_data)
  } catch (error) {
    console.error('Error downloading document:', error)
    return res.status(500).json({ error: 'Failed to download document' })
  }
}

// Upload document (requires file in req.file from multer)
export async function uploadDocument(req: Request, res: Response) {
  const { tenantId } = req.user!;
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }
    
    const { document_name, description } = req.body
    const userId = req.user?.userId
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' })
    }
    
    if (!document_name) {
      return res.status(400).json({ error: 'Document name is required' })
    }
    
    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel' // .xls
    ]
    
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ 
        error: 'Invalid file type. Only PDF, Word, and Excel files are allowed.' 
      })
    }
    
    // Insert document into database
    const result = await pool.query(
      `INSERT INTO documents 
        (document_name, original_filename, file_type, file_size, file_data, uploaded_by, description, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, document_name, original_filename, file_type, file_size, upload_date`,
      [
        document_name,
        req.file.originalname,
        req.file.mimetype,
        req.file.size,
        req.file.buffer,
        userId,
        description || null,
        tenantId
      ]
    )
    
    return res.status(201).json({ 
      message: 'Document uploaded successfully',
      document: result.rows[0]
    })
  } catch (error) {
    console.error('Error uploading document:', error)
    return res.status(500).json({ error: 'Failed to upload document' })
  }
}

// Delete document
export async function deleteDocument(req: Request, res: Response) {
  const { tenantId } = req.user!;
  try {
    const { id } = req.params
    
    const result = await pool.query(
      'DELETE FROM documents WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [id, tenantId]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' })
    }
    
    return res.json({ message: 'Document deleted successfully' })
  } catch (error) {
    console.error('Error deleting document:', error)
    return res.status(500).json({ error: 'Failed to delete document' })
  }
}
