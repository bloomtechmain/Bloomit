import { Request, Response } from 'express'
import { query } from '../db'

// Helper function to calculate depreciation
interface DepreciationCalculation {
  currentBookValue: number
  accumulatedDepreciation: number
  monthsOwned: number
}

function calculateDepreciation(
  originalValue: number,
  salvageValue: number,
  usefulLife: number,
  purchaseDate: string,
  depreciationMethod: 'STRAIGHT_LINE' | 'DOUBLE_DECLINING'
): DepreciationCalculation {
  const purchase = new Date(purchaseDate)
  const today = new Date()
  
  // Calculate months owned
  const monthsOwned = (today.getFullYear() - purchase.getFullYear()) * 12 + 
                      (today.getMonth() - purchase.getMonth())
  
  if (monthsOwned <= 0) {
    return { currentBookValue: originalValue, accumulatedDepreciation: 0, monthsOwned: 0 }
  }
  
  let accumulatedDepreciation = 0
  let bookValue = originalValue
  
  if (depreciationMethod === 'STRAIGHT_LINE') {
    const annualDepreciation = (originalValue - salvageValue) / usefulLife
    const monthlyDepreciation = annualDepreciation / 12
    
    accumulatedDepreciation = Math.min(
      monthlyDepreciation * monthsOwned,
      originalValue - salvageValue
    )
    bookValue = originalValue - accumulatedDepreciation
    
  } else if (depreciationMethod === 'DOUBLE_DECLINING') {
    const rate = 2 / usefulLife
    bookValue = originalValue
    
    // Calculate month by month
    for (let month = 0; month < monthsOwned; month++) {
      if (bookValue <= salvageValue) break
      
      const monthlyDepreciation = (bookValue * rate) / 12
      const proposedBookValue = bookValue - monthlyDepreciation
      
      if (proposedBookValue < salvageValue) {
        accumulatedDepreciation += (bookValue - salvageValue)
        bookValue = salvageValue
      } else {
        accumulatedDepreciation += monthlyDepreciation
        bookValue = proposedBookValue
      }
    }
  }
  
  return {
    currentBookValue: Math.max(bookValue, salvageValue),
    accumulatedDepreciation: Math.min(accumulatedDepreciation, originalValue - salvageValue),
    monthsOwned
  }
}

export const getAssets = async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM assets ORDER BY created_at DESC')
    
    // Calculate current book value for each asset
    const assetsWithDepreciation = result.rows.map(asset => {
      if (asset.depreciation_method && asset.salvage_value !== null && asset.useful_life) {
        const calc = calculateDepreciation(
          Number(asset.value),
          Number(asset.salvage_value),
          Number(asset.useful_life),
          asset.purchase_date,
          asset.depreciation_method
        )
        return {
          ...asset,
          current_book_value: calc.currentBookValue,
          accumulated_depreciation: calc.accumulatedDepreciation
        }
      }
      return {
        ...asset,
        current_book_value: Number(asset.value),
        accumulated_depreciation: 0
      }
    })
    
    res.json({ assets: assetsWithDepreciation })
  } catch (err) {
    console.error('Error fetching assets:', err)
    res.status(500).json({ error: 'Failed to fetch assets' })
  }
}

