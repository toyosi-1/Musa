"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ThemeToggle from '../ui/ThemeToggle';
import Logo from '../ui/Logo';

// Import the Dialog component we just created
import { Dialog } from '../ui/Dialog';


export default function UnifiedNavbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
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



  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <>
      {/* Primary navigation - blue header */}
      <nav className="bg-primary text-white shadow-md">
        <div className="container mx-auto px-4 py-3">
          {/* Centered layout with logo and user info */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 animate-slide-down">
            <div className="flex items-center justify-between">
              {/* Logo/Brand */}
              <div className="flex flex-col items-center">
                <Logo
                  variant="default"
                  size="md"
                  animated={true}
                  className="animate-fade-in"
                />
                {currentUser && (
                  <span className="bg-white text-primary px-3 py-1 rounded-md text-xs font-medium mt-1">
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

            <div className="flex items-center justify-end space-x-4">
              {/* Theme Toggle */}
              <ThemeToggle />
              
              {currentUser && (
                <div className="flex items-center animate-fade-in">
                  <button
                    onClick={handleSignOut}
                    className="text-sm px-4 py-2 bg-white/10 hover:bg-white/20 rounded-md transition transform hover:scale-105"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Admin link if user is admin */}
          {isApproved && isAdmin && (
            <div className="mt-2 md:mt-0 animate-slide-in-right">
              <Link 
                href="/admin/dashboard" 
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  pathname === '/admin/dashboard' ? 'bg-white/20' : 'hover:bg-white/10'
                }`}
              >
                Admin
              </Link>
            </div>
          )}
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
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Full Name</label>
                <p className="text-lg font-medium">{currentUser?.displayName || 'Not provided'}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Email</label>
                <p className="text-lg">{currentUser?.email}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Role</label>
                <p className="capitalize text-lg">
                  {currentUser?.role || 'Not assigned'}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Status</label>
                <div className="flex items-center gap-2">
                  <span className={`inline-block w-3 h-3 rounded-full ${currentUser?.status === 'approved' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                  <span className="capitalize">{currentUser?.status || 'Pending'}</span>
                </div>
              </div>
            </div>
          </div>
        </Dialog>
      )}
    </>
  );
}
