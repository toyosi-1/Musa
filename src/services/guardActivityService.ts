'use client';

import { ref, set, get, update, query, orderByChild, limitToLast } from 'firebase/database';
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
 * Log a verification attempt by a guard
 */
export const logVerificationAttempt = async (
  guardId: string,
  verificationData: {
    code: string;
    isValid: boolean;
    message?: string;
    householdId?: string;
    destinationAddress?: string;
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
    
    // Query the guard's verification history, ordered by timestamp
    const verificationRef = ref(db, `guardActivity/${guardId}/verifications`);
    const verificationQuery = query(verificationRef, orderByChild('timestamp'), limitToLast(limit));
    
    const snapshot = await get(verificationQuery);
    if (!snapshot.exists()) {
      return [];
    }
    
    // Convert to array and sort by timestamp (newest first)
    const records: VerificationRecord[] = Object.values(snapshot.val());
    return records.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Error getting guard verification history:', error);
    return [];
  }
};

/**
 * Get guard activity stats
 */
export const getGuardActivityStats = async (guardId: string): Promise<{
  totalVerifications: number;
  validAccess: number;
  deniedAccess: number;
  todayVerifications: number;
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
        todayVerifications: 0
      };
    }
    
    const records: VerificationRecord[] = Object.values(snapshot.val());
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();
    
    const stats = records.reduce((acc, record) => {
      // Count total
      acc.totalVerifications++;
      
      // Count by valid/invalid
      if (record.isValid) {
        acc.validAccess++;
      } else {
        acc.deniedAccess++;
      }
      
      // Count today's verifications
      if (record.timestamp >= todayTimestamp) {
        acc.todayVerifications++;
      }
      
      return acc;
    }, {
      totalVerifications: 0,
      validAccess: 0,
      deniedAccess: 0,
      todayVerifications: 0
    });
    
    return stats;
  } catch (error) {
    console.error('Error getting guard activity stats:', error);
    return {
      totalVerifications: 0,
      validAccess: 0,
      deniedAccess: 0,
      todayVerifications: 0
    };
  }
};
