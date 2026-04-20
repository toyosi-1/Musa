import { useEffect, useState } from 'react';
import { isFirebaseReady, waitForFirebase } from '@/lib/firebase';

export type FirebaseStatus = 'checking' | 'ready' | 'error';

export interface FirebaseReadinessResult {
  status: FirebaseStatus;
  error: string;
}

const SHOW_LOADING_AFTER_MS = 300;
const GIVE_UP_AFTER_MS = 8000;

/**
 * Waits for Firebase to initialise and reports its status.
 *
 * - Optimistic: reports `ready` immediately if already initialised.
 * - Quiet: only reports `checking` after 300ms to avoid a flash of loading UI
 *   for fast cold starts.
 * - Bailout: reports `error` after 8s if Firebase still hasn't initialised.
 */
export function useFirebaseReadiness(): FirebaseReadinessResult {
  const [status, setStatus] = useState<FirebaseStatus>('ready');
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    let giveUpTimer: NodeJS.Timeout;
    let showLoadingTimer: NodeJS.Timeout;

    const initialize = async () => {
      try {
        if (isFirebaseReady()) {
          if (isMounted) setStatus('ready');
          return;
        }

        showLoadingTimer = setTimeout(() => {
          if (isMounted && !isFirebaseReady()) setStatus('checking');
        }, SHOW_LOADING_AFTER_MS);

        const ready = await waitForFirebase();
        if (!isMounted) return;

        if (ready) {
          setStatus('ready');
          setError('');
        } else {
          setStatus('error');
          setError('Failed to initialize authentication service. Please refresh the page.');
        }
      } catch (err) {
        console.error('Error initializing Firebase:', err);
        if (isMounted) {
          setStatus('error');
          setError('Error initializing authentication service. Please refresh the page.');
        }
      }
    };

    giveUpTimer = setTimeout(() => {
      if (isMounted && !isFirebaseReady()) {
        console.warn('Firebase initialization timed out');
        setStatus('error');
        setError('Connection to authentication service is taking longer than expected. Please refresh the page.');
      }
    }, GIVE_UP_AFTER_MS);

    initialize();

    return () => {
      isMounted = false;
      clearTimeout(giveUpTimer);
      clearTimeout(showLoadingTimer);
    };
  }, []);

  return { status, error };
}
