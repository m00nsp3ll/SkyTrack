import { Capacitor } from '@capacitor/core';
import { PushNotifications, PushNotificationSchema } from '@capacitor/push-notifications';
import { api } from './api';

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

export async function initNativePush() {
  if (!isNativePlatform()) return;

  try {
    const permission = await PushNotifications.requestPermissions();
    if (permission.receive !== 'granted') {
      console.log('Push notification permission not granted');
      return;
    }

    await PushNotifications.register();

    PushNotifications.addListener('registration', async (token) => {
      console.log('FCM Token:', token.value);
      try {
        await api.post('/fcm/register', {
          token: token.value,
          platform: Capacitor.getPlatform(),
          device: `${Capacitor.getPlatform()} - ${navigator.userAgent.slice(0, 50)}`,
        });
        console.log('FCM token registered');
      } catch (error) {
        console.error('FCM register error:', error);
      }
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.error('FCM registration error:', error);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[FCM] Push received:', notification);
      // Show in-app banner if app is open
      if (onInAppNotification) {
        onInAppNotification(notification);
      }
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('[FCM] Notification clicked:', action);
      const data = action.notification.data;

      // Route based on notification type
      const notificationType = data?.type as string;

      switch (notificationType) {
        case 'customer_assigned':
        case 'customer_reassigned':
          // Pilot: Go to pilot page to see assigned customer
          window.location.href = '/pilot';
          break;

        case 'flight_completed':
          // Pilot: Go to pilot page
          window.location.href = '/pilot';
          break;

        case 'flight_cancelled':
          // Pilot: Go to pilot page
          window.location.href = '/pilot';
          break;

        case 'pilot_limit_warning':
        case 'pilot_limit_reached':
          // Pilot: Go to pilot page
          window.location.href = '/pilot';
          break;

        case 'broadcast':
        case 'admin_alert':
          // Admin: Go to dashboard
          window.location.href = '/admin';
          break;

        default:
          // Fallback: use URL if provided, otherwise go to home
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
