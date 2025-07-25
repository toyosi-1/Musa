import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';

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
    console.log('Fetching admin statistics...');
    
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
    
    console.log('Admin stats fetched successfully:', {
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
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    throw error;
  }
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
