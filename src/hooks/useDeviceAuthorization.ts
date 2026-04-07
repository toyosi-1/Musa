import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface DeviceAuthStatus {
  isChecking: boolean;
  needsApproval: boolean;
  deviceId: string | null;
  error: string | null;
}

/**
 * Client-side device fingerprinting (simple version)
 * In production, use a library like FingerprintJS for better accuracy
 */
function getDeviceFingerprint(): string {
  if (typeof window === 'undefined') return '';

  const ua = navigator.userAgent;
  const platform = navigator.platform;
  const language = navigator.language;
  const screenRes = `${window.screen.width}x${window.screen.height}`;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Create a simple fingerprint
  const data = `${ua}|${platform}|${language}|${screenRes}|${timezone}`;
  
  // Simple hash function (in production, use crypto.subtle.digest)
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return Math.abs(hash).toString(36);
}

/**
 * Hook to check and manage device authorization for Head of Household accounts
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
      setStatus({
        isChecking: false,
        needsApproval: false,
        deviceId: null,
        error: null,
      });
      return;
    }

    checkDeviceAuthorization();
  }, [currentUser]);

  const checkDeviceAuthorization = async () => {
    if (!currentUser) return;

    try {
      setStatus(prev => ({ ...prev, isChecking: true, error: null }));

      const fingerprint = getDeviceFingerprint();
      const ua = navigator.userAgent;
      const platform = navigator.platform;

      // Call API to check/create device
      const response = await fetch('/api/device/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.uid,
          fingerprint,
          userAgent: ua,
          platform,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setStatus({
          isChecking: false,
          needsApproval: data.needsApproval,
          deviceId: data.deviceId,
          error: null,
        });

        // If new device needs approval, trigger email
        if (data.isNew && data.needsApproval) {
          await sendDeviceApprovalEmail(data.deviceId, fingerprint);
        }
      } else {
        setStatus({
          isChecking: false,
          needsApproval: false,
          deviceId: null,
          error: data.message || 'Failed to check device authorization',
        });
      }
    } catch (error) {
      console.error('Error checking device authorization:', error);
      setStatus({
        isChecking: false,
        needsApproval: false,
        deviceId: null,
        error: 'Failed to check device authorization',
      });
    }
  };

  const sendDeviceApprovalEmail = async (deviceId: string, fingerprint: string) => {
    if (!currentUser) return;

    try {
      const ua = navigator.userAgent;
      const platform = navigator.platform;

      await fetch('/api/device/send-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId,
          userId: currentUser.uid,
          userEmail: currentUser.email,
          userName: currentUser.displayName,
          deviceInfo: {
            platform,
            userAgent: ua,
            timestamp: Date.now(),
          },
        }),
      });
    } catch (error) {
      console.error('Error sending device approval email:', error);
    }
  };

  return {
    ...status,
    recheckDevice: checkDeviceAuthorization,
  };
}
