"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import GuardDashboard from '@/components/guard/GuardDashboard';
import ResidentDashboard from '@/components/resident/ResidentDashboard';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function Dashboard() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Handle different user statuses
    if (!loading && currentUser) {
      // If user is not approved, redirect to appropriate status page
      if (currentUser.status === 'pending') {
        router.push('/auth/pending');
      } else if (currentUser.status === 'rejected') {
        router.push('/auth/rejected');
      } else if (currentUser.role === 'admin') {
        // Optionally, redirect admins to admin dashboard
        // router.push('/admin/dashboard');
      }
    }
  }, [currentUser, loading, router]);

  if (loading) {
    return <LoadingSpinner size="lg" />;
  }

  if (!currentUser) {
    return null; // Will be handled by the layout redirect
  }

  // Only render dashboard if user is approved
  if (currentUser.status !== 'approved') {
    return null; // Redirection will happen in useEffect
  }

  return (
    <AppLayout requireStatus="approved">
      <div className="container mx-auto px-4 py-8">
        {currentUser.role === 'admin' ? (
          // Admin sees a simplified dashboard with quick links
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                Manage your estate access and security settings.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 hover:shadow-md transition-shadow">
                <h2 className="text-xl font-semibold mb-4">User Management</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-4">Review and approve new user registrations.</p>
                <button
                  onClick={() => router.push('/admin/dashboard')}
                  className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark transition-colors"
                >
                  Manage Users
                </button>
              </div>
            </div>
          </div>
        ) : currentUser.role === 'guard' ? (
          <GuardDashboard user={currentUser} />
        ) : (
          <ResidentDashboard user={currentUser} />
        )}
      </div>
    </AppLayout>
  );
}
