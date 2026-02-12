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
    console.error('FCM error:', error.message);
    // Token geçersizse sil
    if (error.code === 'messaging/registration-token-not-registered' ||
        error.code === 'messaging/invalid-registration-token') {
      await prisma.fcmToken.updateMany({
        where: { token: fcmToken },
        data: { isActive: false },
      });
      console.log('Deactivated invalid FCM token');
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
  if (!firebaseInitialized) return;

  const tokens = await prisma.fcmToken.findMany({
    where: { user: { role: 'PILOT' }, isActive: true },
  });

  const tokenStrings = tokens.map(t => t.token);
  if (tokenStrings.length === 0) return;

  try {
    await admin.messaging().sendEachForMulticast({
      tokens: tokenStrings,
      notification: { title: payload.title, body: payload.body },
      data: payload.data || {},
      android: { priority: 'high' },
    });
    console.log(`FCM broadcast sent to ${tokenStrings.length} pilot devices`);
  } catch (error) {
    console.error('FCM broadcast error:', error);
  }
}

// Tüm kullanıcılara gönder
export async function sendNativeBroadcast(payload: NotificationPayload) {
  if (!firebaseInitialized) return;

  const tokens = await prisma.fcmToken.findMany({
    where: { isActive: true },
  });

  const tokenStrings = tokens.map(t => t.token);
  if (tokenStrings.length === 0) return;

  try {
    await admin.messaging().sendEachForMulticast({
      tokens: tokenStrings,
      notification: { title: payload.title, body: payload.body },
      data: payload.data || {},
      android: { priority: 'high' },
    });
    console.log(`FCM broadcast sent to ${tokenStrings.length} devices`);
  } catch (error) {
    console.error('FCM broadcast error:', error);
  }
}

export { firebaseInitialized };
