"use client";

import { useDeviceAuthorization } from '@/hooks/useDeviceAuthorization';
import { useAuth } from '@/contexts/AuthContext';

export default function DeviceApprovalNotice() {
  const { currentUser } = useAuth();
  // Call the hook to enable background device authorization for HoH
  useDeviceAuthorization();

  // Device authorization is now completely silent - no UI shown
  // Email will be sent automatically in the background for new devices
  return null;
}
