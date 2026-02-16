import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { fetchAndUpdateRates, loadRatesFromDB } from './currencyService.js';

const prisma = new PrismaClient();

export function startCronJobs() {
  // Uygulama başlatıldığında kurları yükle
  loadRatesFromDB().then(() => {
    fetchAndUpdateRates().catch(err => {
      console.error('[CRON] Initial currency fetch error:', err);
    });
  });

  // Her 15 dakikada bir döviz kurlarını güncelle (sabah 6 - gece 23 arası)
  cron.schedule('*/15 6-23 * * *', async () => {
    try {
      await fetchAndUpdateRates();
    } catch (error) {
      console.error('[CRON] Currency rate update error:', error);
    }
  });

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

  console.log('⏰ Cron jobs started (FCM cleanup: daily 03:00, 03:30 | Currency: every 15min 06-23)');
}
