/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

// Push notification handler
self.addEventListener('push', (event) => {
  if (!event.data) {
    console.log('Push event received but no data');
    return;
  }

  try {
    const data = event.data.json();

    const options: NotificationOptions = {
      body: data.body || '',
      icon: data.icon || '/icons/icon-192x192.png',
      badge: data.badge || '/icons/icon-72x72.png',
      vibrate: data.vibrate || [200, 100, 200],
      tag: data.tag || 'default',
      requireInteraction: data.requireInteraction ?? true,
      data: {
        url: data.url || '/',
        ...data.data,
      },
      actions: data.actions || [],
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'SkyTrack', options)
    );
  } catch (error) {
    console.error('Error parsing push data:', error);
  }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already an open window we can focus
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          // Navigate to the notification URL
          if ('navigate' in client) {
            (client as WindowClient).navigate(url);
          }
          return;
        }
      }

      // No open window, open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

// Notification close handler (optional analytics)
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event.notification.tag);
});

// Background sync for offline actions (optional)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-actions') {
    event.waitUntil(syncPendingActions());
  }
});

async function syncPendingActions() {
  // Get pending actions from IndexedDB and sync them
  console.log('Syncing pending actions...');
}

export {};
