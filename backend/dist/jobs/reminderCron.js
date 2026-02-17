"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startReminderCron = startReminderCron;
exports.triggerReminderJobManually = triggerReminderJobManually;
const node_cron_1 = __importDefault(require("node-cron"));
const reminderService_1 = require("../utils/reminderService");
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Railway-compatible cron job for quote follow-up reminders
 * Runs daily at 8:00 AM server time
 * Integrated into the main Express server process for Railway compatibility
 */
function startReminderCron() {
    // Schedule: Run every day at 8:00 AM
    // Cron format: minute hour day month weekday
    // '0 8 * * *' = At 08:00 every day
    const cronSchedule = '0 8 * * *';
    logger_1.default.system('🕒 Initializing Quote Reminder Cron Job...');
    logger_1.default.system(`📅 Schedule: Daily at 8:00 AM (${cronSchedule})`);
    node_cron_1.default.schedule(cronSchedule, async () => {
        const timestamp = new Date().toISOString();
        logger_1.default.system(`\n${'='.repeat(60)}`);
        logger_1.default.system(`🔔 [${timestamp}] Running Quote Reminder Job`);
        logger_1.default.system('='.repeat(60));
        try {
            await (0, reminderService_1.generateAutoReminders)();
            logger_1.default.system(`✅ [${timestamp}] Quote Reminder Job completed successfully`);
        }
        catch (error) {
            logger_1.default.error(`❌ [${timestamp}] Quote Reminder Job failed:`, error);
        }
        logger_1.default.system('='.repeat(60) + '\n');
    }, {
        scheduled: true,
        timezone: process.env.TZ || 'America/Chicago' // Configurable via environment variable
    });
    logger_1.default.system('✅ Quote Reminder Cron Job started successfully');
    logger_1.default.system(`ℹ️  Timezone: ${process.env.TZ || 'America/Chicago (default)'}`);
    logger_1.default.system(`ℹ️  Next run: ${getNextRunTime()}`);
}
/**
 * Helper function to display next scheduled run time
 */
function getNextRunTime() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);
    // If it's before 8 AM today, next run is today at 8 AM
    if (now.getHours() < 8) {
        const today = new Date(now);
        today.setHours(8, 0, 0, 0);
        return today.toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: process.env.TZ || 'America/Chicago'
        });
    }
    return tomorrow.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: process.env.TZ || 'America/Chicago'
    });
}
/**
 * Manual trigger for testing purposes
 * Can be called via API endpoint if needed
 */
async function triggerReminderJobManually() {
    try {
        logger_1.default.info('🔔 Manually triggering Quote Reminder Job...');
        await (0, reminderService_1.generateAutoReminders)();
        return {
            success: true,
            message: 'Quote reminder job executed successfully'
        };
    }
    catch (error) {
        logger_1.default.error('❌ Manual reminder job failed:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
