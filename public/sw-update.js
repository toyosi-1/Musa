
// Service Worker updater script
// This script helps force update the service worker
const swUpdateTimestamp = 1752434150600;

if ('serviceWorker' in navigator) {
  // Unregister old service workers
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (const registration of registrations) {
      registration.unregister();
      console.log('Service worker unregistered');
    }
    
    // After unregistering, clear caches
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          caches.delete(cacheName);
          console.log('Cache deleted:', cacheName);
        });
      });
    }
    
    // Reload page to register new service worker
    window.location.reload();
  });
}
