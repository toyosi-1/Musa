"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function UnifiedNavbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { currentUser, signOut } = useAuth();
  const pathname = usePathname();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Only show navigation links if user is approved
  const isApproved = currentUser && currentUser.status === 'approved';
  const isAdmin = currentUser && currentUser.role === 'admin';
  const isResident = currentUser && currentUser.role === 'resident';
  const isGuard = currentUser && currentUser.role === 'guard';

  // Check if we need to display a back button based on current path
  const showBackButton = () => {
    // Paths that need back buttons
    const pathsWithBack = [
      '/admin/dashboard',
      '/access-codes',
      '/verify',
      '/auth/pending',
      '/auth/rejected'
    ];
    
    return pathsWithBack.includes(pathname);
  };

  // Determine where the back button should lead
  const getBackPath = () => {
    if (pathname === '/admin/dashboard') return '/dashboard';
    if (pathname === '/access-codes') return '/dashboard';
    if (pathname === '/verify') return '/dashboard';
    if (pathname === '/auth/pending' || pathname === '/auth/rejected') return '/';
    return '/dashboard'; // Default fallback
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <div>
      {/* Primary navigation - blue header */}
      <nav className="bg-primary text-white shadow-md">
        <div className="container mx-auto px-6 py-5">
          {/* Top row: Logo, mode indicator, and user info */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <Link href="/dashboard" className="text-2xl font-bold">
                  Musa
                </Link>
                {currentUser && (
                  <span className="bg-white text-primary px-3 py-1.5 rounded-md text-sm font-medium">
                    {currentUser.role === 'guard' ? 'Guard Mode' : 'Resident Mode'}
                  </span>
                )}
              </div>
              
              {/* Mobile menu toggle - could be implemented if needed */}
              <div className="md:hidden">
                <button
                  onClick={toggleMenu}
                  className="text-white hover:text-gray-200 focus:outline-none"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {isMenuOpen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    )}
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end">
              {currentUser && (
                <div className="flex items-center">
                  <div className="mr-6 text-sm">
                    <span className="block font-medium">{currentUser.displayName}</span>
                    <span className="block text-xs opacity-80">{currentUser.email}</span>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="text-sm px-4 py-2 bg-white/10 hover:bg-white/20 rounded-md transition"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Bottom row: Navigation links with better spacing */}
          {isApproved && (
            <div className="flex flex-wrap mt-5 -mx-2">
              <Link 
                href="/dashboard" 
                className={`mx-2 px-4 py-2.5 rounded-md text-sm font-medium transition ${
                  pathname === '/dashboard' ? 'bg-white/20' : 'hover:bg-white/10'
                }`}
              >
                Dashboard
              </Link>
              
              {isAdmin && (
                <Link 
                  href="/admin/dashboard" 
                  className={`mx-2 px-4 py-2.5 rounded-md text-sm font-medium transition ${
                    pathname === '/admin/dashboard' ? 'bg-white/20' : 'hover:bg-white/10'
                  }`}
                >
                  Admin
                </Link>
              )}
              
              {isResident && (
                <Link 
                  href="/access-codes" 
                  className={`mx-2 px-4 py-2.5 rounded-md text-sm font-medium transition ${
                    pathname === '/access-codes' ? 'bg-white/20' : 'hover:bg-white/10'
                  }`}
                >
                  Access Codes
                </Link>
              )}
              
              {isGuard && (
                <Link 
                  href="/verify" 
                  className={`mx-2 px-4 py-2.5 rounded-md text-sm font-medium transition ${
                    pathname === '/verify' ? 'bg-white/20' : 'hover:bg-white/10'
                  }`}
                >
                  Verify Access
                </Link>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Secondary navigation with back button - only shown when needed */}
      {showBackButton() && (
        <div className="bg-white dark:bg-gray-900 shadow-sm">
          <div className="container mx-auto px-4 py-2">
            <Link 
              href={getBackPath()} 
              className="inline-flex items-center text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-white"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-1" />
              <span>Back</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
