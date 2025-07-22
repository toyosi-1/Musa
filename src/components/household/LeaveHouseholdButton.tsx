"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { leaveHousehold } from '@/services/householdService';
import { Household } from '@/types/user';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface LeaveHouseholdButtonProps {
  household: Household;
  onLeave?: () => void;
}

export default function LeaveHouseholdButton({ household, onLeave }: LeaveHouseholdButtonProps) {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [isLeaving, setIsLeaving] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState('');

  const handleLeaveHousehold = async () => {
    if (!currentUser || !household) return;

    setIsLeaving(true);
    setError('');

    try {
      await leaveHousehold(currentUser.uid, household.id);
      
      // Call onLeave callback if provided
      if (onLeave) {
        onLeave();
      }
      
      // Redirect to dashboard
      router.push('/dashboard');
      
    } catch (error) {
      console.error('Error leaving household:', error);
      setError(error instanceof Error ? error.message : 'Failed to leave household');
    } finally {
      setIsLeaving(false);
      setShowConfirmation(false);
    }
  };

  const isHouseholdHead = currentUser?.uid === household.headId;
  const memberCount = household.members ? Object.keys(household.members).length : 0;

  if (showConfirmation) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
              Leave Household
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Are you sure you want to leave <strong>{household.name}</strong>?
            </p>
            
            {isHouseholdHead && memberCount > 1 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Warning:</strong> You are the household head. You cannot leave while there are other members. 
                  Please transfer ownership or remove other members first.
                </p>
              </div>
            )}
            
            {isHouseholdHead && memberCount === 1 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-800 dark:text-red-200">
                  <strong>Warning:</strong> As the only member and household head, leaving will permanently delete this household.
                </p>
              </div>
            )}
            
            {!isHouseholdHead && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                You can rejoin this household if invited again in the future.
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          <div className="flex space-x-3">
            <button
              onClick={() => setShowConfirmation(false)}
              disabled={isLeaving}
              className="flex-1 btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleLeaveHousehold}
              disabled={isLeaving || (isHouseholdHead && memberCount > 1)}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLeaving ? (
                <div className="flex items-center justify-center">
                  <LoadingSpinner size="sm" color="white" />
                  <span className="ml-2">Leaving...</span>
                </div>
              ) : (
                'Leave Household'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirmation(true)}
      className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
      Leave Household
    </button>
  );
}
