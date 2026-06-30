import cron from 'node-cron';
import { escalateStaleClusters } from '../services/clustering';
import { logger } from '../config/logger';
import { config } from '../config/env';

/**
 * Escalation cron job.
 * Runs every hour — finds stale open/assigned clusters and bumps their priority.
 *
 * Design note: In production, this would live in a separate worker process
 * or use a proper job queue (BullMQ, pg-boss) for reliability and deduplication.
 * For this scale, node-cron on the same process is sufficient.
 */
export function startEscalationJob(): void {
  // Run every hour at :00
  cron.schedule('0 * * * *', async () => {
    logger.info('⏰ Running escalation cron job');
    try {
      const escalated = await escalateStaleClusters(config.escalationDaysThreshold);
      logger.info({ escalated }, '✅ Escalation job complete');
    } catch (error) {
      logger.error({ error }, '❌ Escalation job failed');
    }
  });

  logger.info(
    { thresholdDays: config.escalationDaysThreshold },
    '📅 Escalation job scheduled (every hour)'
  );
}
