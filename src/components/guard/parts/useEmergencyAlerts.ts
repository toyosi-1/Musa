import { useEffect, useState } from 'react';
import type { EmergencyAlert } from '@/types/user';
import { subscribeToAlerts } from '@/services/emergencyService';

/**
 * Short audio cue played when a new active alert arrives, so the guard looks
 * up even if their attention is elsewhere. Wrapped in try/catch because
 * autoplay can be blocked by browser policy.
 */
function playAlertBeep(): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const audioCtx = new AudioCtx();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.frequency.value = 880;
    oscillator.type = 'square';
    gainNode.gain.value = 0.3;
    oscillator.start();
    setTimeout(() => {
      oscillator.stop();
      audioCtx.close();
    }, 300);
  } catch {
    // Audio may be blocked — non-fatal.
  }
}

/**
 * Subscribes to active emergency alerts for a given estate. Plays a short
 * beep whenever any active alerts are present after an update.
 */
export function useEmergencyAlerts(estateId: string | undefined): EmergencyAlert[] {
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);

  useEffect(() => {
    if (!estateId) return;
    const unsubscribe = subscribeToAlerts(estateId, (incoming) => {
      const active = incoming.filter((a) => a.status === 'active');
      setAlerts(active);
      if (active.length > 0) playAlertBeep();
    });
    return () => unsubscribe();
  }, [estateId]);

  return alerts;
}
