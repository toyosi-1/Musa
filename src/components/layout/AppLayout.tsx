"use client";

import { ReactNode } from 'react';
import StatusGuard from '../auth/StatusGuard';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '../ui/LoadingSpinner';
import UnifiedNavbar from './UnifiedNavbar';

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
  const { currentUser, loading } = useAuth();
  
  // Show loading spinner while auth state is being determined
  if (loading) {
    return <LoadingSpinner size="lg" fullScreen />;
  }

  // If not requiring auth, or user exists, render content
  if (!requireAuth || currentUser) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <UnifiedNavbar />
        
        <main className="flex-grow py-8 md:py-10">
          <div className="container mx-auto px-4 md:px-6 lg:px-8">
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
