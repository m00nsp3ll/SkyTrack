import { PrismaClient, Pilot, PilotStatus } from '@prisma/client';
import { cache } from './cache.js';
import { sendPushToPilot, notifications } from './pushNotification.js';
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
        { dailyFlightCount: 'asc' },
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
          { dailyFlightCount: 'asc' },
          { queuePosition: 'asc' },
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

    // Create media folder path
    const today = new Date().toISOString().slice(0, 10);
    const mediaFolderPath = path.join(
      MEDIA_STORAGE_PATH,
      today,
      `pilot_${pilot.id}`,
      `customer_${customerDisplayId}`
    );

    // Create the directory
    try {
      fs.mkdirSync(mediaFolderPath, { recursive: true });
      fs.mkdirSync(path.join(mediaFolderPath, 'thumbnails'), { recursive: true });
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

      // Update pilot: increment flight count and move to end of queue
      await tx.pilot.update({
        where: { id: pilot.id },
        data: {
          dailyFlightCount: { increment: 1 },
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

      // Send push notification to pilot (works even when app is closed)
      if (customer) {
        const customerName = `${customer.firstName} ${customer.lastName}`;
        sendPushToPilot(
          pilot.id,
          notifications.customerAssigned(customerName, customer.displayId, customer.weight || 0)
        ).catch(err => console.error('Push notification error:', err));
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
      include: { flights: { where: { status: 'ASSIGNED' } } },
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
      });

      // Invalidate caches
      await cache.pilotQueue.invalidate();
      await cache.pilot.invalidate(pilot.id);

      // Notify via Socket.IO
      if (io) {
        io.to(`pilot:${pilot.id}`).emit('customer:assigned', {
          customer: {
            id: customerId,
            displayId: customer.displayId,
            name: `${customer.firstName} ${customer.lastName}`,
          },
        });

        // Send push notification to new pilot
        const customerName = `${customer.firstName} ${customer.lastName}`;
        sendPushToPilot(
          pilot.id,
          notifications.customerAssigned(customerName, customer.displayId, customer.weight || 0)
        ).catch(err => console.error('Push notification error:', err));
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
        { dailyFlightCount: 'asc' },
        { queuePosition: 'asc' },
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
