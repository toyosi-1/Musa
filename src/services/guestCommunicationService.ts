import { getFirebaseDatabase } from '@/lib/firebase';
import { ref, push, set, get, query, orderByChild, equalTo, update, onValue } from 'firebase/database';

export type GuestMessage = {
  id?: string;
  householdId: string;
  guestName: string;
  message: string;
  accessCodeId?: string;
  timestamp: number;
  status: 'sent' | 'delivered' | 'read';
  type: 'arrival' | 'message' | 'help';
};

/**
 * Send a message from a guest to a household
 */
export const sendGuestMessage = async (message: Omit<GuestMessage, 'id' | 'timestamp' | 'status'>): Promise<string> => {
  try {
    console.log('Sending guest message to household:', message.householdId);
    
    const db = await getFirebaseDatabase();
    const messagesRef = ref(db, 'guestMessages');
    const newMessageRef = push(messagesRef);
    
    if (!newMessageRef.key) {
      throw new Error('Failed to generate message ID');
    }
    
    const timestamp = Date.now();
    const fullMessage: GuestMessage = {
      ...message,
      id: newMessageRef.key,
      timestamp,
      status: 'sent'
    };
    
    // Save the message
    await set(newMessageRef, fullMessage);
    
    // Create indexes for quick lookups
    const updates: { [key: string]: any } = {};
    updates[`guestMessagesByHousehold/${message.householdId}/${newMessageRef.key}`] = timestamp;
    
    if (message.accessCodeId) {
      updates[`guestMessagesByAccessCode/${message.accessCodeId}/${newMessageRef.key}`] = timestamp;
    }
    
    await update(ref(db), updates);
    
    console.log('Guest message sent successfully:', newMessageRef.key);
    return newMessageRef.key;
  } catch (error) {
    console.error('Error sending guest message:', error);
    throw new Error('Failed to send message');
  }
};

/**
 * Get all messages for a specific household
 */
export const getHouseholdGuestMessages = async (householdId: string): Promise<GuestMessage[]> => {
  try {
    console.log('Getting guest messages for household:', householdId);
    
    const db = await getFirebaseDatabase();
    const messagesIndexRef = ref(db, `guestMessagesByHousehold/${householdId}`);
    const snapshot = await get(messagesIndexRef);
    
    if (!snapshot.exists()) {
      return [];
    }
    
    const messageIds = Object.keys(snapshot.val());
    const messages: GuestMessage[] = [];
    
    // Fetch all messages in parallel
    await Promise.all(
      messageIds.map(async (messageId) => {
        const messageRef = ref(db, `guestMessages/${messageId}`);
        const messageSnapshot = await get(messageRef);
        
        if (messageSnapshot.exists()) {
          messages.push(messageSnapshot.val());
        }
      })
    );
    
    // Sort messages by timestamp, newest first
    return messages.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Error getting household guest messages:', error);
    return [];
  }
};

/**
 * Update the status of a guest message (delivered, read)
 */
export const updateMessageStatus = async (messageId: string, status: 'delivered' | 'read'): Promise<void> => {
  try {
    const db = await getFirebaseDatabase();
    const messageRef = ref(db, `guestMessages/${messageId}`);
    await update(messageRef, { status });
    
    console.log(`Message ${messageId} status updated to ${status}`);
  } catch (error) {
    console.error('Error updating message status:', error);
    throw new Error('Failed to update message status');
  }
};

/**
 * Listen for new guest messages for a household
 * Returns an unsubscribe function
 */
export const subscribeToGuestMessages = (
  householdId: string, 
  callback: (messages: GuestMessage[]) => void
): (() => void) => {
  let unsubscribe = () => {};
  
  // Use promise-then pattern instead of await since this function is not async
  getFirebaseDatabase().then(db => {
      const messagesIndexRef = ref(db, `guestMessagesByHousehold/${householdId}`);
    
    // Use onValue to listen for changes
      const onValueUnsubscribe = onValue(messagesIndexRef, async (snapshot) => {
    try {
      if (!snapshot.exists()) {
        callback([]);
        return;
      }
      
      const messagesObj = snapshot.val();
      const messageIds = Object.keys(messagesObj);
      const messages: GuestMessage[] = [];
      
      // Fetch all messages in parallel
      await Promise.all(
        messageIds.map(async (messageId) => {
          const messageRef = ref(db, `guestMessages/${messageId}`);
          const messageSnapshot = await get(messageRef);
          
          if (messageSnapshot.exists()) {
            // Mark as delivered if it's not read yet
            const message = messageSnapshot.val();
            if (message.status === 'sent') {
              updateMessageStatus(messageId, 'delivered')
                .catch(err => console.error('Failed to mark message as delivered:', err));
              message.status = 'delivered';
            }
            
            messages.push(message);
          }
        })
      );
      
      // Sort messages by timestamp, newest first
      callback(messages.sort((a, b) => b.timestamp - a.timestamp));
      
    } catch (error) {
      console.error('Error in message subscription:', error);
      callback([]);
    }
  });
  
      unsubscribe = onValueUnsubscribe;
  });
  
  return () => unsubscribe();
};
