import { db } from '@/lib/firebase';
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
  console.log('Fetching admin statistics from Firestore...');
  
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
    console.log('Fetching recent activities...');
    
    const activities: RecentActivity[] = [];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 7); // Last 7 days for more data
    const weekAgoTimestamp = Timestamp.fromDate(yesterday);
    
    // Get recent user registrations
    const usersSnapshot = await getDocs(
      query(
        collection(db, 'users'),
        where('createdAt', '>=', weekAgoTimestamp),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      )
    );
    
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      activities.push({
        id: doc.id,
        type: 'user_registration',
        description: `New user registered: ${userData.name || userData.email}`,
        timestamp: userData.createdAt?.toMillis() || Date.now(),
        userId: doc.id,
        userName: userData.name || userData.email
      });
    });
    
    // Get recent household creations
    const householdsSnapshot = await getDocs(
      query(
        collection(db, 'households'),
        where('createdAt', '>=', weekAgoTimestamp),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      )
    );
    
    householdsSnapshot.forEach(doc => {
      const householdData = doc.data();
      activities.push({
        id: doc.id,
        type: 'household_creation',
        description: `New household created: ${householdData.name}`,
        timestamp: householdData.createdAt?.toMillis() || Date.now()
      });
    });
    
    // Get recent access code generations
    const accessCodesSnapshot = await getDocs(
      query(
        collection(db, 'accessCodes'),
        where('createdAt', '>=', weekAgoTimestamp),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      )
    );
    
    accessCodesSnapshot.forEach(doc => {
      const codeData = doc.data();
      activities.push({
        id: doc.id,
        type: 'access_code_generation',
        description: `Access code generated for ${codeData.visitorName || 'visitor'}`,
        timestamp: codeData.createdAt?.toMillis() || Date.now(),
        userId: codeData.userId
      });
    });
    
    // Sort all activities by timestamp (most recent first)
    activities.sort((a, b) => b.timestamp - a.timestamp);
    
    // Return only the requested number of activities
    const recentActivities = activities.slice(0, limitCount);
    
    console.log(`Fetched ${recentActivities.length} recent activities`);
    return recentActivities;
    
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    return [];
  }
}
