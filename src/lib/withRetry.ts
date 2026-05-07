/**
 * Retry an async operation with exponential backoff.
 * Designed for Nigerian 2G/3G network conditions where a request may
 * time out or fail transiently but succeed on the next attempt.
 *
 * Retryable errors: network failures, Firebase UNAVAILABLE, timeout.
 * NOT retried: auth errors, permission denied, validation errors.
 */

const RETRYABLE_CODES = new Set([
  'unavailable',
  'deadline-exceeded',
  'resource-exhausted',
  'internal',
  'unknown',
  'auth/network-request-failed',
]);

const RETRYABLE_MESSAGES = [
  'network',
  'timed out',
  'timeout',
  'connection',
  'fetch failed',
  'failed to fetch',
  'networkerror',
  'load failed',
  'aborted',
];

function isRetryable(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const code = ((err as any).code || '').toLowerCase();
  const msg = err.message.toLowerCase();
  if (RETRYABLE_CODES.has(code)) return true;
  return RETRYABLE_MESSAGES.some((m) => msg.includes(m));
}

export interface RetryOptions {
  /** Max number of attempts (default: 3) */
  maxAttempts?: number;
  /** Base delay in ms between retries (default: 800ms, doubles each retry) */
  baseDelayMs?: number;
  /** Max delay cap in ms (default: 8000ms) */
  maxDelayMs?: number;
  /** Optional label for logging */
  label?: string;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const { maxAttempts = 3, baseDelayMs = 800, maxDelayMs = 8000, label = 'op' } = options;

  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isRetryable(err) || attempt === maxAttempts) break;
      const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
      console.warn(`[withRetry] ${label} failed (attempt ${attempt}/${maxAttempts}), retrying in ${delay}ms...`, (err as Error).message);
      await new Promise((res) => setTimeout(res, delay));
    }
  }
  throw lastErr;
}
