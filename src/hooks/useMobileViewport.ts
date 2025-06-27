import { useState, useEffect } from 'react';
import { isMobileDevice } from '@/utils/mobileUtils';

/**
 * Custom hook to handle mobile viewport and device detection
 * @returns Object containing viewport information and device detection
 */
export const useMobileViewport = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [viewportHeight, setViewportHeight] = useState('100vh');
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    // Set initial mobile state
    setIsMobile(isMobileDevice());
    
    // Handle viewport height for mobile browsers
    const setAppHeight = () => {
      if (typeof window !== 'undefined') {
        // Use window.innerHeight for mobile viewport height
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
        setViewportHeight(`${window.innerHeight}px`);
      }
    };

    // Handle keyboard visibility
    const handleResize = () => {
      if (typeof window !== 'undefined') {
        // Check if keyboard is likely visible (viewport height reduced significantly)
        const isKeyboardVisible = window.visualViewport 
          ? window.visualViewport.height < window.innerHeight * 0.6
          : window.innerHeight < 500; // Fallback for browsers without visualViewport
        
        setKeyboardVisible(isKeyboardVisible);
        setAppHeight();
      }
    };

    // Set initial height
    setAppHeight();

    // Add event listeners
    window.addEventListener('resize', setAppHeight);
    
    // Use visualViewport API if available for better accuracy with mobile keyboards
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    } else {
      window.addEventListener('resize', handleResize);
    }

    // Cleanup
    return () => {
      window.removeEventListener('resize', setAppHeight);
      
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      } else {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  return {
    isMobile,
    viewportHeight,
    keyboardVisible,
    isPortrait: typeof window !== 'undefined' 
      ? window.innerHeight > window.innerWidth 
      : true
  };
};

/**
 * Hook to handle responsive breakpoints
 * @returns Object containing breakpoint flags
 */
export const useBreakpoints = () => {
  const [breakpoint, setBreakpoint] = useState({
    isSm: false,
    isMd: false,
    isLg: false,
    isXl: false,
    is2xl: false,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkBreakpoint = () => {
      const width = window.innerWidth;
      setBreakpoint({
        isSm: width >= 640,
        isMd: width >= 768,
        isLg: width >= 1024,
        isXl: width >= 1280,
        is2xl: width >= 1536,
      });
    };

    // Initial check
    checkBreakpoint();

    // Add event listener
    window.addEventListener('resize', checkBreakpoint);

    // Cleanup
    return () => window.removeEventListener('resize', checkBreakpoint);
  }, []);

  return breakpoint;
};
