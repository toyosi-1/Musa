"use client";

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function PendingPage() {
  const { currentUser, loading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If user is not logged in or is already approved, redirect appropriately
    if (!loading) {
      if (!currentUser) {
        router.push('/auth/login');
      } else if (currentUser.status === 'approved') {
        router.push('/dashboard');
      } else if (currentUser.status === 'rejected') {
        router.push('/auth/rejected');
      }
    }
  }, [currentUser, loading, router]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/auth/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-musa-bg dark:bg-gray-900">
        <LoadingSpinner size="lg" color="primary" />
      </div>
    );
  }

  // Calculate estimated time based on registration time
  const waitingTime = currentUser?.createdAt ? Math.floor((Date.now() - currentUser.createdAt) / (1000 * 60 * 60)) : 0;
  const registrationDate = currentUser?.createdAt ? new Date(currentUser.createdAt).toLocaleDateString() : 'Unknown';

  return (
    <div className="min-h-screen flex flex-col bg-musa-bg dark:bg-gray-900">
      {/* Header */}
      <header className="bg-musa-lightmint dark:bg-gray-800 p-4 shadow-sm">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
            <span className="ml-2 text-xl font-semibold text-gray-800 dark:text-white">Musa</span>
          </Link>
          <button 
            onClick={handleSignOut}
            className="text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>
      
      <div className="flex-grow flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          <div className="card text-center">
            {/* Status icon with animation */}
            <div className="relative mx-auto mb-6">
              <div className="w-24 h-24 bg-white dark:bg-gray-700 rounded-full shadow-md flex items-center justify-center mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-yellow-300 dark:border-yellow-500 opacity-50 animate-pulse"></div>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Account Pending Approval</h2>
            
            <div className="mt-6 text-gray-600 dark:text-gray-300 space-y-4">
              <p className="text-lg">
                Thank you for registering, <span className="font-semibold">{currentUser?.displayName}</span>.
              </p>
              
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 border-l-4 border-yellow-400">
                <p>Your account is currently awaiting administrator approval.</p>
                <p className="mt-2">You'll be notified once your account has been reviewed.</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Registration Date</div>
                  <div className="font-medium">{registrationDate}</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Status</div>
                  <div className="font-medium flex items-center justify-center">
                    <span className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></span>
                    Pending
                  </div>
                </div>
              </div>
              
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                <p>
                  {waitingTime < 24 
                    ? "Please allow up to 24 hours for your account to be approved." 
                    : "Your approval is taking longer than expected. Please contact support if this continues."}
                </p>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <button 
                onClick={handleSignOut}
                className="btn-outline w-full"
              >
                Sign Out
              </button>
              
              <div className="flex justify-center">
                <Link 
                  href="mailto:support@musa-app.com" 
                  className="text-primary hover:underline text-sm"
                >
                  Contact Administrator
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
