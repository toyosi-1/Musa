/**
 * Lightweight localStorage cache for critical app data.
 * Ensures access codes, user profiles, and household info
 * are available even when the network is completely down.
 *
 * Uses versioned keys so stale data can be detected.
 */

const CACHE_PREFIX = 'musa_cache_';
const CACHE_VERSION = 1;

interface CacheEntry<T> {
  v: number;       // version
  ts: number;      // timestamp (ms)
  data: T;
}

function key(name: string): string {
  return `${CACHE_PREFIX}${name}`;
}

/**
 * Save data to local cache with a timestamp.
 */
export function cacheSet<T>(name: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { v: CACHE_VERSION, ts: Date.now(), data };
    localStorage.setItem(key(name), JSON.stringify(entry));
  } catch (e) {
    // localStorage full or unavailable — non-critical
    console.warn('[OfflineCache] Failed to write:', name, e);
  }
}

/**
 * Read data from local cache.
 * Returns null if missing, expired, or version mismatch.
 * @param maxAgeMs  Maximum age in ms (default: 24 hours)
 */
export function cacheGet<T>(name: string, maxAgeMs = 24 * 60 * 60 * 1000): T | null {
  try {
    const raw = localStorage.getItem(key(name));
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (entry.v !== CACHE_VERSION) return null;
    if (Date.now() - entry.ts > maxAgeMs) return null;
    return entry.data;
  } catch {
    return null;
  }
}

/**
 * Get the age of a cached item in milliseconds.
 * Returns Infinity if the item is not cached.
 */
export function cacheAge(name: string): number {
  try {
    const raw = localStorage.getItem(key(name));
    if (!raw) return Infinity;
    const entry = JSON.parse(raw);
    return Date.now() - (entry.ts || 0);
  } catch {
    return Infinity;
  }
}

/**
 * Delete a cached item.
 */
export function cacheDelete(name: string): void {
  try {
    localStorage.removeItem(key(name));
  } catch {
    // ignore
  }
}

/**
 * Clear all Musa cache entries.
 */
export function cacheClearAll(): void {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
    keys.forEach(k => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

// ── Convenience helpers for common data ──

export function cacheAccessCodes(uid: string, codes: any[]): void {
  cacheSet(`access_codes_${uid}`, codes);
}

export function getCachedAccessCodes(uid: string): any[] | null {
  return cacheGet(`access_codes_${uid}`);
}

export function cacheHousehold(uid: string, household: any): void {
  cacheSet(`household_${uid}`, household);
}

export function getCachedHousehold(uid: string): any | null {
  return cacheGet(`household_${uid}`);
}

export function cacheUserProfile(uid: string, profile: any): void {
  cacheSet(`profile_${uid}`, profile);
}

export function getCachedUserProfile(uid: string): any | null {
  return cacheGet(`profile_${uid}`);
}
