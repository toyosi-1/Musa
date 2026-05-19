import { getAdminDatabase } from '@/lib/firebaseAdmin';
import crypto from 'crypto';

export interface Device {
  id: string;
  userId: string;
  householdId?: string;
  estateId?: string;
  fingerprint: string;
  userAgent: string;
  platform: string;
  status: 'pending' | 'authorized' | 'revoked';
  createdAt: number;
  approvedAt?: number;
  approvedBy?: string;
  lastUsed: number;
  ipAddress?: string;
}

export interface DeviceApprovalToken {
  id: string;
  deviceId: string;
  userId: string;
  token: string;
  createdAt: number;
  expiresAt: number;
  used: boolean;
}

// Rate limiting for device authorization emails
const DEVICE_AUTH_RATE_LIMIT = 5; // Max 5 device auth emails per day per user
const RATE_LIMIT_WINDOW = 24 * 60 * 60 * 1000; // 24 hours

// Token expiry
const TOKEN_EXPIRY_MINUTES = 30;

/**
 * Generate a device fingerprint from browser/device info
 * In a real app, use a library like FingerprintJS for better accuracy
 */
export function generateDeviceFingerprint(userAgent: string, platform: string): string {
  // Simple fingerprint based on UA and platform
  // In production, consider using FingerprintJS or similar
  const data = `${userAgent}|${platform}|${Date.now()}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Generate a secure approval token
 */
function generateApprovalToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Log device security events
 */
async function logDeviceEvent(
  event: string,
  userId: string,
  details: Record<string, any> = {}
): Promise<void> {
  try {
    const db = getAdminDatabase();
    const newLogRef = db.ref('securityLogs').push();
    await newLogRef.set({
      id: newLogRef.key,
      event,
      userId,
      timestamp: Date.now(),
      ...details,
    });
  } catch (error) {
    console.error('Error logging device event:', error);
  }
}

/**
 * Check rate limit for device authorization emails
 */
async function checkDeviceAuthRateLimit(userId: string): Promise<boolean> {
  try {
    const db = getAdminDatabase();
    const snapshot = await db.ref('securityLogs')
      .orderByChild('userId')
      .equalTo(userId)
      .get();

    if (!snapshot.exists()) return true;

    const now = Date.now();
    const cutoff = now - RATE_LIMIT_WINDOW;
    let count = 0;

    snapshot.forEach((child) => {
      const log = child.val();
      if (log.event === 'DEVICE_AUTH_STARTED' && log.timestamp > cutoff) {
        count++;
      }
    });

    return count < DEVICE_AUTH_RATE_LIMIT;
  } catch (error) {
    console.error('Error checking rate limit:', error);
    return true;
  }
}

/**
 * Get or create a device record for a user
 * Returns { device, isNew, needsApproval }
 */
export async function getOrCreateDevice(
  userId: string,
  fingerprint: string,
  userAgent: string,
  platform: string,
  ipAddress?: string
): Promise<{ device: Device; isNew: boolean; needsApproval: boolean }> {
  const db = getAdminDatabase();

  const snapshot = await db.ref(`devicesByUser/${userId}`).get();

  if (snapshot.exists()) {
    const devices = snapshot.val();
    for (const deviceId in devices) {
      const deviceSnap = await db.ref(`devices/${deviceId}`).get();
      if (deviceSnap.exists()) {
        const device = deviceSnap.val() as Device;
        if (device.fingerprint === fingerprint) {
          await db.ref(`devices/${deviceId}`).update({ lastUsed: Date.now() });
          return { device, isNew: false, needsApproval: device.status === 'pending' };
        }
      }
    }
  }

  const newDeviceRef = db.ref('devices').push();
  if (!newDeviceRef.key) throw new Error('Failed to create device ID');

  const now = Date.now();
  const newDevice: Device = {
    id: newDeviceRef.key,
    userId,
    fingerprint,
    userAgent,
    platform,
    status: 'pending',
    createdAt: now,
    lastUsed: now,
    ipAddress,
  };

  await db.ref().update({
    [`devices/${newDeviceRef.key}`]: newDevice,
    [`devicesByUser/${userId}/${newDeviceRef.key}`]: true,
  });

  await logDeviceEvent('DEVICE_AUTH_STARTED', userId, {
    deviceId: newDeviceRef.key,
    fingerprint,
    userAgent,
    platform,
  });

  return { device: newDevice, isNew: true, needsApproval: true };
}

/**
 * Check if a user's device is authorized
 */
export async function isDeviceAuthorized(
  userId: string,
  fingerprint: string
): Promise<boolean> {
  try {
    const db = getAdminDatabase();
    const snapshot = await db.ref(`devicesByUser/${userId}`).get();

    if (!snapshot.exists()) return false;

    const devices = snapshot.val();
    for (const deviceId in devices) {
      const deviceSnap = await db.ref(`devices/${deviceId}`).get();
      if (deviceSnap.exists()) {
        const device = deviceSnap.val() as Device;
        if (device.fingerprint === fingerprint && device.status === 'authorized') {
          return true;
        }
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking device authorization:', error);
    return false;
  }
}

/**
 * Create an approval token for a device
 */
export async function createDeviceApprovalToken(
  deviceId: string,
  userId: string
): Promise<string> {
  const withinLimit = await checkDeviceAuthRateLimit(userId);
  if (!withinLimit) {
    await logDeviceEvent('DEVICE_AUTH_RATE_LIMIT', userId, {
      deviceId,
      reason: 'Too many device authorization requests',
    });
    throw new Error('Rate limit exceeded. Please try again later.');
  }

  const db = getAdminDatabase();
  const token = generateApprovalToken();
  const now = Date.now();
  const expiresAt = now + TOKEN_EXPIRY_MINUTES * 60 * 1000;

  const tokenData: DeviceApprovalToken = {
    id: token,
    deviceId,
    userId,
    token,
    createdAt: now,
    expiresAt,
    used: false,
  };

  await db.ref(`deviceApprovalTokens/${token}`).set(tokenData);

  return token;
}

/**
 * Approve a device using a token
 */
export async function approveDeviceWithToken(token: string): Promise<{
  success: boolean;
  message: string;
  device?: Device;
}> {
  const db = getAdminDatabase();
  const tokenSnap = await db.ref(`deviceApprovalTokens/${token}`).get();

  if (!tokenSnap.exists()) {
    await logDeviceEvent('DEVICE_AUTH_TOKEN_INVALID', 'system', { token, reason: 'Token not found' });
    return { success: false, message: 'Invalid or expired approval link' };
  }

  const tokenData = tokenSnap.val() as DeviceApprovalToken;

  if (Date.now() > tokenData.expiresAt) {
    await logDeviceEvent('DEVICE_AUTH_TOKEN_EXPIRED', tokenData.userId, { deviceId: tokenData.deviceId, token });
    return { success: false, message: 'Approval link has expired' };
  }

  if (tokenData.used) {
    return { success: false, message: 'This approval link has already been used' };
  }

  await db.ref(`deviceApprovalTokens/${token}`).update({ used: true });

  const deviceSnap = await db.ref(`devices/${tokenData.deviceId}`).get();
  if (!deviceSnap.exists()) {
    return { success: false, message: 'Device not found' };
  }

  const device = deviceSnap.val() as Device;
  const now = Date.now();

  await db.ref(`devices/${tokenData.deviceId}`).update({
    status: 'authorized',
    approvedAt: now,
    approvedBy: tokenData.userId,
  });

  await logDeviceEvent('DEVICE_AUTH_APPROVED', tokenData.userId, {
    deviceId: tokenData.deviceId,
    fingerprint: device.fingerprint,
    approvalMethod: 'email_token',
  });

  return {
    success: true,
    message: 'Device authorized successfully',
    device: { ...device, status: 'authorized', approvedAt: now },
  };
}

/**
 * Revoke a device (admin or user action)
 */
export async function revokeDevice(
  deviceId: string,
  revokedBy: string
): Promise<void> {
  const db = getAdminDatabase();
  const deviceSnap = await db.ref(`devices/${deviceId}`).get();

  if (!deviceSnap.exists()) {
    throw new Error('Device not found');
  }

  const device = deviceSnap.val() as Device;

  await db.ref(`devices/${deviceId}`).update({ status: 'revoked' });

  await logDeviceEvent('DEVICE_AUTH_REVOKED', device.userId, {
    deviceId,
    revokedBy,
    fingerprint: device.fingerprint,
  });
}

/**
 * Get all devices for a user
 */
export async function getUserDevices(userId: string): Promise<Device[]> {
  const db = getAdminDatabase();
  const snapshot = await db.ref(`devicesByUser/${userId}`).get();

  if (!snapshot.exists()) return [];

  const devices: Device[] = [];
  for (const deviceId of Object.keys(snapshot.val())) {
    const deviceSnap = await db.ref(`devices/${deviceId}`).get();
    if (deviceSnap.exists()) {
      devices.push(deviceSnap.val() as Device);
    }
  }

  return devices.sort((a, b) => b.lastUsed - a.lastUsed);
}

/**
 * Get all devices for an estate (admin view)
 */
export async function getEstateDevices(estateId: string): Promise<Device[]> {
  const db = getAdminDatabase();
  const snapshot = await db.ref('devices').get();

  if (!snapshot.exists()) return [];

  const devices: Device[] = [];
  snapshot.forEach((child) => {
    const device = child.val() as Device;
    if (device.estateId === estateId) {
      devices.push(device);
    }
  });

  return devices.sort((a, b) => b.lastUsed - a.lastUsed);
}
