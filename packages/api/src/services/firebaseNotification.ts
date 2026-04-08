import * as admin from 'firebase-admin';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

// Firebase'i başlat (service account varsa)
// __dirname compile sonrası dist/services/ oluyor, o yüzden process.cwd() kullan
const serviceAccountPath = path.resolve(process.cwd(), 'firebase-service-account.json');
let firebaseInitialized = false;

if (fs.existsSync(serviceAccountPath)) {
  try {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    firebaseInitialized = true;
    console.log('✅ Firebase Admin initialized');
  } catch (error) {
    console.error('❌ Firebase init error:', error);
  }
} else {
  console.warn('⚠️  Firebase service account not found at', serviceAccountPath);
  console.warn('   FCM notifications will be disabled.');
}

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

// Tek cihaza gönder
export async function sendNativeNotification(fcmToken: string, payload: NotificationPayload) {
  if (!firebaseInitialized) return;

  try {
    await admin.messaging().send({
      token: fcmToken,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data || {},
      // iOS APNs ayarları
      apns: {
        payload: {
          aps: {
            alert: {
              title: payload.title,
              body: payload.body,
            },
            badge: 1,
            sound: 'default',
            'content-available': 1,
          },
        },
        headers: {
          'apns-priority': '10',
          'apns-push-type': 'alert',
        },
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'skytrack_pilot',
          priority: 'max',
          defaultSound: true,
          defaultVibrateTimings: true,
          visibility: 'public',
        },
      },
    });
    console.log('FCM sent OK to', fcmToken.slice(0, 20) + '...');
  } catch (error: any) {
    const errorCode = error?.code || error?.errorInfo?.code || '';
    console.error('FCM error:', error.message);
    console.error('FCM error code:', errorCode);
    console.error('FCM error details:', JSON.stringify(error?.errorInfo || error?.response?.data || {}, null, 2));

    // Geçersiz veya süresi dolmuş token → otomatik sil
    if (
      errorCode === 'messaging/registration-token-not-registered' ||
      errorCode === 'messaging/invalid-registration-token' ||
      errorCode === 'messaging/invalid-argument'
    ) {
      console.log(`Invalid FCM token, removing: ${fcmToken.substring(0, 20)}...`);
      await prisma.fcmToken.deleteMany({
        where: { token: fcmToken },
      });
    }
  }
}

// Belirli bir kullanıcıya gönder (tüm cihazlarına)
export async function sendNativeToUser(userId: string, payload: NotificationPayload) {
  if (!firebaseInitialized) return;

  const tokens = await prisma.fcmToken.findMany({
    where: { userId, isActive: true },
  });

  for (const t of tokens) {
    await sendNativeNotification(t.token, payload);
  }
}

// Pilot kullanıcısına gönder (pilotId üzerinden user bul)
export async function sendNativeToPilot(pilotId: string, payload: NotificationPayload) {
  // Log notification to DB regardless of FCM status
  try {
    await prisma.pilotNotification.create({
      data: {
        pilotId,
        title: payload.title,
        body: payload.body,
        type: payload.data?.type || 'general',
      },
    });
  } catch (e) {
    console.error('PilotNotification log error:', e);
  }

  if (!firebaseInitialized) return;

  const user = await prisma.user.findFirst({
    where: { pilotId, isActive: true },
  });

  if (user) {
    await sendNativeToUser(user.id, payload);
  }
}

// Tüm pilotlara gönder
export async function sendNativeToAllPilots(payload: NotificationPayload) {
  // Log to all active pilots in DB
  try {
    const allPilots = await prisma.pilot.findMany({
      where: { isActive: true },
      select: { id: true },
    });
    await prisma.pilotNotification.createMany({
      data: allPilots.map(p => ({
        pilotId: p.id,
        title: payload.title,
        body: payload.body,
        type: payload.data?.type || 'broadcast',
      })),
    });
  } catch (e) {
    console.error('PilotNotification broadcast log error:', e);
  }

  if (!firebaseInitialized) return;

  const tokens = await prisma.fcmToken.findMany({
    where: { user: { role: 'PILOT' }, isActive: true },
  });

  if (tokens.length === 0) return;

  for (const t of tokens) {
    await sendNativeNotification(t.token, payload);
  }
  console.log(`FCM sent to ${tokens.length} pilot devices`);
}

// Tüm kullanıcılara gönder
export async function sendNativeBroadcast(payload: NotificationPayload) {
  if (!firebaseInitialized) return;

  const tokens = await prisma.fcmToken.findMany({
    where: { isActive: true },
  });

  if (tokens.length === 0) return;

  for (const t of tokens) {
    await sendNativeNotification(t.token, payload);
  }
  console.log(`FCM broadcast sent to ${tokens.length} devices`);
}

// Get notification config for a type (enabled + custom title/body)
export async function getNotificationConfig(type: string): Promise<{ enabled: boolean; title?: string; body?: string } | null> {
  try {
    const record = await prisma.notificationSetting.findFirst();
    if (!record) return { enabled: true };
    const settings = record.settings as Record<string, any>;
    if (!settings[type]) return { enabled: true };
    return {
      enabled: settings[type].enabled !== false,
      title: settings[type].title || undefined,
      body: settings[type].body || undefined,
    };
  } catch {
    return { enabled: true };
  }
}

// Check if a notification type is enabled
export async function isNotificationEnabled(type: string): Promise<boolean> {
  const config = await getNotificationConfig(type);
  return config?.enabled !== false;
}

export { firebaseInitialized };
