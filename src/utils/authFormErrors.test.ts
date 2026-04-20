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
    ['auth/user-not-found', 'Account not found. Please check your email or register.'],
    ['user-not-found', 'Account not found. Please check your email or register.'],
    ['auth/wrong-password', 'Incorrect password. Please try again.'],
    ['wrong-password', 'Incorrect password. Please try again.'],
    ['auth/invalid-login-credentials', 'Invalid email or password. The account may not exist or the password is incorrect.'],
  ])('maps %s to the friendly login message', (code, expected) => {
    expect(translateLoginError(new Error(code))).toBe(expected);
  });

  it('returns a timeout message for network errors', () => {
    expect(translateLoginError(new Error('Request timed out'))).toMatch(/connection timed out/i);
    expect(translateLoginError(new Error('network-request-failed'))).toMatch(/connection timed out/i);
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
      .toBe('Email already has been used');
  });

  it('translates registration-specific weak-password', () => {
    expect(translateAuthError(new Error('auth/weak-password'), 'register'))
      .toBe('Password is too weak. Please use a stronger password');
  });

  it('translates PERMISSION_DENIED during registration', () => {
    const result = translateAuthError(new Error('PERMISSION_DENIED: write failed'), 'register');
    expect(result).toMatch(/server configuration/i);
  });

  it('translates generic network errors the same for login and register', () => {
    const msg = 'auth/network-request-failed';
    expect(translateAuthError(new Error(msg), 'login')).toMatch(/network connection/i);
    expect(translateAuthError(new Error(msg), 'register')).toMatch(/network connection/i);
  });

  it('translates too-many-requests and user-disabled', () => {
    expect(translateAuthError(new Error('auth/too-many-requests'), 'login'))
      .toMatch(/too many attempts/i);
    expect(translateAuthError(new Error('auth/user-disabled'), 'login'))
      .toMatch(/disabled/i);
  });

  it('passes through unrecognised messages that are not Firebase codes', () => {
    expect(translateAuthError(new Error('Custom validation failed'), 'login'))
      .toBe('Custom validation failed');
  });

  it('never leaks raw Firebase internal errors', () => {
    const raw = new Error('Firebase: Error (auth/internal-error).');
    expect(translateAuthError(raw, 'login')).toBe('Authentication failed');
  });

  it('returns the generic fallback for empty/null', () => {
    expect(translateAuthError(null, 'login')).toBe('Authentication failed');
    expect(translateAuthError(undefined, 'register')).toBe('Authentication failed');
  });
});
