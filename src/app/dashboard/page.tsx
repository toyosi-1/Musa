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
        router.push('/admin/dashboard');
      }
    }
  }, [currentUser, loading, router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-6">
        <LoadingSpinner size="lg" color="primary" />
        <p className="mt-4 text-gray-600 dark:text-gray-300 font-medium">Loading your dashboard...</p>
      </div>
    );
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
      <div>
        {currentUser.role === 'admin' ? (
          // Admin sees a simplified dashboard with quick links
          <div className="space-y-12">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Admin Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-300 max-w-2xl">
                Welcome to Musa. Access all your administrative tools and settings from this central hub.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
              <div className="card hover:shadow-lg transition-shadow border-l-4 border-primary p-5 sm:p-6 md:p-8">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-light/20 flex items-center justify-center mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white">User Management</h2>
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-6">Review and approve new user registrations. Manage access permissions for residents and guards.</p>
                <button
                  onClick={() => router.push('/admin/dashboard')}
                  className="btn-primary flex items-center w-full justify-center py-3 touch-manipulation"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  Manage Users
                </button>
              </div>
              
              <div className="card hover:shadow-lg transition-shadow border-l-4 border-secondary p-5 sm:p-6 md:p-8">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary-light/20 flex items-center justify-center mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white">Estate Management</h2>
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-6">Configure estate settings, manage properties, and view household information.</p>
                <button
                  onClick={() => router.push('/admin/dashboard')}
                  className="btn-secondary flex items-center w-full justify-center py-3 touch-manipulation"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  Manage Estate
                </button>
              </div>
              
              <div className="card hover:shadow-lg transition-shadow border-l-4 border-accent">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 rounded-xl bg-accent-light/20 flex items-center justify-center mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white">Activity Reports</h2>
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-6">View detailed reports and analytics about estate access and resident activity.</p>
                <button
                  onClick={() => router.push('/admin/dashboard')}
                  className="btn-accent flex items-center w-full justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  View Reports
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
