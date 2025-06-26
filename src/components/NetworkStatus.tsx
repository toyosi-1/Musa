import { useEffect, useState } from 'react';
import { 
  WifiIcon, 
  SignalSlashIcon, 
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import useConnectionStatus from '../hooks/useConnectionStatus';

type BannerType = 'online' | 'offline' | 'slow' | 'reconnecting';

interface BannerState {
  show: boolean;
  type: BannerType;
  message: string;
  progress?: number;
}

export default function NetworkStatus() {
  const [banner, setBanner] = useState<BannerState>({ 
    show: false, 
    type: 'online', 
    message: '' 
  });
  
  const { 
    isOnline, 
    wasOffline, 
    connectionType, 
    isSlow, 
    isFast,
    offlineDuration,
    lastOfflineAt,
    lastOnlineAt
  } = useConnectionStatus();

  // Handle connection status changes
  useEffect(() => {
    if (!isOnline) {
      // Show offline banner
      setBanner({
        show: true,
        type: 'offline',
        message: 'You\'re currently offline. Some features may be limited.'
      });
      
      // Start reconnection attempts indicator after 5 seconds
      const reconnectionTimer = setTimeout(() => {
        if (!isOnline) {
          setBanner(prev => ({
            ...prev,
            type: 'reconnecting',
            message: 'Attempting to reconnect...',
            progress: 0
          }));
          
          // Simulate reconnection progress
          const progressInterval = setInterval(() => {
            setBanner(prev => {
              if (prev.type !== 'reconnecting') return prev;
              const newProgress = Math.min(100, (prev.progress || 0) + 5);
              return {
                ...prev,
                progress: newProgress,
                message: `Attempting to reconnect... ${newProgress}%`
              };
            });
          }, 1000);
          
          return () => clearInterval(progressInterval);
        }
      }, 5000);
      
      return () => clearTimeout(reconnectionTimer);
    } 
    
    // Show reconnected message
    if (isOnline && wasOffline) {
      const wasOfflineFor = offlineDuration > 60 
        ? `${Math.floor(offlineDuration / 60)}m ${Math.floor(offlineDuration % 60)}s`
        : `${Math.floor(offlineDuration)}s`;
      
      setBanner({
        show: true,
        type: 'online',
        message: `You're back online! (Offline for ${wasOfflineFor})`
      });
      
      // Hide after 5 seconds
      const timer = setTimeout(() => {
        setBanner(prev => ({ ...prev, show: false }));
      }, 5000);
      
      return () => clearTimeout(timer);
    }
    
    // Show slow connection warning
    if (isOnline && isSlow && !isFast) {
      setBanner({
        show: true,
        type: 'slow',
        message: `Slow connection detected (${connectionType}). Some features may be limited.`
      });
      
      // Hide after 5 seconds
      const timer = setTimeout(() => {
        setBanner(prev => ({ ...prev, show: false }));
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline, isSlow, isFast, connectionType, offlineDuration]);

  // Don't show anything if the banner is hidden
  if (!banner.show) {
    return null;
  }

  // Determine banner styles based on type
  const getBannerStyles = () => {
    switch (banner.type) {
      case 'online':
        return 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-200 border border-green-200 dark:border-green-800';
      case 'offline':
        return 'bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-800';
      case 'slow':
        return 'bg-orange-50 text-orange-800 dark:bg-orange-900/20 dark:text-orange-200 border border-orange-200 dark:border-orange-800';
      case 'reconnecting':
        return 'bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200 border border-blue-200 dark:border-blue-800';
      default:
        return 'bg-gray-50 text-gray-800 dark:bg-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700';
    }
  };

  // Get appropriate icon based on connection status
  const getStatusIcon = () => {
    switch (banner.type) {
      case 'online':
        return <WifiIcon className="h-5 w-5 mr-2 text-green-500 dark:text-green-400" />;
      case 'offline':
        return <SignalSlashIcon className="h-5 w-5 mr-2 text-yellow-500 dark:text-yellow-400" />;
      case 'slow':
        return <ExclamationTriangleIcon className="h-5 w-5 mr-2 text-orange-500 dark:text-orange-400" />;
      case 'reconnecting':
        return <ArrowPathIcon className="h-5 w-5 mr-2 text-blue-500 dark:text-blue-400 animate-spin" />;
      default:
        return null;
    }
  };

  return (
    <div 
      className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ease-in-out ${
        banner.show ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'
      }`}
    >
      <div 
        className={`flex items-center px-4 py-3 rounded-lg shadow-lg ${getBannerStyles()}`}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {getStatusIcon()}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{banner.message}</p>
          {banner.type === 'reconnecting' && banner.progress !== undefined && (
            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1.5 dark:bg-gray-700">
              <div 
                className="bg-blue-600 h-1.5 rounded-full dark:bg-blue-500 transition-all duration-300" 
                style={{ width: `${banner.progress}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
