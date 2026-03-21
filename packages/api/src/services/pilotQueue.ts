import { PrismaClient, Pilot, PilotStatus } from '@prisma/client';
import { cache } from './cache.js';
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
}

export const pilotQueueService = {
  /**
   * Get the next available pilot for assignment
   * Uses Redis cache for performance, falls back to DB
   */
  async getNextPilot(): Promise<Pilot | null> {
    // Try cache first
    const cached = await cache.pilotQueue.get();
    if (cached && Array.isArray(cached) && cached.length > 0) {
      const availablePilot = cached.find(
        (p: QueuedPilot) =>
          p.status === 'AVAILABLE' &&
          p.dailyFlightCount < p.maxDailyFlights
      );

      if (availablePilot) {
        // Get fresh data from DB to ensure accuracy
        return prisma.pilot.findUnique({
          where: { id: availablePilot.id },
        });
      }
    }

    // Fallback to database
    const pilot = await prisma.pilot.findFirst({
      where: {
        isActive: true,
        status: 'AVAILABLE',
        dailyFlightCount: { lt: prisma.pilot.fields.maxDailyFlights },
      },
      orderBy: [
        { queuePosition: 'asc' }, // ONLY queue position - round-robin order
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
          { queuePosition: 'asc' }, // ONLY queue position - round-robin
        ],
        select: {
          id: true,
          name: true,
          dailyFlightCount: true,
          maxDailyFlights: true,
          status: true,
          queuePosition: true,
        },
      });

      queue = pilots;
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
    io?: any
  ): Promise<{ pilot: Pilot; flightId: string; mediaFolderPath: string } | null> {
    const pilot = await this.getNextPilot();

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
    const sortiNumber = pilotFlightsToday + 1;
    const safePilotName = sanitizePilotName(pilot.name);
    const mediaFolderPath = path.join(
      MEDIA_STORAGE_PATH,
      today,
      safePilotName,
      `${sortiNumber}_sorti`,
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

      // Get the max queue position
      const maxQueuePilot = await tx.pilot.findFirst({
        where: { isActive: true },
        orderBy: { queuePosition: 'desc' },
        select: { queuePosition: true },
      });
      const maxQueuePosition = maxQueuePilot?.queuePosition || 0;

      // Update pilot: increment flight count, set status to ASSIGNED, move to end of queue
      await tx.pilot.update({
        where: { id: pilot.id },
        data: {
          dailyFlightCount: { increment: 1 },
          status: 'ASSIGNED',
          queuePosition: maxQueuePosition + 1,
        },
      });

      // Reorder remaining pilots to fill the gap
      await tx.pilot.updateMany({
        where: {
          isActive: true,
          id: { not: pilot.id },
          queuePosition: { gt: pilot.queuePosition },
        },
        data: {
          queuePosition: { decrement: 1 },
        },
      });

      return flight;
    });

    // Invalidate cache
    await cache.pilotQueue.invalidate();
    await cache.pilot.invalidate(pilot.id);

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
        // Decrement old pilot's count
        if (oldPilotId !== pilot!.id) {
          await tx.pilot.update({
            where: { id: oldPilotId },
            data: { dailyFlightCount: { decrement: 1 } },
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

        // Increment new pilot's count (if different)
        if (oldPilotId !== pilot!.id) {
          await tx.pilot.update({
            where: { id: pilot!.id },
            data: { dailyFlightCount: { increment: 1 } },
          });
        }

        // Queue management: old pilot goes to top (position 1), new pilot goes to end
        if (oldPilotId !== pilot!.id) {
          const oldPilot = await tx.pilot.findUnique({
            where: { id: oldPilotId },
            select: { queuePosition: true },
          });
          const newPilotData = await tx.pilot.findUnique({
            where: { id: pilot!.id },
            select: { queuePosition: true },
          });

          if (oldPilot && newPilotData) {
            // Move all pilots with position < old pilot's position down by 1
            // to make room for old pilot at position 1
            await tx.pilot.updateMany({
              where: {
                isActive: true,
                id: { notIn: [oldPilotId, pilot!.id] },
                queuePosition: { lt: oldPilot.queuePosition },
              },
              data: { queuePosition: { increment: 1 } },
            });

            // Old pilot goes to position 1 (top of queue, available)
            await tx.pilot.update({
              where: { id: oldPilotId },
              data: {
                queuePosition: 1,
                status: 'AVAILABLE',
              },
            });

            // Get max queue position for the new pilot
            const maxQueuePilot = await tx.pilot.findFirst({
              where: { isActive: true, id: { not: pilot!.id } },
              orderBy: { queuePosition: 'desc' },
              select: { queuePosition: true },
            });
            const maxPos = maxQueuePilot?.queuePosition || 0;

            // New pilot goes to end of queue with ASSIGNED status
            await tx.pilot.update({
              where: { id: pilot!.id },
              data: { queuePosition: maxPos + 1, status: 'ASSIGNED' },
            });
          }
        }
      });

      // Invalidate caches (both old and new pilot)
      const oldPilotId = customer.flights[0].pilotId;
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
        { queuePosition: 'asc' }, // ONLY queue position - pure round-robin
      ],
      select: {
        id: true,
        name: true,
        dailyFlightCount: true,
        maxDailyFlights: true,
        status: true,
        queuePosition: true,
      },
    });

    await cache.pilotQueue.set(pilots);
  },
};

export default pilotQueueService;
