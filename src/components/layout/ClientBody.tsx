'use client';

import { useEffect, useState } from 'react';

interface ClientBodyProps {
  children: React.ReactNode;
}

export default function ClientBody({ children }: ClientBodyProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if window is defined (client-side)
    if (typeof window !== 'undefined') {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const mobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      setIsMobile(mobile);

      // Handle viewport height on mobile devices
      const updateViewportHeight = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
        document.documentElement.style.setProperty('--app-width', `${window.innerWidth}px`);
      };

      // Set initial height
      updateViewportHeight();

      // Update height on resize or orientation change
      window.addEventListener('resize', updateViewportHeight, { passive: true });
      window.addEventListener('orientationchange', updateViewportHeight, { passive: true });

      // Cleanup event listeners
      return () => {
        window.removeEventListener('resize', updateViewportHeight);
        window.removeEventListener('orientationchange', updateViewportHeight);
      };
    }
  }, []);
  
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
}
