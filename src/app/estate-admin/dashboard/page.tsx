"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getFirebaseDatabase } from '@/lib/firebase';
import { ref, get, query, orderByChild, equalTo } from 'firebase/database';
import type { User, Estate } from '@/types/user';

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
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
              Estate Admin Dashboard
            </h1>
            {estate && (
              <p className="text-gray-600 dark:text-gray-400">
                Managing: <span className="font-semibold text-primary">{estate.name}</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {currentUser?.email}
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Link 
          href="/estate-admin/pending"
          className="card p-6 hover:shadow-lg transition-shadow border-2 border-transparent hover:border-orange-200 dark:hover:border-orange-800"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending Approvals</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.pendingUsers}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Click to review</p>
        </Link>

        <Link 
          href="/estate-admin/users"
          className="card p-6 hover:shadow-lg transition-shadow border-2 border-transparent hover:border-blue-200 dark:hover:border-blue-800"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Users</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.totalUsers}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Manage users</p>
        </Link>

        <div className="card p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Residents</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.residents}</p>
            </div>
          </div>
        </div>

        <div className="card p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Guards</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.guards}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/estate-admin/pending"
            className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-white">Review Pending Users</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Approve or reject user applications</p>
            </div>
          </Link>

          <Link
            href="/estate-admin/users"
            className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-white">Manage Users</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">View and manage estate users</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Information Notice */}
      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex items-start gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Estate Admin Scope</h4>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              You can only view and manage users within <span className="font-semibold">{estate?.name}</span>. 
              For system-wide access or to manage other estates, contact the super administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
