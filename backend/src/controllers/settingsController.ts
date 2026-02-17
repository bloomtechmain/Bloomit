import { Request, Response } from 'express'
import { pool } from '../db'

/**
 * Get all application settings
 */
export const getSettings = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, setting_key, setting_value, description, updated_at FROM application_settings ORDER BY setting_key'
    )
    
    res.json({ 
      success: true,
      settings: result.rows 
    })
  } catch (error) {
    console.error('Error fetching settings:', error)
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch settings',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * Get a specific setting by key
 */
export const getSettingByKey = async (req: Request, res: Response) => {
  const { key } = req.params
  
  try {
    const result = await pool.query(
      'SELECT id, setting_key, setting_value, description, updated_at FROM application_settings WHERE setting_key = $1',
      [key]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Setting not found' 
      })
    }
    
    res.json({ 
      success: true,
      setting: result.rows[0] 
    })
  } catch (error) {
    console.error('Error fetching setting:', error)
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch setting',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * Update a setting value
 * Requires settings:manage permission
 */
export const updateSetting = async (req: Request, res: Response) => {
  const { key } = req.params
  const { value } = req.body
  const userId = req.user?.userId
  
  if (!value && value !== '') {
    return res.status(400).json({ 
      success: false,
      error: 'Setting value is required' 
    })
  }
  
  try {
    // Check if setting exists
    const checkResult = await pool.query(
      'SELECT id FROM application_settings WHERE setting_key = $1',
      [key]
    )
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Setting not found' 
      })
    }
    
    // Update the setting
    const result = await pool.query(
      `UPDATE application_settings 
       SET setting_value = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE setting_key = $3 
       RETURNING id, setting_key, setting_value, description, updated_at`,
      [value, userId, key]
    )
    
    res.json({ 
      success: true,
      message: 'Setting updated successfully',
      setting: result.rows[0] 
    })
  } catch (error) {
    console.error('Error updating setting:', error)
    res.status(500).json({ 
      success: false,
      error: 'Failed to update setting',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * Create a new setting
 * Requires settings:manage permission
 */
export const createSetting = async (req: Request, res: Response) => {
  const { key, value, description } = req.body
  const userId = req.user?.userId
  
  if (!key || !value) {
    return res.status(400).json({ 
      success: false,
      error: 'Setting key and value are required' 
    })
  }
  
  try {
    const result = await pool.query(
      `INSERT INTO application_settings (setting_key, setting_value, description, updated_by) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, setting_key, setting_value, description, updated_at`,
      [key, value, description || null, userId]
    )
    
    res.status(201).json({ 
      success: true,
      message: 'Setting created successfully',
      setting: result.rows[0] 
    })
  } catch (error: any) {
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({ 
        success: false,
        error: 'Setting with this key already exists' 
      })
    }
    
    console.error('Error creating setting:', error)
    res.status(500).json({ 
      success: false,
      error: 'Failed to create setting',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
