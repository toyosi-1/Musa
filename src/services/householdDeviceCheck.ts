import { ref, get, set } from 'firebase/database';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { getFirebaseAuth, getFirebaseDatabase } from '@/lib/firebase';
import { generateDeviceId, getDeviceLabel, isDeviceApprovedLocally, markDeviceApprovedLocally, computeFingerprintHash } from '@/utils/deviceFingerprint';
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
    // Only enforce if the household has other members — a solo HoH doesn't
    // need device security since there's no one else's access at risk.
    // This also prevents false triggers for residents who are auto-flagged as HoH.
    if (user.householdId) {
      const db = await getFirebaseDatabase();
      const membersSnap = await get(ref(db, `households/${user.householdId}/members`));
      const memberCount = membersSnap.exists() ? Object.keys(membersSnap.val()).length : 0;
      if (memberCount <= 1) {
        console.log('✅ Solo household — skipping device check');
        return;
      }
    }

    const deviceId = generateDeviceId();
    const deviceLabel = getDeviceLabel();

    // Fast-path: check local cache first — avoids a server round-trip on slow networks
    if (isDeviceApprovedLocally(user.uid, deviceId)) {
      console.log('✅ Device recognised (local cache) for Head of House');
      return;
    }

    const fingerprintHash = computeFingerprintHash();

    let serverApproved = false;
    try {
      const checkRes = await fetchWithAuth('/api/device-approval', {
        method: 'POST',
        body: JSON.stringify({ action: 'check', userId: user.uid, deviceId, fingerprintHash }),
      });
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        serverApproved = !!checkData.approved;
        if (serverApproved) {
          // If the server recognised us by fingerprintHash (localStorage was cleared),
          // re-persist the correct deviceId it resolved so future checks use it.
          if (checkData.resolvedDeviceId && checkData.resolvedDeviceId !== deviceId) {
            try { localStorage.setItem('musa_device_id', checkData.resolvedDeviceId); } catch { /* non-fatal */ }
            markDeviceApprovedLocally(user.uid, checkData.resolvedDeviceId);
          } else {
            markDeviceApprovedLocally(user.uid, deviceId);
          }
          console.log('✅ Device recognised (server) for Head of House');
          return;
        }
      } else {
        console.warn('⚠️ Device check server returned', checkRes.status, '— proceeding cautiously');
      }
    } catch (checkErr) {
      console.warn('⚠️ Device check request failed (network) — will check knownDevices directly:', checkErr);
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
        fingerprintHash,
      });
      markDeviceApprovedLocally(user.uid, deviceId);
      return;
    }

    // Has known devices, but not this one — send approval email then sign out
    console.log('🔐 New device detected for Head of House — requesting approval email to:', user.email);
    // MUST await before signing out — fire-and-forget causes the fetch to be
    // cancelled by the browser when the page navigates after the sign-out throws.
    try {
      const sendRes = await fetch('/api/device-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          userId: user.uid,
          deviceId,
          deviceLabel,
          fingerprintHash,
          email: user.email,
          displayName: user.displayName,
        }),
      });
      const sendData = await sendRes.json().catch(() => ({}));
      if (!sendRes.ok || !sendData.success) {
        console.error('❌ Device approval email API failed:', sendRes.status, JSON.stringify(sendData));
      } else {
        console.log('✅ Device approval email sent to:', user.email);
      }
    } catch (sendErr) {
      console.error('❌ Device approval email request threw:', sendErr);
    }

    // Persist device info so the "Resend" button can call the API directly
    try {
      sessionStorage.setItem('musa_pending_device', JSON.stringify({
        userId: user.uid,
        deviceId,
        deviceLabel,
        email: user.email,
        displayName: user.displayName,
      }));
    } catch { /* non-fatal */ }

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
