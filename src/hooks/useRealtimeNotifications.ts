'use client';

/**
 * useRealtimeNotifications
 *
 * Listens to the Firebase Realtime Database `notifications/$uid` path for new
 * unread notifications and shows a browser Notification (if permission granted)
 * plus an in-app toast via a custom event.
 *
 * This is the iOS Safari fallback — FCM web push is not supported on iOS Safari
 * PWA. This hook fires for every platform but is the *only* mechanism that works
 * reliably on iOS.
 */

import { useEffect, useRef } from 'react';
import { ref, onChildAdded, off } from 'firebase/database';
import { getFirebaseDatabase } from '@/lib/firebase';

export interface InAppNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  timestamp: number;
  data?: Record<string, any>;
}

const SEEN_KEY = 'musa_seen_notif_ids';
const MAX_SEEN = 200;

function getSeenIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SEEN_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function markSeen(id: string) {
  try {
    const seen = getSeenIds();
    seen.add(id);
    const arr = Array.from(seen).slice(-MAX_SEEN);
    sessionStorage.setItem(SEEN_KEY, JSON.stringify(arr));
  } catch { /* non-fatal */ }
}

function dispatchInApp(notif: InAppNotification) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('musa:notification', { detail: notif }));
}

function showBrowserNotification(notif: InAppNotification) {
  if (typeof window === 'undefined') return;
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    const n = new Notification(notif.title, {
      body: notif.message,
      icon: '/images/icon-192x192.png',
      badge: '/images/icon-192x192.png',
      tag: notif.id,
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch { /* non-fatal - some browsers block Notification constructor */ }
}

export function useRealtimeNotifications(uid: string | null | undefined) {
  const listenerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!uid || typeof window === 'undefined') return;

    let active = true;
    // Track the startup time so we don't surface old notifications as new
    const startedAt = Date.now();

    (async () => {
      try {
        const db = await getFirebaseDatabase();
        const notifRef = ref(db, `notifications/${uid}`);

        const handler = onChildAdded(notifRef, (snap) => {
          if (!active) return;
          if (!snap.exists()) return;

          const data = snap.val();
          const notifId: string = snap.key || String(data.timestamp || Date.now());
          const ts: number = data.timestamp || 0;

          // Skip notifications that existed before this session started
          if (ts < startedAt - 5000) return;

          // Skip already-shown notifications (page reload guard)
          const seen = getSeenIds();
          if (seen.has(notifId)) return;
          markSeen(notifId);

          const notif: InAppNotification = {
            id: notifId,
            title: data.title || 'Musa',
            message: data.message || '',
            type: data.type || 'general',
            timestamp: ts,
            data: data.data,
          };

          dispatchInApp(notif);
          showBrowserNotification(notif);
        });

        listenerRef.current = () => off(notifRef, 'child_added', handler);
      } catch (err) {
        console.warn('[useRealtimeNotifications] Failed to attach listener:', err);
      }
    })();

    return () => {
      active = false;
      listenerRef.current?.();
      listenerRef.current = null;
    };
  }, [uid]);
}
