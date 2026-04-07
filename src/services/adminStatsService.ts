import { getFirestoreDb } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { getFirebaseDatabase, ref, get } from '@/lib/firebase';
import { DataSnapshot } from 'firebase/database';

export interface AdminStats {
  totalUsers: number;
  activeHouseholds: number;
  recentActivities: number;
  pendingUsers: number;
  approvedUsers: number;
  rejectedUsers: number;
  totalAccessCodes: number;
  todayAccessCodes: number;
}

export interface RecentActivity {
  id: string;
  type: 'user_registration' | 'user_approval' | 'household_creation' | 'access_code_generation' | 'verification';
  description: string;
  timestamp: number;
  userId?: string;
  userName?: string;
}

export async function getAdminStats(): Promise<AdminStats> {
  try {
    console.log('Fetching admin statistics from Firestore...');
    return await getFirestoreStats();
  } catch (firestoreError) {
    console.warn('Error fetching from Firestore, falling back to Realtime Database:', firestoreError);
    try {
      return await getRealtimeDatabaseStats();
    } catch (rtdbError) {
      console.error('Error fetching from Realtime Database:', rtdbError);
      throw new Error('Failed to fetch admin statistics from both Firestore and Realtime Database');
    }
  }
}

/**
 * Get admin statistics from Firestore
 */
async function getFirestoreStats(): Promise<AdminStats> {
  const db = await getFirestoreDb();
  
  // Get total users
  const usersSnapshot = await getDocs(collection(db, 'users'));
  const totalUsers = usersSnapshot.size;
  
  // Count users by status
  let pendingUsers = 0;
  let approvedUsers = 0;
  let rejectedUsers = 0;
  
  usersSnapshot.forEach(doc => {
    const userData = doc.data();
    switch (userData.status) {
      case 'pending':
        pendingUsers++;
        break;
      case 'approved':
        approvedUsers++;
        break;
      case 'rejected':
        rejectedUsers++;
        break;
    }
  });
  
  // Get total households
  const householdsSnapshot = await getDocs(collection(db, 'households'));
  const activeHouseholds = householdsSnapshot.size;
  
  // Get total access codes
  const accessCodesSnapshot = await getDocs(collection(db, 'accessCodes'));
  const totalAccessCodes = accessCodesSnapshot.size;
  
  // Count today's access codes
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTimestamp = Timestamp.fromDate(today);
  
  let todayAccessCodes = 0;
  accessCodesSnapshot.forEach(doc => {
    const codeData = doc.data();
    if (codeData.createdAt && codeData.createdAt >= todayTimestamp) {
      todayAccessCodes++;
    }
  });
  
  // Count recent activities (last 24 hours)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayTimestamp = Timestamp.fromDate(yesterday);
  
  let recentActivities = 0;
  
  // Count recent access codes as activities
  accessCodesSnapshot.forEach(doc => {
    const codeData = doc.data();
    if (codeData.createdAt && codeData.createdAt >= yesterdayTimestamp) {
      recentActivities++;
    }
  });
  
  // Count recent user registrations
  usersSnapshot.forEach(doc => {
    const userData = doc.data();
    if (userData.createdAt && userData.createdAt >= yesterdayTimestamp) {
      recentActivities++;
    }
  });
  
  // Count recent household creations
  householdsSnapshot.forEach(doc => {
    const householdData = doc.data();
    if (householdData.createdAt && householdData.createdAt >= yesterdayTimestamp) {
      recentActivities++;
    }
  });
  
  console.log('Admin stats fetched successfully from Firestore:', {
    totalUsers,
    activeHouseholds,
    recentActivities,
    pendingUsers,
    approvedUsers,
    rejectedUsers,
    totalAccessCodes,
    todayAccessCodes
  });
  
  return {
    totalUsers,
    activeHouseholds,
    recentActivities,
    pendingUsers,
    approvedUsers,
    rejectedUsers,
    totalAccessCodes,
    todayAccessCodes
  };
}

/**
 * Get admin statistics from Realtime Database as fallback
 */
