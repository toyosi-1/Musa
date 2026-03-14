"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ResidentDashboard from '@/components/resident/ResidentDashboard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function ResidentDashboardPage() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!currentUser) {
      router.push('/auth/login');
      return;
    }

    if (currentUser.status === 'pending') {
      router.push('/auth/pending');
      return;
    } else if (currentUser.status === 'rejected') {
      router.push('/auth/rejected');
      return;
    }

    if (currentUser.role !== 'resident') {
      if (currentUser.role === 'admin') {
        router.push('/admin/dashboard');
      } else if (currentUser.role === 'estate_admin') {
        router.push('/estate-admin/dashboard');
      } else {
        router.push('/dashboard/guard');
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

  if (!currentUser || currentUser.status !== 'approved' || currentUser.role !== 'resident') {
    return null; // Will be handled by the useEffect redirect
  }

  return <ResidentDashboard user={currentUser} />;
}
