import { rtdb } from '@/lib/firebase';
import { ref, get } from 'firebase/database';
import { User } from '@/types/user';

// Get a user profile by ID
export const getUserProfile = async (uid: string): Promise<User | null> => {
  console.log('Getting user profile for uid:', uid);
  
  try {
    const userRef = ref(rtdb, `users/${uid}`);
    const snapshot = await get(userRef);
    
    if (!snapshot.exists()) {
      console.log('User profile not found for uid:', uid);
      return null;
    }
    
    return snapshot.val() as User;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw new Error('Failed to get user profile');
  }
};
