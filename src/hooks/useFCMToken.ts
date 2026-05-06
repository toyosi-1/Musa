/**
 * useFCMToken
 *
 * Requests notification permission, obtains an FCM registration token, and
 * persists it to the user's database record so the server can send push
 * notifications via the FCM v1 API.
 *
 * Call this hook once per authenticated session (AuthContext wires it in).
 * It is a no-op on iOS Safari (where FCM web push is not supported) and in
 * non-production environments where VAPID key may be absent.
 */
import { useEffect, useRef } from 'react';
import { getFirebaseApp } from '@/lib/firebase';
import { getFirebaseDatabase } from '@/lib/firebase';
import { ref, set } from 'firebase/database';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

/** Returns true for iOS Safari where web push via FCM is not supported in PWA context */
function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !/CriOS|FxiOS/.test(navigator.userAgent);
}

async function sendFirebaseConfigToSW(config: Record<string, string>) {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
    if (reg?.active) {
      reg.active.postMessage({ type: 'FIREBASE_CONFIG', config });
    }
  } catch { /* non-fatal */ }
}

export function useFCMToken(uid: string | null | undefined) {
  const registered = useRef(false);

  useEffect(() => {
    if (!uid) return;
    if (registered.current) return;
    if (typeof window === 'undefined') return;
    if (isIosSafari()) return; // FCM web push not supported on iOS Safari
    if (!VAPID_KEY) {
      console.warn('[useFCMToken] NEXT_PUBLIC_FIREBASE_VAPID_KEY is not set — push notifications disabled');
      return;
    }
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    if (Notification.permission === 'denied') return;

    registered.current = true;

    (async () => {
      try {
        // Dynamically import to keep the messaging SDK out of the main bundle
        const { getMessaging, getToken } = await import('firebase/messaging');

        const app = await getFirebaseApp();
        const messaging = getMessaging(app);

        // Register the dedicated FCM service worker
        const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/',
          updateViaCache: 'none',
        });

        // Send Firebase config to the SW so it can initialize Firebase there too
        const firebaseConfig = {
          apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
          authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
          projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
          storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
          messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
          appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
          databaseURL:       process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || '',
        };
        swReg.active && swReg.active.postMessage({ type: 'FIREBASE_CONFIG', config: firebaseConfig });

        // Request permission if not yet granted
        if (Notification.permission !== 'granted') {
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') {
            console.log('[useFCMToken] Notification permission denied by user');
            return;
          }
        }

        // Get the FCM token
        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: swReg,
        });

        if (!token) {
          console.warn('[useFCMToken] No FCM token returned');
          return;
        }

        // Persist token to the database so the server can send push notifications
        const db = await getFirebaseDatabase();
        await set(ref(db, `users/${uid}/fcmToken`), token);
        await set(ref(db, `users/${uid}/fcmTokenUpdatedAt`), Date.now());

        console.log('[useFCMToken] ✅ FCM token saved for uid:', uid);
      } catch (err) {
        console.warn('[useFCMToken] Could not register FCM token:', err);
        registered.current = false; // allow retry on next mount
      }
    })();
  }, [uid]);
}
