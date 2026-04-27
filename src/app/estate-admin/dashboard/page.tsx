"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getFirebaseDatabase } from '@/lib/firebase';
import { ref, get, query, orderByChild, equalTo } from 'firebase/database';
import type { User, Estate, EmergencyAlert } from '@/types/user';
import { getEstateActivity, ActivityEntry } from '@/services/activityService';
import { subscribeToAlerts, acknowledgeAlert, resolveAlert, getEmergencyTypeInfo } from '@/services/emergencyService';
import { formatDistanceToNow } from 'date-fns';
import PageLoading from '@/components/ui/PageLoading';

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
  const [recentActivity, setRecentActivity] = useState<ActivityEntry[]>([]);

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
      // Load estate activity feed
      if (currentUser?.estateId) {
        const activity = await getEstateActivity(currentUser.estateId, 15);
        setRecentActivity(activity);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <PageLoading
        accent="blue"
        icon={
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 7.5h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
          </svg>
        }
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 safe-area-inset-top">
      <div className="h-0.5 bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500" />
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">

      {/* ─── Estate Admin Banner ─── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-600 via-blue-600 to-indigo-700 p-6 shadow-lg">
        <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-sm" />
        <div className="absolute left-1/3 -bottom-8 w-40 h-40 bg-white/5 rounded-full blur-md" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.1),transparent_60%)]" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-white/70 mb-0.5">Estate Administrator</p>
            <h1 className="text-2xl font-bold text-white">{estate?.name || 'Estate Management'}</h1>
            <p className="text-xs text-white/50 mt-1 truncate">{currentUser?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white text-sm font-medium rounded-xl transition-all"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </div>

      {/* ─── Emergency Alerts ─── */}
      {emergencyAlerts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-red-500 dark:text-red-400 uppercase tracking-wider px-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            {emergencyAlerts.length} Active Alert{emergencyAlerts.length > 1 ? 's' : ''}
          </h2>
          {emergencyAlerts.map((alert) => {
            const typeInfo = getEmergencyTypeInfo(alert.type);
            const timeAgo = formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true });
            return (
              <div key={alert.id} className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-2xl p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">{typeInfo.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold text-red-700 dark:text-red-300 text-sm">{typeInfo.label}</span>
                      <span className="text-[11px] text-red-400">{timeAgo}</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      From: <strong>{alert.triggeredByName}</strong>
                      {alert.householdName ? ` • ${alert.householdName}` : ''}
                    </p>
                    {alert.description && (
                      <p className="text-xs text-gray-400 mt-1 italic">&ldquo;{alert.description}&rdquo;</p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => acknowledgeAlert(alert.estateId, alert.id, currentUser!.uid)}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors"
                    >
                      Ack
                    </button>
                    <button
                      onClick={() => resolveAlert(alert.estateId, alert.id, currentUser!.uid)}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
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

      {/* ─── Stats Grid ─── */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        <div className="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-100 dark:border-gray-800 p-3 text-center">
          <p className="text-lg sm:text-xl font-bold text-orange-600 dark:text-orange-400">{stats.pendingUsers}</p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">Pending</p>
        </div>
        <div className="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-100 dark:border-gray-800 p-3 text-center">
          <p className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400">{stats.totalUsers}</p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">Users</p>
        </div>
        <div className="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-100 dark:border-gray-800 p-3 text-center">
          <p className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400">{stats.residents}</p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">Residents</p>
        </div>
        <div className="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-100 dark:border-gray-800 p-3 text-center">
          <p className="text-lg sm:text-xl font-bold text-purple-600 dark:text-purple-400">{stats.guards}</p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">Guards</p>
        </div>
      </div>

      {/* ─── Quick Actions ─── */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-1">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/estate-admin/pending"
            className="group relative overflow-hidden flex flex-col items-start gap-3 p-4 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-lg hover:border-orange-200 dark:hover:border-orange-700/50 transition-all duration-200 active:scale-[0.97]"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-orange-50 dark:bg-orange-900/20 rounded-full -mr-6 -mt-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="relative">
              <span className="block text-sm font-bold text-gray-900 dark:text-white">Review Pending</span>
              <span className="block text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Approve or reject users</span>
            </div>
            {stats.pendingUsers > 0 && (
              <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-[10px] font-bold">
                {stats.pendingUsers}
              </span>
            )}
          </Link>
          <Link
            href="/estate-admin/users"
            className="group relative overflow-hidden flex flex-col items-start gap-3 p-4 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-700/50 transition-all duration-200 active:scale-[0.97]"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full -mr-6 -mt-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div className="relative">
              <span className="block text-sm font-bold text-gray-900 dark:text-white">Manage Users</span>
              <span className="block text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">View and manage estate users</span>
            </div>
          </Link>
        </div>
      </div>

      {/* ─── Activity Feed ─── */}
      {recentActivity.length > 0 && (
        <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <svg className="h-4 w-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Recent Activity</h3>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {recentActivity.map(a => (
              <div key={a.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
                  a.type === 'guest_checkin' ? 'bg-emerald-500' :
                  a.type === 'guest_denied' ? 'bg-red-500' :
                  a.type === 'access_code_created' ? 'bg-blue-500' :
                  'bg-purple-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 dark:text-gray-200 truncate">{a.description}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{new Date(a.timestamp).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Notice */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/15 border border-blue-100 dark:border-blue-800/40 rounded-xl">
        <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
          <svg className="h-3.5 w-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-xs text-blue-700 dark:text-blue-300">
          You manage users in <span className="font-bold">{estate?.name}</span> only. Contact the super admin for system-wide access.
        </p>
      </div>

      </div>
    </div>
  );
}
