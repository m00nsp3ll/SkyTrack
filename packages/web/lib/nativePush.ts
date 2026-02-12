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
  if (!isNativePlatform()) return;

  try {
    const permission = await PushNotifications.requestPermissions();
    if (permission.receive !== 'granted') {
      console.log('Push notification permission not granted');
      return;
    }

    await PushNotifications.register();

    // Token alındığında
    PushNotifications.addListener('registration', async (token) => {
      console.log('FCM Token:', token.value);
      const authToken = getAuthToken();
      if (authToken) {
        await handleTokenRefresh(token.value, authToken);
      }
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.error('FCM registration error:', error);
    });

    // Uygulama foreground'a geldiğinde token kontrol et
    App.addListener('appStateChange', async ({ isActive }) => {
      if (isActive) {
        const authToken = getAuthToken();
        if (authToken) {
          await checkAndRefreshToken(authToken);
        }
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
  } catch (error) {
    console.error('Native push init error:', error);
  }
}

async function handleTokenRefresh(newToken: string, authToken: string) {
  const oldToken = localStorage.getItem(LAST_TOKEN_KEY);
  const baseUrl = getApiBaseUrl();

  try {
    // Token değiştiyse eski token'ı sil
    if (oldToken && oldToken !== newToken) {
      await fetch(`${baseUrl}/api/fcm/unregister`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ token: oldToken }),
      }).catch(console.error);
    }

    // Yeni token'ı kaydet
    await fetch(`${baseUrl}/api/fcm/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        token: newToken,
        platform: Capacitor.getPlatform(),
        device: `${Capacitor.getPlatform()} - SkyTrack Yp`,
      }),
    });

    // Local'e kaydet
    localStorage.setItem(LAST_TOKEN_KEY, newToken);
    localStorage.setItem(LAST_REFRESH_KEY, new Date().toISOString());
    console.log('FCM token registered/refreshed');
  } catch (error) {
    console.error('FCM token refresh error:', error);
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
      console.log('FCM token refresh check completed');
    } catch (error) {
      console.error('FCM token refresh check error:', error);
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
