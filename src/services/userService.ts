import { getFirebaseDatabase } from '@/lib/firebase';
import { ref, get, update, push, set } from 'firebase/database';
import { User } from '@/types/user';

// Get a user profile by ID
export const getUserProfile = async (uid: string): Promise<User | null> => {
  console.log('Getting user profile for uid:', uid);
  
  try {
    const db = await getFirebaseDatabase();
    const userRef = ref(db, `users/${uid}`);
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

// Approve a pending user with an assigned estate (admin only caller)
export const approveUserWithEstate = async (
  userId: string,
  estateId: string,
  adminId: string,
  isHouseholdHead?: boolean
): Promise<void> => {
  const db = await getFirebaseDatabase();

  // Update user fields and indexes atomically
  const updates: { [key: string]: any } = {};
  const now = Date.now();
  // Don't update estateId - users already have it from registration
  updates[`users/${userId}/status`] = 'approved';
  updates[`users/${userId}/approvedAt`] = now;
  updates[`users/${userId}/approvedBy`] = adminId;
  updates[`usersByEstate/${estateId}/${userId}`] = true;
  
  // Set HoH status if provided
  if (isHouseholdHead !== undefined) {
    updates[`users/${userId}/isHouseholdHead`] = isHouseholdHead;
  }

  console.log('Approving user with updates:', updates);
  await update(ref(db), updates);

  // Security log (best-effort)
  try {
    const logsRef = ref(db, 'securityLogs');
    const newLogRef = push(logsRef);
    if (newLogRef.key) {
      await set(newLogRef, {
        id: newLogRef.key,
        event: 'ADMIN_APPROVED_USER',
        userId,
        estateId,
        isHouseholdHead: isHouseholdHead || false,
        actorId: adminId,
        timestamp: now,
      });
    }
  } catch {}
};

// Reassign a user's estate (admin only caller)
export const reassignUserEstate = async (
  userId: string,
  newEstateId: string,
  adminId: string
): Promise<void> => {
  const db = await getFirebaseDatabase();
  const userRef = ref(db, `users/${userId}`);
  const snap = await get(userRef);
  if (!snap.exists()) throw new Error('User not found');
  const user = snap.val() as User & { estateId?: string };

  const oldEstateId = user.estateId || null;
  const now = Date.now();
  const updates: { [key: string]: any } = {};
  updates[`users/${userId}/estateId`] = newEstateId;
  if (oldEstateId) {
    updates[`usersByEstate/${oldEstateId}/${userId}`] = null;
  }
  updates[`usersByEstate/${newEstateId}/${userId}`] = true;

  await update(ref(db), updates);

  // Security log (best-effort)
  try {
    const logsRef = ref(db, 'securityLogs');
    const newLogRef = push(logsRef);
    if (newLogRef.key) {
      await set(newLogRef, {
        id: newLogRef.key,
        event: 'ADMIN_REASSIGNED_USER_ESTATE',
        userId,
        fromEstateId: oldEstateId,
        toEstateId: newEstateId,
        actorId: adminId,
        timestamp: now,
      });
    }
  } catch {}
};
