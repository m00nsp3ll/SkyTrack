import webpush from 'web-push';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load .env file explicitly
dotenv.config({ path: '../../.env' });

const prisma = new PrismaClient();

// Configure web-push with VAPID keys
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@skytrack.com';

console.log('[Push] VAPID Config:', {
  publicKey: vapidPublicKey ? vapidPublicKey.substring(0, 20) + '...' : 'NOT SET',
  privateKey: vapidPrivateKey ? 'SET' : 'NOT SET',
  subject: vapidSubject,
});

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  console.log('[Push] VAPID configured successfully');
} else {
  console.error('[Push] ERROR: VAPID keys not configured!');
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  vibrate?: number[];
  requireInteraction?: boolean;
  data?: Record<string, any>;
}

interface PushResult {
  success: boolean;
  sent: number;
  failed: number;
  errors: string[];
}

/**
 * Send push notification to a specific user (all their devices)
 */
export async function sendPushToUser(
  userId: string,
  payload: PushNotificationPayload
): Promise<PushResult> {
  const result: PushResult = { success: true, sent: 0, failed: 0, errors: [] };

  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId, isActive: true },
    });

    if (subscriptions.length === 0) {
      result.success = false;
      result.errors.push('No active subscriptions found for user');
      return result;
    }

    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: payload.badge || '/icons/badge-72x72.png',
      url: payload.url || '/',
      tag: payload.tag,
      vibrate: payload.vibrate || [200, 100, 200],
      requireInteraction: payload.requireInteraction ?? true,
      data: payload.data,
    });

    for (const subscription of subscriptions) {
      try {
        console.log('[Push] Sending to endpoint:', subscription.endpoint.substring(0, 50) + '...');
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          notificationPayload
        );
        console.log('[Push] Sent successfully');
        result.sent++;
      } catch (error: any) {
        console.error('[Push] Send error:', error.statusCode, error.message, error.body);
        result.failed++;

        // If subscription is expired or invalid, deactivate it
        if (error.statusCode === 410 || error.statusCode === 404) {
          await prisma.pushSubscription.update({
            where: { id: subscription.id },
            data: { isActive: false },
          });
          result.errors.push(`Subscription ${subscription.id} expired and deactivated`);
        } else {
          result.errors.push(`Failed to send to ${subscription.id}: ${error.message}`);
        }
      }
    }

    result.success = result.sent > 0;
  } catch (error: any) {
    result.success = false;
    result.errors.push(`Database error: ${error.message}`);
  }

  return result;
}

/**
 * Send push notification to a pilot by pilotId
 */
export async function sendPushToPilot(
  pilotId: string,
  payload: PushNotificationPayload
): Promise<PushResult> {
  try {
    // Find user associated with this pilot
    const user = await prisma.user.findFirst({
      where: { pilotId },
    });

    if (!user) {
      return {
        success: false,
        sent: 0,
        failed: 0,
        errors: ['No user account found for pilot'],
      };
    }

    return sendPushToUser(user.id, payload);
  } catch (error: any) {
    return {
      success: false,
      sent: 0,
      failed: 0,
      errors: [`Error finding pilot user: ${error.message}`],
    };
  }
}

/**
 * Send push notification to all users with a specific role
 */
export async function sendPushToRole(
  role: 'ADMIN' | 'OFFICE_STAFF' | 'PILOT' | 'MEDIA_SELLER',
  payload: PushNotificationPayload
): Promise<PushResult> {
  const result: PushResult = { success: true, sent: 0, failed: 0, errors: [] };

  try {
    const users = await prisma.user.findMany({
      where: { role },
      select: { id: true },
    });

    for (const user of users) {
      const userResult = await sendPushToUser(user.id, payload);
      result.sent += userResult.sent;
      result.failed += userResult.failed;
      result.errors.push(...userResult.errors);
    }

    result.success = result.sent > 0;
  } catch (error: any) {
    result.success = false;
    result.errors.push(`Error fetching users: ${error.message}`);
  }

  return result;
}

/**
 * Send push notification to all active subscriptions (broadcast)
 */
export async function sendPushBroadcast(
  payload: PushNotificationPayload
): Promise<PushResult> {
  const result: PushResult = { success: true, sent: 0, failed: 0, errors: [] };

  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { isActive: true },
    });

    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: payload.badge || '/icons/badge-72x72.png',
      url: payload.url || '/',
      tag: payload.tag || 'broadcast',
      vibrate: payload.vibrate || [200, 100, 200],
      requireInteraction: payload.requireInteraction ?? false,
      data: payload.data,
    });

    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          notificationPayload
        );
        result.sent++;
      } catch (error: any) {
        result.failed++;

        if (error.statusCode === 410 || error.statusCode === 404) {
          await prisma.pushSubscription.update({
            where: { id: subscription.id },
            data: { isActive: false },
          });
        }
      }
    }

    result.success = result.sent > 0 || subscriptions.length === 0;
  } catch (error: any) {
    result.success = false;
    result.errors.push(`Broadcast error: ${error.message}`);
  }

  return result;
}

// Pre-defined notification templates
export const notifications = {
  customerAssigned: (customerName: string, displayId: string, weight: number) => ({
    title: '🪂 Yeni Müşteri Atandı',
    body: `${customerName} (${displayId}) - ${weight}kg`,
    url: '/pilot',
    tag: 'customer-assigned',
    vibrate: [200, 100, 200] as number[],
    requireInteraction: true,
  }),

  customerCancelled: (customerName: string, displayId: string) => ({
    title: '❌ Müşteri İptal',
    body: `${customerName} (${displayId}) iptal edildi`,
    url: '/pilot',
    tag: 'customer-cancelled',
    vibrate: [100, 50, 100] as number[],
  }),

  limitWarning: (current: number, max: number) => ({
    title: '⚠️ Limite Yaklaşıyorsunuz',
    body: `Bugün ${current}/${max} uçuş tamamlandı`,
    url: '/pilot',
    tag: 'limit-warning',
  }),

  limitReached: (max: number) => ({
    title: '🛑 Günlük Limit Doldu',
    body: `${max}/${max} uçuş tamamlandı. Bugünlük sıra dışısınız.`,
    url: '/pilot',
    tag: 'limit-reached',
    requireInteraction: true,
  }),

  longFlightWarning: (pilotName: string, duration: number, customerName: string) => ({
    title: '⚠️ Uzun Uçuş Uyarısı',
    body: `Pilot ${pilotName} ${duration} dakikadır havada - ${customerName}`,
    url: '/admin/flights',
    tag: 'long-flight',
    requireInteraction: true,
  }),

  noPilotAvailable: () => ({
    title: '🚫 Müsait Pilot Yok',
    body: 'Tüm pilotlar dolu veya limite ulaştı',
    url: '/admin/pilots',
    tag: 'no-pilot',
    requireInteraction: true,
  }),
};
