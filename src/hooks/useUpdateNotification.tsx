import { useState, useEffect, useCallback } from 'react';
import { ArrowPathIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface UpdateNotificationProps {
  onUpdate: () => void;
  onDismiss: () => void;
}

export const UpdateNotification = ({ onUpdate, onDismiss }: UpdateNotificationProps) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-w-md">
      <div className="flex items-center">
        <ArrowPathIcon className="h-5 w-5 text-blue-500 mr-3 animate-spin" />
        <div>
          <p className="font-medium text-gray-900 dark:text-white">Update Available</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">A new version of the app is ready to install.</p>
        </div>
      </div>
      <div className="flex space-x-2 ml-4">
        <button
          onClick={onUpdate}
          className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
        >
          Update Now
        </button>
        <button
          onClick={onDismiss}
          className="p-1 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          aria-label="Dismiss"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export function useUpdateNotification() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = useCallback(() => {
    setIsUpdating(true);
    // The actual update will be handled by the service worker
    // which will trigger a page reload when complete
  }, []);

  const handleDismiss = useCallback(() => {
    setShowUpdate(false);
    // Store dismissal in localStorage to prevent showing again for this version
    localStorage.setItem('lastUpdateDismissed', 'true');
  }, []);

  // Check if we should show the update notification
  useEffect(() => {
    const lastDismissed = localStorage.getItem('lastUpdateDismissed');
    if (!lastDismissed && 'serviceWorker' in navigator) {
      const controller = navigator.serviceWorker.controller;
      if (controller) {
        const handleControllerChange = () => {
          setShowUpdate(true);
          // Clear the dismissal when a new service worker takes over
          localStorage.removeItem('lastUpdateDismissed');
        };

        navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
        return () => {
          navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
        };
      }
    }
  }, []);

  return {
    showUpdate,
    isUpdating,
    handleUpdate,
    handleDismiss,
    UpdateNotification: () => (
      <UpdateNotification onUpdate={handleUpdate} onDismiss={handleDismiss} />
    ),
  };
}

export default useUpdateNotification;
