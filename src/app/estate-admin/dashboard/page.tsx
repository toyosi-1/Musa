"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getFirebaseDatabase } from '@/lib/firebase';
import { ref, get, query, orderByChild, equalTo } from 'firebase/database';
import type { User, Estate, EmergencyAlert } from '@/types/user';
import { subscribeToAlerts, acknowledgeAlert, resolveAlert, getEmergencyTypeInfo } from '@/services/emergencyService';
import { formatDistanceToNow } from 'date-fns';

export default function EstateAdminDashboard() {
  const { currentUser, signOut } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [estate, setEstate] = useState<Estate | null>(null);
  const [stats, setStats] = useState({
    pendingUsers: 0,
    totalUsers: 0,
    residents: 0,
    guards: 0
  });
  const [emergencyAlerts, setEmergencyAlerts] = useState<EmergencyAlert[]>([]);

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/auth/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  useEffect(() => {
    if (!currentUser) {
      router.push('/auth/login');
      return;
    }

    if (currentUser.role !== 'estate_admin') {
      router.push('/dashboard');
      return;
    }

    loadDashboardData();
  }, [currentUser, router]);

  // Subscribe to emergency alerts for this estate
  useEffect(() => {
    if (!currentUser?.estateId) return;

    const unsubscribe = subscribeToAlerts(currentUser.estateId, (alerts) => {
      setEmergencyAlerts(alerts.filter(a => a.status === 'active'));
    });

    return () => unsubscribe();
  }, [currentUser?.estateId]);

  const loadDashboardData = async () => {
    if (!currentUser?.estateId) {
      console.error('Estate admin missing estateId');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const db = await getFirebaseDatabase();

      // Load estate details
      const estateRef = ref(db, `estates/${currentUser.estateId}`);
      const estateSnapshot = await get(estateRef);
      if (estateSnapshot.exists()) {
        setEstate(estateSnapshot.val() as Estate);
      }

      // Load users for this estate
      const usersRef = ref(db, 'users');
      const snapshot = await get(usersRef);

      if (snapshot.exists()) {
        let pendingCount = 0;
        let totalCount = 0;
        let residentCount = 0;
        let guardCount = 0;

        snapshot.forEach((child) => {
          const user = child.val() as User;
          
          // Only count users in this estate
          if (user.estateId === currentUser.estateId) {
            totalCount++;
            
            if (user.status === 'pending') {
              pendingCount++;
            }
            
            if (user.role === 'resident') {
              residentCount++;
            } else if (user.role === 'guard') {
              guardCount++;
            }
          }
        });

        setStats({
          pendingUsers: pendingCount,
          totalUsers: totalCount,
          residents: residentCount,
          guards: guardCount
        });
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 py-4 sm:px-4 sm:py-8 max-w-7xl">
      <div className="mb-4 sm:mb-8">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-3xl font-bold text-gray-800 dark:text-white">
              Estate Admin
            </h1>
            {estate && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                Managing: <span className="font-semibold text-primary">{estate.name}</span>
              </p>
            )}
            <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{currentUser?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex-shrink-0 flex items-center justify-center p-2 sm:px-4 sm:py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-sm"
            title="Logout"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden sm:inline ml-2">Logout</span>
          </button>
        </div>
      </div>

      {/* ─── Emergency Alerts ─── */}
      {emergencyAlerts.length > 0 && (
        <div className="mb-4 sm:mb-6 space-y-3">
          <h2 className="text-base font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
            <span className="animate-pulse">🚨</span> Active Emergencies ({emergencyAlerts.length})
          </h2>
          {emergencyAlerts.map((alert) => {
            const typeInfo = getEmergencyTypeInfo(alert.type);
            const timeAgo = formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true });
            return (
              <div key={alert.id} className="bg-red-50 dark:bg-red-900/20 border-2 border-red-500 dark:border-red-600 rounded-2xl p-4 shadow-lg">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center flex-shrink-0 animate-pulse">
                    <span className="text-xl">{typeInfo.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-red-700 dark:text-red-300 uppercase tracking-wide text-xs">Emergency</span>
                      <span className="text-xs text-red-500 dark:text-red-400">{timeAgo}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{typeInfo.label}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                      From: <strong>{alert.triggeredByName}</strong>
                      {alert.householdName ? ` • ${alert.householdName}` : ''}
                    </p>
                    {alert.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">&ldquo;{alert.description}&rdquo;</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => acknowledgeAlert(alert.estateId, alert.id, currentUser!.uid)}
                      className="px-3 py-1.5 text-[11px] font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors"
                    >
                      Acknowledge
                    </button>
                    <button
                      onClick={() => resolveAlert(alert.estateId, alert.id, currentUser!.uid)}
                      className="px-3 py-1.5 text-[11px] font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                    >
                      Resolve
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Statistics Cards — compact 2x2 on mobile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-8">
        <Link 
          href="/estate-admin/pending"
          className="card p-3 sm:p-5 hover:shadow-lg transition-shadow border border-transparent hover:border-orange-200 dark:hover:border-orange-800"
        >
          <div className="p-2 sm:p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg w-fit mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Pending</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">{stats.pendingUsers}</p>
        </Link>

        <Link 
          href="/estate-admin/users"
          className="card p-3 sm:p-5 hover:shadow-lg transition-shadow border border-transparent hover:border-blue-200 dark:hover:border-blue-800"
        >
          <div className="p-2 sm:p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg w-fit mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Total Users</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">{stats.totalUsers}</p>
        </Link>

        <div className="card p-3 sm:p-5 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
          <div className="p-2 sm:p-3 bg-green-100 dark:bg-green-900/30 rounded-lg w-fit mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Residents</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">{stats.residents}</p>
        </div>

        <div className="card p-3 sm:p-5 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
          <div className="p-2 sm:p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg w-fit mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Guards</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">{stats.guards}</p>
        </div>
      </div>

      {/* Quick Actions — side by side on mobile */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
        <Link
          href="/estate-admin/pending"
          className="card flex flex-col items-center gap-2 p-3 sm:p-4 text-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white">Review Pending</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">Approve or reject users</p>
        </Link>

        <Link
          href="/estate-admin/users"
          className="card flex flex-col items-center gap-2 p-3 sm:p-4 text-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white">Manage Users</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">View and manage estate users</p>
        </Link>
      </div>

      {/* Information Notice */}
      <div className="p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex items-start gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-200">
            You manage users in <span className="font-semibold">{estate?.name}</span> only. Contact the super admin for system-wide access.
          </p>
        </div>
      </div>
    </div>
  );
}
