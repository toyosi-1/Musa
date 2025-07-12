"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import PendingUsersManager from '@/components/admin/PendingUsersManager';
import StatusGuard from '@/components/auth/StatusGuard';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const { currentUser, loading, signOut } = useAuth();
  const router = useRouter();
  // Add a local state for component mounting to avoid rendering issues
  const [mounted, setMounted] = useState(false);
  
  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/auth/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };
  
  // Handle mounting to ensure hooks are called consistently
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    // Only allow admins to access this page
    if (!loading && currentUser && currentUser.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [currentUser, loading, router]);

  // Don't render anything until component has mounted to avoid hook inconsistencies
  if (!mounted || loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-14 w-14 border-t-3 border-b-3 border-primary mb-4"></div>
        <p className="text-gray-600 dark:text-gray-300 font-medium">Loading admin dashboard...</p>
      </div>
    );
  }

  return (
    <StatusGuard requireStatus="approved" requireAdmin={true}>
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-10 flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Admin Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl">
              Welcome to the admin control panel. Manage estate access, user approvals, and system settings from this central hub.
            </p>
          </div>
          
          <button
            onClick={handleLogout}
            className="mt-4 md:mt-0 flex items-center justify-center px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>

        <div className="grid grid-cols-1 gap-10">
          <div className="space-y-2">
            <div className="flex items-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-primary mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">User Management</h2>
            </div>
            <PendingUsersManager />
          </div>
          
          {/* Additional admin sections can be added here */}
          <div className="card">
            <div className="flex items-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-primary mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">System Overview</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 bg-musa-bg dark:bg-gray-900/50 rounded-2xl shadow-card border border-blue-100 dark:border-blue-900/30">
                <div className="flex items-center mb-3">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Total Users</h3>
                </div>
                <div className="flex items-end">
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">--</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 ml-2 mb-1">accounts</p>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">All registered users on the platform</p>
              </div>
              
              <div className="p-6 bg-musa-bg dark:bg-gray-900/50 rounded-2xl shadow-card border border-green-100 dark:border-green-900/30">
                <div className="flex items-center mb-3">
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Active Households</h3>
                </div>
                <div className="flex items-end">
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">--</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 ml-2 mb-1">households</p>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Total active households in the estate</p>
              </div>
              
              <div className="p-6 bg-musa-bg dark:bg-gray-900/50 rounded-2xl shadow-card border border-purple-100 dark:border-purple-900/30">
                <div className="flex items-center mb-3">
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Recent Activities</h3>
                </div>
                <div className="flex items-end">
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">--</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 ml-2 mb-1">events</p>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Estate activities in the last 24 hours</p>
              </div>
            </div>
            
            <div className="mt-6 text-center">
              <button className="btn-outline inline-flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Statistics
              </button>
            </div>
          </div>
        </div>
      </div>
    </StatusGuard>
  );
}
