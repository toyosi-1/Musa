'use client';

import { ref, set, get, query, orderByChild, equalTo, limitToLast } from 'firebase/database';
import { createAccessCodeScanNotification } from './notificationService';
import { AccessCode } from '@/types/user';
import { getFirebaseDatabase } from '@/lib/firebase';

export type VerificationRecord = {
  id: string;
  timestamp: number;
  code: string;
  isValid: boolean;
  message?: string;
  guardId: string;
  householdId?: string;
  destinationAddress?: string;
};

/**
 * Log a verification attempt by a guard and notify the resident
 */
export const logVerificationAttempt = async (
  guardId: string,
  verificationData: {
    code: string;
    isValid: boolean;
    message?: string;
    householdId?: string;
    destinationAddress?: string;
    accessCodeId?: string;
  }
): Promise<VerificationRecord> => {
  try {
    const timestamp = Date.now();
    const id = `${timestamp}-${Math.random().toString(36).substring(2, 10)}`;
    
    const record: VerificationRecord = {
      id,
      timestamp,
      guardId,
      ...verificationData
    };
    
    const db = await getFirebaseDatabase();
    
    // Store in guard's verification history
    const recordRef = ref(db, `guardActivity/${guardId}/verifications/${id}`);
    await set(recordRef, record);
    
    // Also store in estate-wide verification log
    const estateLogRef = ref(db, `estateActivity/verifications/${id}`);
    await set(estateLogRef, record);
    
    // Create notification for the resident if we have access code info
    if (verificationData.accessCodeId) {
      try {
        // Get the access code details to find the owner
        const accessCodeRef = ref(db, `accessCodes/${verificationData.accessCodeId}`);
        const accessCodeSnapshot = await get(accessCodeRef);
        
        if (accessCodeSnapshot.exists()) {
          const accessCode = accessCodeSnapshot.val() as AccessCode;
          
          // Create notification for the resident
          await createAccessCodeScanNotification(
            accessCode,
            guardId,
            verificationData.isValid,
            verificationData.message || 'Access code verified',
            verificationData.destinationAddress
          );
          
          console.log(`📱 Notification sent to resident ${accessCode.userId} for code scan`);
        }
      } catch (notificationError) {
        console.error('Error creating scan notification:', notificationError);
        // Don't throw - notification failure shouldn't block verification logging
      }
    }
    
    return record;
  } catch (error) {
    console.error('Error logging verification attempt:', error);
    throw error;
  }
};

/**
 * Get recent verification history for a guard
 */
export const getGuardVerificationHistory = async (
  guardId: string, 
  limit: number = 10
): Promise<VerificationRecord[]> => {
  try {
    const db = await getFirebaseDatabase();
    
    // Query the guard's verification history without ordering (working around missing index)
    const verificationRef = ref(db, `guardActivity/${guardId}/verifications`);
    
    // Get all records without using orderByChild (avoids the need for an index)
    const snapshot = await get(verificationRef);
    if (!snapshot.exists()) {
      return [];
    }
    
    // Convert to array and sort by timestamp in the client (newest first)
    const records: VerificationRecord[] = Object.values(snapshot.val());
    const sortedRecords = records.sort((a, b) => b.timestamp - a.timestamp);
    
    // Only return the most recent records up to the limit
    return sortedRecords.slice(0, limit);
  } catch (error) {
    console.error('Error getting guard verification history:', error);
    return [];
  }
};

/**
 * Enhanced guard activity stats with comprehensive security metrics
 */
export const getGuardActivityStats = async (guardId: string): Promise<{
  totalVerifications: number;
  validAccess: number;
  deniedAccess: number;
  todayVerifications: number;
  successRate: number;
  expiredCodes: number;
  invalidCodes: number;
  thisWeekVerifications: number;
  thisMonthVerifications: number;
  averagePerDay: number;
}> => {
  try {
    const db = await getFirebaseDatabase();
    const verificationRef = ref(db, `guardActivity/${guardId}/verifications`);
    const snapshot = await get(verificationRef);
    
    if (!snapshot.exists()) {
      return {
        totalVerifications: 0,
        validAccess: 0,
        deniedAccess: 0,
        todayVerifications: 0,
        successRate: 0,
        expiredCodes: 0,
        invalidCodes: 0,
        thisWeekVerifications: 0,
        thisMonthVerifications: 0,
        averagePerDay: 0
      };
    }
    
    const records: VerificationRecord[] = Object.values(snapshot.val());
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekTimestamp = weekAgo.getTime();
    
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const monthTimestamp = monthAgo.getTime();
    
    const stats = records.reduce((acc, record) => {
      // Count total
      acc.totalVerifications++;
      
      // Count by valid/invalid
      if (record.isValid) {
        acc.validAccess++;
      } else {
        acc.deniedAccess++;
        
        // Categorize denied access reasons
        if (record.message?.toLowerCase().includes('expired')) {
          acc.expiredCodes++;
        } else {
          acc.invalidCodes++;
        }
      }
      
      // Count today's verifications
      if (record.timestamp >= todayTimestamp) {
        acc.todayVerifications++;
      }
      
      // Count this week's verifications
      if (record.timestamp >= weekTimestamp) {
        acc.thisWeekVerifications++;
      }
      
      // Count this month's verifications
      if (record.timestamp >= monthTimestamp) {
        acc.thisMonthVerifications++;
      }
      
      return acc;
    }, {
      totalVerifications: 0,
      validAccess: 0,
      deniedAccess: 0,
      todayVerifications: 0,
      expiredCodes: 0,
      invalidCodes: 0,
      thisWeekVerifications: 0,
      thisMonthVerifications: 0
    });
    
    // Calculate success rate
    const successRate = stats.totalVerifications > 0 
      ? Math.round((stats.validAccess / stats.totalVerifications) * 100)
      : 0;
    
    // Calculate average per day (based on first record date)
    const firstRecord = records.length > 0 ? records.reduce((earliest, record) => 
      record.timestamp < earliest.timestamp ? record : earliest
    ) : null;
    
    const averagePerDay = firstRecord 
      ? Math.round(stats.totalVerifications / Math.max(1, Math.ceil((now.getTime() - firstRecord.timestamp) / (1000 * 60 * 60 * 24))))
      : 0;
    
    return {
      ...stats,
      successRate,
      averagePerDay
    };
  } catch (error) {
    console.error('Error getting guard activity stats:', error);
    return {
      totalVerifications: 0,
      validAccess: 0,
      deniedAccess: 0,
      todayVerifications: 0,
      successRate: 0,
      expiredCodes: 0,
      invalidCodes: 0,
      thisWeekVerifications: 0,
      thisMonthVerifications: 0,
      averagePerDay: 0
    };
  }
};
