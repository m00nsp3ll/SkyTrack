import { PrismaClient } from '@prisma/client';
import { sendNativeToPilot } from './firebaseNotification.js';
import { qnap } from './qnapService.js';
import { sanitizePilotName } from './media.js';

const prisma = new PrismaClient();

const SWAP_EXPIRE_SECONDS = 60;

/**
 * Süresi dolmuş PENDING talepleri EXPIRED olarak işaretle (cleanup)
 */
export async function expireOldRequests() {
  const result = await prisma.pilotSwapRequest.updateMany({
    where: { status: 'PENDING', expiresAt: { lt: new Date() } },
    data: { status: 'EXPIRED' },
  });
  if (result.count > 0) {
    console.log(`[Swap] ${result.count} eski PENDING talep EXPIRED yapıldı`);
  }
  return result.count;
}

/**
 * Swap request oluştur — hedef pilota FCM bildirim gönderir
 */
export async function createSwapRequest(requesterPilotId: string, targetPilotId: string) {
  // Önce eskimiş PENDING'leri temizle
  await expireOldRequests();

  // Her iki pilotun da PICKED_UP durumunda aktif uçuşu olmalı
  const [requesterFlight, targetFlight] = await Promise.all([
    prisma.flight.findFirst({
      where: { pilotId: requesterPilotId, status: 'PICKED_UP' },
      include: { customer: true, pilot: true },
    }),
    prisma.flight.findFirst({
      where: { pilotId: targetPilotId, status: 'PICKED_UP' },
      include: { customer: true, pilot: true },
    }),
  ]);

  if (!requesterFlight) {
    throw new Error('Kendi uçuşunuz PICKED_UP durumunda olmalı');
  }
  if (!targetFlight) {
    throw new Error('Hedef pilotun PICKED_UP durumunda aktif uçuşu yok');
  }

  // Aynı hedefe AKTİF (süresi dolmamış) PENDING istek var mı kontrol et
  const existing = await prisma.pilotSwapRequest.findFirst({
    where: {
      targetPilotId,
      status: 'PENDING',
      expiresAt: { gt: new Date() },
    },
  });
  if (existing) {
    throw new Error('Bu pilotun başka bir bekleyen değişim talebi var');
  }

  const expiresAt = new Date(Date.now() + SWAP_EXPIRE_SECONDS * 1000);

  const swap = await prisma.pilotSwapRequest.create({
    data: {
      requesterPilotId,
      requesterFlightId: requesterFlight.id,
      targetPilotId,
      targetFlightId: targetFlight.id,
      status: 'PENDING',
      expiresAt,
    },
  });

  // Hedef pilota FCM bildirim
  const requesterName = requesterFlight.pilot.name;
  const requesterCustomer = `${requesterFlight.customer.firstName} ${requesterFlight.customer.lastName} (${requesterFlight.customer.displayId})`;
  const targetCustomer = `${targetFlight.customer.firstName} ${targetFlight.customer.lastName} (${targetFlight.customer.displayId})`;

  sendNativeToPilot(targetPilotId, {
    title: '🔄 Pilot Değişim Talebi',
    body: `${requesterName} müşterilerinizi değiştirmek istiyor. ${requesterCustomer} ↔ ${targetCustomer}`,
    data: {
      type: 'pilot_swap_requested',
      swapRequestId: swap.id,
      requesterPilot: requesterName,
      requesterCustomer,
      targetCustomer,
    },
  }).catch(() => {});

  return swap;
}

/**
 * Swap'ı onayla — müşterileri değiştir + NAS klasörlerini taşı
 */
