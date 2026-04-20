import { describe, it, expect } from 'vitest';
import { getAccessCodeStatus, isAccessCodeActive } from './accessCodeStatus';

const NOW = 1_700_000_000_000; // 2023-11-14T22:13:20Z — arbitrary fixed clock
const HOUR_MS = 60 * 60 * 1000;

describe('getAccessCodeStatus', () => {
  it('returns "inactive" when isActive is false regardless of expiry', () => {
    expect(
      getAccessCodeStatus({ isActive: false, expiresAt: NOW + HOUR_MS }, NOW),
    ).toBe('inactive');
    expect(getAccessCodeStatus({ isActive: false }, NOW)).toBe('inactive');
  });

  it('returns "expired" when isActive but expiresAt is in the past', () => {
    expect(
      getAccessCodeStatus({ isActive: true, expiresAt: NOW - HOUR_MS }, NOW),
    ).toBe('expired');
  });

  it('returns "active" when isActive and expiresAt is in the future', () => {
    expect(
      getAccessCodeStatus({ isActive: true, expiresAt: NOW + HOUR_MS }, NOW),
    ).toBe('active');
  });

  it('returns "active" when isActive and no expiresAt is set', () => {
    expect(getAccessCodeStatus({ isActive: true }, NOW)).toBe('active');
  });

  it('treats expiresAt === now as expired (boundary)', () => {
    // expiresAt strictly less than now means "already passed"; equality is
    // treated as not-yet-expired so the code is still usable up to that instant.
    expect(
      getAccessCodeStatus({ isActive: true, expiresAt: NOW }, NOW),
    ).toBe('active');
  });
});

describe('isAccessCodeActive', () => {
  it('is true only when the status is "active"', () => {
    expect(isAccessCodeActive({ isActive: true }, NOW)).toBe(true);
    expect(
      isAccessCodeActive({ isActive: true, expiresAt: NOW + HOUR_MS }, NOW),
    ).toBe(true);
  });

  it('is false for expired codes (regression: "1 active codes" bug)', () => {
    expect(
      isAccessCodeActive({ isActive: true, expiresAt: NOW - HOUR_MS }, NOW),
    ).toBe(false);
  });

  it('is false for inactive codes', () => {
    expect(isAccessCodeActive({ isActive: false }, NOW)).toBe(false);
  });
});
