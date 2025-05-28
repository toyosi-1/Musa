"use client";

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PendingPage() {
  const { currentUser, loading } = useAuth();
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Link href="/" className="absolute top-4 left-4 inline-flex items-center text-primary hover:text-primary-dark transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
        </svg>
        Back to Home
      </Link>
      
      <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100 text-yellow-500 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Account Pending Approval</h2>
          
          <div className="mt-4 text-gray-600 dark:text-gray-300">
            <p>Thank you for registering with Musa.</p>
            <p className="mt-2">Your account is currently awaiting administrator approval.</p>
            <p className="mt-2">You'll receive a notification when your account has been reviewed.</p>
          </div>

          <div className="mt-8 space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              If you have any questions about your account status, please contact the administrator.
            </p>
            
            <div>
              <Link 
                href="/auth/login" 
                className="text-primary hover:text-primary-dark text-sm transition-colors"
              >
                ← Back to Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
