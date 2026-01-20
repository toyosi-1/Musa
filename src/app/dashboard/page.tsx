"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

/**
 * Main dashboard router that redirects users to their appropriate role-specific dashboard
 */
export default function Dashboard() {
  const { currentUser, loading, getUserProfile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Function to verify user role and redirect to appropriate dashboard
    const verifyRoleAndRedirect = async () => {
      // Wait until authentication is not loading
      if (!loading) {
        // Not logged in, redirect to login
        if (!currentUser) {
          console.log('No user authenticated, redirecting to login');
          router.push('/auth/login');
          return;
        }

        console.log('Current user found:', currentUser.uid, 'Role:', currentUser.role);

        // Handle different user statuses
        if (currentUser.status === 'pending') {
          console.log('User is pending approval');
          router.push('/auth/pending');
          return;
        } else if (currentUser.status === 'rejected') {
          console.log('User was rejected');
          router.push('/auth/rejected');
          return;
        }

        try {
          // Double-check user role from the database to ensure accuracy
          const freshUserData = await getUserProfile(currentUser.uid);
          
          // Use the most recent role data from database or fallback to context
          const confirmedRole = freshUserData?.role || currentUser.role;
          console.log('Confirmed user role:', confirmedRole);

          // Redirect based on confirmed role - STRICT role checking with NO dangerous fallbacks
          if (confirmedRole === 'admin') {
            console.log('Redirecting to admin dashboard');
            router.push('/admin/dashboard');
          } else if (confirmedRole === 'estate_admin') {
            console.log('Redirecting to estate admin dashboard');
            router.push('/estate-admin/dashboard');
          } else if (confirmedRole === 'guard') {
            console.log('Redirecting to guard dashboard');
            router.push('/dashboard/guard');
          } else if (confirmedRole === 'resident') {
            console.log('Redirecting to resident dashboard');
            router.push('/dashboard/resident');
          } else {
            // SECURITY: Never redirect unknown roles to any dashboard
            console.error('SECURITY ERROR: Unknown user role detected:', confirmedRole);
            console.log('Redirecting to login for security');
            router.push('/auth/login');
          }
        } catch (error) {
          console.error('Error verifying user role from database:', error);
          // SECURITY: In case of error, use strict role checking with NO dangerous fallbacks
          if (currentUser.role === 'admin') {
            console.log('Error fallback: Redirecting to admin dashboard');
            router.push('/admin/dashboard');
          } else if (currentUser.role === 'estate_admin') {
            console.log('Error fallback: Redirecting to estate admin dashboard');
            router.push('/estate-admin/dashboard');
          } else if (currentUser.role === 'guard') {
            console.log('Error fallback: Redirecting to guard dashboard');
            router.push('/dashboard/guard');
          } else if (currentUser.role === 'resident') {
            console.log('Error fallback: Redirecting to resident dashboard');
            router.push('/dashboard/resident');
          } else {
            // SECURITY: Never redirect unknown roles to any dashboard - force re-authentication
            console.error('SECURITY ERROR: Unknown user role in error fallback:', currentUser.role);
            console.log('Forcing re-authentication for security');
            router.push('/auth/login');
          }
        }
      }
    };

    verifyRoleAndRedirect();
  }, [currentUser, loading, router, getUserProfile]);

  // Show loading spinner while authentication is in progress
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-6">
      <LoadingSpinner size="lg" color="primary" />
      <p className="mt-4 text-gray-600 dark:text-gray-300 font-medium">
        {loading ? "Loading your dashboard..." : "Redirecting to your dashboard..."}
      </p>
    </div>
  );
}
