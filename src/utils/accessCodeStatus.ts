import type { AccessCode } from '@/types/user';

export type AccessCodeStatus = 'inactive' | 'expired' | 'active';

/**
 * Returns the effective status of an access code.
 *
 * - `inactive` — the user manually deactivated it (`isActive === false`).
 * - `expired` — still flagged active but `expiresAt` has passed.
 * - `active` — flagged active and either has no expiry or its expiry is in
 *   the future.
 *
 * `now` is injected so tests (and any future server-side checks) can supply
 * a deterministic clock. Defaults to `Date.now()`.
 */
export function getAccessCodeStatus(
  code: Pick<AccessCode, 'isActive' | 'expiresAt'>,
  now: number = Date.now(),
): AccessCodeStatus {
  if (!code.isActive) return 'inactive';
  if (code.expiresAt && code.expiresAt < now) return 'expired';
  return 'active';
}

/**
 * True if the code is currently usable — not manually deactivated **and**
 * not past its expiry. Use this for dashboard counters and "is this code
 * still good to share?" checks.
 */
export function isAccessCodeActive(
  code: Pick<AccessCode, 'isActive' | 'expiresAt'>,
  now: number = Date.now(),
): boolean {
  return getAccessCodeStatus(code, now) === 'active';
}
