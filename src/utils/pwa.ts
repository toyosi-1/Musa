/**
 * Utility functions for PWA installation and management
 */

/**
 * Checks if the app is running as a PWA (installed to home screen)
 */
export function isRunningAsPWA(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone ||
    document.referrer.includes('android-app://')
  );
}

/**
 * Checks if the browser supports PWA installation
 */
export function canInstallPWA(): boolean {
  return 'BeforeInstallPromptEvent' in window;
}

/**
 * Triggers the PWA installation prompt
 * @returns Promise that resolves when the installation is complete or rejected if the user dismisses the prompt
 */
export async function triggerInstallPrompt(): Promise<boolean> {
  // This function should be called in response to a user gesture
  const deferredPrompt = (window as any).deferredPrompt as BeforeInstallPromptEvent | null;
  
  if (!deferredPrompt) {
    throw new Error('No install prompt available. The beforeinstallprompt event was not fired.');
  }

  try {
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    // Log the user's choice
    console.log(`User ${outcome} the install prompt`);
    
    // Clear the deferredPrompt variable
    (window as any).deferredPrompt = null;
    
    return outcome === 'accepted';
  } catch (error) {
    console.error('Error showing install prompt:', error);
    throw error;
  }
}

/**
 * Checks if the app is running on a mobile device
 */
export function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Checks if the app is running on iOS
 */
export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

/**
 * Shows a custom install prompt for iOS devices
 */
export function showiOSInstallPrompt() {
  // iOS doesn't support the beforeinstallprompt event, so we show custom instructions
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  
  if (isSafari && isIOS()) {
    // Show iOS installation instructions
    alert('To install this app, tap the Share button and then "Add to Home Screen".');
    return true;
  }
  
  return false;
}

/**
 * Type definition for the BeforeInstallPromptEvent
 */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Extend the Window interface to include our custom properties
declare global {
  interface Window {
    // Using any here to avoid type conflicts with other declarations
    deferredPrompt: any;
  }
}

// Export the interface for use in other files
export type { BeforeInstallPromptEvent };
