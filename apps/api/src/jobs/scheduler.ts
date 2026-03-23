import cron from 'node-cron';
import { runReminderJob } from './reminderJob';

export function startScheduler() {
  console.log('Starting automated jobs scheduler...');
  
  // Run every day at 08:00 AM
  cron.schedule('0 8 * * *', async () => {
    console.log('[Cron] Running daily reminder email job...');
    try {
      await runReminderJob();
      console.log('[Cron] Reminder job completed successfully');
    } catch (error) {
      console.error('[Cron] Error running reminder job:', error);
    }
  });
}
