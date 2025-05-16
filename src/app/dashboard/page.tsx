"use client";

import { useAuth } from '@/contexts/AuthContext';
import GuardDashboard from '@/components/guard/GuardDashboard';
import ResidentDashboard from '@/components/resident/ResidentDashboard';

export default function Dashboard() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null; // Will be handled by the layout redirect
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {currentUser.role === 'guard' ? (
        <GuardDashboard user={currentUser} />
      ) : (
        <ResidentDashboard user={currentUser} />
      )}
    </div>
  );
}
