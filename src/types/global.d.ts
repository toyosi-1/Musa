// Extend the Window interface
declare global {
  interface Window {
    gtag: any; // Google Analytics
    dataLayer: any[];
  }
}

export {}; // This file needs to be a module
