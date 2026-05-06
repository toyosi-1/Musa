import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  classifyCameraError,
  checkSecureContext,
  checkMediaDevicesSupport,
} from './cameraErrors';

describe('classifyCameraError', () => {
  it('maps NotAllowedError to permission-denied', () => {
    const err = Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' });
    const out = classifyCameraError(err);
    expect(out.type).toBe('permission-denied');
    // Hint must reference the address bar / settings so the guard knows what to do.
    expect(out.hint).toMatch(/settings|address bar/i);
  });

  it('falls back to message matching when name is missing', () => {
    expect(classifyCameraError({ message: 'NotAllowedError: User denied' }).type).toBe('permission-denied');
    expect(classifyCameraError({ message: 'permission denied for camera' }).type).toBe('permission-denied');
  });

  it('maps NotFoundError to no-camera with manual-entry hint', () => {
    const err = Object.assign(new Error('Requested device not found'), { name: 'NotFoundError' });
    const out = classifyCameraError(err);
    expect(out.type).toBe('no-camera');
    expect(out.hint).toMatch(/manual/i);
  });

  it('maps NotReadableError to in-use', () => {
    const err = Object.assign(new Error('Could not start video source'), { name: 'NotReadableError' });
    expect(classifyCameraError(err).type).toBe('in-use');
  });

  it('detects insecure-context from a free-text message', () => {
    expect(classifyCameraError({ message: 'getUserMedia requires HTTPS' }).type).toBe('insecure-context');
  });

  it('falls back to unknown but still includes the original detail', () => {
    const out = classifyCameraError({ message: 'something exotic broke' });
    expect(out.type).toBe('unknown');
    expect(out.hint).toContain('something exotic broke');
  });

  it('handles plain string errors', () => {
    expect(classifyCameraError('Permission denied').type).toBe('permission-denied');
  });

  it('handles undefined / null gracefully', () => {
    expect(classifyCameraError(undefined).type).toBe('unknown');
    expect(classifyCameraError(null).type).toBe('unknown');
  });
});

describe('checkSecureContext', () => {
  const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');

  afterEach(() => {
    if (originalDescriptor) {
      Object.defineProperty(globalThis, 'window', originalDescriptor);
    }
  });

  it('returns null on the server (no window)', () => {
    Object.defineProperty(globalThis, 'window', { value: undefined, configurable: true });
    expect(checkSecureContext()).toBeNull();
  });

  it('returns null when window.isSecureContext is true', () => {
    Object.defineProperty(globalThis, 'window', {
      value: { isSecureContext: true },
      configurable: true,
    });
    expect(checkSecureContext()).toBeNull();
  });

  it('returns an insecure-context error when window.isSecureContext is false', () => {
    Object.defineProperty(globalThis, 'window', {
      value: { isSecureContext: false },
      configurable: true,
    });
    const out = checkSecureContext();
    expect(out?.type).toBe('insecure-context');
    expect(out?.hint).toMatch(/https/i);
  });
});

describe('checkMediaDevicesSupport', () => {
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');

  afterEach(() => {
    if (originalNavigator) {
      Object.defineProperty(globalThis, 'navigator', originalNavigator);
    }
  });

  it('returns null when navigator is missing (server)', () => {
    Object.defineProperty(globalThis, 'navigator', { value: undefined, configurable: true });
    expect(checkMediaDevicesSupport()).toBeNull();
  });

  it('returns null when getUserMedia is available', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { mediaDevices: { getUserMedia: () => Promise.resolve() } },
      configurable: true,
    });
    expect(checkMediaDevicesSupport()).toBeNull();
  });

  it('flags missing mediaDevices as unsupported', () => {
    Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true });
    const out = checkMediaDevicesSupport();
    expect(out?.type).toBe('unsupported');
  });

  it('flags missing getUserMedia as unsupported', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { mediaDevices: {} },
      configurable: true,
    });
    expect(checkMediaDevicesSupport()?.type).toBe('unsupported');
  });
});
