"use client";

import { useEffect, useState } from 'react';

/**
 * Checks for app updates and prompts user to reload.
 * For PWAs, this ensures users get the latest version after deployment.
 */
export default function UpdateChecker() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    // Check for updates every 5 minutes
    const checkForUpdates = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.update();
        }
      } catch (error) {
        console.warn('Failed to check for updates:', error);
      }
    };

    // Listen for service worker updates
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      setUpdateAvailable(true);
    });

    // Check immediately on mount
    checkForUpdates();

    // Then check periodically
    const interval = setInterval(checkForUpdates, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

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
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-white text-blue-600 font-semibold py-2 px-4 rounded-lg hover:bg-blue-50 transition-colors"
          >
            Reload Now
          </button>
        </div>
      </div>
    </div>
  );
}
