"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ThemeToggle from '../ui/ThemeToggle';

import Logo from '../ui/Logo';


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



  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <div>
      {/* Primary navigation - blue header */}
      <nav className="bg-primary text-white shadow-md">
        <div className="container mx-auto px-6 py-5">
          {/* Top row: Logo, mode indicator, and user info */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-slide-down">
            <div className="flex items-center justify-between">
              {/* Logo/Brand */}
              <div className="flex items-center">
                <Logo
                  variant="default"
                  size="md"
                  animated={true}
                  className="animate-fade-in"
                />
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

            <div className="flex items-center justify-end space-x-4">
              {/* Theme Toggle */}
              <ThemeToggle />
              

              
              {currentUser && (
                <div className="flex items-center animate-fade-in">
                  <div className="mr-8 text-sm">
                    <span className="block font-medium">{currentUser.displayName}</span>
                    <span className="block text-xs opacity-80">{currentUser.email}</span>
                  </div>
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

          {/* Bottom row: Navigation links with improved spacing */}
          {isApproved && (
            <div className="flex flex-wrap mt-6 space-x-6 animate-slide-in-right">
              <Link 
                href="/dashboard" 
                className={`px-4 py-2.5 rounded-md text-sm font-medium transition ${
                  pathname === '/dashboard' ? 'bg-white/20' : 'hover:bg-white/10'
                }`}
              >
                Dashboard
              </Link>
              
              {isAdmin && (
                <Link 
                  href="/admin/dashboard" 
                  className={`px-4 py-2.5 rounded-md text-sm font-medium transition ${
                    pathname === '/admin/dashboard' ? 'bg-white/20' : 'hover:bg-white/10'
                  }`}
                >
                  Admin
                </Link>
              )}
              

              

            </div>
          )}
        </div>
      </nav>


    </div>
  );
}
