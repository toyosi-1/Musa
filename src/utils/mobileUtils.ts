/**
 * Utility functions for mobile-specific interactions and optimizations
 */

/**
 * Prevents the default behavior of touch events to improve scrolling performance
 * and prevent unwanted behaviors like pull-to-refresh in certain contexts.
 */
export const preventDefaultTouchBehavior = (e: TouchEvent) => {
  // Only prevent default if the element is scrollable
  const target = e.target as HTMLElement;
  const isScrollable = target.scrollHeight > target.clientHeight;
  
  if (isScrollable) {
    e.preventDefault();
  }
};

/**
 * Adds passive event listeners for better scroll performance on mobile devices
 * @param element The element to add the listener to
 * @param callback The callback function to execute
 */
export const addPassiveScrollListener = (
  element: HTMLElement | Window,
  callback: EventListenerOrEventListenerObject
) => {
  const options = { passive: true } as AddEventListenerOptions;
  element.addEventListener('touchmove', callback, options);
  return () => element.removeEventListener('touchmove', callback, options as EventListenerOptions);
};

/**
 * Locks the body scroll while maintaining the current scroll position
 * Useful for modals and dialogs on mobile
 */
export const lockBodyScroll = () => {
  const scrollY = window.scrollY;
  document.body.style.position = 'fixed';
  document.body.style.top = `-${scrollY}px`;
  document.body.style.width = '100%';
  document.body.style.overflow = 'hidden';
  return scrollY;
};

/**
 * Unlocks the body scroll and restores the previous scroll position
 * @param savedPosition The scroll position to restore (from lockBodyScroll)
 */
export const unlockBodyScroll = (savedPosition: number) => {
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.width = '';
  document.body.style.overflow = '';
  window.scrollTo(0, savedPosition);
};

/**
 * Detects if the device is a mobile device based on user agent and touch support
 * This is more reliable than user agent sniffing alone
 */
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  
  // Check for touch support
  const hasTouchScreen = 'ontouchstart' in window || 
    navigator.maxTouchPoints > 0 || 
    (navigator as any).msMaxTouchPoints > 0;
  
  if (!hasTouchScreen) return false;
  
  // Check for mobile user agent
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  const isMobileAgent = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(userAgent);
  
  // Check screen size as an additional indicator
  const isSmallScreen = window.innerWidth <= 1024 && window.innerHeight <= 1024;
  const isMobileScreen = window.innerWidth <= 768;
  
  // Return true if it's a mobile agent or has mobile-like characteristics
  return isMobileAgent || (hasTouchScreen && (isMobileScreen || isSmallScreen));
};

/**
 * Detects if the device is running iOS
 */
export const isIOS = (): boolean => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  
  // Check for iOS devices
  return /iPad|iPhone|iPod/.test(userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
    (/iPad|iPhone|iPod/.test(navigator.platform) || 
    (navigator.userAgent.includes('Mac') && 'ontouchend' in document));
};

/**
 * Gets the iOS version if running on iOS
 */
export const getIOSVersion = (): { major: number; minor: number; patch: number } | null => {
  if (!isIOS() || typeof navigator === 'undefined') return null;
  
  const match = navigator.userAgent.match(/OS (\d+)_(\d+)_?(\d+)?/);
  if (!match) return null;
  
  return {
    major: parseInt(match[1], 10) || 0,
    minor: parseInt(match[2], 10) || 0,
    patch: match[3] ? parseInt(match[3], 10) : 0
  };
};

/**
 * Checks if the device is running iOS 15 or newer
 */
export const isIOS15Plus = (): boolean => {
  const version = getIOSVersion();
  return version ? version.major >= 15 : false;
};

/**
 * Sets up viewport height CSS variable for mobile browsers
 * This helps with the 100vh issue on mobile
 */
export const setupViewportHeight = (): (() => void) => {
  if (typeof window === 'undefined') return () => {};
  
  const setVH = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };
  
  // Set initial value
  setVH();
  
  // Update on resize and orientation change
  window.addEventListener('resize', setVH);
  window.addEventListener('orientationchange', setVH);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('resize', setVH);
    window.removeEventListener('orientationchange', setVH);
  };
};

/**
 * Adds a class to the HTML element when the virtual keyboard is shown
 * This helps with layout adjustments when the keyboard is visible on mobile
 */
export const setupKeyboardDetection = () => {
  if (typeof window === 'undefined') return;
  
  const handleResize = () => {
    const isKeyboardVisible = window.innerHeight < (window.visualViewport?.height || window.innerHeight) * 0.8;
    document.documentElement.classList.toggle('keyboard-visible', isKeyboardVisible);
  };
  
  // Use visualViewport API if available for better accuracy
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', handleResize);
  } else {
    window.addEventListener('resize', handleResize);
  }
  
  return () => {
    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', handleResize);
    } else {
      window.removeEventListener('resize', handleResize);
    }
  };
};
