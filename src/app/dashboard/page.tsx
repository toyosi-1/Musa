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
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {currentUser.role === 'admin' ? (
          // Admin sees a simplified dashboard with quick links
          <div className="space-y-8 sm:space-y-10">
            <div className="px-2 sm:px-0">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Admin Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-300 max-w-2xl">
                Welcome to Musa. Access all your administrative tools and settings from this central hub.
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
              <div className="relative group bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-white dark:from-gray-900/50 dark:to-gray-800/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative p-5 sm:p-6 md:p-7 h-full flex flex-col">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mr-4 transition-colors duration-200 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">User Management</h2>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 mb-6 flex-grow">Review and approve new user registrations. Manage access permissions for residents and guards.</p>
                  <button
                    onClick={() => router.push('/admin/dashboard')}
                    className="btn-primary flex items-center justify-center py-3 px-4 w-full transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    Manage Users
                  </button>
                </div>
              </div>
              
              <div className="relative group bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-white dark:from-gray-900/50 dark:to-gray-800/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative p-5 sm:p-6 md:p-7 h-full flex flex-col">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center mr-4 transition-colors duration-200 group-hover:bg-green-100 dark:group-hover:bg-green-900/50">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Estate Management</h2>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 mb-6 flex-grow">Configure estate settings, manage properties, and view household information.</p>
                  <button
                    onClick={() => router.push('/admin/dashboard')}
                    className="btn-secondary flex items-center justify-center py-3 px-4 w-full transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    Manage Estate
                  </button>
                </div>
              </div>
              
              <div className="relative group bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-white dark:from-gray-900/50 dark:to-gray-800/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative p-5 sm:p-6 md:p-7 h-full flex flex-col">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center mr-4 transition-colors duration-200 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/50">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">System Settings</h2>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 mb-6 flex-grow">Configure system preferences, security settings, and application behavior.</p>
                  <button
                    onClick={() => router.push('/admin/dashboard')}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg px-4 py-3 flex items-center justify-center w-full transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    Configure Settings
                  </button>
                </div>
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