export const createAsset = async (req: Request, res: Response) => {
  const { asset_name, value, purchase_date, depreciation_method, salvage_value, useful_life } = req.body
  
  if (!asset_name || !value || !purchase_date) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    const result = await query(
      `INSERT INTO assets (asset_name, value, purchase_date, depreciation_method, salvage_value, useful_life) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        asset_name, 
        value, 
        purchase_date, 
        depreciation_method || null,
        salvage_value || null,
        useful_life || null
      ]
    )
    res.status(201).json({ asset: result.rows[0] })
  } catch (err) {
    console.error('Error creating asset:', err)
    res.status(500).json({ error: 'Failed to create asset' })
  }
}

export const getDepreciationSchedule = async (req: Request, res: Response) => {
  const { id } = req.params
  const { view } = req.query // 'monthly' or 'yearly'
  
  try {
    const result = await query('SELECT * FROM assets WHERE id = $1', [id])
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Asset not found' })
    }
    
    const asset = result.rows[0]
    
    if (!asset.depreciation_method || !asset.salvage_value || !asset.useful_life) {
      return res.status(400).json({ error: 'Asset is not depreciable' })
    }
    
    const originalValue = Number(asset.value)
    const salvageValue = Number(asset.salvage_value)
    const usefulLife = Number(asset.useful_life)
    const purchaseDate = new Date(asset.purchase_date)
    const method = asset.depreciation_method
    
    if (view === 'monthly') {
      // Generate monthly schedule
      const schedule = []
      let bookValue = originalValue
      let accumulatedDepreciation = 0
      
      const totalMonths = usefulLife * 12
      const today = new Date()
      
      for (let month = 0; month < totalMonths; month++) {
        const periodDate = new Date(purchaseDate)
        periodDate.setMonth(periodDate.getMonth() + month)
        
        if (bookValue <= salvageValue) {
          bookValue = salvageValue
          break
        }
        
        let monthlyDepreciation = 0
        
        if (method === 'STRAIGHT_LINE') {
          const annualDepreciation = (originalValue - salvageValue) / usefulLife
          monthlyDepreciation = annualDepreciation / 12
        } else if (method === 'DOUBLE_DECLINING') {
          const rate = 2 / usefulLife
          monthlyDepreciation = (bookValue * rate) / 12
        }
        
        const proposedBookValue = bookValue - monthlyDepreciation
        if (proposedBookValue < salvageValue) {
          monthlyDepreciation = bookValue - salvageValue
          bookValue = salvageValue
        } else {
          bookValue = proposedBookValue
        }
        
        accumulatedDepreciation += monthlyDepreciation
        
        schedule.push({
          period: `${periodDate.getFullYear()}-${String(periodDate.getMonth() + 1).padStart(2, '0')}`,
          month: month + 1,
          beginningBookValue: bookValue + monthlyDepreciation,
          depreciation: monthlyDepreciation,
          accumulatedDepreciation,
          endingBookValue: bookValue,
          isCurrent: periodDate <= today && new Date(periodDate.getFullYear(), periodDate.getMonth() + 1, 0) >= today
        })
      }
      
      return res.json({ schedule, view: 'monthly' })
    } else {
      // Generate yearly schedule
      const schedule = []
      let bookValue = originalValue
      let accumulatedDepreciation = 0
      
      for (let year = 0; year < usefulLife; year++) {
        if (bookValue <= salvageValue) {
          bookValue = salvageValue
          break
        }
        
        const yearStart = new Date(purchaseDate)
        yearStart.setFullYear(yearStart.getFullYear() + year)
        
        let annualDepreciation = 0
        
        if (method === 'STRAIGHT_LINE') {
          annualDepreciation = (originalValue - salvageValue) / usefulLife
          
          // Pro-rate first year
          if (year === 0) {
            const monthsInFirstYear = 12 - purchaseDate.getMonth()
            annualDepreciation = annualDepreciation * (monthsInFirstYear / 12)
          }
        } else if (method === 'DOUBLE_DECLINING') {
          const rate = 2 / usefulLife
          annualDepreciation = bookValue * rate
          
          // Pro-rate first year
          if (year === 0) {
            const monthsInFirstYear = 12 - purchaseDate.getMonth()
            annualDepreciation = annualDepreciation * (monthsInFirstYear / 12)
          }
        }
        
        const proposedBookValue = bookValue - annualDepreciation
        if (proposedBookValue < salvageValue) {
          annualDepreciation = bookValue - salvageValue
          bookValue = salvageValue
        } else {
          bookValue = proposedBookValue
        }
        
        accumulatedDepreciation += annualDepreciation
        
        schedule.push({
          year: year + 1,
          period: yearStart.getFullYear(),
          beginningBookValue: bookValue + annualDepreciation,
          depreciation: annualDepreciation,
          accumulatedDepreciation,
          endingBookValue: bookValue
        })
      }
      
      return res.json({ schedule, view: 'yearly' })
    }
  } catch (err) {
    console.error('Error generating depreciation schedule:', err)
    res.status(500).json({ error: 'Failed to generate depreciation schedule' })
  }
}
