import { Capacitor } from '@capacitor/core';
import { PushNotifications, PushNotificationSchema } from '@capacitor/push-notifications';
import { App } from '@capacitor/app';

const LAST_TOKEN_KEY = 'skytrack_fcm_token';
const LAST_REFRESH_KEY = 'skytrack_fcm_last_refresh';

// In-app notification callback (set by InAppNotificationBanner component)
let onInAppNotification: ((notification: PushNotificationSchema) => void) | null = null;

export function setInAppNotificationHandler(handler: (notification: PushNotificationSchema) => void) {
  onInAppNotification = handler;
}

export function isNativePlatform() {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return 'https://api.skytrackyp.com';
  const hostname = window.location.hostname;

  if (hostname === 'skytrackyp.com' || hostname === 'www.skytrackyp.com') {
    return 'https://api.skytrackyp.com';
  }
  if (hostname.includes('trycloudflare.com')) {
    return `https://${hostname.replace(/^[^.]+/, 'api')}`;
  }
  // Capacitor apps run on localhost but need real API
  if (hostname === 'localhost' && isNativePlatform()) {
    return 'https://api.skytrackyp.com';
  }
  return `https://${hostname}:3001`;
}

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export async function initNativePush() {
  console.log('=== initNativePush START ===');
  console.log('Platform:', Capacitor.getPlatform());
  console.log('Is native:', isNativePlatform());

  if (!isNativePlatform()) {
    console.log('Not native platform, skipping push init');
    return;
  }

  const authToken = getAuthToken();
  if (!authToken) {
    console.log('No auth token, skipping push init');
    return;
  }

  try {
    // İzin iste
    const permission = await PushNotifications.requestPermissions();
    console.log('Push permission result:', JSON.stringify(permission));

    if (permission.receive !== 'granted') {
      console.warn('Push permission denied');
      return;
    }

    // Register çağır
    await PushNotifications.register();
    console.log('PushNotifications.register() called');

    // Registration listener - Capacitor plugin token döndüğünde
    PushNotifications.addListener('registration', async (token) => {
      console.log('=== REGISTRATION EVENT ===');
      console.log('FCM Token from registration:', token.value);
      const currentAuth = getAuthToken();
      if (currentAuth) {
        await sendTokenToBackend(token.value, currentAuth);
      }
    });

    // Registration error
    PushNotifications.addListener('registrationError', (error) => {
      console.error('Push registration error:', JSON.stringify(error));
    });

    // AppDelegate'den gelen FCM token event'ini dinle (iOS fallback)
    window.addEventListener('fcmToken', async (event: any) => {
      const token = event.detail;
      console.log('=== FCM TOKEN FROM NATIVE EVENT ===');
      console.log('Token:', token.substring(0, 30) + '...');
      const currentAuth = getAuthToken();
      if (currentAuth) {
        await sendTokenToBackend(token, currentAuth);
      }
    });

    // Bildirim geldiğinde (uygulama açıkken)
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[FCM] Push received:', notification);
      if (onInAppNotification) {
        onInAppNotification(notification);
      }
    });

    // Bildirime tıklandığında
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('[FCM] Notification clicked:', action);
      const data = action.notification.data;
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
          const url = data?.url as string;
          if (url) {
            window.location.href = url;
          } else {
            window.location.href = '/';
          }
      }
    });

    // App state listener (foreground'a geldiğinde token yenile)
    App.addListener('appStateChange', async ({ isActive }) => {
      if (isActive) {
        const currentAuth = getAuthToken();
        if (currentAuth) {
          await checkAndRefreshToken(currentAuth);
        }
      }
    });

    // 5 saniye sonra token kontrolü - registration event gelmemiş olabilir
    setTimeout(async () => {
      const existingToken = localStorage.getItem(LAST_TOKEN_KEY);
      if (!existingToken) {
        console.log('No token registered after 5s, retrying register...');
        try {
          await PushNotifications.register();
        } catch (e) {
          console.log('Retry register error:', e);
        }
      } else {
        console.log('Token already registered:', existingToken.substring(0, 30) + '...');
      }
    }, 5000);

    console.log('=== initNativePush COMPLETE ===');

  } catch (error) {
    console.error('initNativePush error:', error);
  }
}

async function sendTokenToBackend(fcmToken: string, authToken: string) {
  console.log('=== sendTokenToBackend ===');
  console.log('Token:', fcmToken.substring(0, 30) + '...');

  const oldToken = localStorage.getItem(LAST_TOKEN_KEY);
  const baseUrl = getApiBaseUrl();
  const platform = Capacitor.getPlatform();

  try {
    // Eski token farklıysa sil
    if (oldToken && oldToken !== fcmToken) {
      console.log('Old token exists, deleting...');
      await fetch(`${baseUrl}/api/fcm/unregister`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ token: oldToken })
      }).catch(err => console.error('Delete old token error:', err));
    }

    // Yeni token kaydet
    console.log('Registering new token to:', baseUrl);
    const response = await fetch(`${baseUrl}/api/fcm/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        token: fcmToken,
        platform: platform,
        device: `${platform} - SkyTrack Yp`
      })
    });

    const data = await response.json();
    console.log('Register response:', JSON.stringify(data));

    if (response.ok) {
      localStorage.setItem(LAST_TOKEN_KEY, fcmToken);
      localStorage.setItem(LAST_REFRESH_KEY, new Date().toISOString());
      console.log('✅ FCM token registered successfully');
    } else {
      console.error('❌ FCM register failed:', data);
    }
  } catch (error) {
    console.error('sendTokenToBackend error:', error);
  }
}

async function checkAndRefreshToken(authToken: string) {
  const lastRefresh = localStorage.getItem(LAST_REFRESH_KEY);
  const now = new Date();

  // Son yenilemeden 24 saat geçmediyse gerek yok
  if (lastRefresh) {
    const diff = now.getTime() - new Date(lastRefresh).getTime();
    const hoursPassed = diff / (1000 * 60 * 60);
    if (hoursPassed < 24) return;
  }

  // Token'ı yeniden kaydet (backend updatedAt günceller)
  const currentToken = localStorage.getItem(LAST_TOKEN_KEY);
  if (currentToken) {
    const baseUrl = getApiBaseUrl();
    try {
      await fetch(`${baseUrl}/api/fcm/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          token: currentToken,
          platform: Capacitor.getPlatform(),
          device: `${Capacitor.getPlatform()} - SkyTrack Yp`,
        }),
      });
      localStorage.setItem(LAST_REFRESH_KEY, now.toISOString());
      console.log('Token refreshed');
    } catch (error) {
      console.error('Token refresh error:', error);
    }
  }
}

// Logout'ta FCM token'ı temizle
export async function cleanupFcmToken() {
  if (!isNativePlatform()) return;

  const fcmToken = localStorage.getItem(LAST_TOKEN_KEY);
  const authToken = getAuthToken();

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
      console.error('FCM token cleanup error:', error);
    }
  }

  localStorage.removeItem(LAST_TOKEN_KEY);
  localStorage.removeItem(LAST_REFRESH_KEY);
}
