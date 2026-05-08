'use client';

/**
 * InAppNotificationToast
 *
 * Listens to the 'musa:notification' custom event dispatched by
 * useRealtimeNotifications and shows a slide-in toast banner.
 *
 * Works on all platforms including iOS Safari PWA where FCM web push
 * is unavailable.
 */

import { useEffect, useState, useCallback } from 'react';
import type { InAppNotification } from '@/hooks/useRealtimeNotifications';

interface ToastItem extends InAppNotification {
  visible: boolean;
}

const ICONS: Record<string, string> = {
  'guest-checkin': '🚪',
  'access_code_scan': '🔑',
  'emergency_alert': '🚨',
  'general': '🔔',
};

const AUTO_DISMISS_MS = 6000;

export default function InAppNotificationToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, visible: false } : t));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 400);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const notif = (e as CustomEvent<InAppNotification>).detail;
      if (!notif) return;

      const item: ToastItem = { ...notif, visible: true };
      setToasts(prev => [...prev.slice(-4), item]); // keep max 5

      setTimeout(() => dismiss(item.id), AUTO_DISMISS_MS);
    };

    window.addEventListener('musa:notification', handler);
    return () => window.removeEventListener('musa:notification', handler);
  }, [dismiss]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 left-4 z-[9999] flex flex-col gap-2 pointer-events-none sm:left-auto sm:w-80">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`pointer-events-auto bg-gray-900 border border-white/10 rounded-2xl shadow-2xl p-4 flex items-start gap-3 transition-all duration-300 ${
            toast.visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
          }`}
        >
          <span className="text-xl shrink-0 mt-0.5">
            {ICONS[toast.type] || ICONS.general}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold truncate">{toast.title}</p>
            <p className="text-gray-400 text-xs mt-0.5 leading-snug line-clamp-2">{toast.message}</p>
          </div>
          <button
            onClick={() => dismiss(toast.id)}
            className="text-gray-500 hover:text-gray-300 shrink-0 mt-0.5 transition-colors"
            aria-label="Dismiss"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
