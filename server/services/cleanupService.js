import cron from 'node-cron';
import { Op } from 'sequelize';
import Session from '../models/Session.js';

/**
 * Automatically closes sessions that have been inactive for longer than the configured period.
 */
export const autoCloseOldSessions = async () => {
    const autoCloseDays = Number(process.env.SESSION_AUTO_CLOSE_DAYS || 7);
    const cutoffDate = new Date(Date.now() - autoCloseDays * 24 * 60 * 60 * 1000);

    console.log(`[Auto-Close] Starting session auto-close. Inactive days: ${autoCloseDays}. Cutoff date: ${cutoffDate.toISOString()}`);

    try {
        const [closedCount] = await Session.update(
            { status: 'closed' },
            {
                where: {
                    status: {
                        [Op.ne]: 'closed'
                    },
                    updatedAt: {
                        [Op.lt]: cutoffDate
                    }
                }
            }
        );

        console.log(`[Auto-Close] Closed ${closedCount} old inactive sessions.`);
    } catch (error) {
        console.error('[Auto-Close] Error during session auto-close:', error);
    }
};

/**
 * Starts the daily auto-close job.
 * Runs at 00:00 every day (Europe/Paris timezone).
 * Also runs once on startup to catch sessions missed during container restarts.
 */
export const startCleanupJob = () => {
    // Run every day at midnight (Paris time)
    cron.schedule('0 0 * * *', () => {
        autoCloseOldSessions();
    }, { timezone: 'Europe/Paris' });

    console.log('[Auto-Close] Session auto-close job scheduled to run daily at 00:00 Europe/Paris.');

    // Run immediately on startup to catch sessions missed during restarts
    autoCloseOldSessions();
};
