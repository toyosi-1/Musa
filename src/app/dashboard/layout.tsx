"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser, loading, signOut } = useAuth();
  const router = useRouter();

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!currentUser) {
    return null; // Will redirect to login via useEffect
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Unified Header/Navigation */}
      <header className="bg-primary text-white shadow-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-xl font-bold">
                Musa
              </Link>
              <span className="ml-4 bg-white text-primary px-2 py-1 rounded-md text-xs font-medium">
                {currentUser.role === 'guard' ? 'Guard Mode' : 'Resident Mode'}
              </span>
            </div>

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
          </div>
          
          {/* Integrated Navigation Links */}
          <div className="flex space-x-4 pt-2">
            <Link href="/dashboard" className="hover:bg-white/10 px-3 py-2 rounded-md text-sm font-medium transition">
              Dashboard
            </Link>
            
            {currentUser.role === 'admin' && (
              <Link href="/admin/dashboard" className="hover:bg-white/10 px-3 py-2 rounded-md text-sm font-medium transition">
                Admin
              </Link>
            )}
            
            {currentUser.role === 'resident' && (
              <Link href="/access-codes" className="hover:bg-white/10 px-3 py-2 rounded-md text-sm font-medium transition">
                Access Codes
              </Link>
            )}
            
            {currentUser.role === 'guard' && (
              <Link href="/verify" className="hover:bg-white/10 px-3 py-2 rounded-md text-sm font-medium transition">
                Verify Access
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        {children}
      </main>
    </div>
  );
}
