import { getFirebaseDatabase } from '@/lib/firebase';
import { ref, push } from 'firebase/database';

/**
 * Log security-related events to the database
 * Used for audit trails and security monitoring
 */
export const logSecurityEvent = async (
  event: string,
  userId: string,
  details: Record<string, any> = {}
): Promise<void> => {
  try {
    const db = await getFirebaseDatabase();
    const securityLogRef = ref(db, 'securityLogs');
    const newLogRef = push(securityLogRef);

    if (newLogRef.key) {
      const logEntry = {
        id: newLogRef.key,
        event,
        userId,
        details,
        timestamp: Date.now(),
        date: new Date().toISOString()
      };

      await push(securityLogRef, logEntry);
      console.log(`Security event logged: ${event}`, logEntry);
    }
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
};
