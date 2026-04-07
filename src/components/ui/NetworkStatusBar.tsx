'use client';

import { useNetwork } from '@/hooks/useNetwork';
import { useEffect, useState } from 'react';

/**
 * Global network status bar.
 * Shows a slim banner at the top of the screen when:
 * - Device is offline (red)
 * - Connection is slow / 2G / 3G (amber)
 * - Connection was restored (green, auto-dismiss)
 *
 * Designed for Nigerian network conditions (2G–4G mix).
 */
export default function NetworkStatusBar() {
  const { online, quality, effectiveType } = useNetwork();
  const [showRestored, setShowRestored] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  // Track transitions: offline → online should flash a "restored" banner
  useEffect(() => {
    if (!online) {
      setWasOffline(true);
      setShowRestored(false);
    } else if (wasOffline && online) {
      setShowRestored(true);
      setWasOffline(false);
      const timer = setTimeout(() => setShowRestored(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [online, wasOffline]);

  // Nothing to show
  if (online && quality === 'good' && !showRestored) return null;

  // Connection restored
  if (showRestored) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[9999] bg-emerald-600 text-white text-center text-xs font-medium py-1.5 px-4 animate-slide-down safe-area-top">
        <span className="flex items-center justify-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.858 15.355-5.858 21.213 0" />
          </svg>
          Connection restored
        </span>
      </div>
    );
  }

  // Offline
  if (!online) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[9999] bg-red-600 text-white text-center text-xs font-medium py-1.5 px-4 safe-area-top">
        <span className="flex items-center justify-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 11-12.728 0M12 9v4m0 4h.01" />
          </svg>
          You're offline — some features may be unavailable
        </span>
      </div>
    );
  }

  // Slow connection
  if (quality === 'slow') {
    return (
      <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-600 text-white text-center text-xs font-medium py-1.5 px-4 safe-area-top">
        <span className="flex items-center justify-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          Slow connection{effectiveType ? ` (${effectiveType.toUpperCase()})` : ''} — loading may take longer
        </span>
      </div>
    );
  }

  return null;
}