async function getRealtimeDatabaseStats(): Promise<AdminStats> {
  console.log('Fetching admin statistics from Realtime Database...');
  
  // Initialize the database
  const database = await getFirebaseDatabase();
  
  // Initialize stats with default values
  let totalUsers = 0;
  let pendingUsers = 0;
  let approvedUsers = 0;
  let rejectedUsers = 0;
  let activeHouseholds = 0;
  let totalAccessCodes = 0;
  let todayAccessCodes = 0;
  let recentActivities = 0;
  
  // Get users data
  const usersSnapshot = await get(ref(database, 'users'));
  if (usersSnapshot.exists()) {
    const usersData = usersSnapshot.val();
    totalUsers = Object.keys(usersData).length;
    
    // Count users by status
    Object.values(usersData).forEach((user: any) => {
      switch (user.status) {
        case 'pending':
          pendingUsers++;
          break;
        case 'approved':
          approvedUsers++;
          break;
        case 'rejected':
          rejectedUsers++;
          break;
      }
    });
  }
  
  // Get households data
  const householdsSnapshot = await get(ref(database, 'households'));
  if (householdsSnapshot.exists()) {
    const householdsData = householdsSnapshot.val();
    activeHouseholds = Object.keys(householdsData).length;
  }
  
  // Get access codes data
  const accessCodesSnapshot = await get(ref(database, 'accessCodes'));
  if (accessCodesSnapshot.exists()) {
    const accessCodesData = accessCodesSnapshot.val();
    totalAccessCodes = Object.keys(accessCodesData).length;
    
    // Calculate today's access codes and recent activities
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayTime = yesterday.getTime();
    
    Object.values(accessCodesData).forEach((code: any) => {
      if (code.createdAt && code.createdAt >= todayTime) {
        todayAccessCodes++;
      }
      if (code.createdAt && code.createdAt >= yesterdayTime) {
        recentActivities++;
      }
    });
  }
  
  // Count recent user registrations and household creations for activities
  if (usersSnapshot.exists()) {
    Object.values(usersSnapshot.val()).forEach((user: any) => {
      if (user.createdAt) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (user.createdAt >= yesterday.getTime()) {
          recentActivities++;
        }
      }
    });
  }
  
  if (householdsSnapshot.exists()) {
    Object.values(householdsSnapshot.val()).forEach((household: any) => {
      if (household.createdAt) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (household.createdAt >= yesterday.getTime()) {
          recentActivities++;
        }
      }
    });
  }
  
  console.log('Admin stats fetched successfully from Realtime Database:', {
    totalUsers,
    activeHouseholds,
    recentActivities,
    pendingUsers,
    approvedUsers,
    rejectedUsers,
    totalAccessCodes,
    todayAccessCodes
  });
  
  return {
    totalUsers,
    activeHouseholds,
    recentActivities,
    pendingUsers,
    approvedUsers,
    rejectedUsers,
    totalAccessCodes,
    todayAccessCodes
  };
}

export async function getRecentActivities(limitCount: number = 10): Promise<RecentActivity[]> {
  try {
    // Primary: read from unified Realtime Database activity log
    const db = await getFirebaseDatabase();
    const snapshot = await get(ref(db, 'activity'));

    if (snapshot.exists()) {
      const raw: RecentActivity[] = Object.values(snapshot.val() as Record<string, any>).map((e: any) => ({
        id: e.id,
        type: e.type === 'access_code_created' ? 'access_code_generation'
             : e.type === 'guest_checkin' ? 'verification'
             : e.type === 'guest_denied' ? 'verification'
             : e.type === 'user_registered' ? 'user_registration'
             : e.type === 'user_approved' ? 'user_approval'
             : 'household_creation',
        description: e.description,
        timestamp: e.timestamp,
        userId: e.userId,
        userName: e.metadata?.userName,
      }));

      const sorted = raw
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limitCount);

      console.log(`[adminStatsService] Fetched ${sorted.length} recent activities from Realtime DB`);
      return sorted;
    }

    // Fallback: scan users/accessCodes nodes directly from Realtime DB
    const activities: RecentActivity[] = [];
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const usersSnap = await get(ref(db, 'users'));
    if (usersSnap.exists()) {
      Object.entries(usersSnap.val() as Record<string, any>).forEach(([id, u]) => {
        if (u.createdAt && u.createdAt >= weekAgo) {
          activities.push({
            id,
            type: 'user_registration',
            description: `New user registered: ${u.displayName || u.email || id}`,
            timestamp: u.createdAt,
            userId: id,
            userName: u.displayName || u.email,
          });
        }
      });
    }

    const codesSnap = await get(ref(db, 'accessCodes'));
    if (codesSnap.exists()) {
      Object.entries(codesSnap.val() as Record<string, any>).forEach(([id, c]) => {
        if (c.createdAt && c.createdAt >= weekAgo) {
          activities.push({
            id,
            type: 'access_code_generation',
            description: `Access code created${c.description ? `: "${c.description}"` : ''}`,
            timestamp: c.createdAt,
            userId: c.userId,
          });
        }
      });
    }

    const sorted = activities
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limitCount);

    console.log(`[adminStatsService] Fetched ${sorted.length} recent activities (fallback scan)`);
    return sorted;
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    return [];
  }
}
