import { describe, expect, it } from 'vitest';
import {
  translateLoginError,
  translateAuthError,
  NEW_DEVICE_APPROVAL_MESSAGE,
} from './authFormErrors';

describe('translateLoginError', () => {
  it('returns the device-approval message for NEW_DEVICE_APPROVAL_REQUIRED', () => {
    const result = translateLoginError(new Error('NEW_DEVICE_APPROVAL_REQUIRED'));
    expect(result).toBe(NEW_DEVICE_APPROVAL_MESSAGE);
  });

  it.each([
    ['auth/user-not-found', /couldn't find an account/i],
    ['user-not-found', /couldn't find an account/i],
    ['auth/wrong-password', /doesn't look right/i],
    ['wrong-password', /doesn't look right/i],
    ['auth/invalid-login-credentials', /doesn't match/i],
    ['auth/invalid-credential', /doesn't match/i],
  ])('maps %s to the friendly login message', (code, pattern) => {
    expect(translateLoginError(new Error(code))).toMatch(pattern);
  });

  it('returns a slow-connection message for network errors', () => {
    expect(translateLoginError(new Error('Request timed out'))).toMatch(/check your signal/i);
    expect(translateLoginError(new Error('network-request-failed'))).toMatch(/check your signal/i);
  });

  it('returns null for unknown login errors (fall through to generic)', () => {
    expect(translateLoginError(new Error('some unrelated thing'))).toBeNull();
  });

  it('returns null for non-error values', () => {
    expect(translateLoginError(null)).toBeNull();
    expect(translateLoginError(undefined)).toBeNull();
  });
});

describe('translateAuthError', () => {
  it('translates registration-specific email-already-in-use', () => {
    expect(translateAuthError(new Error('auth/email-already-in-use'), 'register'))
      .toMatch(/already exists/i);
  });

  it('translates registration-specific weak-password', () => {
    expect(translateAuthError(new Error('auth/weak-password'), 'register'))
      .toMatch(/stronger password/i);
  });

  it('translates PERMISSION_DENIED during registration', () => {
    const result = translateAuthError(new Error('PERMISSION_DENIED: write failed'), 'register');
    expect(result).toMatch(/estate admin/i);
  });

  it('translates generic network errors the same for login and register', () => {
    const msg = 'auth/network-request-failed';
    expect(translateAuthError(new Error(msg), 'login')).toMatch(/check your signal/i);
    expect(translateAuthError(new Error(msg), 'register')).toMatch(/check your signal/i);
  });

  it('translates too-many-requests and user-disabled', () => {
    expect(translateAuthError(new Error('auth/too-many-requests'), 'login'))
      .toMatch(/too many attempts/i);
    expect(translateAuthError(new Error('auth/user-disabled'), 'login'))
      .toMatch(/suspended/i);
  });

  it('passes through unrecognised messages that are not Firebase codes', () => {
    expect(translateAuthError(new Error('Custom validation failed'), 'login'))
      .toBe('Custom validation failed');
  });

  it('never leaks raw Firebase internal errors', () => {
    const raw = new Error('Firebase: Error (auth/internal-error).');
    expect(translateAuthError(raw, 'login')).toMatch(/something went wrong/i);
  });

  it('returns the generic fallback for empty/null', () => {
    expect(translateAuthError(null, 'login')).toMatch(/something went wrong/i);
    expect(translateAuthError(undefined, 'register')).toMatch(/something went wrong/i);
  });
});
