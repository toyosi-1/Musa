"use client";

import { useEffect, useState } from 'react';
import { BUILD_TIMESTAMP } from '@/lib/version';

/**
 * Checks for app updates and prompts user to reload.
 * For PWAs, this ensures users get the latest version after deployment.
 */
export default function UpdateChecker() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if build timestamp has changed (indicates new deployment)
    const checkBuildVersion = () => {
      const storedBuild = localStorage.getItem('musa_build_timestamp');
      const currentBuild = BUILD_TIMESTAMP.toString();
      const updateDismissed = sessionStorage.getItem('musa_update_dismissed');
      
      if (storedBuild && storedBuild !== currentBuild && !updateDismissed) {
        console.log(`🔄 New build detected: ${storedBuild} → ${currentBuild}`);
        setUpdateAvailable(true);
      }
      
      // Always update stored build to current
      localStorage.setItem('musa_build_timestamp', currentBuild);
    };

    // Check for service worker updates
    const checkServiceWorker = async () => {
      if (!('serviceWorker' in navigator)) return;
      
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.update();
        }
      } catch (error) {
        console.warn('Failed to check for SW updates:', error);
      }
    };

    // Listen for service worker updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('🔄 Service worker updated');
        setUpdateAvailable(true);
      });
    }

    // Check immediately on mount
    checkBuildVersion();
    checkServiceWorker();

    // Don't check periodically - only on mount to avoid annoying users
    // The update will be detected on next app open

    return () => {};
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem('musa_update_dismissed', 'true');
    setUpdateAvailable(false);
  };

  const handleReload = () => {
    // Mark as dismissed so it doesn't show again after reload
    sessionStorage.setItem('musa_update_dismissed', 'true');
    
    // Clear service worker cache and force hard reload
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(reg => reg.unregister());
      });
    }
    // Clear all caches
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }
    // Hard reload
    window.location.reload();
  };

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-xl shadow-2xl border border-blue-400">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 text-2xl">🔄</div>
        <div className="flex-1">
          <h3 className="font-semibold mb-1">Update Available</h3>
          <p className="text-sm text-blue-100 mb-3">
            A new version of Musa is ready. Reload to get the latest features and fixes.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleDismiss}
              className="flex-1 bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Later
            </button>
            <button
              onClick={handleReload}
              className="flex-1 bg-white text-blue-600 font-semibold py-2 px-4 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Reload Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
