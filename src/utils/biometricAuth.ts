/**
 * Client-side biometric authentication helpers using WebAuthn.
 * Supports Face ID (iOS), fingerprint (Android), Windows Hello.
 */

import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { fetchWithAuth } from '@/lib/fetchWithAuth';

/** Check if the device supports biometric/platform authentication */
export async function isBiometricAvailable(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/** Check if user has already registered biometric credentials */
export function hasBiometricRegistered(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('musa_biometric_enabled') === 'true';
}

/** Get the email saved for biometric login */
export function getBiometricEmail(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('musa_biometric_email');
}

/**
 * Register a new biometric credential for the current user.
 * Call this AFTER the user is logged in with email/password.
 */
export async function registerBiometric(
  userId: string,
  email: string,
  displayName: string
): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Get registration options from server
    const optRes = await fetchWithAuth('/api/webauthn/register-options', {
      method: 'POST',
      body: JSON.stringify({ userId, email, displayName }),
    });
    const optData = await optRes.json();
    if (!optData.success) {
      return { success: false, message: optData.message || 'Failed to get options' };
    }

    // 2. Prompt user for biometric (Face ID / fingerprint)
    const credential = await startRegistration({ optionsJSON: optData.options });

    // 3. Send credential to server for verification
    const verifyRes = await fetchWithAuth('/api/webauthn/register-verify', {
      method: 'POST',
      body: JSON.stringify({ userId, credential }),
    });
    const verifyData = await verifyRes.json();

    if (verifyData.success) {
      // Mark biometric as enabled locally
      localStorage.setItem('musa_biometric_enabled', 'true');
      localStorage.setItem('musa_biometric_email', email);
      return { success: true, message: 'Biometric login enabled!' };
    }

    return { success: false, message: verifyData.message || 'Registration failed' };
  } catch (error: any) {
    // User cancelled or device error
    if (error?.name === 'NotAllowedError') {
      return { success: false, message: 'Biometric registration was cancelled.' };
    }
    console.error('Biometric registration error:', error);
    return { success: false, message: error?.message || 'Registration failed' };
  }
}

/**
 * Authenticate using biometric (Face ID / fingerprint).
 * Returns a custom token or session recovery data for signing in.
 */
export async function authenticateWithBiometric(
  email: string
): Promise<{ success: boolean; customToken?: string; userId?: string; sessionRecovery?: boolean; message?: string }> {
  try {
    // 1. Get authentication options from server
    const optRes = await fetch('/api/webauthn/login-options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const optData = await optRes.json();
    if (!optData.success) {
      return { success: false, message: optData.message || 'Failed to get options' };
    }

    // 2. Prompt user for biometric
    const credential = await startAuthentication({ optionsJSON: optData.options });

    // 3. Verify on server
    const verifyRes = await fetch('/api/webauthn/login-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: optData.userId, credential }),
    });
    const verifyData = await verifyRes.json();

    if (verifyData.success) {
      return {
        success: true,
        customToken: verifyData.customToken,
        userId: verifyData.userId,
        sessionRecovery: verifyData.sessionRecovery,
      };
    }

    return { success: false, message: verifyData.message || 'Authentication failed' };
  } catch (error: any) {
    if (error?.name === 'NotAllowedError') {
      return { success: false, message: 'Biometric authentication was cancelled.' };
    }
    console.error('Biometric auth error:', error);
    return { success: false, message: error?.message || 'Authentication failed' };
  }
}

/** Remove biometric preferences (doesn't delete server credentials) */
export function clearBiometricPreference(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('musa_biometric_enabled');
  localStorage.removeItem('musa_biometric_email');
}
