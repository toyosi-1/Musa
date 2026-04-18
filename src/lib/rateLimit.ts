/**
 * In-memory sliding-window rate limiter for API routes.
 *
 * This is a pragmatic, zero-dependency limiter that works out of the box on
 * any deployment target (Netlify, Vercel, Node servers, Docker). It is
 * *best-effort* on serverless platforms because each function instance has
 * its own memory — if the platform spins up multiple instances concurrently,
 * a determined attacker can get N × limit requests through. For Musa's
 * current traffic profile that trade-off is acceptable; for higher-volume
 * routes consider swapping the `store` implementation for Upstash Redis.
 *
 * Design:
 *   - One global Map, keyed by "<routeName>:<identifier>".
 *   - Each entry stores the window start + request count.
 *   - Entries older than their window are lazily reset on the next hit.
 *   - A periodic timer prunes fully-expired keys so the Map can't grow
 *     unbounded on a long-lived server.
 *
 * Typical call site inside a Next.js App Router route:
 *
 *   import { rateLimit, getClientIp } from '@/lib/rateLimit';
 *
 *   export async function POST(request: NextRequest) {
 *     const rl = rateLimit({
 *       key: `send-email:${getClientIp(request)}`,
 *       limit: 5,
 *       windowMs: 60_000,
 *     });
 *     if (!rl.success) return rateLimitResponse(rl);
 *     // ...handle request...
 *   }
 */

import { NextRequest, NextResponse } from 'next/server';

export interface RateLimitOptions {
  /** Unique cache key. Usually `<route>:<ip>`. */
  key: string;
  /** Maximum allowed hits per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  /** Whether the request is allowed. */
  success: boolean;
  /** Configured limit for the window. */
  limit: number;
  /** Remaining hits in the current window. */
  remaining: number;
  /** Unix ms timestamp when the window resets. */
  reset: number;
}

interface StoreEntry {
  count: number;
  resetAt: number;
}

// Module-scoped store — survives as long as the Node/Edge worker does.
const store = new Map<string, StoreEntry>();

// Lazy cleanup: prune entries that are already past their reset time.
// Runs at most once per minute, triggered by incoming requests — no setInterval
// (which wouldn't work on Edge runtime anyway).
let lastCleanup = 0;
const CLEANUP_INTERVAL_MS = 60_000;

function pruneExpired(now: number): void {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  store.forEach((entry, key) => {
    if (entry.resetAt <= now) store.delete(key);
  });
}

export function rateLimit(opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  pruneExpired(now);

  const existing = store.get(opts.key);

  // No entry yet, or window has expired → reset.
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + opts.windowMs;
    store.set(opts.key, { count: 1, resetAt });
    return {
      success: true,
      limit: opts.limit,
      remaining: Math.max(0, opts.limit - 1),
      reset: resetAt,
    };
  }

  // Window is live → bump count and evaluate.
  existing.count += 1;
  const allowed = existing.count <= opts.limit;
  return {
    success: allowed,
    limit: opts.limit,
    remaining: Math.max(0, opts.limit - existing.count),
    reset: existing.resetAt,
  };
}

/**
 * Extract the best-available client IP from a Next.js request.
 * Falls back to 'unknown' so rate limiting still functions — an unknown IP
 * just shares its bucket with all other unknowns, which is acceptable.
 */
export function getClientIp(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    // XFF can be a comma-separated list; the first entry is the original client.
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  const xri = request.headers.get('x-real-ip');
  if (xri) return xri.trim();
  // `request.ip` is populated on Vercel/Edge but not Netlify — defensive optional chain.
  const nextReq = request as NextRequest & { ip?: string };
  if (nextReq.ip) return nextReq.ip;
  return 'unknown';
}

/**
 * Build a 429 Too Many Requests response with the standard headers.
 */
export function rateLimitResponse(result: RateLimitResult): NextResponse {
  const retryAfterSec = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
  return NextResponse.json(
    {
      success: false,
      message: 'Too many requests. Please wait a moment and try again.',
      retryAfterSeconds: retryAfterSec,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSec),
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(Math.ceil(result.reset / 1000)),
      },
    },
  );
}

/** Test-only: reset the store. Not exported to consumers. */
export function __resetStoreForTests(): void {
  store.clear();
  lastCleanup = 0;
}
