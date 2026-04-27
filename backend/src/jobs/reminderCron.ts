import cron from 'node-cron'
import { generateAutoReminders } from '../utils/reminderService'
import logger from '../utils/logger'

/**
 * Railway-compatible cron job for quote follow-up reminders
 * Runs daily at 8:00 AM server time
 * Integrated into the main Express server process for Railway compatibility
 */
export function startReminderCron() {
  // Schedule: Run every day at 8:00 AM
  // Cron format: minute hour day month weekday
  // '0 8 * * *' = At 08:00 every day
  
  const cronSchedule = '0 8 * * *'
  
  logger.system('🕒 Initializing Quote Reminder Cron Job...')
  logger.system(`📅 Schedule: Daily at 8:00 AM (${cronSchedule})`)
  
  cron.schedule(cronSchedule, async () => {
    const timestamp = new Date().toISOString()
    logger.system(`\n${'='.repeat(60)}`)
    logger.system(`🔔 [${timestamp}] Running Quote Reminder Job`)
    logger.system('='.repeat(60))
    
    try {
      await generateAutoReminders()
      logger.system(`✅ [${timestamp}] Quote Reminder Job completed successfully`)
    } catch (error) {
      logger.error(`❌ [${timestamp}] Quote Reminder Job failed:`, error)
    }
    
    logger.system('='.repeat(60) + '\n')
  }, {
    timezone: process.env.TZ || 'America/Chicago'
  })
  
  logger.system('✅ Quote Reminder Cron Job started successfully')
  logger.system(`ℹ️  Timezone: ${process.env.TZ || 'America/Chicago (default)'}`)
  logger.system(`ℹ️  Next run: ${getNextRunTime()}`)
}

/**
 * Helper function to display next scheduled run time
 */
function getNextRunTime(): string {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(8, 0, 0, 0)
  
  // If it's before 8 AM today, next run is today at 8 AM
  if (now.getHours() < 8) {
    const today = new Date(now)
    today.setHours(8, 0, 0, 0)
    return today.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: process.env.TZ || 'America/Chicago'
    })
  }
  
  return tomorrow.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: process.env.TZ || 'America/Chicago'
  })
}

/**
 * Manual trigger for testing purposes
 * Can be called via API endpoint if needed
 */
export async function triggerReminderJobManually(): Promise<{ success: boolean; message: string }> {
  try {
    logger.info('🔔 Manually triggering Quote Reminder Job...')
    await generateAutoReminders()
    return { 
      success: true, 
      message: 'Quote reminder job executed successfully' 
    }
  } catch (error) {
    logger.error('❌ Manual reminder job failed:', error)
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}
