import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { generateDeviceId, computeFingerprintHash } from '@/utils/deviceFingerprint';
import { getFirebaseDatabase } from '@/lib/firebase';
import { ref, get } from 'firebase/database';

interface DeviceAuthStatus {
  isChecking: boolean;
  needsApproval: boolean;
  deviceId: string | null;
  error: string | null;
}

/**
 * Hook to check device authorization for Head of Household accounts.
 * Uses the same knownDevices system as the login check to avoid conflicts.
 */
export function useDeviceAuthorization() {
  const { currentUser } = useAuth();
  const [status, setStatus] = useState<DeviceAuthStatus>({
    isChecking: false,
    needsApproval: false,
    deviceId: null,
    error: null,
  });

  useEffect(() => {
    // Only check for Head of Household accounts
    if (!currentUser || !currentUser.isHouseholdHead) {
      setStatus({ isChecking: false, needsApproval: false, deviceId: null, error: null });
      return;
    }
    checkDeviceAuthorization();
  }, [currentUser?.uid]);

  const checkDeviceAuthorization = async () => {
    if (!currentUser) return;

    try {
      setStatus(prev => ({ ...prev, isChecking: true, error: null }));

      // Skip check for solo households — only enforce when HoH has actual members
      if (currentUser.householdId) {
        const db = await getFirebaseDatabase();
        const membersSnap = await get(ref(db, `households/${currentUser.householdId}/members`));
        const memberCount = membersSnap.exists() ? Object.keys(membersSnap.val()).length : 0;
        if (memberCount <= 1) {
          console.log('✅ Solo household — skipping device check in hook');
          setStatus({ isChecking: false, needsApproval: false, deviceId: null, error: null });
          return;
        }
      }

      const deviceId = generateDeviceId();
      const fingerprintHash = computeFingerprintHash();

      // Use the same /api/device-approval check endpoint as the login flow
      // so approvals from email links are immediately recognised here too
      const response = await fetchWithAuth('/api/device-approval', {
        method: 'POST',
        body: JSON.stringify({ action: 'check', userId: currentUser.uid, deviceId, fingerprintHash }),
      });

      if (!response.ok) {
        // Server error — fail open so the user isn't blocked
        setStatus({ isChecking: false, needsApproval: false, deviceId, error: null });
        return;
      }

      const data = await response.json();

      setStatus({
        isChecking: false,
        needsApproval: !data.approved,
        deviceId,
        error: null,
      });
    } catch (error) {
      console.error('Error checking device authorization:', error);
      // Fail open — never block the user due to a network error
      setStatus({ isChecking: false, needsApproval: false, deviceId: null, error: null });
    }
  };

  return {
    ...status,
    recheckDevice: checkDeviceAuthorization,
  };
}
