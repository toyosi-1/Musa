"use client";

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RejectedPage() {
  const { currentUser, loading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If user is not logged in or is already approved, redirect appropriately
    if (!loading) {
      if (!currentUser) {
        router.push('/auth/login');
      } else if (currentUser.status === 'approved') {
        router.push('/dashboard');
      } else if (currentUser.status === 'pending') {
        router.push('/auth/pending');
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
      <div className="flex flex-col justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-14 w-14 border-t-3 border-b-3 border-primary mb-4"></div>
        <p className="text-gray-600 dark:text-gray-300 font-medium">Loading...</p>
      </div>
    );
  }

  const rejectionReason = currentUser?.rejectionReason || 'No reason provided';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-musa-bg dark:bg-gray-900 p-4">
      <Link href="/" className="absolute top-6 left-6 inline-flex items-center text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary-light transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
        </svg>
        Back to Home
      </Link>
      
      <div className="w-full max-w-md space-y-8">
        <div className="card overflow-hidden">
          <div className="h-2 bg-red-500 w-full absolute top-0 left-0"></div>
          
          <div className="text-center pt-8">
            <div className="relative">
              <div className="w-24 h-24 bg-red-50 dark:bg-red-900/30 rounded-full shadow-md flex items-center justify-center mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mt-6">Account Not Approved</h2>
            
            <div className="mt-6 text-gray-600 dark:text-gray-300 max-w-sm mx-auto">
              <p>We're sorry, but your application to join Musa has not been approved by the administrator.</p>
              
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800/30">
                <p className="font-medium text-red-800 dark:text-red-300">Reason:</p>
                <p className="mt-1 text-red-700 dark:text-red-200">{rejectionReason}</p>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                If you believe this is an error or would like more information, please contact the administrator for further assistance.
              </p>
              
              <div className="pt-4">
                <button 
                  onClick={handleSignOut}
                  className="btn-primary flex items-center mx-auto"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Need help? <a href="mailto:support@musa.com" className="text-primary hover:text-primary-dark dark:text-primary-light dark:hover:text-primary transition-colors">Contact Support</a>
          </p>
        </div>
      </div>
    </div>
  );
}
