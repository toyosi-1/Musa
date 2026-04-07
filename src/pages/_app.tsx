import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { AppProps } from 'next/app';
import Head from 'next/head';
import { ThemeProvider } from '../context/ThemeContext';
import PWAInstallPrompt from '../components/PWAInstallPrompt';
import NetworkStatus from '../components/NetworkStatus';
import useInstallPrompt from '../hooks/useInstallPrompt';
import useNetworkStatus from '../hooks/useNetworkStatus';
import useAppUpdates from '../hooks/useAppUpdates';
import { useUpdateNotification, UpdateNotification } from '../hooks/useUpdateNotification';
import '../app/globals.css';

// Import the BeforeInstallPromptEvent type
import type { BeforeInstallPromptEvent } from '../utils/pwa';

// Extend the Window interface to include our custom properties
declare global {
  interface Window {
    gtag: any;
    // This is managed by the usePWAInstall hook
    deferredPrompt: BeforeInstallPromptEvent | null;
  }
}

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  
  // Use custom hooks
  const { isInstallable, showPrompt, handleInstall, dismissPrompt } = useInstallPrompt();
  const { isOnline } = useNetworkStatus();
  const { isUpdateAvailable, handleUpdate } = useAppUpdates();
  const { 
    showUpdate, 
    isUpdating, 
    handleUpdate: handleUpdateNotification, 
    handleDismiss: handleDismissUpdate
  } = useUpdateNotification();

  // Google Analytics page view tracking
  useEffect(() => {
    // Skip if window is not available (SSR)
    if (typeof window === 'undefined') return;

    const handleRouteChange = (url: string) => {
      if (process.env.NODE_ENV === 'production' && (window as any).gtag) {
        (window as any).gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID, {
          page_path: url,
        });
      }
    };

    // Track the first pageview
    handleRouteChange(window.location.pathname);

    // Track subsequent pageviews
    router.events.on('routeChangeComplete', handleRouteChange);

    // Clean up
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events]);

  // Handle app installation
  const handleInstallClick = useCallback(async () => {
    try {
      await handleInstall();
      console.log('App installed successfully');
    } catch (error) {
      console.error('Error during installation:', error);
    }
  }, [handleInstall]);
  
  // Handle update button click
  const handleUpdateClick = useCallback(() => {
    handleUpdate();
    handleUpdateNotification();
  }, [handleUpdate, handleUpdateNotification]);

  return (
    <ThemeProvider>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" />
        <meta name="theme-color" content="#ffffff" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Musa" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </Head>
      
      <Component {...pageProps} />
      
      {/* Show PWA install prompt if available */}
      {isInstallable && showPrompt && (
        <PWAInstallPrompt 
          onInstall={handleInstallClick} 
          onDismiss={dismissPrompt}
          hideAfterMs={10000} // Auto-dismiss after 10 seconds
        />
      )}
      
      {/* Show network status */}
      <NetworkStatus />
      
      {/* Show update notification if available */}
      {isUpdateAvailable && (
        <UpdateNotification 
          onUpdate={handleUpdateClick} 
          onDismiss={handleDismissUpdate} 
        />
      )}
      
      {typeof window !== 'undefined' && (
        <>
          {/* Show update available banner */}
          {isUpdateAvailable && (
            <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-4">
              <span>New update available!</span>
              <button 
                onClick={handleUpdate}
                className="px-3 py-1 bg-white text-blue-600 rounded font-medium hover:bg-blue-50 transition-colors"
              >
                Update Now
              </button>
            </div>
          )}
          
          {/* Show offline indicator */}
          {!isOnline && (
            <div className="fixed bottom-4 left-4 z-50 bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>You're offline. Some features may be limited.</span>
            </div>
          )}
        </>
      )}
    </ThemeProvider>
  );
}

export default MyApp;
