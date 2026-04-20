import { ref, get, set } from 'firebase/database';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { getFirebaseAuth, getFirebaseDatabase } from '@/lib/firebase';
import { generateDeviceId, getDeviceLabel } from '@/utils/deviceFingerprint';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import type { User } from '@/types/user';

/**
 * Sentinel error thrown when a Head-of-House signs in from an unrecognised
 * device. Callers (AuthContext.signIn) should catch this specific message,
 * sign the user out, and show the "approve this device" UI.
 */
export const NEW_DEVICE_APPROVAL_REQUIRED = 'NEW_DEVICE_APPROVAL_REQUIRED';

/**
 * Head-of-House new-device security flow:
 *   1. Check if this device is already approved.
 *   2. If not, see whether the user has ANY known devices.
 *      - No devices yet → auto-approve this one (first device is trusted).
 *      - Has other devices → send approval email and sign the user out,
 *        throwing `NEW_DEVICE_APPROVAL_REQUIRED`.
 *
 * This runs *inside* signIn() — it never blocks non-HoH users.
 * Network / DB errors are treated as non-fatal (we let the user through)
 * to avoid locking them out when a flaky connection interrupts the check.
 */
export async function enforceHouseholdDeviceApproval(user: User): Promise<void> {
  if (!user.isHouseholdHead) return;

  try {
    const deviceId = generateDeviceId();
    const deviceLabel = getDeviceLabel();

    const checkRes = await fetchWithAuth('/api/device-approval', {
      method: 'POST',
      body: JSON.stringify({ action: 'check', userId: user.uid, deviceId }),
    });
    const checkData = await checkRes.json();

    if (checkData.approved) {
      console.log('✅ Device recognised for Head of House');
      return;
    }

    // Device not approved — check if this is their very first device
    const db = await getFirebaseDatabase();
    const devicesRef = ref(db, `users/${user.uid}/knownDevices`);
    const devicesSnap = await get(devicesRef);
    const hasKnownDevices = devicesSnap.exists() && Object.keys(devicesSnap.val()).length > 0;

    if (!hasKnownDevices) {
      console.log('🔐 First device for Head of House — auto-approving');
      const newDeviceRef = ref(db, `users/${user.uid}/knownDevices/${deviceId}`);
      await set(newDeviceRef, {
        label: deviceLabel,
        approvedAt: Date.now(),
        autoApproved: true,
      });
      return;
    }

    // Has known devices, but not this one — send approval email and sign out
    console.log('🔐 New device detected for Head of House — requesting approval');
    await fetchWithAuth('/api/device-approval', {
      method: 'POST',
      body: JSON.stringify({
        action: 'send',
        userId: user.uid,
        deviceId,
        deviceLabel,
        email: user.email,
        displayName: user.displayName,
      }),
    });

    const auth = await getFirebaseAuth();
    await firebaseSignOut(auth);
    throw new Error(NEW_DEVICE_APPROVAL_REQUIRED);
  } catch (err: any) {
    if (err?.message === NEW_DEVICE_APPROVAL_REQUIRED) {
      throw err;
    }
    // Any other failure (e.g. network) is non-blocking
    console.warn('Device check failed (non-blocking):', err);
  }
}
