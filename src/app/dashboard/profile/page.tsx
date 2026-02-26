"use client";

import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';

export default function ProfilePage() {
  const { currentUser, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
      // Redirect happens automatically due to auth listener
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!currentUser) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-md">
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={() => router.back()} 
          className="flex items-center text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-all duration-200 rounded-lg px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-1" />
          <span className="font-medium text-sm">Back</span>
        </button>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Your Profile</h1>
        <div className="w-16" />
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden mb-6">
        {/* Profile header with avatar */}
        <div className="bg-blue-500 text-white p-6 text-center">
          <div className="w-24 h-24 rounded-full bg-white text-blue-500 flex items-center justify-center text-3xl font-bold mx-auto mb-4">
            {currentUser.displayName?.charAt(0) || 'U'}
          </div>
          <h2 className="text-xl font-bold">{currentUser.displayName}</h2>
          <p className="opacity-90">{currentUser.email}</p>
          <div className="mt-2">
            <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-sm">
              {currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)}
            </span>
          </div>
        </div>
        
        {/* Profile details */}
        <div className="p-4">
          <h3 className="font-semibold text-lg mb-3 text-gray-800 dark:text-white">Account Information</h3>
          
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">Account ID</span>
              <span className="font-medium text-gray-800 dark:text-gray-200">{currentUser.uid.slice(0, 8)}...</span>
            </div>
            
            <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">Status</span>
              <span className={`font-medium ${
                currentUser.status === 'approved' 
                  ? 'text-green-600 dark:text-green-400' 
                  : currentUser.status === 'pending' 
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-red-600 dark:text-red-400'
              }`}>
                {currentUser.status.charAt(0).toUpperCase() + currentUser.status.slice(1)}
              </span>
            </div>
            
            <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">Email Verified</span>
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {currentUser.isEmailVerified ? 'Yes' : 'No'}
              </span>
            </div>
            
            <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">Joined</span>
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {new Date(currentUser.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Actions */}
      <div className="space-y-3">
        <button 
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 font-semibold py-3 px-4 rounded-xl border border-red-200 dark:border-red-800 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </button>
      </div>
    </div>
  );
}
