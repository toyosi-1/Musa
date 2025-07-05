'use client';

import Head from 'next/head';
import { useEffect } from 'react';

export default function PerformanceOptimizations() {
  useEffect(() => {
    // Preload critical resources after initial render
    const preloadLinks = [
      { href: '/_next/static/css/app/layout.css', as: 'style' },
      { href: '/_next/static/chunks/main-app.js', as: 'script' },
      { href: '/images/icon-192x192.png', as: 'image', type: 'image/png' },
      { href: '/images/icon-512x512.png', as: 'image', type: 'image/png' },
    ];

    preloadLinks.forEach(({ href, as, type }) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = href;
      link.as = as as any;
      if (type) link.type = type;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });

    // Cleanup function
    return () => {
      document.querySelectorAll('link[rel="preload"]').forEach(link => {
        document.head.removeChild(link);
      });
    };
  }, []);

  return (
    <Head>
      {/* Preconnect to external domains */}
      <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
      
      {/* Preload critical CSS */}
      <link
        rel="preload"
        href="/_next/static/css/app/layout.css"
        as="style"
        crossOrigin="anonymous"
      />
      
      {/* Preload critical fonts */}
      <link
        rel="preload"
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap"
        as="style"
        crossOrigin="anonymous"
      />
      
      {/* Add any other performance-related meta tags */}
      <meta httpEquiv="x-ua-compatible" content="ie=edge" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="format-detection" content="telephone=no" />
    </Head>
  );
}