export async function approveSwap(swapRequestId: string, approvingPilotId: string) {
  const swap = await prisma.pilotSwapRequest.findUnique({ where: { id: swapRequestId } });
  if (!swap) throw new Error('Talep bulunamadı');
  if (swap.targetPilotId !== approvingPilotId) throw new Error('Bu talebi onaylama yetkiniz yok');
  if (swap.status !== 'PENDING') throw new Error('Talep zaten yanıtlandı');
  if (swap.expiresAt < new Date()) {
    await prisma.pilotSwapRequest.update({ where: { id: swapRequestId }, data: { status: 'EXPIRED' } });
    throw new Error('Talep süresi doldu');
  }

  // Her iki flight'ı da pilotla birlikte çek
  const [reqFlight, tgtFlight] = await Promise.all([
    prisma.flight.findUnique({
      where: { id: swap.requesterFlightId },
      include: { customer: true, pilot: true, mediaFolder: true },
    }),
    prisma.flight.findUnique({
      where: { id: swap.targetFlightId },
      include: { customer: true, pilot: true, mediaFolder: true },
    }),
  ]);

  if (!reqFlight || !tgtFlight) throw new Error('Uçuş bulunamadı');
  if (reqFlight.status !== 'PICKED_UP' || tgtFlight.status !== 'PICKED_UP') {
    throw new Error('Uçuşlardan biri artık PICKED_UP durumunda değil');
  }

  // Yeni medya klasör path'leri hesapla
  const today = new Date().toISOString().split('T')[0];
  const reqPilotSafe = sanitizePilotName(reqFlight.pilot.name);
  const tgtPilotSafe = sanitizePilotName(tgtFlight.pilot.name);

  // Sorti numaralarını hedef pilotların günlük uçuş sayısına göre hesapla
  const reqSortiNo = reqFlight.pilot.dailyFlightCount + 1;
  const tgtSortiNo = tgtFlight.pilot.dailyFlightCount + 1;

  // Yeni path'ler: requester'ın flight'ı artık target'a gidecek ve vice versa
  const newReqFlightPath = `${today}/${tgtPilotSafe}/${tgtSortiNo}_sorti/${reqFlight.customer.displayId}`;
  const newTgtFlightPath = `${today}/${reqPilotSafe}/${reqSortiNo}_sorti/${tgtFlight.customer.displayId}`;

  // DB transaction
  const result = await prisma.$transaction(async (tx) => {
    // Flight.pilotId swap
    await tx.flight.update({ where: { id: reqFlight.id }, data: { pilotId: tgtFlight.pilotId } });
    await tx.flight.update({ where: { id: tgtFlight.id }, data: { pilotId: reqFlight.pilotId } });

    // Customer.assignedPilotId swap
    await tx.customer.update({ where: { id: reqFlight.customerId }, data: { assignedPilotId: tgtFlight.pilotId } });
    await tx.customer.update({ where: { id: tgtFlight.customerId }, data: { assignedPilotId: reqFlight.pilotId } });

    // MediaFolder swap (pilotId ve path)
    if (reqFlight.mediaFolder) {
      await tx.mediaFolder.update({
        where: { id: reqFlight.mediaFolder.id },
        data: { pilotId: tgtFlight.pilotId, folderPath: `media/${newReqFlightPath}` },
      });
    }
    if (tgtFlight.mediaFolder) {
      await tx.mediaFolder.update({
        where: { id: tgtFlight.mediaFolder.id },
        data: { pilotId: reqFlight.pilotId, folderPath: `media/${newTgtFlightPath}` },
      });
    }

    // Swap request'i APPROVED işaretle
    const updated = await tx.pilotSwapRequest.update({
      where: { id: swapRequestId },
      data: { status: 'APPROVED', respondedAt: new Date() },
    });
    return updated;
  });

  // NAS klasörlerini taşı (best-effort, DB commit'den sonra)
  try {
    if (reqFlight.mediaFolder) {
      const oldPath = reqFlight.mediaFolder.folderPath.replace(/^media\//, '');
      await qnap.moveFolder(oldPath, newReqFlightPath);
    }
    if (tgtFlight.mediaFolder) {
      const oldPath = tgtFlight.mediaFolder.folderPath.replace(/^media\//, '');
      await qnap.moveFolder(oldPath, newTgtFlightPath);
    }
  } catch (e: any) {
    console.error('NAS folder swap error (DB updated):', e?.message);
  }

  // Her iki pilota da bildirim
  const notifyReq = sendNativeToPilot(reqFlight.pilotId, {
    title: '✅ Pilot Değişimi Onaylandı',
    body: `Yeni müşteri: ${tgtFlight.customer.firstName} ${tgtFlight.customer.lastName} (${tgtFlight.customer.displayId})`,
    data: { type: 'pilot_swap_approved', swapRequestId: swap.id },
  }).catch(() => {});

  const notifyTgt = sendNativeToPilot(tgtFlight.pilotId, {
    title: '✅ Pilot Değişimi Onaylandı',
    body: `Yeni müşteri: ${reqFlight.customer.firstName} ${reqFlight.customer.lastName} (${reqFlight.customer.displayId})`,
    data: { type: 'pilot_swap_approved', swapRequestId: swap.id },
  }).catch(() => {});

  await Promise.all([notifyReq, notifyTgt]);

  return result;
}

export async function declineSwap(swapRequestId: string, decliningPilotId: string) {
  const swap = await prisma.pilotSwapRequest.findUnique({ where: { id: swapRequestId } });
  if (!swap) throw new Error('Talep bulunamadı');
  if (swap.targetPilotId !== decliningPilotId) throw new Error('Yetkiniz yok');
  if (swap.status !== 'PENDING') throw new Error('Talep zaten yanıtlandı');

  const updated = await prisma.pilotSwapRequest.update({
    where: { id: swapRequestId },
    data: { status: 'DECLINED', respondedAt: new Date() },
  });

  // Requester'a FCM
  sendNativeToPilot(swap.requesterPilotId, {
    title: '❌ Pilot Değişimi Reddedildi',
    body: 'Müşteri değişim talebiniz reddedildi.',
    data: { type: 'pilot_swap_declined', swapRequestId },
  }).catch(() => {});

  return updated;
}

// PENDING talepleri kontrol et — pilot için bekleyen var mı?
export async function getPendingSwapForPilot(pilotId: string) {
  const swap = await prisma.pilotSwapRequest.findFirst({
    where: {
      targetPilotId: pilotId,
      status: 'PENDING',
      expiresAt: { gt: new Date() },
    },
    include: {
      requester: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  if (!swap) return null;

  // Her iki flight'ı ve müşteri bilgilerini getir
  const [requesterFlight, targetFlight] = await Promise.all([
    prisma.flight.findUnique({
      where: { id: swap.requesterFlightId },
      include: { customer: { select: { firstName: true, lastName: true, displayId: true, weight: true } } },
    }),
    prisma.flight.findUnique({
      where: { id: swap.targetFlightId },
      include: { customer: { select: { firstName: true, lastName: true, displayId: true, weight: true } } },
    }),
  ]);

  return {
    ...swap,
    requesterCustomer: requesterFlight?.customer || null,
    targetCustomer: targetFlight?.customer || null,
  };
}

// PICKED_UP durumundaki diğer pilotları getir (swap için hedef seçimi)
export async function getSwappablePilots(excludePilotId: string) {
  return prisma.flight.findMany({
    where: {
      status: 'PICKED_UP',
      pilotId: { not: excludePilotId },
    },
    include: {
      pilot: { select: { id: true, name: true } },
      customer: { select: { displayId: true, firstName: true, lastName: true, weight: true } },
    },
  });
}
