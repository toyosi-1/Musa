"use client";

import { ReactNode, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '../ui/LoadingSpinner';

// Dynamically import client-side only components
const StatusGuard = dynamic(
  () => import('../auth/StatusGuard'),
  { ssr: false }
);

const UnifiedNavbar = dynamic(
  () => import('./UnifiedNavbar'),
  { ssr: false }
);

interface AppLayoutProps {
  children: ReactNode;
  requireAuth?: boolean;
  requireStatus?: 'approved' | 'pending' | 'rejected' | 'any';
  requireAdmin?: boolean;
}

export default function AppLayout({
  children,
  requireAuth = true,
  requireStatus = 'approved',
  requireAdmin = false
}: AppLayoutProps) {
  const [isClient, setIsClient] = useState(false);
  const { currentUser, loading } = useAuth();
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Show loading spinner while auth state is being determined or during SSR
  if (loading || !isClient) {
    return <LoadingSpinner size="lg" fullScreen />;
  }

  // If not requiring auth, or user exists, render content
  if (!requireAuth || currentUser) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <UnifiedNavbar />
        
        <main className="flex-grow py-6 md:py-8 w-full">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {requireAuth ? (
              <StatusGuard 
                requireStatus={requireStatus} 
                requireAdmin={requireAdmin}
              >
                {children}
              </StatusGuard>
            ) : (
              children
            )}
          </div>
        </main>
        
        <footer className="bg-white dark:bg-gray-800 shadow-inner py-6">
          <div className="container mx-auto px-4 text-center text-sm text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} Musa Estate Management. All rights reserved.
          </div>
        </footer>
      </div>
    );
  }
  
  // If we require auth but no user is logged in, redirect to login
  // This will be handled by the StatusGuard component
  return <StatusGuard>{children}</StatusGuard>;
}
