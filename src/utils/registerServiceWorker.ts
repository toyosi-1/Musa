// Check if service workers are supported
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  // Wait for the window to load before registering the service worker
  window.addEventListener('load', () => {
    // Register the service worker
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registered with scope:', registration.scope);
        
        // Check for updates
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content is available; show update notification
                console.log('New content is available; please refresh.');
                
                // You can show a toast or notification to the user here
                if (window.confirm('A new version of Musa is available. Would you like to update now?')) {
                  window.location.reload();
                }
              } else if (installingWorker.state === 'installed' && !navigator.serviceWorker.controller) {
                // Content is cached for offline use
                console.log('Content is cached for offline use.');
              }
            };
          }
        };
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
  });
  
  // Listen for controller change (when a new service worker takes over)
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      window.location.reload();
      refreshing = true;
    }
  });
}
