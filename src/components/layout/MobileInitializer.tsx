'use client';

import { useEffect } from 'react';
import { 
  isMobileDevice, 
  isIOS, 
  isIOS15Plus, 
  setupViewportHeight 
} from '@/utils/mobileUtils';

// Helper function to detect iOS
function isIOS() {
  if (typeof window === 'undefined') return false;
  return [
    'iPad Simulator',
    'iPhone Simulator',
    'iPod Simulator',
    'iPad',
    'iPhone',
    'iPod'
  ].includes(navigator.platform) ||
  (navigator.userAgent.includes('Mac') && 'ontouchend' in document) ||
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

// Detect if the device is running iOS 15+
function isIOS15Plus() {
  if (typeof window === 'undefined') return false;
  if (!isIOS()) return false;
  
  const userAgent = window.navigator.userAgent;
  const match = userAgent.match(/OS (\d+)_(\d+)_?(\d+)?/);
  if (!match) return false;
  
  const majorVersion = parseInt(match[1], 10);
  return majorVersion >= 15;
}

// Throttle function to limit the rate of function execution
const throttle = (func: Function, limit: number) => {
  let inThrottle: boolean;
  return function(this: any, ...args: any[]) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

export default function MobileInitializer() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const html = document.documentElement;
    const body = document.body;
    const isMobile = isMobileDevice();
    const isIOSDevice = isIOS();
    const isIOS15OrNewer = isIOS15Plus();
    
    // Setup viewport height CSS variable
    const cleanupViewportHeight = setupViewportHeight();
    
    // Add mobile class to HTML element
    if (isMobile) {
      html.classList.add('is-mobile');
      if (isIOSDevice) {
        html.classList.add('ios');
        if (isIOS15OrNewer) {
          html.classList.add('ios-15-plus');
        }
      }
      
      // Add touch-action manipulation for better scrolling
      body.style.touchAction = 'pan-y';
      body.style.webkitOverflowScrolling = 'touch';
      
      // Prevent pull-to-refresh on mobile
      const preventPullToRefresh = (e: TouchEvent) => {
        if (window.scrollY <= 0) {
          e.preventDefault();
        }
      };
      
      // Disable double tap to zoom
      let lastTap = 0;
      const preventDoubleTapZoom = (e: TouchEvent) => {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        if (tapLength < 500 && tapLength > 0) {
          e.preventDefault();
          e.stopPropagation();
        }
        lastTap = currentTime;
      };
      
      document.addEventListener('touchmove', preventPullToRefresh, { passive: false });
      document.addEventListener('touchend', preventDoubleTapZoom, { passive: false });
      
      // Add iOS-specific optimizations
      if (isIOSDevice) {
        // Force redraw on iOS to fix rendering issues
        const forceRedraw = () => {
          document.body.style.display = 'none';
          document.body.offsetHeight; // Trigger reflow
          document.body.style.display = '';
        };
        
        // Add iOS-specific event listeners
        window.addEventListener('orientationchange', forceRedraw);
        window.addEventListener('focus', forceRedraw);
        
        // Cleanup iOS listeners
        return () => {
          cleanupViewportHeight();
          document.removeEventListener('touchmove', preventPullToRefresh);
          document.removeEventListener('touchend', preventDoubleTapZoom);
          window.removeEventListener('orientationchange', forceRedraw);
          window.removeEventListener('focus', forceRedraw);
        };
      }
      
      // Cleanup for non-iOS mobile devices
      return () => {
        cleanupViewportHeight();
        document.removeEventListener('touchmove', preventPullToRefresh);
        document.removeEventListener('touchend', preventDoubleTapZoom);
      };
    }
    
    // Cleanup for non-mobile devices
    return cleanupViewportHeight;

  }, []);

  return null; // This component doesn't render anything
}
