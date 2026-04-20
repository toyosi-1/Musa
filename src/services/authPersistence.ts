/**
 * Auth persistence configuration.
 *
 * Factored out of `AuthContext.tsx` because picking the right Firebase Auth
 * persistence strategy has distinct code paths for:
 *  - iOS PWA  — try IndexedDB, fall back to localStorage, then in-memory
 *  - Other PWA — IndexedDB → localStorage → in-memory
 *  - Browser  — localStorage (the Firebase default)
 *
 * Each branch is independently testable once it lives in its own module.
 */
import {
  setPersistence,
  browserLocalPersistence,
  inMemoryPersistence,
  indexedDBLocalPersistence,
  type Auth,
} from 'firebase/auth';
import { isPwaMode } from '@/utils/pwaUtils';

/** Heuristic for iOS devices running as an installed PWA (home-screen app). */
export function isIosPwa(): boolean {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false;
  const isIosDevice = !!navigator.userAgent.match(/iPad|iPhone|iPod/);
  const isStandalone = window.matchMedia?.('(display-mode: standalone)').matches;
  return isIosDevice && !!isStandalone;
}

/**
 * Apply the appropriate persistence for the current runtime. Never throws —
 * auth persistence failures degrade to in-memory rather than blocking sign-in.
 */
export async function configureAuthPersistence(auth: Auth): Promise<void> {
  try {
    const inPwa = isPwaMode();
    console.log(`🔒 Setting up auth persistence for ${inPwa ? 'PWA' : 'browser'} mode`);

    if (!inPwa) {
      await setPersistence(auth, browserLocalPersistence);
      console.log('✅ Using standard localStorage persistence');
      return;
    }

    if (isIosPwa()) {
      console.log('📱 iOS PWA detected, using special persistence strategy');
      await setPersistence(auth, indexedDBLocalPersistence)
        .catch(() => setPersistence(auth, browserLocalPersistence))
        .catch(() => setPersistence(auth, inMemoryPersistence));
      console.log('✅ iOS PWA persistence strategy applied');
      return;
    }

    try {
      await setPersistence(auth, indexedDBLocalPersistence);
      console.log('✅ Using IndexedDB persistence');
    } catch {
      try {
        await setPersistence(auth, browserLocalPersistence);
        console.log('✅ Using localStorage persistence');
      } catch {
        await setPersistence(auth, inMemoryPersistence);
        console.log('⚠️ Using in-memory persistence (session only)');
      }
    }
  } catch (e) {
    console.warn('⚠️ Failed to set auth persistence:', e);
  }
}
