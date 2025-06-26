import { useState, useEffect, useCallback } from 'react';
import { BeforeInstallPromptEvent } from '../utils/pwa';

type UsePWAInstallReturn = {
  isInstalled: boolean;
  isInstallable: boolean;
  isInstalling: boolean;
  installPrompt: BeforeInstallPromptEvent | null;
  handleInstall: () => Promise<void>;
  dismissPrompt: () => void;
};

/**
 * Custom hook to handle PWA installation
 * @returns Object containing installation state and handlers
 */
export function usePWAInstall(): UsePWAInstallReturn {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);

  // Check if the app is already installed
  const checkIfAppInstalled = useCallback(() => {
    const isInStandaloneMode = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://');
    
    setIsInstalled(isInStandaloneMode);
    return isInStandaloneMode;
  }, []);

  // Handle beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the default browser install prompt
      e.preventDefault();
      
      // Store the event for later use
      const promptEvent = e as BeforeInstallPromptEvent;
      setInstallPrompt(promptEvent);
      
      // Also store it on window for use in other parts of the app
      window.deferredPrompt = promptEvent;
      
      // The app is installable
      setIsInstallable(true);
    };

    // Check if the app is already installed
    const alreadyInstalled = checkIfAppInstalled();
    
    if (!alreadyInstalled) {
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
    }

    // Listen for app installation
    window.addEventListener('appinstalled', () => {
      console.log('App was installed');
      setIsInstalled(true);
      setIsInstallable(false);
      setInstallPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
    };
  }, [checkIfAppInstalled]);

  // Handle the installation
  const handleInstall = useCallback(async () => {
    if (!installPrompt) {
      console.log('No install prompt available');
      return;
    }

    try {
      setIsInstalling(true);
      
      // Show the install prompt
      installPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      const { outcome } = await installPrompt.userChoice;
      
      console.log(`User ${outcome} the install prompt`);
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setIsInstallable(false);
      }
      
      // Clear the prompt
      setInstallPrompt(null);
      window.deferredPrompt = null;
      
    } catch (error) {
      console.error('Error during installation:', error);
    } finally {
      setIsInstalling(false);
    }
  }, [installPrompt]);

  // Dismiss the install prompt
  const dismissPrompt = useCallback(() => {
    setInstallPrompt(null);
    window.deferredPrompt = null;
    setIsInstallable(false);
    
    // Store dismissal in localStorage to prevent showing again soon
    localStorage.setItem('pwaInstallDismissed', Date.now().toString());
  }, []);

  return {
    isInstalled,
    isInstallable,
    isInstalling,
    installPrompt,
    handleInstall,
    dismissPrompt,
  };
}

export default usePWAInstall;
