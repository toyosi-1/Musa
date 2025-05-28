"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import PendingUsersManager from '@/components/admin/PendingUsersManager';
import StatusGuard from '@/components/auth/StatusGuard';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  // Add a local state for component mounting to avoid rendering issues
  const [mounted, setMounted] = useState(false);
  
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
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <StatusGuard requireStatus="approved" requireAdmin={true}>
      <div className="container mx-auto px-4 py-8">
        <Link href="/dashboard" className="inline-flex items-center mb-6 text-primary hover:text-primary-dark transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Dashboard
        </Link>
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Manage estate access, users, and system settings.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8">
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">User Management</h2>
            <PendingUsersManager />
          </div>
          
          {/* Additional admin sections can be added here */}
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">System Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <h3 className="text-lg font-medium text-blue-700 dark:text-blue-300">Total Users</h3>
                <p className="text-3xl font-bold mt-2">--</p>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
                <h3 className="text-lg font-medium text-green-700 dark:text-green-300">Active Households</h3>
                <p className="text-3xl font-bold mt-2">--</p>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                <h3 className="text-lg font-medium text-purple-700 dark:text-purple-300">Recent Activities</h3>
                <p className="text-3xl font-bold mt-2">--</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StatusGuard>
  );
}
