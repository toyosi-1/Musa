'use client';

import { useIsMobile } from '@/hooks/useIsMobile';

interface ClientBodyProps {
  children: React.ReactNode;
}

export function ClientBody({ children }: ClientBodyProps) {
  const isMobile = useIsMobile();
  
  return (
    <body 
      className={`min-h-screen bg-musa-bg dark:bg-gray-900 text-gray-900 dark:text-white relative touch-manipulation ${isMobile ? 'mobile' : 'desktop'}`}
      style={{
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain',
        height: '100vh',
        height: 'var(--app-height, 100vh)',
        width: '100%',
        margin: 0,
        padding: 0,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'auto',
        touchAction: 'pan-y',
        msTouchAction: 'pan-y',
        WebkitTapHighlightColor: 'transparent',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      {children}
    </body>
  );
}
