import { getFirebaseDatabase } from '@/lib/firebase';
import { ref, push, set, get, query, orderByChild, equalTo, limitToLast } from 'firebase/database';
import { User, AccessCode } from '@/types/user';

export interface AccessCodeScanNotification {
  id: string;
  userId: string; // The resident who owns the access code
  accessCodeId: string;
  scannedBy: string; // Guard ID who scanned the code
  guardName?: string;
  timestamp: number;
  isValid: boolean;
  message: string;
  destinationAddress?: string;
  read: boolean;
  type: 'access_code_scan';
}

export interface NotificationData {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  data?: any;
}

/**
 * Create a notification when an access code is scanned
 */
export const createAccessCodeScanNotification = async (
  accessCode: AccessCode,
  guardId: string,
  isValid: boolean,
  message: string,
  destinationAddress?: string
): Promise<void> => {
  try {
    const db = await getFirebaseDatabase();
    
    // Get guard information
    const guardRef = ref(db, `users/${guardId}`);
    const guardSnapshot = await get(guardRef);
    const guardData = guardSnapshot.exists() ? guardSnapshot.val() : null;
    const guardName = guardData?.displayName || 'Security Guard';
    
    // Create notification for the resident who owns the access code
    const notificationId = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    
    const notification: AccessCodeScanNotification = {
      id: notificationId,
      userId: accessCode.userId,
      accessCodeId: accessCode.id,
      scannedBy: guardId,
      guardName,
      timestamp: Date.now(),
      isValid,
      message,
      destinationAddress,
      read: false,
      type: 'access_code_scan'
    };
    
    // Store notification in user's notifications
    const notificationRef = ref(db, `notifications/${accessCode.userId}/${notificationId}`);
    await set(notificationRef, notification);
    
    // Also store in a general notifications index for easier querying
    const indexRef = ref(db, `notificationIndex/${notificationId}`);
    await set(indexRef, {
      userId: accessCode.userId,
      type: 'access_code_scan',
      timestamp: Date.now()
    });
    
    console.log(`✅ Access code scan notification created for user ${accessCode.userId}`);
    
  } catch (error) {
    console.error('❌ Error creating access code scan notification:', error);
    // Don't throw error - notification failure shouldn't block access verification
  }
};

/**
 * Get all notifications for a user
 */
export const getUserNotifications = async (userId: string): Promise<NotificationData[]> => {
  try {
    const db = await getFirebaseDatabase();
    const notificationsRef = ref(db, `notifications/${userId}`);
    const snapshot = await get(notificationsRef);
    
    if (!snapshot.exists()) {
      return [];
    }
    
    const notificationsData = snapshot.val();
    const notifications: NotificationData[] = [];
    
    Object.values(notificationsData).forEach((notification: any) => {
      if (notification.type === 'access_code_scan') {
        const scanNotification = notification as AccessCodeScanNotification;
        notifications.push({
          id: scanNotification.id,
          userId: scanNotification.userId,
          type: scanNotification.type,
          title: scanNotification.isValid ? '✅ Access Code Used' : '❌ Access Code Denied',
          message: `${scanNotification.guardName} ${scanNotification.isValid ? 'approved' : 'denied'} your access code`,
          timestamp: scanNotification.timestamp,
          read: scanNotification.read,
          data: {
            accessCodeId: scanNotification.accessCodeId,
            scannedBy: scanNotification.scannedBy,
            guardName: scanNotification.guardName,
            isValid: scanNotification.isValid,
            destinationAddress: scanNotification.destinationAddress,
            originalMessage: scanNotification.message
          }
        });
      }
    });
    
    // Sort by timestamp (newest first)
    return notifications.sort((a, b) => b.timestamp - a.timestamp);
    
  } catch (error) {
    console.error('Error getting user notifications:', error);
    return [];
  }
};

/**
 * Mark a notification as read
 */
export const markNotificationAsRead = async (userId: string, notificationId: string): Promise<void> => {
  try {
    const db = await getFirebaseDatabase();
    const notificationRef = ref(db, `notifications/${userId}/${notificationId}/read`);
    await set(notificationRef, true);
    
    console.log(`Notification ${notificationId} marked as read for user ${userId}`);
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
};

/**
 * Get unread notification count for a user
 */
export const getUnreadNotificationCount = async (userId: string): Promise<number> => {
  try {
    const notifications = await getUserNotifications(userId);
    return notifications.filter(n => !n.read).length;
  } catch (error) {
    console.error('Error getting unread notification count:', error);
    return 0;
  }
};

/**
 * Mark all notifications as read for a user
 */
export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
  try {
    const db = await getFirebaseDatabase();
    const notificationsRef = ref(db, `notifications/${userId}`);
    const snapshot = await get(notificationsRef);
    
    if (!snapshot.exists()) {
      return;
    }
    
    const notificationsData = snapshot.val();
    const updates: { [key: string]: boolean } = {};
    
    Object.keys(notificationsData).forEach(notificationId => {
      updates[`notifications/${userId}/${notificationId}/read`] = true;
    });
    
    await set(ref(db), updates);
    console.log(`All notifications marked as read for user ${userId}`);
    
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
  }
};
