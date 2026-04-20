/**
 * Unit tests for `authPersistence.ts`.
 *
 * The `configureAuthPersistence` function calls out to Firebase, so we only
 * unit-test the pure helpers here (`isIosPwa`). The full persistence
 * strategy is covered by the rules-emulator suite.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isIosPwa } from './authPersistence';

describe('isIosPwa', () => {
  const originalNavigator = globalThis.navigator;
  const originalMatchMedia = globalThis.window?.matchMedia;

  beforeEach(() => {
    // Default: desktop browser — neither iOS nor standalone.
    Object.defineProperty(globalThis, 'navigator', {
      value: { userAgent: 'Mozilla/5.0 Chrome/120.0.0 Safari/537.36' },
      writable: true,
      configurable: true,
    });
    globalThis.window.matchMedia = vi.fn().mockReturnValue({ matches: false });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
    if (originalMatchMedia) globalThis.window.matchMedia = originalMatchMedia;
  });

  it('returns false for a desktop Chrome browser', () => {
    expect(isIosPwa()).toBe(false);
  });

  it('returns false for iOS Safari without standalone display-mode', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari' },
      writable: true,
      configurable: true,
    });
    globalThis.window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    expect(isIosPwa()).toBe(false);
  });

  it('returns false for an Android PWA (standalone but not iOS)', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { userAgent: 'Mozilla/5.0 (Linux; Android 13) Chrome' },
      writable: true,
      configurable: true,
    });
    globalThis.window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    expect(isIosPwa()).toBe(false);
  });

  it('returns true for an iPhone running as an installed PWA', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari' },
      writable: true,
      configurable: true,
    });
    globalThis.window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    expect(isIosPwa()).toBe(true);
  });

  it('returns true for an iPad running as an installed PWA', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) Safari' },
      writable: true,
      configurable: true,
    });
    globalThis.window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    expect(isIosPwa()).toBe(true);
  });
});
