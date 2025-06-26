import { useState, useEffect } from 'react';
import { XMarkIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import useInstallPrompt from '../hooks/useInstallPrompt';

interface PWAInstallPromptProps {
  onInstall?: () => void;
  onDismiss?: () => void;
  hideAfterMs?: number;
}

export default function PWAInstallPrompt({ 
  onInstall, 
  onDismiss,
  hideAfterMs = 0 
}: PWAInstallPromptProps) {
  const [isVisible, setIsVisible] = useState(false);
  
  const { 
    isInstallable, 
    isInstalled, 
    showPrompt, 
    isInstalling,
    installationResult,
    handleInstall, 
    dismissPrompt 
  } = useInstallPrompt();

  // Handle installation result
  useEffect(() => {
    if (installationResult === 'accepted' && onInstall) {
      onInstall();
    } else if (installationResult === 'dismissed' && onDismiss) {
      onDismiss();
    }
  }, [installationResult, onInstall, onDismiss]);

  // Auto-dismiss after specified time
  useEffect(() => {
    if (showPrompt && hideAfterMs > 0) {
      const timer = setTimeout(() => {
        dismissPrompt();
        if (onDismiss) onDismiss();
      }, hideAfterMs);
      
      return () => clearTimeout(timer);
    }
  }, [showPrompt, hideAfterMs, dismissPrompt, onDismiss]);

  // Update visibility based on installable state and prompt status
  useEffect(() => {
    setIsVisible(!!(isInstallable && showPrompt && !isInstalled));
  }, [isInstallable, showPrompt, isInstalled]);

  const handleInstallClick = async () => {
    try {
      const installed = await handleInstall();
      if (installed && onInstall) {
        onInstall();
      } else if (!installed && onDismiss) {
        onDismiss();
      }
    } catch (error) {
      console.error('Error installing app:', error);
      if (onDismiss) onDismiss();
    }
  };

  const handleDismiss = () => {
    dismissPrompt();
    if (onDismiss) onDismiss();
  };

  // Don't show if not installable, already installed, or prompt is dismissed
  if (!isVisible) {
    return null;
  }

  return (
    <div 
      className="fixed bottom-4 right-4 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden w-80 transform transition-all duration-300 ease-in-out"
      role="dialog"
      aria-labelledby="install-prompt-title"
      aria-describedby="install-prompt-description"
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 
              id="install-prompt-title" 
              className="text-lg font-medium text-gray-900 dark:text-white"
            >
              Install Musa App
            </h3>
            <p 
              id="install-prompt-description" 
              className="mt-1 text-sm text-gray-500 dark:text-gray-400"
            >
              Add Musa to your home screen for quick access and an enhanced experience.
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
            aria-label="Dismiss installation prompt"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4 flex space-x-3">
          <button
            onClick={handleInstallClick}
            disabled={isInstalling}
            className={`flex-1 flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              isInstalling 
                ? 'bg-blue-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
            }`}
            aria-busy={isInstalling}
            aria-live="polite"
          >
            {isInstalling ? (
              <>
                <svg 
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" 
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 24 24"
                >
                  <circle 
                    className="opacity-25" 
                    cx="12" 
                    cy="12" 
                    r="10" 
                    stroke="currentColor" 
                    strokeWidth="4"
                  />
                  <path 
                    className="opacity-75" 
                    fill="currentColor" 
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Installing...
              </>
            ) : (
              <>
                <ArrowDownTrayIcon className="-ml-1 mr-2 h-4 w-4" />
                Install Now
              </>
            )}
          </button>
          <button
            onClick={handleDismiss}
            className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600"
          >
            Not Now
          </button>
        </div>
      </div>
    </div>
  );
}
