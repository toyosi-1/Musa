import { useEffect, useState } from 'react';

export function useViewportHeight() {
  const [height, setHeight] = useState('100vh');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if we're on a mobile device
    const userAgent = typeof window.navigator === 'undefined' ? '' : navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    setIsMobile(isMobile);

    // Set the initial height
    const setAppHeight = () => {
      if (isMobile) {
        // Use window.innerHeight for mobile devices
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
        document.documentElement.style.setProperty('--vh', `${vh}px`);
        setHeight(`${window.innerHeight}px`);
      } else {
        // Use 100vh for desktop
        setHeight('100vh');
      }
    };

    // Set initial height
    setAppHeight();

    // Add event listeners for mobile devices
    if (isMobile) {
      // Handle orientation changes
      const handleResize = () => {
        setAppHeight();
      };

      // Add event listeners
      window.addEventListener('resize', handleResize);
      window.addEventListener('orientationchange', handleResize);
      window.visualViewport?.addEventListener('resize', handleResize);

      // Cleanup
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('orientationchange', handleResize);
        window.visualViewport?.removeEventListener('resize', handleResize);
      };
    }
  }, []);

  return { height, isMobile };
}
