import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export function startCronJobs() {
  // Her gece 03:00'te eski FCM token'ları temizle
  cron.schedule('0 3 * * *', async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // 30 gündür güncellenmemiş tokenları sil
      const deleted = await prisma.fcmToken.deleteMany({
        where: {
          updatedAt: { lt: thirtyDaysAgo },
        },
      });

      if (deleted.count > 0) {
        console.log(`[CRON] Cleaned up ${deleted.count} stale FCM tokens`);
      }
    } catch (error) {
      console.error('[CRON] FCM token cleanup error:', error);
    }
  });

  // Her gece 03:30'da pasif tokenları sil
  cron.schedule('30 3 * * *', async () => {
    try {
      const deleted = await prisma.fcmToken.deleteMany({
        where: { isActive: false },
      });

      if (deleted.count > 0) {
        console.log(`[CRON] Removed ${deleted.count} inactive FCM tokens`);
      }
    } catch (error) {
      console.error('[CRON] Inactive token cleanup error:', error);
    }
  });

  console.log('⏰ Cron jobs started (FCM cleanup: daily 03:00, 03:30)');
}
