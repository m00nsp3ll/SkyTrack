import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

const TOKEN_KEY = 'skytrack_fcm_token';
let initialized = false;

// InAppNotificationBanner uyumluluğu
type InAppNotificationHandler = (notification: any) => void;
let inAppHandler: InAppNotificationHandler | null = null;

export function setInAppNotificationHandler(handler: InAppNotificationHandler | null) {
  inAppHandler = handler;
}

export function isNativePlatform() {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export async function initNativePush(authToken?: string) {
  if (initialized) {
    console.log('[PUSH] already initialized, skip');
    return;
  }
  initialized = true;

  const platform = Capacitor.getPlatform();
  console.log('[PUSH] initNativePush v3 - platform:', platform);

  if (!Capacitor.isNativePlatform()) return;

  // Auth token: parametre veya localStorage'dan
  const token = authToken || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
  if (!token) {
    console.log('[PUSH] no auth token found, skip');
    initialized = false;
    return;
  }

  // A: AppDelegate'den native event dinle
  window.addEventListener('nativeFCMToken', async (e: any) => {
    console.log('[PUSH] nativeFCMToken event received');
    if (e.detail && !(window as any)._fcmTokenDone) {
      await registerToken(e.detail, platform, token);
    }
  });

  // Eski event adını da dinle (AppDelegate'de 'fcmToken' kullanılıyor olabilir)
  window.addEventListener('fcmToken', async (e: any) => {
    console.log('[PUSH] fcmToken event received (legacy)');
    if (e.detail && !(window as any)._fcmTokenDone) {
      await registerToken(e.detail, platform, token);
    }
  });

  // B: Zaten inject edilmiş token var mı?
  if ((window as any)._nativeFCMToken && !(window as any)._fcmTokenDone) {
    console.log('[PUSH] found existing _nativeFCMToken');
    await registerToken((window as any)._nativeFCMToken, platform, token);
  }

  // C: Capacitor plugin
  try {
    const perm = await PushNotifications.requestPermissions();
    console.log('[PUSH] permission:', perm.receive);
    if (perm.receive === 'granted') {
      await PushNotifications.register();
      PushNotifications.addListener('registration', async (t) => {
        console.log('[PUSH] capacitor registration event, token:', t.value?.substring(0, 30));
        if (t.value && !(window as any)._fcmTokenDone) {
          await registerToken(t.value, platform, token);
        }
      });
      PushNotifications.addListener('registrationError', (err) => {
        console.error('[PUSH] registrationError:', err);
      });
    }
  } catch (e) {
    console.error('[PUSH] capacitor error:', e);
  }

  // D: Bildirim dinleyicileri
  try {
    PushNotifications.addListener('pushNotificationReceived', (n) => {
      console.log('[PUSH] notification received:', n.title, n.body);
      // In-app banner göster
      if (inAppHandler) {
        inAppHandler(n);
      }
    });
    PushNotifications.addListener('pushNotificationActionPerformed', (a) => {
      const data = a.notification.data;
      const notificationType = data?.type as string;

      switch (notificationType) {
        case 'customer_assigned':
        case 'customer_reassigned':
        case 'flight_completed':
        case 'flight_cancelled':
        case 'pilot_limit_warning':
        case 'pilot_limit_reached':
          window.location.href = '/pilot';
          break;
        case 'broadcast':
        case 'admin_alert':
          window.location.href = '/admin';
          break;
        default:
          if (data?.url) {
            window.location.href = data.url;
          } else {
            window.location.href = '/';
          }
      }
    });
  } catch (e) {}

  // E: Retry - 4s, 8s, 14s, 22s, 35s
  [4000, 8000, 14000, 22000, 35000].forEach(delay => {
    setTimeout(async () => {
      const tk = (window as any)._nativeFCMToken;
      if (!(window as any)._fcmTokenDone && tk) {
        console.log(`[PUSH] retry at ${delay/1000}s`);
        await registerToken(tk, platform, token);
      }
    }, delay);
  });

  console.log('[PUSH] initNativePush v3 setup complete');
}

function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return 'https://api.skytrackyp.com';
  const hostname = window.location.hostname;

  if (hostname === 'skytrackyp.com' || hostname === 'www.skytrackyp.com') {
    return 'https://api.skytrackyp.com';
  }
  if (hostname === 'localhost' && isNativePlatform()) {
    return 'https://api.skytrackyp.com';
  }
  return `https://${hostname}:3001`;
}

async function registerToken(fcmToken: string, platform: string, authToken: string) {
  if ((window as any)._fcmTokenDone) return;

  console.log('[PUSH] >>> REGISTERING TOKEN <<<');
  console.log('[PUSH] token:', fcmToken.substring(0, 30));

  const baseUrl = getApiBaseUrl();
  console.log('[PUSH] API base:', baseUrl);

  try {
    const oldToken = localStorage.getItem(TOKEN_KEY);
    if (oldToken && oldToken !== fcmToken) {
      fetch(`${baseUrl}/api/fcm/unregister`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ token: oldToken })
      }).catch(() => {});
    }

    const res = await fetch(`${baseUrl}/api/fcm/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
      body: JSON.stringify({ token: fcmToken, platform, device: `${platform} - SkyTrack Yp` })
    });

    console.log('[PUSH] register response status:', res.status);

    // If JWT expired, try keepalive (public endpoint — just marks existing token active)
    if (res.status === 401) {
      console.log('[PUSH] JWT expired, attempting keepalive for existing token...');
      const keepRes = await fetch(`${baseUrl}/api/fcm/keepalive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: fcmToken }),
      });
      if (keepRes.ok) {
        console.log('[PUSH] keepalive OK — token kept active');
        localStorage.setItem(TOKEN_KEY, fcmToken);
        (window as any)._fcmTokenDone = true;
      } else {
        console.warn('[PUSH] keepalive failed (token not registered) — pilot needs to re-login');
      }
      return;
    }

    if (res.ok) {
      const data = await res.json();
      console.log('[PUSH] TOKEN REGISTERED:', JSON.stringify(data));
      localStorage.setItem(TOKEN_KEY, fcmToken);
      (window as any)._fcmTokenDone = true;
    } else {
      const errText = await res.text();
      console.error('[PUSH] register failed:', res.status, errText);
    }
  } catch (err) {
    console.error('[PUSH] register error:', err);
  }
}

// Logout'ta FCM token'ı temizle — eski adıyla da export et
export async function cleanupPushOnLogout() {
  if (!isNativePlatform()) return;

  const fcmToken = localStorage.getItem(TOKEN_KEY);
  const authToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  if (fcmToken && authToken) {
    const baseUrl = getApiBaseUrl();
    try {
      await fetch(`${baseUrl}/api/fcm/unregister`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ token: fcmToken }),
      });
    } catch (error) {
      console.error('[PUSH] cleanup error:', error);
    }
  }

  localStorage.removeItem(TOKEN_KEY);
  (window as any)._fcmTokenDone = false;
  (window as any)._nativeFCMToken = null;
  initialized = false;
}

// Backward compatibility alias
export const cleanupFcmToken = cleanupPushOnLogout;
