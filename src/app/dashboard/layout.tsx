"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();


  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !currentUser) {
      router.push('/auth/login');
    }
  }, [loading, currentUser, router]);

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-musa-bg dark:bg-gray-900">
        <LoadingSpinner />
      </div>
    );
  }

  if (!currentUser) {
    return null; // Will redirect to login via useEffect
  }

  // Determine which nav item is active
  const isActive = (path: string) => {
    return pathname?.includes(path);
  };

  return (
    <div className="min-h-screen flex flex-col bg-musa-bg dark:bg-gray-900 safe-area-inset-bottom">
      {/* Header with location */}
      <header className="bg-musa-lightmint dark:bg-gray-800 p-4 shadow-sm">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between">
            <div className="text-xl font-semibold text-gray-700 dark:text-white">
              {currentUser.displayName}
            </div>
            <button 
              onClick={handleSignOut}
              className="text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
          

        </div>
      </header>

      <main className="flex-grow overflow-y-auto overflow-x-hidden pb-24 px-4 max-w-md mx-auto w-full">
        <div className="min-h-[calc(100vh-12rem)]">
          {children}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm shadow-lg border-t border-gray-100 dark:border-gray-700 pb-[max(env(safe-area-inset-bottom),0.5rem)] z-50">
        <div className="flex justify-around items-center max-w-md mx-auto px-2 py-2">
          <Link 
            href="/dashboard" 
            className={`flex flex-col items-center justify-center p-2 rounded-lg min-w-[60px] ${
              isActive('/dashboard') && !isActive('/dashboard/profile') 
                ? 'text-musa-blue dark:text-blue-400' 
                : 'text-gray-500 dark:text-gray-400 hover:text-musa-blue dark:hover:text-blue-400'
            } transition-colors`}
          >
            <div className="p-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <span className="text-xs font-medium">Home</span>
          </Link>



          {currentUser.role === 'guard' && (
            <Link 
              href="/dashboard/scan" 
              className={`relative flex flex-col items-center justify-center min-w-[60px] ${
                isActive('/dashboard/scan') ? 'text-musa-red dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <div className="relative -mt-5">
                <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 w-14 h-14 bg-musa-red hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <span className="text-xs font-medium mt-9 block">Scan</span>
              </div>
            </Link>
          )}

          <Link 
            href="/dashboard/history" 
            className={`flex flex-col items-center justify-center p-2 rounded-lg min-w-[60px] ${
              isActive('/dashboard/history') 
                ? 'text-musa-blue dark:text-blue-400' 
                : 'text-gray-500 dark:text-gray-400 hover:text-musa-blue dark:hover:text-blue-400'
            } transition-colors`}
          >
            <div className="p-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-xs font-medium">History</span>
          </Link>

          <Link 
            href="/dashboard/profile" 
            className={`flex flex-col items-center justify-center p-2 rounded-lg min-w-[60px] ${
              isActive('/dashboard/profile') 
                ? 'text-musa-blue dark:text-blue-400' 
                : 'text-gray-500 dark:text-gray-400 hover:text-musa-blue dark:hover:text-blue-400'
            } transition-colors`}
          >
            <div className="p-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <span className="text-xs font-medium">Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
