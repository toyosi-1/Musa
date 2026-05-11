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

// Emergency notifications require manual dismissal and play sound
const EMERGENCY_SOUND = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZURE'; // Short alert beep (truncated, will use Audio constructor)

const AUTO_DISMISS_MS = 6000;
const EMERGENCY_AUTO_DISMISS_MS = 30000; // 30 seconds for emergency

export default function InAppNotificationToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Play notification sound for high-priority alerts
  const playSound = useCallback((type: string) => {
    if (typeof window === 'undefined') return;
    try {
      // Emergency: urgent beep pattern
      if (type === 'emergency_alert') {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          const ctx = new AudioContext();
          const playBeep = (freq: number, delay: number) => {
            setTimeout(() => {
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.frequency.value = freq;
              gain.gain.value = 0.3;
              osc.start();
              osc.stop(ctx.currentTime + 0.15);
            }, delay);
          };
          // Urgent pattern: high-low-high-low
          playBeep(880, 0);
          playBeep(440, 200);
          playBeep(880, 400);
          playBeep(440, 600);
        }
      }
      // Guest check-in: single pleasant chime
      else if (type === 'guest-checkin' || type === 'access_code_scan') {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 523; // C5
          gain.gain.value = 0.2;
          osc.type = 'sine';
          osc.start();
          osc.stop(ctx.currentTime + 0.3);
        }
      }
    } catch { /* non-fatal - audio may be blocked */ }
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, visible: false } : t));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 400);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const notif = (e as CustomEvent<InAppNotification>).detail;
      if (!notif) return;

      const isEmergency = notif.type === 'emergency_alert';
      const item: ToastItem = { ...notif, visible: true };
      setToasts(prev => [...prev.slice(-4), item]); // keep max 5

      // Play sound
      playSound(notif.type);

      // Auto-dismiss (longer for emergency, none requires manual dismiss)
      const dismissMs = isEmergency ? EMERGENCY_AUTO_DISMISS_MS : AUTO_DISMISS_MS;
      setTimeout(() => dismiss(item.id), dismissMs);
    };

    window.addEventListener('musa:notification', handler);
    return () => window.removeEventListener('musa:notification', handler);
  }, [dismiss]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 left-4 z-[9999] flex flex-col gap-2 pointer-events-none sm:left-auto sm:w-80">
      {toasts.map(toast => {
        const isEmergency = toast.type === 'emergency_alert';
        return (
        <div
          key={toast.id}
          className={`pointer-events-auto rounded-2xl shadow-2xl p-4 flex items-start gap-3 transition-all duration-300 ${
            toast.visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
          } ${
            isEmergency 
              ? 'bg-red-950 border-2 border-red-500 animate-pulse' 
              : 'bg-gray-900 border border-white/10'
          }`}
        >
          <span className={`text-xl shrink-0 mt-0.5 ${isEmergency ? 'animate-bounce' : ''}`}>
            {ICONS[toast.type] || ICONS.general}
          </span>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold truncate ${isEmergency ? 'text-red-100' : 'text-white'}`}>
              {toast.title}
            </p>
            <p className={`text-xs mt-0.5 leading-snug line-clamp-2 ${isEmergency ? 'text-red-300' : 'text-gray-400'}`}>
              {toast.message}
            </p>
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
      )})}
    </div>
  );
}
