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
 * Detects if the device is a mobile device based on user agent
 * Note: User agent detection is not 100% reliable but works for most cases
 */
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const userAgent = window.navigator.userAgent.toLowerCase();
  const isMobile = /iphone|ipad|ipod|android|blackberry|windows phone/g.test(userAgent);
  const isTablet = /(ipad|tablet|playbook|silk)|(android(?!.*mobile))/i.test(userAgent);
  
  return isMobile || isTablet;
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
