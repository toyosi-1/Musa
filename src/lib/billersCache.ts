/**
 * In-memory biller cache shared between the `/api/utilities/billers` route
 * (producer) and `/api/utilities/complete-purchase` (consumer).
 *
 * Lives outside any route file because Next.js App Router only allows
 * HTTP-verb exports from `route.ts` files — exporting a helper from there
 * triggers a build-time type error.
 */

export interface BillersCacheEntry {
  data: unknown;
  timestamp: number;
  source: 'live' | 'fallback';
}

let billersCache: BillersCacheEntry | null = null;

export function getBillersCache(): BillersCacheEntry | null {
  return billersCache;
}

export function setBillersCache(entry: BillersCacheEntry): void {
  billersCache = entry;
}

export function invalidateBillersCache(): void {
  billersCache = null;
}
