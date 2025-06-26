import { useState, useEffect, useCallback } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
    appinstalled: Event;
  }
}

interface InstallPromptState {
  isInstallable: boolean;
  isInstalled: boolean;
  deferredPrompt: BeforeInstallPromptEvent | null;
  showPrompt: boolean;
  isInstalling: boolean;
  installationResult: 'accepted' | 'dismissed' | null;
}

export function useInstallPrompt() {
  const [state, setState] = useState<InstallPromptState>({
    isInstallable: false,
    isInstalled: false,
    deferredPrompt: null,
    showPrompt: false,
    isInstalling: false,
    installationResult: null,
  });

  // Check if the app is already installed
  const checkIfAppIsInstalled = useCallback(() => {
    // For iOS devices
    const isIos = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      return /iphone|ipad|ipod/.test(userAgent);
    };

    // For iOS
    const isInStandaloneMode = () => 
      ('standalone' in window.navigator) && ((window.navigator as any).standalone);

    // For other platforms
    const isInWebApp = window.matchMedia('(display-mode: standalone)').matches;

    return isIos() ? isInStandaloneMode() : isInWebApp;
  }, []);

  // Handle beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      // Prevent the default browser install prompt
      e.preventDefault();
      
      // Check if the app is already installed
      const installed = checkIfAppIsInstalled();
      
      setState(prev => ({
        ...prev,
        isInstallable: !installed,
        deferredPrompt: e,
        showPrompt: !installed,
        isInstalled: installed,
      }));
    };

    // Handle app installed event
    const handleAppInstalled = () => {
      setState(prev => ({
        ...prev,
        isInstallable: false,
        showPrompt: false,
        isInstalled: true,
        isInstalling: false,
        installationResult: 'accepted',
      }));
    };

    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Initial check for installation status
    const installed = checkIfAppIsInstalled();
    setState(prev => ({
      ...prev,
      isInstalled: installed,
      isInstallable: !installed && 'BeforeInstallPromptEvent' in window,
    }));

    // Cleanup
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [checkIfAppIsInstalled]);

  // Handle installation
  const handleInstall = useCallback(async () => {
    if (!state.deferredPrompt) {
      console.error('No deferred prompt available');
      return false;
    }

    try {
      setState(prev => ({ ...prev, isInstalling: true }));
      
      // Show the install prompt
      state.deferredPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      const { outcome } = await state.deferredPrompt.userChoice;
      
      // Update state based on user's choice
      setState(prev => ({
        ...prev,
        isInstalling: false,
        installationResult: outcome,
        showPrompt: outcome === 'dismissed',
        isInstallable: outcome === 'dismissed',
      }));
      
      return outcome === 'accepted';
    } catch (error) {
      console.error('Error during installation:', error);
      setState(prev => ({
        ...prev,
        isInstalling: false,
        installationResult: 'dismissed',
      }));
      return false;
    }
  }, [state.deferredPrompt]);

  // Dismiss the install prompt
  const dismissPrompt = useCallback(() => {
    setState(prev => ({
      ...prev,
      showPrompt: false,
      isInstallable: false,
    }));
  }, []);

  return {
    ...state,
    handleInstall,
    dismissPrompt,
  };
}

export default useInstallPrompt;
