// This file handles the registration and communication with the service worker

// Check if service workers are supported
const isSupported = typeof window !== 'undefined' && 
                   'serviceWorker' in navigator && 
                   process.env.NODE_ENV === 'production';

type ServiceWorkerMessage = {
  type: string;
  payload?: any;
};

type ServiceWorkerMessageHandlers = {
  onUpdateAvailable?: () => void;
  onUpdateActivated?: () => void;
};

// Function to register the service worker
export async function registerServiceWorker() {
  // Double check for browser environment
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    console.log('Service workers are not available in server-side rendering');
    return null;
  }
  
  if (!isSupported) {
    console.log('Service workers are not supported in this browser or in development mode');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('ServiceWorker registration successful with scope: ', registration.scope);
    
    // Check for updates periodically
    registration.onupdatefound = () => {
      const installingWorker = registration.installing;
      if (!installingWorker) return;

      installingWorker.onstatechange = () => {
        if (installingWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            // New content is available; inform the user
            console.log('New content is available; please refresh.');
            // You can dispatch an event or update the UI to show an update message
            window.dispatchEvent(new Event('swUpdate'));
          } else {
            // Content is cached for offline use
            console.log('Content is cached for offline use.');
          }
        }
      };
    };

    return registration;
  } catch (error) {
    console.error('ServiceWorker registration failed: ', error);
    return null;
  }
}

// Function to unregister the service worker
export async function unregisterServiceWorker() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined' || !isSupported) return;
  
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
    }
    console.log('ServiceWorker unregistered');
  } catch (error) {
    console.error('Error unregistering service worker: ', error);
  }
}

// Function to check for updates
export async function checkForUpdates() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined' || !isSupported) return;
  
  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.update();
  } catch (error) {
    console.error('Error checking for updates: ', error);
  }
}

// Function to send a message to the service worker
export async function sendMessageToSW(message: ServiceWorkerMessage) {
  if (typeof window === 'undefined' || typeof navigator === 'undefined' || !isSupported) return;
  
  try {
    const registration = await navigator.serviceWorker.ready;
    if (registration.active) {
      registration.active.postMessage(message);
    }
  } catch (error) {
    console.error('Error sending message to service worker: ', error);
  }
}

// Function to handle service worker messages

// Initialize service worker message handling
export function initServiceWorkerMessages(handlers?: ServiceWorkerMessageHandlers) {
  const handleControllerChange = () => {
    // This will be called when a new service worker takes control
    console.log('New content is available; please refresh.');
    handlers?.onUpdateActivated?.();
  };

  const handleMessage = (event: MessageEvent) => {
    if (!event.data) return;
    
    switch (event.data.type) {
      case 'SKIP_WAITING':
        // This will be handled by the service worker
        console.log('Skipping waiting...');
        break;
      case 'UPDATE_AVAILABLE':
        console.log('Update available');
        handlers?.onUpdateAvailable?.();
        break;
      case 'UPDATE_ACTIVATED':
        console.log('Update activated');
        handlers?.onUpdateActivated?.();
        break;
      default:
        console.log('Unknown message from service worker:', event.data);
    }
  };

  // Only add event listeners if in a browser environment
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    // Listen for the controlling service worker changing
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    
    // Listen for messages from the service worker
    navigator.serviceWorker.addEventListener('message', handleMessage);
  }

  // Return cleanup function
  return () => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    }
  };
}

// Check if the page is being controlled by a service worker
export function isControlledByServiceWorker() {
  return isSupported && navigator.serviceWorker.controller !== null;
}

// Get the current service worker registration
export async function getServiceWorkerRegistration() {
  if (!isSupported) return null;
  
  try {
    return await navigator.serviceWorker.ready;
  } catch (error) {
    console.error('Error getting service worker registration: ', error);
    return null;
  }
}

// Clear all caches
export async function clearCaches() {
  if (!isSupported) return;
  
  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );
    console.log('All caches cleared');
  } catch (error) {
    console.error('Error clearing caches: ', error);
  }
}
