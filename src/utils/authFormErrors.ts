/**
 * Translate raw Firebase Auth / app-layer error messages into user-friendly
 * strings for the login and register screens.
 *
 * Centralised so the same Firebase error code yields the same copy in every
 * flow (email/password login, biometric fallback, sign-up). Returns a new
 * Error whose `.message` is the friendly string.
 */
export type AuthMode = 'login' | 'register';

/** Device approval sentinel raised by `enforceHouseholdDeviceApproval`. */
export const NEW_DEVICE_APPROVAL_MESSAGE =
  '🔐 New device detected! A verification email has been sent to your inbox. Please approve this device before signing in.';

function extractMessage(err: unknown): string {
  if (err instanceof Error) return err.message || '';
  if (typeof err === 'string') return err;
  return '';
}

/**
 * Map a login-specific Firebase error to a friendly message.
 * Returns `null` when no translation applies — caller should fall through
 * to `translateAuthError`.
 */
export function translateLoginError(err: unknown): string | null {
  const msg = extractMessage(err);
  if (!msg) return null;

  if (msg.includes('NEW_DEVICE_APPROVAL_REQUIRED')) return NEW_DEVICE_APPROVAL_MESSAGE;
  if (msg.includes('auth/user-not-found') || msg.includes('user-not-found')) {
    return 'Account not found. Please check your email or register.';
  }
  if (msg.includes('auth/wrong-password') || msg.includes('wrong-password')) {
    return 'Incorrect password. Please try again.';
  }
  if (msg.includes('auth/invalid-login-credentials') || msg.includes('invalid-login-credentials')) {
    return 'Invalid email or password. The account may not exist or the password is incorrect.';
  }
  if (msg.includes('network') || msg.includes('timeout') || msg.includes('timed out')) {
    return 'Connection timed out. The server may be slow or your internet connection is unstable. Please try again.';
  }
  return null;
}

/**
 * Map a generic (or registration) Firebase error to a friendly message.
 * Always returns a string — falls back to the raw message when nothing
 * specific matches and the error is not a raw Firebase code.
 */
export function translateAuthError(err: unknown, mode: AuthMode): string {
  const msg = extractMessage(err);
  if (!msg) return 'Authentication failed';

  // Registration-specific before generic handling.
  if (mode === 'register') {
    if (msg.includes('auth/email-already-in-use') || msg.includes('email-already-in-use')) {
      return 'Email already has been used';
    }
    if (msg.includes('auth/weak-password') || msg.includes('weak-password')) {
      return 'Password is too weak. Please use a stronger password';
    }
    if (msg.includes('auth/invalid-email') || msg.includes('invalid-email')) {
      return 'Invalid email address format';
    }
    if (msg.includes('PERMISSION_DENIED') || msg.includes('Permission denied')) {
      return 'Registration could not be completed due to a server configuration issue. Please contact the administrator.';
    }
  }

  if (msg.includes('auth/network-request-failed') || msg.includes('network-request-failed')) {
    return 'Network connection error. Please check your internet connection';
  }
  if (msg.includes('auth/too-many-requests') || msg.includes('too-many-requests')) {
    return 'Too many attempts. Please try again later';
  }
  if (msg.includes('auth/user-disabled') || msg.includes('user-disabled')) {
    return 'This account has been disabled';
  }

  // Don't leak raw Firebase codes — keep the generic fallback for those.
  if (msg.includes('Firebase')) return 'Authentication failed';
  return msg;
}
