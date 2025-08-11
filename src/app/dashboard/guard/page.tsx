"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import GuardDashboard from '@/components/guard/GuardDashboard';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function GuardDashboardPage() {
  const { currentUser, loading, getUserProfile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const verifyGuardRole = async () => {
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
          if (currentUser.role !== 'guard') {
            console.log('User is not a guard. Actual role:', currentUser.role);
            // If not a guard, redirect to the appropriate dashboard
            if (currentUser.role === 'admin') {
              router.push('/admin/dashboard');
            } else if (currentUser.role === 'resident') {
              router.push('/dashboard/resident');
            } else {
              console.error('SECURITY ERROR: Unknown user role in guard page:', currentUser.role);
              router.push('/auth/login');
            }
            return;
          }

          // Optional second verification directly from database
          const freshUserData = await getUserProfile(currentUser.uid);
          if (freshUserData && freshUserData.role !== 'guard') {
            console.log('Database role verification failed. Redirecting to correct dashboard.');
            if (freshUserData.role === 'admin') {
              router.push('/admin/dashboard');
            } else if (freshUserData.role === 'resident') {
              router.push('/dashboard/resident');
            } else {
              console.error('SECURITY ERROR: Unknown database role in guard page:', freshUserData.role);
              router.push('/auth/login');
            }
          }
        } catch (error) {
          console.error('Error verifying user role:', error);
        }
      }
    };

    verifyGuardRole();
  }, [currentUser, loading, router, getUserProfile]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-6">
        <LoadingSpinner size="lg" color="primary" />
        <p className="mt-4 text-gray-600 dark:text-gray-300 font-medium">Loading your dashboard...</p>
      </div>
    );
  }

  if (!currentUser || currentUser.status !== 'approved' || currentUser.role !== 'guard') {
    return null; // Will be handled by the useEffect redirect
  }

  return (
    <AppLayout requireStatus="approved" requireRole="guard">
      <GuardDashboard user={currentUser} />
    </AppLayout>
  );
}
