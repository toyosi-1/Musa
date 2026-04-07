import { getFirebaseDatabase } from '@/lib/firebase';
import { ref, set, get } from 'firebase/database';

export type ActivityType = 'access_code_created' | 'guest_checkin' | 'guest_denied' | 'user_registered' | 'user_approved' | 'login';

export interface ActivityEntry {
  id: string;
  type: ActivityType;
  description: string;
  timestamp: number;
  userId: string;
  estateId: string;
  householdId?: string;
  metadata?: {
    code?: string;
    accessCodeId?: string;
    guardId?: string;
    guardName?: string;
    destinationAddress?: string;
    visitorDescription?: string;
  };
}

export const logActivity = async (entry: Omit<ActivityEntry, 'id'>): Promise<void> => {
  try {
    const db = await getFirebaseDatabase();
    const ts = entry.timestamp || Date.now();
    const id = `${ts}-${Math.random().toString(36).substring(2, 9)}`;
    const record: ActivityEntry = { ...entry, id, timestamp: ts };
    await Promise.all([
      set(ref(db, `activity/${id}`), record),
      entry.estateId ? set(ref(db, `estateActivity/${entry.estateId}/log/${id}`), record) : Promise.resolve(),
    ]);
  } catch (err) {
    console.error('[activityService] logActivity failed (non-fatal):', err);
  }
};

export const getEstateActivity = async (estateId: string, limitCount = 30): Promise<ActivityEntry[]> => {
  try {
    const db = await getFirebaseDatabase();
    const snapshot = await get(ref(db, `estateActivity/${estateId}/log`));
    if (!snapshot.exists()) return [];
    return (Object.values(snapshot.val()) as ActivityEntry[])
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limitCount);
  } catch (err) {
    console.error('[activityService] getEstateActivity error:', err);
    return [];
  }
};

export const getHouseholdActivity = async (userId: string, householdId: string, estateId: string, limitCount = 50): Promise<ActivityEntry[]> => {
  try {
    const db = await getFirebaseDatabase();
    const snapshot = await get(ref(db, `estateActivity/${estateId}/log`));
    if (!snapshot.exists()) return [];
    const all = Object.values(snapshot.val()) as ActivityEntry[];
    return all
      .filter(e =>
        (e.userId === userId && (e.type === 'access_code_created' || e.type === 'login')) ||
        ((e.type === 'guest_checkin' || e.type === 'guest_denied') && e.householdId === householdId)
      )
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limitCount);
  } catch (err) {
    console.error('[activityService] getHouseholdActivity error:', err);
    return [];
  }
};

export const getAllActivity = async (limitCount = 50): Promise<ActivityEntry[]> => {
  try {
    const db = await getFirebaseDatabase();
    const snapshot = await get(ref(db, 'activity'));
    if (!snapshot.exists()) return [];
    return (Object.values(snapshot.val()) as ActivityEntry[])
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limitCount);
  } catch (err) {
    console.error('[activityService] getAllActivity error:', err);
    return [];
  }
};
