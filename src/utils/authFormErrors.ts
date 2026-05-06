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
    return "We couldn't find an account with that email. Double-check and try again, or register below.";
  }
  if (msg.includes('auth/wrong-password') || msg.includes('wrong-password')) {
    return "That password doesn't look right. Give it another try, or use Forgot password.";
  }
  if (
    msg.includes('auth/invalid-login-credentials') ||
    msg.includes('invalid-login-credentials') ||
    msg.includes('auth/invalid-credential') ||
    msg.includes('Incorrect email or password')
  ) {
    return "Hmm, that email or password doesn't match. Please try again.";
  }
  if (msg.includes('network') || msg.includes('timeout') || msg.includes('timed out') || msg.includes('connection')) {
    return "Connection is taking a while. Please check your signal and try again.";
  }
  if (msg.includes('Unable to verify') || msg.includes('Unable to retrieve')) {
    return "We signed you in but had trouble loading your profile. Please try again.";
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
  if (!msg) return 'Something went wrong. Please try again.';

  // Try login-specific translation first for login mode
  if (mode === 'login') {
    const loginSpecific = translateLoginError(err);
    if (loginSpecific) return loginSpecific;
  }

  // Registration-specific before generic handling.
  if (mode === 'register') {
    if (msg.includes('auth/email-already-in-use') || msg.includes('email-already-in-use')) {
      return 'An account with that email already exists. Try signing in instead.';
    }
    if (msg.includes('auth/weak-password') || msg.includes('weak-password')) {
      return 'Please choose a stronger password (at least 8 characters).';
    }
    if (msg.includes('auth/invalid-email') || msg.includes('invalid-email')) {
      return 'That email address doesn\'t look right. Please check and try again.';
    }
    if (msg.includes('PERMISSION_DENIED') || msg.includes('Permission denied')) {
      return 'Registration could not be completed. Please contact your estate admin.';
    }
  }

  if (msg.includes('auth/network-request-failed') || msg.includes('network-request-failed') ||
      msg.includes('network') || msg.includes('timed out') || msg.includes('connection')) {
    return 'Connection is taking a while. Please check your signal and try again.';
  }
  if (msg.includes('auth/too-many-requests') || msg.includes('too-many-requests')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  if (msg.includes('auth/user-disabled') || msg.includes('user-disabled')) {
    return 'This account has been suspended. Please contact your estate admin.';
  }

  // Never leak raw Firebase error codes or internal messages to the user.
  if (msg.includes('Firebase') || msg.includes('auth/') || msg.includes('SECURITY ERROR')) {
    return 'Something went wrong. Please try again.';
  }
  // For messages already translated upstream (from AuthContext), pass them through.
  return msg;
}
