// Firebase Messaging Service Worker
// Handles background push notifications when the app is closed or backgrounded.
// This file MUST be named exactly firebase-messaging-sw.js and served from the root.

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Firebase config is injected at build time via the self.__FIREBASE_CONFIG__ pattern.
// We read it from the SW's own URL query params so we don't hard-code any secrets.
// The main app posts the config once via postMessage after the SW is activated.
let messaging = null;

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    try {
      const app = firebase.initializeApp(event.data.config);
      messaging = firebase.messaging(app);
      console.log('[firebase-messaging-sw] Firebase initialized via postMessage');
    } catch (e) {
      // App may already be initialized
      try {
        messaging = firebase.messaging();
      } catch (e2) {
        console.warn('[firebase-messaging-sw] Could not initialize messaging:', e2);
      }
    }
  }
});

// Handle background messages — shown when the app tab is not in focus
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { notification: { title: 'Musa', body: event.data.text() } };
  }

  const notification = payload.notification || {};
  const data = payload.data || {};

  const title = notification.title || 'Musa Security';
  const body  = notification.body  || 'You have a new notification.';

  const isEmergency = data.type === 'emergency_alert';
  const isGuestCheckin = data.type === 'guest-checkin';
  
  const options = {
    body,
    icon: '/images/icon-192x192.png',
    badge: '/images/icon-192x192.png',
    tag: data.tag || data.type || 'musa-notification',
    data: { url: data.url || '/', ...data },
    // Emergency: require interaction (stays on lock screen until dismissed)
    requireInteraction: isEmergency || isGuestCheckin,
    // Emergency: urgent vibration pattern; Guest: standard pattern
    vibrate: isEmergency 
      ? [500, 200, 500, 200, 500, 200, 500] 
      : [200, 100, 200],
    // Emergency: high priority for Android lock screen
    priority: isEmergency ? 'high' : 'default',
    // Emergency: show on lock screen even with sensitive content hidden
    visibility: 'public',
    actions: isGuestCheckin
      ? [{ action: 'view', title: 'View Details' }]
      : isEmergency
        ? [{ action: 'acknowledge', title: 'Acknowledge' }]
        : [],
  };

  event.waitUntil(self.registration.showNotification(title, options));
  
  // For emergency, also try to play a sound via Audio if possible in SW context
  if (isEmergency) {
    // Service Workers can't directly play audio, but we can tell the client to do so
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach(client => {
          client.postMessage({ type: 'PLAY_EMERGENCY_SOUND' });
        });
      }).catch(() => {})
    );
  }
});

// Handle notification click — open/focus the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = (event.notification.data && event.notification.data.url) || '/';
  const action = event.action;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing tab if available
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
