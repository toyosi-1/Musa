'use client';

import { useEffect } from 'react';
import { isMobileDevice } from '@/utils/mobileUtils';

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
  (navigator.userAgent.includes('Mac') && 'ontouchend' in document);
}

export default function MobileInitializer() {
  useEffect(() => {
    const html = document.documentElement;
    const isMobile = isMobileDevice();
    
    // Add mobile class to HTML element
    if (isMobile) {
      html.classList.add('is-mobile');
      
      // Add touch-action manipulation for better scrolling
      document.body.style.touchAction = 'manipulation';
    }

    // Handle viewport height for mobile browsers
    const setAppHeight = () => {
      if (typeof window !== 'undefined') {
        // Get the viewport height and multiply it by 1% to get a value for a vh unit
        const vh = window.innerHeight * 0.01;
        // Set the value in the --vh custom property to the root of the document
        document.documentElement.style.setProperty('--vh', `${vh}px`);
        
        // Add a class when the virtual keyboard is visible (only for mobile)
        if (isMobile) {
          const isKeyboardVisible = window.innerHeight < window.outerHeight * 0.8;
          html.classList.toggle('keyboard-visible', isKeyboardVisible);
        }
      }
    };

    // Set initial height
    setAppHeight();

    // Add event listeners
    const events = ['resize', 'orientationchange', 'focusin', 'focusout'];
    events.forEach(event => {
      window.addEventListener(event, setAppHeight, { passive: true });
    });
    
    // Handle iOS viewport height changes
    if (isIOS()) {
      // Add iOS-specific viewport handling if needed
    }

    // Cleanup
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, setAppHeight);
      });
    };
  }, []);

  return null; // This component doesn't render anything
}
