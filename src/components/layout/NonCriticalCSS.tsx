'use client';

import { useEffect } from 'react';

export default function NonCriticalCSS() {
  useEffect(() => {
    // Create link element for non-critical CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/_next/static/css/app/globals.css';
    link.media = 'print';
    
    // Once loaded, change media to all
    link.onload = () => {
      link.media = 'all';
    };
    
    // Add to document head
    document.head.appendChild(link);
    
    // Cleanup function to remove the link when component unmounts
    return () => {
      if (document.head.contains(link)) {
        document.head.removeChild(link);
      }
    };
  }, []);
  
  // Fallback for browsers that don't support JavaScript
  return (
    <noscript>
      <link rel="stylesheet" href="/_next/static/css/app/globals.css" />
    </noscript>
  );
}
