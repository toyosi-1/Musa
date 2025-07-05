'use client';

import { useEffect, useState } from 'react';

interface ClientBodyProps {
  children: React.ReactNode;
}

const ClientBody: React.FC<ClientBodyProps> = ({ children }) => {
  const [isMounted, setIsMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Set mounted state to true after component mounts
    setIsMounted(true);
    
    // Only run on client-side
    const updateViewportHeight = () => {
      if (typeof window === 'undefined') return;
      
      // Update mobile detection
      const userAgent = window.navigator.userAgent.toLowerCase();
      const mobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      setIsMobile(mobile);

      // Update viewport dimensions
      document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
      document.documentElement.style.setProperty('--app-width', `${window.innerWidth}px`);
    };

    // Set initial values
    updateViewportHeight();

    // Add event listeners
    window.addEventListener('resize', updateViewportHeight, { passive: true });
    window.addEventListener('orientationchange', updateViewportHeight, { passive: true });

    // Cleanup
    return () => {
      window.removeEventListener('resize', updateViewportHeight);
      window.removeEventListener('orientationchange', updateViewportHeight);
    };
  }, []);
  
  // Don't render anything until the component is mounted on the client
  if (!isMounted) {
    return null;
  }
  
  return (
    <div 
      className={`min-h-screen bg-musa-bg dark:bg-gray-900 text-gray-900 dark:text-white relative ${isMobile ? 'mobile' : 'desktop'}`}
      style={{
        '--app-height': '100vh',
        '--app-width': '100vw',
        minHeight: 'var(--app-height, 100vh)',
        width: '100%',
        maxWidth: '100%',
        margin: 0,
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        overflowX: 'hidden',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain',
        touchAction: 'pan-y',
        WebkitTapHighlightColor: 'transparent',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)'
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
};

export default ClientBody;
