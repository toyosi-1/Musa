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

/** True when running on any iOS device (Safari browser tab or home-screen PWA). */
export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/** True only when running as an installed home-screen PWA on iOS. */
export function isIosPwa(): boolean {
  if (!isIosDevice() || typeof window === 'undefined') return false;
  return !!window.matchMedia?.('(display-mode: standalone)').matches;
}

/**
 * Apply the appropriate persistence for the current runtime. Never throws —
 * auth persistence failures degrade to in-memory rather than blocking sign-in.
 *
 * iOS (both Safari browser tab and home-screen PWA) uses localStorage as the
 * primary strategy. IndexedDB on iOS Safari is unreliable — Safari's ITP can
 * silently clear it between sessions, causing Firebase to lose the auth token
 * and return auth/invalid-credential even with a correct password.
 */
export async function configureAuthPersistence(auth: Auth): Promise<void> {
  try {
    if (isIosDevice()) {
      console.log('� iOS detected — using localStorage persistence (IndexedDB unreliable on Safari)');
      await setPersistence(auth, browserLocalPersistence)
        .catch(() => setPersistence(auth, inMemoryPersistence));
      console.log('✅ iOS persistence applied');
      return;
    }

    const inPwa = isPwaMode();
    if (inPwa) {
      await setPersistence(auth, indexedDBLocalPersistence)
        .catch(() => setPersistence(auth, browserLocalPersistence))
        .catch(() => setPersistence(auth, inMemoryPersistence));
      console.log('✅ PWA persistence applied (IndexedDB)');
      return;
    }

    await setPersistence(auth, browserLocalPersistence)
      .catch(() => setPersistence(auth, inMemoryPersistence));
    console.log('✅ Browser persistence applied (localStorage)');
  } catch (e) {
    console.warn('⚠️ Failed to set auth persistence:', e);
  }
}
