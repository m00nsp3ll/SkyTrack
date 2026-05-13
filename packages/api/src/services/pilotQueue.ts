import { PrismaClient, Pilot, PilotStatus } from '@prisma/client';
import { cache, getRedis } from './cache.js';
import { sendNativeToPilot, getNotificationConfig } from './firebaseNotification.js';
import { sanitizePilotName } from './media.js';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const MEDIA_STORAGE_PATH = process.env.MEDIA_STORAGE_PATH || './media';

export interface QueuedPilot {
  id: string;
  name: string;
  dailyFlightCount: number;
  maxDailyFlights: number;
  status: PilotStatus;
  queuePosition: number;
  roundCount: number;
}

export const pilotQueueService = {
  /**
   * Get the next available pilot for assignment
   * Uses Redis cache for performance, falls back to DB
   */
  async getNextPilot(excludeIds?: string[]): Promise<Pilot | null> {
    // Try cache first (skip if excludeIds provided — need fresh DB query)
    if (!excludeIds?.length) {
      const cached = await cache.pilotQueue.get();
      if (cached && Array.isArray(cached) && cached.length > 0) {
        const availablePilot = cached.find(
          (p: QueuedPilot) =>
            p.status === 'AVAILABLE' &&
            p.dailyFlightCount < p.maxDailyFlights &&
            (p as any).isInExcel === true
        );

        if (availablePilot) {
          // Get fresh data from DB to ensure accuracy
          return prisma.pilot.findUnique({
            where: { id: availablePilot.id },
          });
        }
      }
    }

    // Fallback to database
    // Kitap mantığı: tur sayısı en az olan, eşitse queue_position küçük olan.
    // locked_until_round ile bu tur bloke olan pilot atlanır.
    const { getCurrentRound } = await import('./roundCounter.js');
    const currentRound = await getCurrentRound();
    const pilot = await prisma.pilot.findFirst({
      where: {
        isActive: true,
        inQueue: true,
        isInExcel: true,
        status: 'AVAILABLE',
        dailyFlightCount: { lt: prisma.pilot.fields.maxDailyFlights },
        ...(excludeIds?.length ? { id: { notIn: excludeIds } } : {}),
        OR: [
          { lockedUntilRound: null },
          { lockedUntilRound: { lte: currentRound } },
        ],
      },
      orderBy: [
        { priorityOverride: 'desc' },
        { roundCount: 'asc' },
        { queuePosition: 'asc' },
      ],
    });

    // Update cache
    await this.refreshQueueCache();

    return pilot;
  },

  /**
   * Get the current pilot queue status
   */
  async getQueueStatus(): Promise<{
    queue: QueuedPilot[];
    nextPilot: QueuedPilot | null;
    availableCount: number;
    totalActive: number;
  }> {
    // Try cache first
    let queue = await cache.pilotQueue.get() as QueuedPilot[] | null;

    if (!queue) {
      // Fetch from database
      const pilots = await prisma.pilot.findMany({
        where: { isActive: true },
        orderBy: [
          { priorityOverride: 'desc' },
          { roundCount: 'asc' },
          { queuePosition: 'asc' },
        ],
        select: {
          id: true,
          name: true,
          dailyFlightCount: true,
          maxDailyFlights: true,
          status: true,
          queuePosition: true,
          roundCount: true,
          priorityOverride: true,
        },
      });

      // Sıralama: müsait → mesai dışı/mola → müşteri almış/uçuşta
      const available = pilots.filter(p => p.status === 'AVAILABLE');
      const notAvailable = pilots.filter(p => ['OFF_DUTY', 'ON_BREAK', 'UNAVAILABLE'].includes(p.status));
      const busy = pilots.filter(p => ['PICKED_UP', 'ASSIGNED', 'IN_FLIGHT'].includes(p.status));
      queue = [...available, ...notAvailable, ...busy];
      await cache.pilotQueue.set(queue);
    }

    const availablePilots = queue.filter(
      p => p.status === 'AVAILABLE' && p.dailyFlightCount < p.maxDailyFlights
    );

    return {
      queue,
      nextPilot: availablePilots[0] || null,
      availableCount: availablePilots.length,
      totalActive: queue.length,
    };
  },

  /**
   * Assign a pilot to a customer and create flight record
   */
  async assignPilotToCustomer(
    customerId: string,
    customerDisplayId: string,
    io?: any,
    specificPilotId?: string
  ): Promise<{ pilot: Pilot; flightId: string; mediaFolderPath: string } | null> {
    // Redis lock — aynı anda iki müşterinin aynı pilota atanmasını engelle
    const redis = getRedis();
    const lockKey = 'lock:pilot-assignment';
    const lockValue = `${customerId}:${Date.now()}`;
    let lockAcquired = false;

    if (redis) {
      // SET NX EX — 10 saniye timeout ile lock al
      const result = await redis.set(lockKey, lockValue, 'EX', 10, 'NX');
      if (!result) {
        // Lock alınamadı — başka atama devam ediyor, 2 saniye bekle ve tekrar dene
        await new Promise(r => setTimeout(r, 2000));
        const retry = await redis.set(lockKey, lockValue, 'EX', 10, 'NX');
        if (!retry) {
          // Hala alınamıyorsa force — eski lock 10sn sonra zaten düşer
          await redis.set(lockKey, lockValue, 'EX', 10);
        }
      }
      lockAcquired = true;
    }

    try {
    let pilot: Pilot | null;
    if (specificPilotId) {
      pilot = await prisma.pilot.findUnique({ where: { id: specificPilotId } });
    } else {
      // Lock sayesinde cache'i atla, direkt DB'den oku
      pilot = await this.getNextPilot();
    }

    if (!pilot) {
      return null;
    }

    // Create media folder path with pilot name and sorti number
    const today = new Date().toISOString().slice(0, 10);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const pilotFlightsToday = await prisma.flight.count({
      where: {
        pilotId: pilot.id,
        createdAt: { gte: todayStart },
      },
    });
    const safePilotName = sanitizePilotName(pilot.name);
    const mediaFolderPath = path.join(
      MEDIA_STORAGE_PATH,
      today,
      safePilotName,
      customerDisplayId
    );

    // Create the directory (flat - no subdirectories)
    try {
      fs.mkdirSync(mediaFolderPath, { recursive: true });
    } catch (error) {
      console.error('Error creating media folder:', error);
    }

    // Transaction: update customer, create flight, update pilot, create media folder
    const result = await prisma.$transaction(async (tx) => {
      // Update customer
      await tx.customer.update({
        where: { id: customerId },
        data: {
          assignedPilotId: pilot.id,
          status: 'ASSIGNED',
        },
      });

      // Create flight
      const flight = await tx.flight.create({
        data: {
          customerId,
          pilotId: pilot.id,
          status: 'ASSIGNED',
        },
      });

      // Create media folder record
      await tx.mediaFolder.create({
        data: {
          flightId: flight.id,
          customerId,
          pilotId: pilot.id,
          folderPath: mediaFolderPath,
        },
      });

      // FORMA SİSTEMİ: queue_position SABİT (forma numarası). Sıralama roundCount ile dönüyor.
      // priorityOverride varsa atama sonrası otomatik kaldır (tek seferlik istisnai durum)
      await tx.pilot.update({
        where: { id: pilot.id },
        data: {
          dailyFlightCount: { increment: 1 },
          roundCount: { increment: 1 },
          status: 'ASSIGNED',
          priorityOverride: false,
        },
      });

      // ATLANAN PİLOT FERAGATİ: Sırası geçmiş ama mesai dışı/mola olan pilotlar feragat yer.
      // priorityOverride ile sıra başı yapılan pilotta feragat sistemi ÇALIŞMAZ —
      // çünkü sıra atlanmadı, pilot özel olarak öne alındı.
      const oldRound = pilot.roundCount; // atama öncesi round
      const wasPriority = pilot.priorityOverride; // atama öncesi priority durumu
      const skipped = wasPriority ? [] : await tx.pilot.findMany({
        where: {
          isActive: true,
          isInExcel: true,
          id: { not: pilot.id },
          roundCount: { lte: oldRound },
          OR: [
            { inQueue: false },
            { status: { in: ['OFF_DUTY', 'ON_BREAK'] } },
          ],
        },
        select: { id: true, roundCount: true, queuePosition: true },
      });
      for (const sp of skipped) {
        // Aynı rounddaki pilot: sadece sırası öndeyse (queuePosition < atanan pilot) feragat yer
        // Gerideki pilot (roundCount < oldRound): her zaman feragat yer (+1)
        if (sp.roundCount === oldRound && sp.queuePosition >= pilot.queuePosition) continue;
        await tx.pilot.update({
          where: { id: sp.id },
          data: {
            roundCount: { increment: 1 },
            forfeitCount: { increment: 1 },
            lastForfeitRound: oldRound,
          },
        });
        // Feragat kaydı oluştur — queue-history'de görünsün
        // createdAt'ı flight'tan 1sn önce yap ki sıralama doğru olsun (feragat → uçuş)
        const forfeitTime = new Date(Date.now() - 1000);
        await tx.flight.create({
          data: {
            customerId,
            pilotId: sp.id,
            status: 'CANCELLED',
            cancellationReason: 'FORFEIT',
            notes: 'Mesai dışı - otomatik feragat',
            createdAt: forfeitTime,
          },
        });
      }

      return flight;
    });

    // Round counter — atama yapıldı, pilot TUR'u artsın
    try {
      const { recordAssignment } = await import('./roundCounter.js');
      await recordAssignment(pilot.id);
    } catch (e) {
      console.error('Round counter error:', e);
    }

    // Invalidate cache
    await cache.pilotQueue.invalidate();
    await cache.pilot.invalidate(pilot.id);

    // Notify the new #1 pilot in queue
    try {
      const nextFirst = await prisma.pilot.findFirst({
        where: {
          isActive: true,
          inQueue: true,
          status: 'AVAILABLE',
          dailyFlightCount: { lt: prisma.pilot.fields.maxDailyFlights },
          id: { not: pilot.id },
        },
        orderBy: [{ priorityOverride: 'desc' }, { roundCount: 'asc' }, { queuePosition: 'asc' }],
      });
      if (nextFirst) {
        getNotificationConfig('pilot_first_in_queue').then(config => {
          if (config?.enabled) {
            sendNativeToPilot(nextFirst.id, {
              title: config.title || '🥇 İlk Sıradasınız!',
              body: config.body || 'Sıra size geldi, bir sonraki müşteri size atanacak.',
              data: { type: 'pilot_first_in_queue' },
            }).catch(err => console.error('FCM first-in-queue error:', err));
          }
        });
        if (io) {
          io.emit('pilot:queue-updated');
        }
      }
    } catch (e) {
      console.error('First-in-queue notification error:', e);
    }

    // Send Socket.IO notification to pilot
    if (io) {
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        select: { firstName: true, lastName: true, displayId: true, weight: true },
      });

      io.to(`pilot:${pilot.id}`).emit('customer:assigned', {
        flightId: result.id,
        customer: {
          id: customerId,
          displayId: customer?.displayId,
          name: `${customer?.firstName} ${customer?.lastName}`,
        },
      });

      // Also notify admins
      io.to('admin').emit('customer:assigned', {
        pilotId: pilot.id,
        pilotName: pilot.name,
        customer: {
          id: customerId,
          displayId: customer?.displayId,
          name: `${customer?.firstName} ${customer?.lastName}`,
        },
      });

      // Send notification to pilot
      if (customer) {
        const customerName = `${customer.firstName} ${customer.lastName}`;
        const defaultBody = `${customerName} (${customer.displayId}) - ${customer.weight || 0}kg`;

        // Firebase Native Push (FCM) - Primary notification channel
        getNotificationConfig('customer_assigned').then(config => {
          if (config?.enabled) {
            sendNativeToPilot(pilot.id, {
              title: config.title || '🪂 Yeni Müşteri Atandı',
              body: config.body ? config.body.replace('{customer}', customerName).replace('{displayId}', customer.displayId).replace('{weight}', String(customer.weight || 0)) : defaultBody,
              data: { type: 'customer_assigned', flightId: result.id },
            }).catch(err => console.error('FCM notification error:', err));
          }
        });
      }
    }

    return {
      pilot,
      flightId: result.id,
      mediaFolderPath,
    };
    } finally {
      // Lock release
      if (lockAcquired && redis) {
        const currentVal = await redis.get(lockKey);
        if (currentVal === lockValue) await redis.del(lockKey);
      }
    }
  },

  /**
   * Reassign a customer to a different pilot
   */
  async reassignPilot(
    customerId: string,
    newPilotId?: string,
    io?: any
  ): Promise<Pilot | null> {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        flights: {
          where: { status: { in: ['ASSIGNED', 'PICKED_UP', 'IN_FLIGHT'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!customer) {
      throw new Error('Müşteri bulunamadı');
    }

    let pilot: Pilot | null;

    if (newPilotId) {
      // Assign to specific pilot
      pilot = await prisma.pilot.findUnique({
        where: { id: newPilotId },
      });

      if (!pilot) {
        throw new Error('Pilot bulunamadı');
      }

      if (pilot.dailyFlightCount >= pilot.maxDailyFlights) {
        throw new Error('Bu pilot günlük uçuş limitine ulaşmış');
      }

      if (pilot.status !== 'AVAILABLE') {
        throw new Error('Bu pilot şu an müsait değil');
      }
    } else {
      // Get next available pilot
      pilot = await this.getNextPilot();

      if (!pilot) {
        throw new Error('Müsait pilot bulunamadı');
      }
    }

    // If there's an existing assigned flight, update it
    if (customer.flights.length > 0) {
      const oldPilotId = customer.flights[0].pilotId;

      await prisma.$transaction(async (tx) => {
        if (oldPilotId !== pilot!.id) {
          // Eski pilotun mevcut değerlerini oku
          const oldPilot = await tx.pilot.findUnique({ where: { id: oldPilotId } });

          // Eski pilot: uçmadı → geri al (0'ın altına düşürme)
          await tx.pilot.update({
            where: { id: oldPilotId },
            data: {
              dailyFlightCount: oldPilot && oldPilot.dailyFlightCount > 0 ? { decrement: 1 } : 0,
              roundCount: oldPilot && oldPilot.roundCount > 0 ? { decrement: 1 } : 0,
              status: 'AVAILABLE',
            },
          });

          // Yeni pilot: uçacak → artır
          await tx.pilot.update({
            where: { id: pilot!.id },
            data: {
              dailyFlightCount: { increment: 1 },
              roundCount: { increment: 1 },
              status: 'ASSIGNED',
            },
          });
        }

        // Update flight
        await tx.flight.update({
          where: { id: customer.flights[0].id },
          data: { pilotId: pilot!.id },
        });

        // Update customer
        await tx.customer.update({
          where: { id: customerId },
          data: { assignedPilotId: pilot!.id },
        });
      });

      // Invalidate caches (both old and new pilot)
      await cache.pilotQueue.invalidate();
      await cache.pilot.invalidate(pilot.id);
      if (oldPilotId !== pilot.id) {
        await cache.pilot.invalidate(oldPilotId);
      }

      // Notify via Socket.IO
      if (io) {
        // Notify new pilot — trigger panel refresh
        io.to(`pilot:${pilot.id}`).emit('customer:assigned', {
          customer: {
            id: customerId,
            displayId: customer.displayId,
            firstName: customer.firstName,
            lastName: customer.lastName,
            weight: customer.weight,
          },
        });

        // Notify old pilot — they lost the customer, refresh their panel
        if (oldPilotId !== pilot.id) {
          io.to(`pilot:${oldPilotId}`).emit('flight:updated', {});
        }

        // Notify admins so the main board updates
        io.to('admin').emit('customer:updated', { customerId });

        // Send notification to new pilot
        const customerName = `${customer.firstName} ${customer.lastName}`;
        const defaultBody = `${customerName} (${customer.displayId}) - ${customer.weight || 0}kg`;

        // Firebase Native Push (FCM) - Primary notification channel
        getNotificationConfig('customer_reassigned').then(config => {
          if (config?.enabled) {
            sendNativeToPilot(pilot.id, {
              title: config.title || '🪂 Yeni Müşteri Atandı',
              body: config.body ? config.body.replace('{customer}', customerName).replace('{displayId}', customer.displayId).replace('{weight}', String(customer.weight || 0)) : defaultBody,
              data: { type: 'customer_reassigned' },
            }).catch(err => console.error('FCM notification error:', err));
          }
        });
      }
    }

    return pilot;
  },

  /**
   * Refresh the pilot queue cache
   */
  async refreshQueueCache(): Promise<void> {
    const pilots = await prisma.pilot.findMany({
      where: { isActive: true },
      orderBy: [
        { priorityOverride: 'desc' },
        { roundCount: 'asc' },
        { queuePosition: 'asc' },
      ],
      select: {
        id: true,
        name: true,
        dailyFlightCount: true,
        maxDailyFlights: true,
        status: true,
        queuePosition: true,
        roundCount: true,
        priorityOverride: true,
      },
    });

    await cache.pilotQueue.set(pilots);
  },
};

export default pilotQueueService;
