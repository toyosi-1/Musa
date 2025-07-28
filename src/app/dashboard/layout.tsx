"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog } from '@/components/ui/Dialog';
import Link from 'next/link';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { HomeIcon, ClockIcon, UserIcon } from '@heroicons/react/24/outline';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Mobile menu state
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // Profile modal state
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showUserDialog, setShowUserDialog] = useState(false);

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
  
  // Toggle profile dialog
  const toggleProfileDialog = () => {
    setIsProfileOpen(!isProfileOpen);
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
      <main className="flex-grow overflow-y-auto overflow-x-hidden pb-12 md:pb-0">
        <div className="w-full max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-6 md:py-8">
          {children}
        </div>
      </main>

      {/* Bottom Navigation - Mobile Only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 shadow-lg z-50 h-20 safe-area-inset-bottom">
        <div className="flex justify-around items-center h-full px-4">
          <Link
            href="/dashboard"
            className={`flex flex-col items-center justify-center flex-1 max-w-[100px] py-3 px-2 rounded-lg transition-all ${
              pathname === '/dashboard'
                ? 'text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-900/20'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
            }`}
            aria-label="Home"
          >
            <HomeIcon className="w-7 h-7 mb-1" />
            <span className="text-sm font-medium leading-tight">Home</span>
          </Link>
          
          <Link
            href="/dashboard/history"
            className={`flex flex-col items-center justify-center flex-1 max-w-[100px] py-3 px-2 rounded-lg transition-all ${
              pathname === '/dashboard/history'
                ? 'text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-900/20'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
            }`}
            aria-label="History"
          >
            <ClockIcon className="w-7 h-7 mb-1" />
            <span className="text-sm font-medium leading-tight">History</span>
          </Link>
          
          <button
            onClick={() => setShowUserDialog(true)}
            className="flex flex-col items-center justify-center flex-1 max-w-[100px] py-3 px-2 rounded-lg transition-all text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50"
            aria-label="Account"
          >
            <UserIcon className="w-7 h-7 mb-1" />
            <span className="text-sm font-medium leading-tight">Account</span>
          </button>
        </div>
      </nav>
      
      {/* User Profile Dialog */}
      {currentUser && (
        <Dialog 
          isOpen={isProfileOpen} 
          onClose={() => setIsProfileOpen(false)}
          title="User Profile"
        >
          <div className="space-y-4">
            {/* Profile Picture */}
            <div className="flex justify-center">
              <div className="bg-primary text-white w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold">
                {currentUser?.displayName ? currentUser.displayName.charAt(0).toUpperCase() : '?'}
              </div>
            </div>
            
            {/* User Details */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-300">Full Name</label>
                <p className="text-lg font-medium">{currentUser?.displayName || 'Not provided'}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-300">Email</label>
                <p className="text-lg">{currentUser?.email}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-300">Role</label>
                <p className="capitalize text-lg">
                  {currentUser?.role || 'Not assigned'}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-300">Status</label>
                <div className="flex items-center gap-2">
                  <span className={`inline-block w-3 h-3 rounded-full ${currentUser?.status === 'approved' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                  <span className="capitalize">{currentUser?.status || 'Pending'}</span>
                </div>
              </div>
              
              {/* Sign Out Button */}
              <div className="pt-4">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
