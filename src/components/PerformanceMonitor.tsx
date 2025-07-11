import { useEffect } from 'react';
import { useRouter } from 'next/router';

type WebVitalsMetric = {
  id: string;
  name: string;
  startTime: number;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta?: number;
  entries?: PerformanceEntry[];
};

const PerformanceMonitor = () => {
  const router = useRouter();

  const logMetric = (metric: WebVitalsMetric) => {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(metric.name, metric.value);
    }

    // Send to analytics in production
    if (process.env.NODE_ENV === 'production' && window.gtag) {
      window.gtag('event', metric.name, {
        event_category: 'Web Vitals',
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value), // CLS needs to be multiplied by 1000 for better precision
        event_label: metric.id, // id unique to current page load
        non_interaction: true, // avoids affecting bounce rate
      });
    }
  };

  useEffect(() => {
    const handleRouteChange = (url: string) => {
      // Track page view
      if (process.env.NODE_ENV === 'production' && window.gtag) {
        window.gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-XXXXXXXXXX', {
          page_path: url,
        });
      }

      // Track navigation timing
      if (window.performance) {
        const [navigation] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
        if (navigation) {
          const timing = {
            dns: navigation.domainLookupEnd - navigation.domainLookupStart,
            connect: navigation.connectEnd - navigation.connectStart,
            ttfb: navigation.responseStart - navigation.requestStart,
            download: navigation.responseEnd - navigation.responseStart,
            dom: navigation.domComplete - navigation.domInteractive,
            total: navigation.loadEventEnd - navigation.startTime,
          };
          
          if (process.env.NODE_ENV === 'development') {
            console.log('Navigation Timing:', timing);
          }
        }
      }
    };

    // Track web vitals
    const trackWebVitals = () => {
      try {
        import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
          getCLS(logMetric);
          getFID(logMetric);
          getFCP(logMetric);
          getLCP(logMetric);
          getTTFB(logMetric);
        });
      } catch (err) {
        console.error('Error tracking web vitals:', err);
      }
    };

    // Initial page load
    trackWebVitals();
    
    // Track route changes
    router.events.on('routeChangeComplete', handleRouteChange);
    
    // Track page visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Page became visible, track web vitals again
        trackWebVitals();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [router.events]);

  return null;
};

export default PerformanceMonitor;
