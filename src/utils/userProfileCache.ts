import type { User, UserRole } from '@/types/user';

/**
 * User-profile caching helpers extracted from AuthContext.
 *
 * Two tiers:
 * - In-memory map (10 min expiry) — avoids repeat DB reads during a session
 * - localStorage (7 days) — enables instant dashboard on PWA cold starts before
 *   Firebase auth has restored its session
 *
 * Also re-exports `getInitialUser()` which reads the persisted profile
 * *synchronously* on module load so React's initial render can already show the
 * authenticated UI.
 */

const CACHE_EXPIRY_MS = 10 * 60 * 1000; // 10 min
const PERSISTENT_CACHE_KEY = 'musa_user_profile_cache';
const PERSISTENT_CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CacheEntry {
  user: User;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry>();

/** Returns the cached user if present and not expired; otherwise null. */
export function getMemoryCached(uid: string): User | null {
  const entry = memoryCache.get(uid);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_EXPIRY_MS) return null;
  return entry.user;
}

/** Store a user in the in-memory cache. */
export function setMemoryCached(user: User): void {
  memoryCache.set(user.uid, { user, timestamp: Date.now() });
}

/** Evict a uid from the in-memory cache. */
export function evictMemoryCached(uid: string): void {
  memoryCache.delete(uid);
}

/** Persist the user profile to localStorage for cold-start recovery. */
export function persistUserProfile(user: User): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      PERSISTENT_CACHE_KEY,
      JSON.stringify({ user, timestamp: Date.now() }),
    );
  } catch (e) {
    console.warn('Failed to persist user profile:', e);
  }
}

/** Retrieve the persisted profile for a given uid, if still fresh. */
export function getPersistedUserProfile(uid: string): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PERSISTENT_CACHE_KEY);
    if (!raw) return null;
    const { user, timestamp } = JSON.parse(raw) as { user: User; timestamp: number };
    if (user?.uid === uid && Date.now() - timestamp < PERSISTENT_CACHE_EXPIRY_MS) {
      return user;
    }
    return null;
  } catch {
    return null;
  }
}

/** Remove the persisted profile (call on genuine sign-out). */
export function clearPersistedUserProfile(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(PERSISTENT_CACHE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Synchronous read during module load so React's very first render can use it.
 * Returns any persisted profile from the last 7 days, or null.
 */
export function getInitialUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PERSISTENT_CACHE_KEY);
    if (!raw) return null;
    const { user, timestamp } = JSON.parse(raw) as { user: User; timestamp: number };
    if (user?.uid && Date.now() - timestamp < PERSISTENT_CACHE_EXPIRY_MS) {
      console.log('⚡ Instant recovery: found persisted user profile for', user.displayName);
      return user;
    }
  } catch {
    /* ignore parse errors */
  }
  return null;
}

/** Narrow a possibly-unknown role string into the UserRole union type. */
export function coerceUserRole(raw: unknown): UserRole | null {
  if (
    raw === 'resident' ||
    raw === 'guard' ||
    raw === 'admin' ||
    raw === 'estate_admin' ||
    raw === 'vendor' ||
    raw === 'operator'
  ) {
    return raw;
  }
  return null;
}
