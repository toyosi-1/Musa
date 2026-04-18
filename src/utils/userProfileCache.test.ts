import { describe, it, expect, beforeEach } from 'vitest';
import {
  getMemoryCached,
  setMemoryCached,
  evictMemoryCached,
  persistUserProfile,
  getPersistedUserProfile,
  clearPersistedUserProfile,
  coerceUserRole,
} from './userProfileCache';
import type { User } from '@/types/user';

const sampleUser: User = {
  uid: 'u1',
  email: 'alice@example.com',
  displayName: 'Alice',
  role: 'resident',
  status: 'approved',
  isEmailVerified: true,
  createdAt: Date.now(),
};

describe('userProfileCache — memory cache', () => {
  beforeEach(() => {
    evictMemoryCached(sampleUser.uid);
  });

  it('stores and retrieves a user', () => {
    setMemoryCached(sampleUser);
    expect(getMemoryCached(sampleUser.uid)).toEqual(sampleUser);
  });

  it('returns null for an unknown uid', () => {
    expect(getMemoryCached('unknown')).toBeNull();
  });

  it('evicts a user on demand', () => {
    setMemoryCached(sampleUser);
    evictMemoryCached(sampleUser.uid);
    expect(getMemoryCached(sampleUser.uid)).toBeNull();
  });
});

describe('userProfileCache — localStorage persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists and retrieves a user by uid', () => {
    persistUserProfile(sampleUser);
    expect(getPersistedUserProfile(sampleUser.uid)).toEqual(sampleUser);
  });

  it('returns null when persisted profile belongs to a different uid', () => {
    persistUserProfile(sampleUser);
    expect(getPersistedUserProfile('other-uid')).toBeNull();
  });

  it('returns null when no profile is persisted', () => {
    expect(getPersistedUserProfile('u1')).toBeNull();
  });

  it('clears persisted profile on demand', () => {
    persistUserProfile(sampleUser);
    clearPersistedUserProfile();
    expect(getPersistedUserProfile(sampleUser.uid)).toBeNull();
  });
});

describe('coerceUserRole', () => {
  it('accepts all valid role strings', () => {
    expect(coerceUserRole('resident')).toBe('resident');
    expect(coerceUserRole('guard')).toBe('guard');
    expect(coerceUserRole('admin')).toBe('admin');
    expect(coerceUserRole('estate_admin')).toBe('estate_admin');
    expect(coerceUserRole('vendor')).toBe('vendor');
    expect(coerceUserRole('operator')).toBe('operator');
  });

  it('rejects invalid inputs', () => {
    expect(coerceUserRole('')).toBeNull();
    expect(coerceUserRole(null)).toBeNull();
    expect(coerceUserRole(undefined)).toBeNull();
    expect(coerceUserRole(42)).toBeNull();
    expect(coerceUserRole('hacker')).toBeNull();
    expect(coerceUserRole('Resident')).toBeNull(); // case-sensitive on purpose
  });
});
