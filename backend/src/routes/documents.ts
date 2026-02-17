import { Router } from 'express'
import multer from 'multer'
import { requireAuth } from '../middleware/auth'
import { requireRole } from '../middleware/authorize'
import { 
  getAllDocuments, 
  downloadDocument, 
  uploadDocument, 
  deleteDocument 
} from '../controllers/documentsController'

const router = Router()

// Configure multer to use memory storage (files stored in buffer)
const storage = multer.memoryStorage()
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
})

// All routes require authentication
router.use(requireAuth)

// Get all documents (accessible to all authenticated users)
router.get('/', getAllDocuments)

// Download document (accessible to all authenticated users)
router.get('/:id/download', downloadDocument)

// Upload document (admin and super admin only)
router.post('/upload', requireRole('Admin', 'Super Admin'), upload.single('file'), uploadDocument)

// Delete document (admin and super admin only)
router.delete('/:id', requireRole('Admin', 'Super Admin'), deleteDocument)

export default router
