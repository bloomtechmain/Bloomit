import { Request, Response } from 'express'

// Get all notes for a user (including shared notes)
export const getNotes = async (req: Request, res: Response) => {
  try {
    const userId = req.query.user_id as string

    if (!userId) {
      return res.status(400).json({ error: 'user_id is required' })
    }

    const result = await req.dbClient!.query(
      `
      SELECT DISTINCT n.*, u.name as owner_name,
        CASE
          WHEN n.user_id = $1 THEN 'owner'
          ELSE ns.permission
        END as access_level
      FROM notes n
      LEFT JOIN note_shares ns ON n.id = ns.note_id
      LEFT JOIN users u ON n.user_id = u.id
      WHERE n.user_id = $1 OR ns.shared_with_user_id = $1
      ORDER BY n.is_pinned DESC, n.updated_at DESC
      `,
      [userId]
    )

    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching notes:', error)
    res.status(500).json({ error: 'Failed to fetch notes' })
  }
}

// Create a new note
export const createNote = async (req: Request, res: Response) => {
  try {
    const { user_id, title, content, color, is_pinned } = req.body

    if (!user_id || !title) {
      return res.status(400).json({ error: 'user_id and title are required' })
    }

    const result = await req.dbClient!.query(
      `
      INSERT INTO notes (user_id, title, content, color, is_pinned)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [user_id, title, content || '', color || '#ffffff', is_pinned || false]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Error creating note:', error)
    res.status(500).json({ error: 'Failed to create note' })
  }
}

// Update a note
export const updateNote = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { user_id, title, content, color, is_pinned } = req.body

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' })
    }

    // Check if user has write permission
    const permCheck = await req.dbClient!.query(
      `
      SELECT n.user_id, ns.permission
      FROM notes n
      LEFT JOIN note_shares ns ON n.id = ns.note_id AND ns.shared_with_user_id = $1
      WHERE n.id = $2
      `,
      [user_id, id]
    )

    if (permCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' })
    }

    const isOwner = permCheck.rows[0].user_id == user_id
    const hasWriteAccess = permCheck.rows[0].permission === 'write'

    if (!isOwner && !hasWriteAccess) {
      return res.status(403).json({ error: 'No permission to edit this note' })
    }

    const result = await req.dbClient!.query(
      `
      UPDATE notes
      SET title = $1, content = $2, color = $3, is_pinned = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
      `,
      [title, content, color, is_pinned, id]
    )

    res.json(result.rows[0])
  } catch (error) {
    console.error('Error updating note:', error)
    res.status(500).json({ error: 'Failed to update note' })
  }
}

// Delete a note
export const deleteNote = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.query.user_id as string

    if (!userId) {
      return res.status(400).json({ error: 'user_id is required' })
    }

    const result = await req.dbClient!.query(
      `
      DELETE FROM notes
      WHERE id = $1 AND user_id = $2
      RETURNING id
      `,
      [id, userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found or no permission' })
    }

    res.json({ message: 'Note deleted successfully' })
  } catch (error) {
    console.error('Error deleting note:', error)
    res.status(500).json({ error: 'Failed to delete note' })
  }
}

// Share a note with another user
export const shareNote = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { user_id, shared_with_user_id, permission } = req.body

    if (!user_id || !shared_with_user_id) {
      return res.status(400).json({ error: 'user_id and shared_with_user_id are required' })
    }

    // Check if user owns the note
    const noteCheck = await req.dbClient!.query(
      'SELECT user_id FROM notes WHERE id = $1',
      [id]
    )

    if (noteCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' })
    }

    if (noteCheck.rows[0].user_id != user_id) {
      return res.status(403).json({ error: 'Only the owner can share notes' })
    }

    const result = await req.dbClient!.query(
      `
      INSERT INTO note_shares (note_id, shared_with_user_id, permission)
      VALUES ($1, $2, $3)
      ON CONFLICT (note_id, shared_with_user_id)
      DO UPDATE SET permission = $3
      RETURNING *
      `,
      [id, shared_with_user_id, permission || 'read']
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Error sharing note:', error)
    res.status(500).json({ error: 'Failed to share note' })
  }
}

// Remove share access
export const unshareNote = async (req: Request, res: Response) => {
  try {
    const { id, shareId } = req.params
    const userId = req.query.user_id as string

    if (!userId) {
      return res.status(400).json({ error: 'user_id is required' })
    }

    // Check if user owns the note
    const noteCheck = await req.dbClient!.query(
      'SELECT user_id FROM notes WHERE id = $1',
      [id]
    )

    if (noteCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' })
    }

    if (noteCheck.rows[0].user_id != userId) {
      return res.status(403).json({ error: 'Only the owner can manage shares' })
    }

    await req.dbClient!.query(
      'DELETE FROM note_shares WHERE id = $1 AND note_id = $2',
      [shareId, id]
    )

    res.json({ message: 'Share removed successfully' })
  } catch (error) {
    console.error('Error removing share:', error)
    res.status(500).json({ error: 'Failed to remove share' })
  }
}

// Get shares for a note
export const getNoteShares = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.query.user_id as string

    if (!userId) {
      return res.status(400).json({ error: 'user_id is required' })
    }

    // Check if user owns the note
    const noteCheck = await req.dbClient!.query(
      'SELECT user_id FROM notes WHERE id = $1',
      [id]
    )

    if (noteCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' })
    }

    if (noteCheck.rows[0].user_id != userId) {
      return res.status(403).json({ error: 'Only the owner can view shares' })
    }

    const result = await req.dbClient!.query(
      `SELECT ns.id, ns.note_id, ns.shared_with_user_id, ns.permission, ns.created_at,
              u.name as user_name, u.email as user_email
       FROM note_shares ns
       JOIN users u ON ns.shared_with_user_id = u.id
       WHERE ns.note_id = $1
       ORDER BY u.name`,
      [id]
    )

    res.json({ shares: result.rows })
  } catch (error) {
    console.error('Error fetching note shares:', error)
    res.status(500).json({ error: 'Failed to fetch note shares' })
  }
}
