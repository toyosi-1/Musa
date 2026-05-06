/**
 * Pure helpers for diagnosing why `getUserMedia` (or html5-qrcode, which
 * wraps it) failed to start the camera. These are split out from the
 * scanner component so they can be unit-tested without spinning up a DOM.
 *
 * The single most common reason "the camera doesn't open" reports happen on
 * production is that we never tell the user *why* — the previous scanner
 * just silently flipped the toggle off. This module makes those failures
 * explicit and actionable.
 */

export type CameraErrorType =
  | 'insecure-context'
  | 'permission-denied'
  | 'no-camera'
  | 'in-use'
  | 'unsupported'
  | 'unknown';

export interface CameraError {
  type: CameraErrorType;
  /** Short user-facing message; safe to render directly. */
  message: string;
  /** Optional second sentence with the recommended next step. */
  hint?: string;
}

/**
 * `getUserMedia` is only available on secure origins (HTTPS or localhost).
 * Returns `null` when the current page is fine, or a `CameraError` describing
 * the problem otherwise.
 *
 * On the server we have no `window` to check; treat that as fine and let the
 * runtime check on the client take over.
 */
export function checkSecureContext(): CameraError | null {
  if (typeof window === 'undefined') return null;

  // Modern browsers expose `window.isSecureContext`. localhost is treated as
  // secure even over HTTP, which keeps `npm run dev` working out of the box.
  if (window.isSecureContext) return null;

  return {
    type: 'insecure-context',
    message: 'Camera access requires a secure (HTTPS) connection.',
    hint: 'Reload this page using the https:// URL, or ask your admin to enable HTTPS for the staff portal.',
  };
}

/**
 * Returns a `CameraError` describing whether the browser even supports the
 * APIs we need. Some legacy in-app browsers (e.g. older WebViews on cheap
 * Android handsets) lack `mediaDevices` entirely.
 */
export function checkMediaDevicesSupport(): CameraError | null {
  if (typeof navigator === 'undefined') return null;
  if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') return null;

  return {
    type: 'unsupported',
    message: 'This browser does not support camera access.',
    hint: 'Open the link in Chrome, Safari, or another modern browser, or use manual code entry.',
  };
}

/**
 * Classifies an error thrown by `Html5Qrcode.start()` (or by `getUserMedia`
 * directly) into one of our known buckets so the UI can show specific
 * guidance instead of a raw stack trace.
 */
export function classifyCameraError(err: unknown): CameraError {
  const name = (err as { name?: string } | undefined)?.name || '';
  const rawMessage = (err as { message?: string } | undefined)?.message
    || (typeof err === 'string' ? err : '');
  const msg = rawMessage.toLowerCase();

  // DOMException names are the most reliable signal. Fall back to message
  // matching for libraries (like html5-qrcode) that wrap the error.
  if (name === 'NotAllowedError' || /permission|denied|notallowed/.test(msg)) {
    return {
      type: 'permission-denied',
      message: 'Camera permission was blocked.',
      hint: 'Tap the camera icon in your browser address bar (or open Settings → Site settings → Camera) and allow access for this site, then tap Retry.',
    };
  }

  if (name === 'NotFoundError' || /no camera|notfound|requested device not found|no.*video.*input/.test(msg)) {
    return {
      type: 'no-camera',
      message: 'No camera was detected on this device.',
      hint: 'Use manual code entry to verify visitors instead.',
    };
  }

  if (name === 'NotReadableError' || /already in use|tracks|notreadable|could not start video source/.test(msg)) {
    return {
      type: 'in-use',
      message: 'The camera is busy.',
      hint: 'Close any other apps that might be using the camera (e.g. WhatsApp video, another browser tab) and tap Retry.',
    };
  }

  if (/secure|https/.test(msg)) {
    return {
      type: 'insecure-context',
      message: 'Camera access requires a secure (HTTPS) connection.',
      hint: 'Reload using the https:// URL.',
    };
  }

  return {
    type: 'unknown',
    message: 'Could not start the camera.',
    hint: rawMessage ? `Details: ${rawMessage}` : 'Please tap Retry, or use manual code entry.',
  };
}
