import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const setupCronJobs = () => {
  // Reset daily flight counts at midnight (00:00)
  cron.schedule('0 0 * * *', async () => {
    console.log('🔄 Running daily pilot flight count reset...');

    try {
      await prisma.pilot.updateMany({
        data: {
          dailyFlightCount: 0,
        },
      });

      console.log('✅ Daily flight counts reset successfully');
    } catch (error) {
      console.error('❌ Error resetting daily flight counts:', error);
    }
  }, {
    timezone: 'Europe/Istanbul',
  });

  console.log('⏰ Cron jobs scheduled');
};
