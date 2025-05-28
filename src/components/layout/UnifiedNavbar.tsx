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
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-xl font-bold">
                Musa
              </Link>
              {currentUser && (
                <span className="ml-4 bg-white text-primary px-2 py-1 rounded-md text-xs font-medium">
                  {currentUser.role === 'guard' ? 'Guard Mode' : 'Resident Mode'}
                </span>
              )}
            </div>

            <div className="flex items-center">
              {currentUser && (
                <div className="flex items-center">
                  <div className="mr-6 text-sm">
                    <span className="block font-medium">{currentUser.displayName}</span>
                    <span className="block text-xs opacity-80">{currentUser.email}</span>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="text-sm px-3 py-2 bg-white/10 hover:bg-white/20 rounded-md transition"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Integrated Navigation Links */}
          {isApproved && (
            <div className="flex space-x-4 pt-2">
              <Link href="/dashboard" className={`hover:bg-white/10 px-3 py-2 rounded-md text-sm font-medium transition ${
                pathname === '/dashboard' ? 'bg-white/20' : ''
              }`}>
                Dashboard
              </Link>
              
              {isAdmin && (
                <Link href="/admin/dashboard" className={`hover:bg-white/10 px-3 py-2 rounded-md text-sm font-medium transition ${
                  pathname === '/admin/dashboard' ? 'bg-white/20' : ''
                }`}>
                  Admin
                </Link>
              )}
              
              {isResident && (
                <Link href="/access-codes" className={`hover:bg-white/10 px-3 py-2 rounded-md text-sm font-medium transition ${
                  pathname === '/access-codes' ? 'bg-white/20' : ''
                }`}>
                  Access Codes
                </Link>
              )}
              
              {isGuard && (
                <Link href="/verify" className={`hover:bg-white/10 px-3 py-2 rounded-md text-sm font-medium transition ${
                  pathname === '/verify' ? 'bg-white/20' : ''
                }`}>
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
