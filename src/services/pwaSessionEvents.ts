/**
 * PWA session-recovery event wiring.
 *
 * The app runs as a PWA on mobile devices where the OS can freeze or evict
 * the browser tab. When the user returns, Firebase Auth may not have restored
 * the session yet, so we listen for visibility/pageshow/focus events and
 * rehydrate the user profile from our own backup.
 *
 * Lifted out of `AuthContext.tsx`. The caller supplies getters so reads
 * always see the current state rather than a stale closure.
 */
import type { User } from '@/types/user';
import {
  isPwaMode,
  backupSession,
  getSessionBackup,
  refreshSessionBackup,
  registerPwaLifecycleEvents,
} from '@/utils/pwaUtils';
import { coerceUserRole } from '@/utils/userProfileCache';
import { isIosPwa } from './authPersistence';

export interface PwaSessionEventOptions {
  /** Live read of the current user — used inside event handlers. */
  getCurrentUser: () => User | null;
  /** Live read of the loading flag. */
  getLoading: () => boolean;
  setCurrentUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setInitError: (message: string | null) => void;
  /** Looks up a user profile by uid (preferred from in-memory cache). */
  getUserProfile: (uid: string) => Promise<User | null>;
}

/**
 * Wire up all PWA recovery event listeners. Returns a cleanup function.
 * No-ops and returns a no-op cleanup when not running as a PWA.
 */
export function setupPwaSessionEvents(options: PwaSessionEventOptions): () => void {
  if (!isPwaMode()) return () => {};

  const {
    getCurrentUser,
    getLoading,
    setCurrentUser,
    setLoading,
    setInitError,
    getUserProfile,
  } = options;

  console.log('📱 Setting up enhanced PWA session management...');

  // iOS PWA: kick off a session-recovery event after a brief delay if the
  // normal auth state listener hasn't landed a user yet.
  if (isIosPwa()) {
    setInitError(null);
    setTimeout(() => {
      if (!getCurrentUser() && getLoading()) {
        const sessionBackup = getSessionBackup();
        if (sessionBackup?.userId) {
          window.dispatchEvent(
            new CustomEvent('pwa-session-recovery', { detail: { userId: sessionBackup.userId } }),
          );
        }
      }
    }, 1000);
  }

  registerPwaLifecycleEvents();

  const recoveryEventHandler = async (event: Event): Promise<void> => {
    const customEvent = event as CustomEvent;
    if (!customEvent.detail?.userId) return;
    console.log('🔄 PWA session recovery event triggered for:', customEvent.detail.userId);
    try {
      const user = await getUserProfile(customEvent.detail.userId);
      if (user) {
        console.log('✅ PWA session recovered for:', user.displayName);
        const sessionBackup = getSessionBackup();
        if (sessionBackup && !user.role) {
          const role = coerceUserRole(sessionBackup.role);
          if (role) user.role = role;
        }
        setCurrentUser(user);
        backupSession(user.uid, user.email, user.role, user.displayName);
      }
    } catch (e) {
      console.error('Failed to recover PWA session:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleVisibilityChange = (): void => {
    const user = getCurrentUser();
    if (document.visibilityState === 'visible') {
      refreshSessionBackup();
      if (user) backupSession(user.uid, user.email, user.role, user.displayName);
    } else if (user) {
      backupSession(user.uid, user.email, user.role, user.displayName);
    }
  };

  const handlePageShow = (event: PageTransitionEvent): void => {
    if (!event.persisted) return;
    const sessionBackup = getSessionBackup();
    if (sessionBackup?.userId && !getCurrentUser()) {
      recoveryEventHandler(
        new CustomEvent('pwa-session-recovery', { detail: { userId: sessionBackup.userId } }),
      );
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  document.addEventListener('pwa-session-recovery', recoveryEventHandler);
  window.addEventListener('pageshow', handlePageShow);
  window.addEventListener('focus', handleVisibilityChange);

  // Kick off an immediate recovery if we already have a backup but no user.
  const sessionBackup = getSessionBackup();
  if (sessionBackup?.userId && !getCurrentUser()) {
    recoveryEventHandler(
      new CustomEvent('pwa-session-recovery', { detail: { userId: sessionBackup.userId } }),
    );
  }

  return () => {
    document.removeEventListener('pwa-session-recovery', recoveryEventHandler);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('pageshow', handlePageShow);
    window.removeEventListener('focus', handleVisibilityChange);
  };
}
