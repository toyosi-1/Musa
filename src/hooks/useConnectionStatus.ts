import { useState, useEffect, useCallback } from 'react';

type ConnectionType = 'slow-2g' | '2g' | '3g' | '4g' | '5g' | 'ethernet' | 'wifi' | 'cellular' | 'unknown';

interface ConnectionStatus {
  isOnline: boolean;
  wasOffline: boolean;
  connectionType: ConnectionType;
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
  lastOfflineAt: Date | null;
  lastOnlineAt: Date;
  offlineDuration: number;
  isSlow: boolean;
  isFast: boolean;
}

const useConnectionStatus = (): ConnectionStatus => {
  const [status, setStatus] = useState<Omit<ConnectionStatus, 'isSlow' | 'isFast' | 'offlineDuration'>>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    wasOffline: false,
    connectionType: 'unknown',
    effectiveType: '4g',
    downlink: 10,
    rtt: 50,
    saveData: false,
    lastOfflineAt: null,
    lastOnlineAt: new Date(),
  });

  // Update connection information
  const updateConnectionInfo = useCallback(() => {
    if (typeof navigator === 'undefined') return;

    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    if (!connection) {
      setStatus(prev => ({
        ...prev,
        connectionType: 'unknown',
        effectiveType: '4g',
        downlink: 10,
        rtt: 50,
        saveData: false,
      }));
      return;
    }

    const connectionType = (connection.type || connection.effectiveType || 'unknown') as ConnectionType;
    
    setStatus(prev => ({
      ...prev,
      connectionType,
      effectiveType: connection.effectiveType || '4g',
      downlink: connection.downlink || 10,
      rtt: connection.rtt || 50,
      saveData: connection.saveData || false,
    }));
  }, []);

  // Handle online/offline events
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setStatus(prev => ({
        ...prev,
        isOnline: true,
        wasOffline: true,
        lastOnlineAt: new Date(),
      }));
      updateConnectionInfo();
    };

    const handleOffline = () => {
      setStatus(prev => ({
        ...prev,
        isOnline: false,
        lastOfflineAt: new Date(),
      }));
    };

    // Initial setup
    updateConnectionInfo();
    
    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Listen for connection changes if supported
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (connection) {
      connection.addEventListener('change', updateConnectionInfo);
    }

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (connection) {
        connection.removeEventListener('change', updateConnectionInfo);
      }
    };
  }, [updateConnectionInfo]);

  // Calculate derived state
  const isSlow = status.effectiveType === 'slow-2g' || status.effectiveType === '2g' || status.downlink < 1;
  const isFast = status.effectiveType === '4g' || status.effectiveType === '5g' || status.downlink > 2;
  
  const offlineDuration = status.lastOfflineAt 
    ? Math.max(0, status.lastOnlineAt.getTime() - status.lastOfflineAt.getTime()) / 1000 
    : 0;

  return {
    ...status,
    isSlow,
    isFast,
    offlineDuration,
  };
};

export default useConnectionStatus;
