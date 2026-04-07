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
      <div className="p-4 sm:p-6 space-y-5 animate-pulse">
        {/* Skeleton: Quick Actions row */}
        <div className="grid grid-cols-4 gap-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-2xl bg-gray-200 dark:bg-gray-800" />
              <div className="h-2.5 bg-gray-200 dark:bg-gray-800 rounded-full w-12" />
            </div>
          ))}
        </div>
        {/* Skeleton: Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full w-36" />
          <div className="space-y-2.5">
            <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full w-full" />
            <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full w-4/5" />
          </div>
          <div className="h-28 bg-gray-100 dark:bg-gray-800 rounded-xl" />
        </div>
        {/* Skeleton: Activity card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full w-28" />
          {[1,2,3].map(i => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gray-200 dark:bg-gray-700" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full w-3/5" />
                <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full w-2/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!currentUser || currentUser.status !== 'approved' || currentUser.role !== 'resident') {
    return null; // Will be handled by the useEffect redirect
  }

  return <ResidentDashboard user={currentUser} />;
}
