import { describe, it, expect, beforeEach, vi } from 'vitest';
import { rateLimit, __resetStoreForTests } from './rateLimit';

describe('rateLimit', () => {
  beforeEach(() => {
    __resetStoreForTests();
    vi.useRealTimers();
  });

  it('allows the first request within the window', () => {
    const r = rateLimit({ key: 'k1', limit: 3, windowMs: 1000 });
    expect(r.success).toBe(true);
    expect(r.remaining).toBe(2);
    expect(r.limit).toBe(3);
  });

  it('decrements remaining on successive hits', () => {
    const r1 = rateLimit({ key: 'k1', limit: 3, windowMs: 1000 });
    const r2 = rateLimit({ key: 'k1', limit: 3, windowMs: 1000 });
    const r3 = rateLimit({ key: 'k1', limit: 3, windowMs: 1000 });
    expect(r1.remaining).toBe(2);
    expect(r2.remaining).toBe(1);
    expect(r3.remaining).toBe(0);
    expect(r3.success).toBe(true);
  });

  it('rejects once the limit is exceeded', () => {
    for (let i = 0; i < 3; i++) rateLimit({ key: 'k1', limit: 3, windowMs: 1000 });
    const blocked = rateLimit({ key: 'k1', limit: 3, windowMs: 1000 });
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('tracks different keys independently', () => {
    for (let i = 0; i < 3; i++) rateLimit({ key: 'a', limit: 3, windowMs: 1000 });
    const a = rateLimit({ key: 'a', limit: 3, windowMs: 1000 });
    const b = rateLimit({ key: 'b', limit: 3, windowMs: 1000 });
    expect(a.success).toBe(false);
    expect(b.success).toBe(true);
  });

  it('resets the window after it expires', async () => {
    vi.useFakeTimers();
    const start = new Date('2025-01-01T00:00:00Z');
    vi.setSystemTime(start);

    for (let i = 0; i < 3; i++) rateLimit({ key: 'k1', limit: 3, windowMs: 1000 });
    expect(rateLimit({ key: 'k1', limit: 3, windowMs: 1000 }).success).toBe(false);

    // Advance past the window.
    vi.setSystemTime(new Date(start.getTime() + 1500));
    const r = rateLimit({ key: 'k1', limit: 3, windowMs: 1000 });
    expect(r.success).toBe(true);
    expect(r.remaining).toBe(2);
  });

  it('sets reset timestamp to now + windowMs on the first hit', () => {
    vi.useFakeTimers();
    const now = new Date('2025-01-01T00:00:00Z');
    vi.setSystemTime(now);
    const r = rateLimit({ key: 'k1', limit: 3, windowMs: 5000 });
    expect(r.reset).toBe(now.getTime() + 5000);
  });
});
