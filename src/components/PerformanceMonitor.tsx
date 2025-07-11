'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

type WebVitalsMetric = {
  id: string;
  name: string;
  startTime: number;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta?: number;
  entries?: PerformanceEntry[];
};

// Extend the Window interface to include webVitals
declare global {
  interface Window {
    webVitals?: {
      getCLS: (callback: (metric: WebVitalsMetric) => void) => void;
      getFID: (callback: (metric: WebVitalsMetric) => void) => void;
      getFCP: (callback: (metric: WebVitalsMetric) => void) => void;
      getLCP: (callback: (metric: WebVitalsMetric) => void) => void;
      getTTFB: (callback: (metric: WebVitalsMetric) => void) => void;
    };
    gtag?: (...args: any[]) => void;
  }
}

const PerformanceMonitor = () => {
  const pathname = usePathname();

  useEffect(() => {
    const logMetric = (metric: WebVitalsMetric) => {
      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log(metric.name, metric.value);
      }

      // Send to analytics in production
      if (process.env.NODE_ENV === 'production' && window.gtag) {
        window.gtag('event', metric.name, {
          event_category: 'Web Vitals',
          value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
          event_label: metric.id,
          non_interaction: true,
        });
      }
    };

    // Track page view on route change
    if (process.env.NODE_ENV === 'production' && window.gtag) {
      window.gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-XXXXXXXXXX', {
        page_path: pathname,
      });
    }

    // Track navigation timing
    if (typeof window !== 'undefined' && 'performance' in window) {
      const [navigation] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      if (navigation) {
        const timing = {
          dns: navigation.domainLookupEnd - navigation.domainLookupStart,
          connect: navigation.connectEnd - navigation.connectStart,
          ttfb: navigation.responseStart - navigation.requestStart,
          download: navigation.responseEnd - navigation.responseStart,
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.startTime,
          load: navigation.loadEventEnd - navigation.startTime,
        };

        if (process.env.NODE_ENV === 'development') {
          console.log('Navigation Timing:', timing);
        }
      }
    }

    // Track Web Vitals if available
    const trackWebVitals = () => {
      if (window.webVitals) {
        const { getCLS, getFID, getFCP, getLCP, getTTFB } = window.webVitals;
        getCLS(logMetric);
        getFID(logMetric);
        getFCP(logMetric);
        getLCP(logMetric);
        getTTFB(logMetric);
      } else if (process.env.NODE_ENV === 'development') {
        console.warn('web-vitals not available');
      }
    };

    // Track page visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Page became visible again, could log a custom event
      }
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Track initial page load
    trackWebVitals();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pathname]);

  return null;
};

export default PerformanceMonitor;
