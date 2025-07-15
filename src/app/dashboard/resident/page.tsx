"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ResidentDashboard from '@/components/resident/ResidentDashboard';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function ResidentDashboardPage() {
  const { currentUser, loading, getUserProfile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const verifyResidentRole = async () => {
      // Wait until authentication is not loading
      if (!loading) {
        if (!currentUser) {
          // Not logged in, redirect to login
          router.push('/auth/login');
          return;
        }

        // Handle different user statuses
        if (currentUser.status === 'pending') {
          router.push('/auth/pending');
          return;
        } else if (currentUser.status === 'rejected') {
          router.push('/auth/rejected');
          return;
        }

        // Double verify the user role from the database
        try {
          if (currentUser.role !== 'resident') {
            console.log('User is not a resident. Actual role:', currentUser.role);
            // If not a resident, redirect to the appropriate dashboard
            if (currentUser.role === 'admin') {
              router.push('/admin/dashboard');
            } else {
              router.push('/dashboard/guard');
            }
            return;
          }

          // Optional second verification directly from database
          const freshUserData = await getUserProfile(currentUser.uid);
          if (freshUserData && freshUserData.role !== 'resident') {
            console.log('Database role verification failed. Redirecting to correct dashboard.');
            if (freshUserData.role === 'admin') {
              router.push('/admin/dashboard');
            } else {
              router.push('/dashboard/guard');
            }
          }
        } catch (error) {
          console.error('Error verifying user role:', error);
        }
      }
    };

    verifyResidentRole();
  }, [currentUser, loading, router, getUserProfile]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-6">
        <LoadingSpinner size="lg" color="primary" />
        <p className="mt-4 text-gray-600 dark:text-gray-300 font-medium">Loading your dashboard...</p>
      </div>
    );
  }

  if (!currentUser || currentUser.status !== 'approved' || currentUser.role !== 'resident') {
    return null; // Will be handled by the useEffect redirect
  }

  return (
    <AppLayout requireStatus="approved" requireRole="resident">
      <ResidentDashboard user={currentUser} />
    </AppLayout>
  );
}
