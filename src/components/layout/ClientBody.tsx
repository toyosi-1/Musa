'use client';

import { useEffect, useState } from 'react';

interface ClientBodyProps {
  children: React.ReactNode;
}

const ClientBody: React.FC<ClientBodyProps> = ({ children }) => {
  const [isMounted, setIsMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [viewportHeight, setViewportHeight] = useState('100vh');
  const [viewportWidth, setViewportWidth] = useState('100vw');

  useEffect(() => {
    // Set mounted state to true after component mounts
    setIsMounted(true);
    
    // Only run on client-side
    const updateViewport = () => {
      if (typeof window === 'undefined') return;
      
      // Device detection
      const userAgent = window.navigator.userAgent.toLowerCase();
      const mobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      const ios = /iphone|ipad|ipod/i.test(userAgent);
      const android = /android/i.test(userAgent);
      
      setIsMobile(mobile);
      setIsIOS(ios);
      setIsAndroid(android);

      // Get viewport dimensions
      const vh = window.innerHeight * 0.01;
      const vw = window.innerWidth * 0.01;
      
      // Update CSS variables
      document.documentElement.style.setProperty('--vh', `${vh}px`);
      document.documentElement.style.setProperty('--vw', `${vw}px`);
      document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
      document.documentElement.style.setProperty('--app-width', `${window.innerWidth}px`);
      
      // For mobile browsers with dynamic toolbars
      if (mobile) {
        document.documentElement.style.setProperty('--dynamic-height', `${window.innerHeight}px`);
      }
    };

    // Set initial values
    updateViewport();

    // Add event listeners with debounce
    let resizeTimer: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(updateViewport, 100);
    };

    // Use both resize and visualViewport for better mobile support
    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', updateViewport, { passive: true });
    
    // Visual viewport API for mobile browsers with dynamic toolbars
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize, { passive: true });
      window.visualViewport.addEventListener('scroll', handleResize, { passive: true });
    }

    // Force update after a short delay to catch any missed updates
    const initialUpdateTimer = setTimeout(updateViewport, 500);

    // Cleanup
    return () => {
      clearTimeout(resizeTimer);
      clearTimeout(initialUpdateTimer);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', updateViewport);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
        window.visualViewport.removeEventListener('scroll', handleResize);
      }
    };
  }, []);
  
  // Don't render anything until the component is mounted on the client
  if (!isMounted) {
    return null;
  }
  
  return (
    <div 
      className={`min-h-screen bg-musa-bg dark:bg-gray-900 text-gray-900 dark:text-white relative ${
        isMobile ? 'mobile' : 'desktop'
      } ${isIOS ? 'ios-device' : isAndroid ? 'android-device' : ''}`}
      style={{
        '--app-height': '100vh',
        '--app-width': '100vw',
        '--dynamic-height': '100vh',
        minHeight: 'var(--dynamic-height, 100vh)',
        height: 'var(--dynamic-height, 100vh)',
        width: '100%',
        maxWidth: '100%',
        margin: 0,
        padding: 0,
        overflow: 'hidden',
        position: 'relative',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      } as React.CSSProperties}
      data-device-type={isIOS ? 'ios' : isAndroid ? 'android' : 'desktop'}
      data-orientation={
        typeof window !== 'undefined'
          ? window.innerWidth > window.innerHeight
            ? 'landscape'
            : 'portrait'
          : 'unknown'
      }
    >
      <div 
        className="scrollbar-hide"
        style={{
          height: '100%',
          width: '100%',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          position: 'relative',
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default ClientBody;
