import * as path from 'path'
import * as fs from 'fs'

/**
 * File Validation Utilities for Employee Document Uploads
 * Phase 17 Implementation
 * 
 * Validates file type, size, and security
 * Allowed types: PDF and JPEG only
 * Max size: 10MB
 */

// Allowed MIME types
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg'
]

// Allowed file extensions
export const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg']

// Max file size: 10MB in bytes
export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10485760 bytes

// File type magic numbers (file signatures) for validation
const FILE_SIGNATURES: { [key: string]: number[][] } = {
  pdf: [
    [0x25, 0x50, 0x44, 0x46] // %PDF
  ],
  jpeg: [
    [0xFF, 0xD8, 0xFF, 0xE0], // JPEG/JFIF
    [0xFF, 0xD8, 0xFF, 0xE1], // JPEG/Exif
    [0xFF, 0xD8, 0xFF, 0xE2], // JPEG
    [0xFF, 0xD8, 0xFF, 0xE3], // JPEG
    [0xFF, 0xD8, 0xFF, 0xDB]  // JPEG raw
  ]
}

/**
 * Validate file extension
 */
export function validateFileExtension(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase()
  return ALLOWED_EXTENSIONS.includes(ext)
}

/**
 * Validate MIME type
 */
export function validateMimeType(mimetype: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimetype.toLowerCase())
}

/**
 * Validate file size
 */
export function validateFileSize(size: number): boolean {
  return size > 0 && size <= MAX_FILE_SIZE
}

/**
 * Check file signature (magic numbers) to verify actual file type
 * This prevents file extension spoofing
 */
export async function validateFileSignature(filePath: string): Promise<{
  valid: boolean
  detectedType: string | null
  error?: string
}> {
  try {
    // Read first 8 bytes of file
    const buffer = Buffer.alloc(8)
    const fd = fs.openSync(filePath, 'r')
    fs.readSync(fd, buffer, 0, 8, 0)
    fs.closeSync(fd)

    // Check PDF signature
    const pdfSig = FILE_SIGNATURES.pdf[0]
    if (buffer[0] === pdfSig[0] && buffer[1] === pdfSig[1] && 
        buffer[2] === pdfSig[2] && buffer[3] === pdfSig[3]) {
      return { valid: true, detectedType: 'pdf' }
    }

    // Check JPEG signatures
    for (const sig of FILE_SIGNATURES.jpeg) {
      if (buffer[0] === sig[0] && buffer[1] === sig[1] && 
          buffer[2] === sig[2] && buffer[3] === sig[3]) {
        return { valid: true, detectedType: 'jpeg' }
      }
    }

    return { 
      valid: false, 
      detectedType: null,
      error: 'File signature does not match PDF or JPEG format'
    }
  } catch (error) {
    return { 
      valid: false, 
      detectedType: null,
      error: error instanceof Error ? error.message : 'Failed to read file signature'
    }
  }
}

/**
 * Comprehensive file validation
 */
export async function validateUploadedFile(
  file: Express.Multer.File
): Promise<{
  valid: boolean
  errors: string[]
}> {
  const errors: string[] = []

  // Validate extension
  if (!validateFileExtension(file.originalname)) {
    errors.push('Invalid file type. Only PDF and JPEG files are allowed.')
  }

  // Validate MIME type
  if (!validateMimeType(file.mimetype)) {
    errors.push('Invalid MIME type. Only application/pdf and image/jpeg are allowed.')
  }

  // Validate file size
  if (!validateFileSize(file.size)) {
    if (file.size === 0) {
      errors.push('File is empty.')
    } else {
      errors.push(`File size exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB.`)
    }
  }

  // Validate file signature
  if (file.path) {
    const signatureCheck = await validateFileSignature(file.path)
    if (!signatureCheck.valid) {
      errors.push(signatureCheck.error || 'File content does not match expected format.')
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Sanitize filename to prevent directory traversal and other attacks
 */
export function sanitizeFilename(filename: string): string {
  // Remove path separators and null bytes
  let sanitized = filename.replace(/[\/\\:\*\?"<>\|]/g, '_')
  
  // Remove any path traversal attempts
  sanitized = sanitized.replace(/\.\./g, '')
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '')
  
  // Limit length
  if (sanitized.length > 255) {
    const ext = path.extname(sanitized)
    const nameWithoutExt = path.basename(sanitized, ext)
    sanitized = nameWithoutExt.substring(0, 255 - ext.length) + ext
  }
  
  return sanitized
}

/**
 * Generate unique filename with timestamp and random string
 */
export function generateUniqueFilename(originalname: string): string {
  const ext = path.extname(originalname).toLowerCase()
  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 10)
  return `${timestamp}_${randomString}${ext}`
}

/**
 * Get file type category from MIME type
 */
export function getFileTypeFromMime(mimetype: string): 'pdf' | 'jpeg' | null {
  if (mimetype === 'application/pdf') return 'pdf'
  if (mimetype === 'image/jpeg' || mimetype === 'image/jpg') return 'jpeg'
  return null
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Ensure upload directory exists
 */
export function ensureUploadDirectory(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

/**
 * Delete file safely
 */
export function deleteFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  } catch (error) {
    console.error('Error deleting file:', error)
  }
}
