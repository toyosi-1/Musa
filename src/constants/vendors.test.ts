import { describe, it, expect } from 'vitest';
import { PLATFORM_VENDORS_ESTATE_ID, isPlatformVendorBucket } from './vendors';

describe('PLATFORM_VENDORS_ESTATE_ID', () => {
  it('is a stable, non-empty sentinel', () => {
    // Changing this value is a schema migration — add a Firebase-side rename
    // before touching it.
    expect(PLATFORM_VENDORS_ESTATE_ID).toBe('__platform__');
  });

  it('cannot collide with a Firebase push id (which never contains underscores)', () => {
    expect(PLATFORM_VENDORS_ESTATE_ID).toMatch(/_/);
  });
});

describe('isPlatformVendorBucket', () => {
  it('returns true only for the platform bucket id', () => {
    expect(isPlatformVendorBucket(PLATFORM_VENDORS_ESTATE_ID)).toBe(true);
    expect(isPlatformVendorBucket('__platform__')).toBe(true);
  });

  it('returns false for any real estate id', () => {
    expect(isPlatformVendorBucket('estate-A')).toBe(false);
    expect(isPlatformVendorBucket('musa-estate-123')).toBe(false);
  });

  it('returns false for empty / nullish input', () => {
    expect(isPlatformVendorBucket('')).toBe(false);
    expect(isPlatformVendorBucket(null)).toBe(false);
    expect(isPlatformVendorBucket(undefined)).toBe(false);
  });
});
