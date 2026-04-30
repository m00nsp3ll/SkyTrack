import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const setupCronJobs = () => {
  // Gece 21:00 — günlük pilot istatistiklerini kaydet
  cron.schedule('0 21 * * *', async () => {
    console.log('📊 Günlük pilot istatistikleri kaydediliyor...');
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateOnly = today.toISOString().split('T')[0];

      const pilots = await prisma.pilot.findMany({
        where: { isActive: true, isInExcel: true },
        select: { id: true, name: true, queuePosition: true, roundCount: true, dailyFlightCount: true, forfeitCount: true },
      });

      // Bugünkü tamamlanan uçuşları say
      const todayFlights = await prisma.flight.groupBy({
        by: ['pilotId'],
        where: { status: 'COMPLETED', createdAt: { gte: today, lt: tomorrow } },
        _count: true,
      });
      const flightMap = new Map(todayFlights.map(f => [f.pilotId, f._count]));

      // Dünkü stats'ı al — feragat farkını hesapla
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStats = await prisma.dailyPilotStat.findMany({
        where: { date: yesterday },
        select: { pilotId: true, roundCount: true },
      });
      const yesterdayRoundMap = new Map(yesterdayStats.map((s: { pilotId: string; roundCount: number }) => [s.pilotId, s.roundCount]));

      let saved = 0;
      for (const pilot of pilots) {
        const flights = flightMap.get(pilot.id) || 0;
        // Günlük feragat = bugünkü round artışı - bugünkü uçuş sayısı
        const prevRound = Number(yesterdayRoundMap.get(pilot.id) ?? (pilot.roundCount - flights));
        const roundIncrease: number = pilot.roundCount - prevRound;
        const forfeits = Math.max(0, roundIncrease - flights);

        await prisma.dailyPilotStat.upsert({
          where: { pilotId_date: { pilotId: pilot.id, date: today } },
          create: { pilotId: pilot.id, date: today, flights, forfeits, roundCount: pilot.roundCount },
          update: { flights, forfeits, roundCount: pilot.roundCount },
        });
        saved++;
      }

      console.log(`✅ ${saved} pilot istatistik kaydedildi (${dateOnly})`);
    } catch (error) {
      console.error('❌ Günlük istatistik hatası:', error);
    }
  }, { timezone: 'Europe/Istanbul' });

  // Reset daily flight counts at midnight (00:00)
  cron.schedule('0 0 * * *', async () => {
    console.log('🔄 Running daily pilot flight count reset...');
    try {
      await prisma.pilot.updateMany({ data: { dailyFlightCount: 0 } });
      console.log('✅ Daily flight counts reset successfully');
    } catch (error) {
      console.error('❌ Error resetting daily flight counts:', error);
    }
  }, { timezone: 'Europe/Istanbul' });

  console.log('⏰ Cron jobs scheduled (21:00 stats + 00:00 reset)');
};
