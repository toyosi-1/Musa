"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import PendingUsersManager from '@/components/admin/PendingUsersManager';
import StatusGuard from '@/components/auth/StatusGuard';
import Link from 'next/link';
import { getAdminStats, AdminStats } from '@/services/adminStatsService';
import { getAllActivity, ActivityEntry } from '@/services/activityService';
import { subscribeToAlerts, acknowledgeAlert, resolveAlert, getEmergencyTypeInfo } from '@/services/emergencyService';
import { EmergencyAlert } from '@/types/user';
import { formatDistanceToNow } from 'date-fns';

export default function AdminDashboardPage() {
  const { currentUser, loading, signOut } = useAuth();
  const router = useRouter();
  // Add a local state for component mounting to avoid rendering issues
  const [mounted, setMounted] = useState(false);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [emergencyAlerts, setEmergencyAlerts] = useState<EmergencyAlert[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityEntry[]>([]);
  
  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/auth/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };
  
  // Load admin statistics
  const loadAdminStats = async () => {
    try {
      setIsLoadingStats(true);
      setStatsError(null);
      const [stats, activity] = await Promise.all([
        getAdminStats(),
        getAllActivity(15),
      ]);
      setAdminStats(stats);
      setRecentActivity(activity);
    } catch (error) {
      console.error('Error loading admin stats:', error);
      setStatsError('Failed to load statistics');
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Handle mounting to ensure hooks are called consistently
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Load stats when component mounts and user is authenticated
  useEffect(() => {
    if (mounted && currentUser && currentUser.role === 'admin' && !loading) {
      loadAdminStats();
    }
  }, [mounted, currentUser, loading]);

  // Subscribe to emergency alerts across all estates (admin sees all)
  useEffect(() => {
    if (!mounted || !currentUser || currentUser.role !== 'admin') return;

    // Admin subscribes to alerts - for now using a known estateId from stats
    // We'll subscribe once we have estate data
    const setupSubscription = async () => {
      try {
        const { getFirebaseDatabase } = await import('@/lib/firebase');
        const { ref, get } = await import('firebase/database');
        const db = await getFirebaseDatabase();
        const estatesSnap = await get(ref(db, 'estates'));
        if (!estatesSnap.exists()) return;

        const unsubscribers: (() => void)[] = [];
        const allAlerts = new Map<string, EmergencyAlert>();

        estatesSnap.forEach((child: any) => {
          const estateId = child.key;
          if (estateId) {
            const unsub = subscribeToAlerts(estateId, (alerts) => {
              alerts.forEach(a => {
                if (a.status === 'active') allAlerts.set(a.id, a);
                else allAlerts.delete(a.id);
              });
              setEmergencyAlerts(Array.from(allAlerts.values()).sort((a, b) => b.createdAt - a.createdAt));
            });
            unsubscribers.push(unsub);
          }
        });

        return () => unsubscribers.forEach(fn => fn());
      } catch (e) {
        console.error('Error subscribing to emergency alerts:', e);
      }
    };

    let cleanup: (() => void) | undefined;
    setupSubscription().then(fn => { cleanup = fn; });
    return () => { if (cleanup) cleanup(); };
  }, [mounted, currentUser]);

  useEffect(() => {
    // Only allow admins to access this page
    if (!loading && currentUser && currentUser.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [currentUser, loading, router]);

  // Don't render anything until component has mounted to avoid hook inconsistencies
  if (!mounted || loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-950 gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/25 animate-pulse">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
        </div>
        <div className="w-6 h-6 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <StatusGuard requireStatus="approved" requireAdmin={true}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        {/* Top gradient accent */}
        <div className="h-0.5 bg-gradient-to-r from-violet-600 via-purple-500 to-fuchsia-500" />
        
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* ─── Admin Banner ─── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-6 shadow-lg">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-sm" />
          <div className="absolute left-1/2 -bottom-8 w-40 h-40 bg-white/5 rounded-full blur-md" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.12),transparent_60%)]" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-white/70 mb-0.5">Super Admin</p>
              <h1 className="text-2xl font-bold text-white">Control Panel</h1>
              <p className="text-sm text-white/60 mt-1 max-w-lg">Manage estates, approve users, and monitor system activity.</p>
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
                <div
                  key={alert.id}
                  className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-2xl p-4 shadow-sm"
                >
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

        {/* ─── System Overview Stats ─── */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{isLoadingStats ? '-' : (adminStats?.totalUsers || '0')}</p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">Users</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-md shadow-emerald-500/20">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{isLoadingStats ? '-' : (adminStats?.activeHouseholds || '0')}</p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">Households</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-md shadow-purple-500/20">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{isLoadingStats ? '-' : (adminStats?.recentActivities || '0')}</p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">24h Events</p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Quick Actions ─── */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-1">Quick Actions</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Link href="/admin/pending" className="group relative overflow-hidden flex flex-col items-start gap-3 p-4 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-lg hover:border-orange-200 dark:hover:border-orange-700/50 transition-all duration-200 active:scale-[0.97]">
              <div className="absolute top-0 right-0 w-20 h-20 bg-orange-50 dark:bg-orange-900/20 rounded-full -mr-6 -mt-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div className="relative">
                <span className="block text-sm font-bold text-gray-900 dark:text-white">Approvals</span>
                <span className="block text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Pending users</span>
              </div>
              {adminStats && adminStats.pendingUsers > 0 && (
                <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-[10px] font-bold">
                  {adminStats.pendingUsers}
                </span>
              )}
            </Link>
            <Link href="/admin/estates" className="group relative overflow-hidden flex flex-col items-start gap-3 p-4 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-700/50 transition-all duration-200 active:scale-[0.97]">
              <div className="absolute top-0 right-0 w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full -mr-6 -mt-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="relative">
                <span className="block text-sm font-bold text-gray-900 dark:text-white">Estates</span>
                <span className="block text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Manage estates</span>
              </div>
            </Link>
            <Link href="/admin/users" className="group relative overflow-hidden flex flex-col items-start gap-3 p-4 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-lg hover:border-purple-200 dark:hover:border-purple-700/50 transition-all duration-200 active:scale-[0.97]">
              <div className="absolute top-0 right-0 w-20 h-20 bg-purple-50 dark:bg-purple-900/20 rounded-full -mr-6 -mt-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-md shadow-purple-500/20 group-hover:scale-105 transition-transform">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="relative">
                <span className="block text-sm font-bold text-gray-900 dark:text-white">Users</span>
                <span className="block text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">All accounts</span>
              </div>
            </Link>
            <Link href="/admin/vendors" className="group relative overflow-hidden flex flex-col items-start gap-3 p-4 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-lg hover:border-emerald-200 dark:hover:border-emerald-700/50 transition-all duration-200 active:scale-[0.97]">
              <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-50 dark:bg-emerald-900/20 rounded-full -mr-6 -mt-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.1-3.26m0 0l-.18-.12a3 3 0 01-.96-3.74l.18-.3a3 3 0 013.74-.96l.18.12m2.14 8.26l5.1-3.26m0 0l.18-.12a3 3 0 00.96-3.74l-.18-.3a3 3 0 00-3.74-.96l-.18.12" />
                </svg>
              </div>
              <div className="relative">
                <span className="block text-sm font-bold text-gray-900 dark:text-white">Vendors</span>
                <span className="block text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Manage vendors</span>
              </div>
            </Link>
            <Link href="/admin/settings" className="group relative overflow-hidden flex flex-col items-start gap-3 p-4 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-lg hover:border-gray-200 dark:hover:border-gray-600/50 transition-all duration-200 active:scale-[0.97]">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gray-50 dark:bg-gray-700/20 rounded-full -mr-6 -mt-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center shadow-md shadow-gray-500/20 group-hover:scale-105 transition-transform">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="relative">
                <span className="block text-sm font-bold text-gray-900 dark:text-white">Settings</span>
                <span className="block text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Preferences</span>
              </div>
            </Link>
          </div>
        </div>
          
        {statsError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
              <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-red-600 dark:text-red-400 text-sm font-medium">{statsError}</p>
          </div>
        )}

        {/* ─── Secondary Stats ─── */}
        {adminStats && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-100 dark:border-gray-800 p-3 text-center">
              <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{adminStats.pendingUsers}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">Pending</p>
            </div>
            <div className="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-100 dark:border-gray-800 p-3 text-center">
              <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{adminStats.totalAccessCodes}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">Access Codes</p>
            </div>
            <div className="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-100 dark:border-gray-800 p-3 text-center">
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{adminStats.todayAccessCodes}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">Today’s Codes</p>
            </div>
          </div>
        )}

        {/* ─── Activity Feed ─── */}
        {recentActivity.length > 0 && (
          <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <svg className="h-4 w-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Recent Activity</h3>
              </div>
              <button 
                onClick={loadAdminStats}
                disabled={isLoadingStats}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-50"
              >
                <svg className={`h-4 w-4 ${isLoadingStats ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
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
        </div>
      </div>
    </StatusGuard>
  );
}
