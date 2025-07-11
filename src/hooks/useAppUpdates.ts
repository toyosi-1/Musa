import { useState, useEffect, useCallback } from 'react';
import { registerServiceWorker, initServiceWorkerMessages } from '../utils/serviceWorker';

/**
 * Custom hook to handle app updates and service worker registration
 * @returns Object containing update state and handlers
 */
export function useAppUpdates() {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [isServiceWorkerRegistered, setIsServiceWorkerRegistered] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Handle service worker updates
  const handleUpdate = useCallback(() => {
    // Skip if window is not available (SSR) or no registration
    if (typeof window === 'undefined' || !registration?.waiting) {
      return;
    }
    
    // Tell the service worker to skip waiting and activate the new version
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    
    // Reload the page once the new service worker is activated
    registration.waiting.addEventListener('statechange', (e: Event) => {
      const sw = e.target as ServiceWorker;
      if (sw.state === 'activated') {
        window.location.reload();
      }
    });
  }, [registration]);

  // Register service worker and set up update handling
  useEffect(() => {
    // Skip if window or navigator is not available (SSR)
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return () => {}; // Return empty cleanup function
    }
    
    // Skip if not in production or service worker not supported
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) {
      return () => {}; // Return empty cleanup function
    }
    
    const registerSW = async () => {
      try {
        // Register service worker
        const reg = await registerServiceWorker();
        
        if (!reg) {
          console.warn('Service worker registration returned null');
          return;
        }
        
        setRegistration(reg);
        
        // Initialize service worker messages with proper types
        const cleanupMessages = initServiceWorkerMessages({
          onUpdateAvailable: () => {
            console.log('Update available');
            setIsUpdateAvailable(true);
          },
          onUpdateActivated: () => {
            console.log('Update activated');
            setIsUpdateAvailable(false);
          },
        });
        
        // Check if there's a waiting service worker
        if (reg.waiting) {
          setIsUpdateAvailable(true);
        }
        
        // Listen for controller change (new service worker activated)
        const handleControllerChange = () => {
          console.log('Controller changed, reloading...');
          window.location.reload();
        };
        
        navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
        
        // Set as registered
        setIsServiceWorkerRegistered(true);
        
        // Cleanup function
        return () => {
          cleanupMessages?.();
          navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
        };
      } catch (error) {
        console.error('Service worker registration failed:', error);
      }
    };
    
    // Call the registration function
    registerSW();
    
    // No dependencies - this effect only runs once on mount
  }, []);

  return {
    isUpdateAvailable,
    isServiceWorkerRegistered,
    handleUpdate,
    registration,
  };
}

export default useAppUpdates;
