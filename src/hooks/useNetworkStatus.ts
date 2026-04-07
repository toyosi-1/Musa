import { useState, useEffect } from 'react';

/**
 * Custom hook to track the network connection status
 * @returns Object containing the current online status and network information
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [wasOffline, setWasOffline] = useState<boolean>(false);
  const [offlineAt, setOfflineAt] = useState<Date | null>(null);
  const [onlineAt, setOnlineAt] = useState<Date | null>(new Date());
  const [connection, setConnection] = useState<{
    effectiveType: string;
    downlink: number;
    rtt: number;
    saveData: boolean;
  }>({
    effectiveType: '4g',
    downlink: 10,
    rtt: 50,
    saveData: false,
  });

  useEffect(() => {
    // Skip if window/navigator is not available (SSR)
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return;
    }

    // Set initial online status
    setIsOnline(navigator.onLine);
    
    // Set initial connection info if available
    if ('connection' in navigator) {
      const nav = navigator as any;
      setConnection({
        effectiveType: nav.connection?.effectiveType || '4g',
        downlink: nav.connection?.downlink || 10,
        rtt: nav.connection?.rtt || 50,
        saveData: nav.connection?.saveData || false,
      });
    }

    // Handle online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      setWasOffline(true);
      setOnlineAt(new Date());
      
      // Show a notification that we're back online
      if (wasOffline) {
        console.log('Back online');
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setOfflineAt(new Date());
      console.log('App is offline');
    };

    // Handle connection changes
    const handleConnectionChange = () => {
      if ('connection' in navigator) {
        const nav = navigator as any;
        setConnection({
          effectiveType: nav.connection?.effectiveType || '4g',
          downlink: nav.connection?.downlink || 10,
          rtt: nav.connection?.rtt || 50,
          saveData: nav.connection?.saveData || false,
        });
      }
    };

    // Skip if window/navigator is not available (SSR)
    if (typeof window !== 'undefined') {
      // Add event listeners
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      
      if ('connection' in navigator) {
        const nav = navigator as any;
        nav.connection?.addEventListener('change', handleConnectionChange);
      }
    }

    // Clean up event listeners
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        
        if ('connection' in navigator) {
          const nav = navigator as any;
          nav.connection?.removeEventListener('change', handleConnectionChange);
        }
      }
    };
  }, [wasOffline]);

  // Calculate offline duration
  const getOfflineDuration = () => {
    if (!offlineAt || !onlineAt) return 0;
    return Math.round((onlineAt.getTime() - offlineAt.getTime()) / 1000);
  };

  // Get connection type (4g, 3g, 2g, slow-2g, etc.)
  const getConnectionType = () => {
    if (!isOnline) return 'offline';
    return connection.effectiveType || 'unknown';
  };

  // Check if connection is slow (2g or slow-2g)
  const isSlowConnection = () => {
    if (!isOnline) return true;
    return ['slow-2g', '2g'].includes(connection.effectiveType);
  };

  // Check if connection is fast (4g or better)
  const isFastConnection = () => {
    if (!isOnline) return false;
    return ['4g', '5g'].includes(connection.effectiveType);
  };

  return {
    isOnline,
    wasOffline,
    offlineAt,
    onlineAt,
    connection,
    connectionType: getConnectionType(),
    isSlow: isSlowConnection(),
    isFast: isFastConnection(),
    offlineDuration: getOfflineDuration(),
  };
}

export default useNetworkStatus;
