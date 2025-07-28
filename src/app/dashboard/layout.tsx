"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog } from '@/components/ui/Dialog';
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

  // Mobile menu state
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // Profile modal state
  const [isProfileOpen, setIsProfileOpen] = useState(false);

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
      <main className="flex-grow overflow-y-auto overflow-x-hidden pb-16 md:pb-0">
        <div className="w-full max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-6 md:py-8">
          {children}
        </div>
      </main>

      {/* Professional iOS-Style Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/98 dark:bg-gray-900/98 backdrop-blur-xl border-t border-gray-200/80 dark:border-gray-700/80 z-50 md:hidden" style={{
        paddingBottom: 'max(env(safe-area-inset-bottom), 12px)',
        boxShadow: '0 -1px 3px 0 rgba(0, 0, 0, 0.1), 0 -1px 2px 0 rgba(0, 0, 0, 0.06)'
      }}>
        <div className="flex justify-around items-stretch h-16 px-4">
          <Link 
            href="/dashboard" 
            className={`flex flex-col items-center justify-center flex-1 py-2 px-1 transition-all duration-200 ${
              isActive('/dashboard') && !isActive('/dashboard/profile') 
                ? 'text-blue-600 dark:text-blue-400' 
                : 'text-gray-600 dark:text-gray-200 active:text-blue-600 dark:active:text-blue-400'
            }`}
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <div className={`flex items-center justify-center w-7 h-7 mb-1 transition-all duration-200 ${
              isActive('/dashboard') && !isActive('/dashboard/profile')
                ? 'transform scale-110'
                : 'transform scale-100'
            }`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill={isActive('/dashboard') && !isActive('/dashboard/profile') ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive('/dashboard') && !isActive('/dashboard/profile') ? 0 : 2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <span className={`text-xs font-medium leading-none transition-all duration-200 ${
              isActive('/dashboard') && !isActive('/dashboard/profile')
                ? 'opacity-100 transform translate-y-0'
                : 'opacity-80 transform translate-y-0'
            }`}>Home</span>
          </Link>

          {currentUser.role === 'guard' && (
            <Link 
              href="/dashboard/scan" 
              className={`flex flex-col items-center justify-center flex-1 py-2 px-1 transition-all duration-200 ${
                isActive('/dashboard/scan') ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-200 active:text-red-600 dark:active:text-red-400'
              }`}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <div className={`flex items-center justify-center w-7 h-7 mb-1 transition-all duration-200 ${
                isActive('/dashboard/scan')
                  ? 'transform scale-110'
                  : 'transform scale-100'
              }`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill={isActive('/dashboard/scan') ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive('/dashboard/scan') ? 0 : 2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h4" />
                </svg>
              </div>
              <span className={`text-xs font-medium leading-none transition-all duration-200 ${
                isActive('/dashboard/scan')
                  ? 'opacity-100 transform translate-y-0'
                  : 'opacity-80 transform translate-y-0'
              }`}>Scan</span>
            </Link>
          )}

          <Link 
            href="/dashboard/history" 
            className={`flex flex-col items-center justify-center flex-1 py-2 px-1 transition-all duration-200 ${
              isActive('/dashboard/history') 
                ? 'text-blue-600 dark:text-blue-400' 
                : 'text-gray-600 dark:text-gray-200 active:text-blue-600 dark:active:text-blue-400'
            }`}
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <div className={`flex items-center justify-center w-7 h-7 mb-1 transition-all duration-200 ${
              isActive('/dashboard/history')
                ? 'transform scale-110'
                : 'transform scale-100'
            }`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill={isActive('/dashboard/history') ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive('/dashboard/history') ? 0 : 2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className={`text-xs font-medium leading-none transition-all duration-200 ${
              isActive('/dashboard/history')
                ? 'opacity-100 transform translate-y-0'
                : 'opacity-80 transform translate-y-0'
            }`}>History</span>
          </Link>

          <div className="flex flex-col items-center justify-center flex-1 py-2 px-1">
            <button 
              onClick={toggleProfileDialog} 
              className="flex flex-col items-center justify-center w-full transition-all duration-200 text-gray-600 dark:text-gray-200 active:text-blue-600 dark:active:text-blue-400 focus:outline-none"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <div className="flex items-center justify-center w-7 h-7 mb-1 transition-all duration-200 transform scale-100 hover:scale-105">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 flex items-center justify-center text-white text-sm font-semibold shadow-sm">
                  {currentUser.displayName?.charAt(0).toUpperCase() || 'U'}
                </div>
              </div>
              <span className="text-xs font-medium leading-none opacity-80 truncate max-w-[60px]">
                {currentUser.displayName?.split(' ')[0] || 'User'}
              </span>
            </button>
          </div>
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
