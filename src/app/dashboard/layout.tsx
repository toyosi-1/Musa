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
      {/* Header/Navigation */}
      <header className="bg-primary text-white shadow-md">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
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
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 dark:bg-gray-800 py-4 border-t border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 text-center text-sm text-gray-600 dark:text-gray-400">
          © {new Date().getFullYear()} Musa Estate Access Control. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
