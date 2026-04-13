import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Round Counter Service
 *
 * Sıra sistemi "tur" mantığı:
 * - Aktif sıradaki pilot sayısı kadar atama yapıldığında tur tamamlanır
 * - currentRound 1 artar, assignmentsInRound sıfırlanır
 * - Feragat eden pilotların lockedUntilRound > currentRound olduğu sürece
 *   kilidi devam eder (görsel/admin için)
 */

/**
 * Yeni atama yapıldığında çağrılır.
 * Eğer assignmentsInRound aktif pilot sayısına ulaştıysa tur biter, currentRound++.
 * @returns Güncel round bilgisi
 */
export async function recordAssignment(tx?: any): Promise<{ currentRound: number; assignmentsInRound: number; roundCompleted: boolean }> {
  const db = tx || prisma;

  // Aktif sıradaki pilot sayısı (round size)
  const activeQueueSize = await db.pilot.count({
    where: { isActive: true, inQueue: true },
  });

  if (activeQueueSize === 0) {
    return { currentRound: 0, assignmentsInRound: 0, roundCompleted: false };
  }

  // Singleton state'i upsert ile garantile
  const state = await db.queueState.upsert({
    where: { id: 'singleton' },
    update: { assignmentsInRound: { increment: 1 } },
    create: { id: 'singleton', currentRound: 0, assignmentsInRound: 1 },
  });

  // Tur tamamlandı mı?
  if (state.assignmentsInRound >= activeQueueSize) {
    const updated = await db.queueState.update({
      where: { id: 'singleton' },
      data: {
        currentRound: { increment: 1 },
        assignmentsInRound: 0,
      },
    });
    return {
      currentRound: updated.currentRound,
      assignmentsInRound: 0,
      roundCompleted: true,
    };
  }

  return {
    currentRound: state.currentRound,
    assignmentsInRound: state.assignmentsInRound,
    roundCompleted: false,
  };
}

/**
 * Mevcut tur numarasını döndürür.
 */
export async function getCurrentRound(): Promise<number> {
  const state = await prisma.queueState.findUnique({ where: { id: 'singleton' } });
  return state?.currentRound || 0;
}

/**
 * Pilotun feragat edip kilidinin hala aktif olup olmadığını kontrol eder.
 * Lock aktifse pilot kuyruğun arkasında kalır, normal sıraya giremez.
 */
export async function isPilotLocked(pilotId: string): Promise<boolean> {
  const [pilot, currentRound] = await Promise.all([
    prisma.pilot.findUnique({ where: { id: pilotId }, select: { lockedUntilRound: true } }),
    getCurrentRound(),
  ]);
  if (!pilot?.lockedUntilRound) return false;
  return pilot.lockedUntilRound > currentRound;
}

/**
 * Pilot feragat eder.
 * - Kuyruğun en sonuna gönderilir
 * - lockedUntilRound = currentRound + 1 (1 tam tur sonra kilit kalkar)
 * - forfeitCount artar
 */
export async function forfeitPilot(pilotId: string, tx?: any): Promise<void> {
  const db = tx || prisma;

  const pilot = await db.pilot.findUnique({
    where: { id: pilotId },
    select: { id: true, queuePosition: true, forfeitCount: true },
  });
  if (!pilot) throw new Error('Pilot bulunamadı');

  const currentRound = await getCurrentRound();

  // En son sıra pozisyonu
  const maxPosResult = await db.pilot.aggregate({
    where: { isActive: true },
    _max: { queuePosition: true },
  });
  const maxPosition = (maxPosResult._max.queuePosition || 0) + 1;

  const originalPosition = pilot.queuePosition;

  await db.$transaction([
    // Pilotu en arkaya yerleştir
    db.pilot.update({
      where: { id: pilotId },
      data: {
        queuePosition: maxPosition,
        lastForfeitRound: currentRound,
        lockedUntilRound: currentRound + 1,
        forfeitCount: { increment: 1 },
        status: 'AVAILABLE', // Feragat sonrası müsait kalır ama en arkada
      },
    }),
    // Aradaki pilotları 1 yukarı çek (gap fill)
    db.pilot.updateMany({
      where: {
        isActive: true,
        queuePosition: { gt: originalPosition },
        id: { not: pilotId },
      },
      data: { queuePosition: { decrement: 1 } },
    }),
  ]);
}
