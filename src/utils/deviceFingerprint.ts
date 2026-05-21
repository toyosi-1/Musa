/**
 * Device fingerprinting for Head of House new-device security.
 * Generates a consistent device ID from browser characteristics.
 */

const LS_KEY = 'musa_approved_devices';

/**
 * Compute a stable hash from browser fingerprint components.
 * Used server-side to detect "same physical device, lost its localStorage ID".
 */
export function computeFingerprintHash(): string {
  if (typeof window === 'undefined') return 'server';
  const components = [
    navigator.userAgent,
    navigator.language,
    navigator.platform || '',
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    navigator.hardwareConcurrency?.toString() || '',
  ];
  const raw = components.join('|');
  let hash = 5381;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) + hash + raw.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

export function generateDeviceId(): string {
  if (typeof window === 'undefined') return 'server';

  // If we already have a stable ID stored for this browser, reuse it.
  // This prevents iOS PWA from generating different IDs across sessions
  // if any fingerprint component changes.
  try {
    const stored = localStorage.getItem('musa_device_id');
    if (stored) return stored;
  } catch { /* non-fatal */ }

  const id = `dev_${computeFingerprintHash()}`;

  // Persist it so it survives user-agent micro-changes (iOS minor updates etc.)
  try { localStorage.setItem('musa_device_id', id); } catch { /* non-fatal */ }

  return id;
}

/**
 * Mark a device as approved in localStorage so we can skip the server
 * round-trip on subsequent logins when the network is slow.
 */
export function markDeviceApprovedLocally(userId: string, deviceId: string): void {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const map: Record<string, string[]> = raw ? JSON.parse(raw) : {};
    if (!map[userId]) map[userId] = [];
    if (!map[userId].includes(deviceId)) map[userId].push(deviceId);
    localStorage.setItem(LS_KEY, JSON.stringify(map));
  } catch { /* non-fatal */ }
}

/**
 * Returns true if this device was previously approved and cached locally.
 * Used as a fast-path fallback when the server check times out on 2G/3G.
 */
export function isDeviceApprovedLocally(userId: string, deviceId: string): boolean {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return false;
    const map: Record<string, string[]> = JSON.parse(raw);
    return !!(map[userId]?.includes(deviceId));
  } catch {
    return false;
  }
}

export function getDeviceLabel(): string {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android Device';
  if (/Mac/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows PC';
  if (/Linux/.test(ua)) return 'Linux Device';
  return 'Unknown Device';
}
