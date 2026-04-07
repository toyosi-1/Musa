'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export type NetworkQuality = 'offline' | 'slow' | 'good';

interface NetworkState {
  /** Whether the browser reports online */
  online: boolean;
  /** Estimated quality: offline | slow | good */
  quality: NetworkQuality;
  /** Effective connection type from NetworkInformation API (e.g. '2g', '3g', '4g') */
  effectiveType: string | null;
  /** Round-trip time estimate in ms (from NetworkInformation API) */
  rtt: number | null;
  /** True while actively checking connectivity */
  checking: boolean;
}

/**
 * Hook that monitors network connectivity and quality.
 * Works on 2G/3G/3.5G connections common in Nigeria.
 *
 * Uses three layers:
 * 1. navigator.onLine (instant but unreliable)
 * 2. NetworkInformation API (connection type + RTT, Chrome/Android only)
 * 3. Periodic lightweight ping to verify actual connectivity
 */
export function useNetwork(): NetworkState {
  const [state, setState] = useState<NetworkState>({
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    quality: 'good',
    effectiveType: null,
    rtt: null,
    checking: false,
  });

  const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Derive quality from NetworkInformation API data
  const deriveQuality = useCallback((online: boolean): NetworkQuality => {
    if (!online) return 'offline';

    // Use NetworkInformation API if available (Chrome, Android WebView, Samsung Internet)
    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (conn) {
      const ect = conn.effectiveType; // '2g' | '3g' | '4g' | 'slow-2g'
      if (ect === 'slow-2g' || ect === '2g') return 'slow';
      if (ect === '3g' && conn.rtt > 500) return 'slow';
    }

    return 'good';
  }, []);

  // Read NetworkInformation data
  const readConnectionInfo = useCallback(() => {
    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (conn) {
      return { effectiveType: conn.effectiveType || null, rtt: conn.rtt ?? null };
    }
    return { effectiveType: null, rtt: null };
  }, []);

  // Update state from all available signals
  const refresh = useCallback(() => {
    const online = navigator.onLine;
    const quality = deriveQuality(online);
    const { effectiveType, rtt } = readConnectionInfo();
    setState(prev => {
      // Only update if something actually changed to avoid re-renders
      if (prev.online === online && prev.quality === quality && prev.effectiveType === effectiveType && prev.rtt === rtt) {
        return prev;
      }
      return { online, quality, effectiveType, rtt, checking: false };
    });
  }, [deriveQuality, readConnectionInfo]);

  useEffect(() => {
    // Listen for online/offline events
    const handleOnline = () => refresh();
    const handleOffline = () => {
      setState(prev => ({ ...prev, online: false, quality: 'offline' }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for NetworkInformation changes (Android/Chrome)
    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (conn) {
      conn.addEventListener('change', refresh);
    }

    // Periodic lightweight connectivity check every 30s
    // Uses a tiny HEAD request to detect silent connectivity loss
    pingTimerRef.current = setInterval(async () => {
      if (!navigator.onLine) {
        setState(prev => ({ ...prev, online: false, quality: 'offline', checking: false }));
        return;
      }
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const start = Date.now();
        await fetch('/manifest.json', {
          method: 'HEAD',
          cache: 'no-store',
          signal: controller.signal,
        });
        clearTimeout(timeout);
        const elapsed = Date.now() - start;
        const { effectiveType, rtt } = readConnectionInfo();
        setState(prev => ({
          ...prev,
          online: true,
          quality: elapsed > 3000 ? 'slow' : (prev.quality === 'offline' ? 'good' : prev.quality),
          effectiveType,
          rtt,
          checking: false,
        }));
      } catch {
        // Fetch failed — might be offline or extremely slow
        setState(prev => ({
          ...prev,
          quality: navigator.onLine ? 'slow' : 'offline',
          online: navigator.onLine,
          checking: false,
        }));
      }
    }, 30000);

    // Initial read
    refresh();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (conn) conn.removeEventListener('change', refresh);
      if (pingTimerRef.current) clearInterval(pingTimerRef.current);
    };
  }, [refresh, readConnectionInfo]);

  return state;
}
