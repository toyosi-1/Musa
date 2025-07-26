"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';

export default function ProfilePage() {
  const { currentUser, signOut } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
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
    <div className="container mx-auto px-4 py-6 max-w-md relative">
      <button 
        onClick={() => router.back()} 
        className="absolute top-0 left-0 flex items-center text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-all duration-200 rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <ArrowLeftIcon className="h-5 w-5 mr-1" />
        <span className="font-medium">Back</span>
      </button>
      
      <h1 className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-white">Your Profile</h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden mb-6">
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
          <h3 className="font-semibold text-lg mb-3">Account Information</h3>
          
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-300">Account ID</span>
              <span className="font-medium">{currentUser.uid.slice(0, 8)}...</span>
            </div>
            
            <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-300">Status</span>
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
              <span className="text-gray-500 dark:text-gray-300">Email Verified</span>
              <span className="font-medium">
                {currentUser.isEmailVerified ? 'Yes' : 'No'}
              </span>
            </div>
            
            <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-300">Joined</span>
              <span className="font-medium">
                {new Date(currentUser.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Actions */}
      <div className="space-y-3">
        <button 
          onClick={() => setIsEditing(!isEditing)}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg shadow transition"
        >
          Edit Profile
        </button>
        
        <button 
          onClick={handleSignOut}
          className="w-full bg-white hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-white font-semibold py-3 px-4 rounded-lg shadow transition"
        >
          Sign Out
        </button>
      </div>
      
      {isEditing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Edit Profile</h3>
            <p className="text-gray-500 dark:text-gray-300 mb-6">Profile editing functionality will be implemented in a future update.</p>
            <button 
              onClick={() => setIsEditing(false)}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
