"use client";

import React, { useState, useEffect, useRef } from 'react';
import { getFirebaseDatabase } from '@/lib/firebase';
import { ref, get } from 'firebase/database';
import { User, AccessCode, Household } from '@/types/user';
import { getResidentAccessCodes, createAccessCode, deactivateAccessCode } from '@/services/accessCodeService';
import { getHousehold, createHousehold } from '@/services/householdService';
import AccessCodeCard from '@/components/resident/AccessCodeCard';
import HouseholdManager from '@/components/resident/HouseholdManager';
import CreateAccessCodeForm from '@/components/resident/CreateAccessCodeForm';
import CreateHouseholdForm from '@/components/resident/CreateHouseholdForm';
import PendingInvitations from '@/components/resident/PendingInvitations';
import { DashboardSkeleton, AccessCodeSkeleton } from '@/components/ui/SkeletonLoader';


interface ResidentDashboardProps {
  user: User;
}

export default function ResidentDashboard({ user }: ResidentDashboardProps) {
  const [accessCodes, setAccessCodes] = useState<AccessCode[]>([]);
  const [household, setHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Removed activeTab state since we now show both sections simultaneously

  // Reference to track if we've already attempted householdId refresh
  const householdIdCheckedRef = useRef(false);

  // Function to refresh household data
  const refreshHousehold = async (): Promise<void> => {
    if (user.householdId) {
      try {
        const householdData = await getHousehold(user.householdId);
        setHousehold(householdData);
        // Don't return the household data to match Promise<void> type
      } catch (err) {
        console.error('Error refreshing household data:', err);
      }
    }
  };

  // Load resident data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Double-check for household ID if not present in user object but we haven't checked yet
        if (!user.householdId && !householdIdCheckedRef.current) {
          householdIdCheckedRef.current = true;
          // Try to refresh user data from database in case household was just created
          console.log('No household ID found, trying to refresh user data...');
          if (user.uid) {
            const db = await getFirebaseDatabase();
            const userRef = ref(db, `users/${user.uid}`);
            const snapshot = await get(userRef);
            if (snapshot.exists()) {
              const userData = snapshot.val();
              if (userData.householdId) {
                console.log('Found household ID in fresh user data:', userData.householdId);
                // Update user object with householdId
                user.householdId = userData.householdId;
              }
            }
          }
        }
        
        // Load access codes
        const codes = await getResidentAccessCodes(user.uid);
        setAccessCodes(codes);
        
        // Load household data if the user has a household
        if (user.householdId) {
          const householdData = await getHousehold(user.householdId);
          setHousehold(householdData);
        }
      } catch (err) {
        console.error('Error loading resident data:', err);
        setError('Failed to load your data. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [user.uid, user.householdId]);

  // Create a new access code
  const handleCreateAccessCode = async (description: string, expiresAt?: number) => {
    if (!user.householdId) {
      console.error('No household ID found for user:', user.uid);
      setError('You need to create or join a household first');
      return null;
    }
    
    try {
      setLoading(true);
      console.log('Creating access code with description:', description);
      console.log('User ID:', user.uid, 'Household ID:', user.householdId);
      
      const result = await createAccessCode(user.uid, user.householdId, description, expiresAt);
      console.log('Access code created successfully:', result);
      
      // Refresh access codes
      const updatedCodes = await getResidentAccessCodes(user.uid);
      setAccessCodes(updatedCodes);
      
      // Make sure we return a properly structured result
      if (result && result.code && result.qrCode) {
        return { code: result.code, qrCode: result.qrCode };
      } else {
        console.error('Invalid result from createAccessCode:', result);
        throw new Error('Invalid access code result structure');
      }
    } catch (err) {
      console.error('Error creating access code:', err);
      setError('Failed to create access code: ' + (err instanceof Error ? err.message : 'Unknown error'));
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Deactivate an access code
  const handleDeactivateCode = async (codeId: string) => {
    try {
      setLoading(true);
      await deactivateAccessCode(codeId, user.uid);
      
      // Update the local state
      setAccessCodes(prevCodes => 
        prevCodes.map(code => 
          code.id === codeId 
            ? { ...code, isActive: false } 
            : code
        )
      );
    } catch (err) {
      console.error('Error deactivating code:', err);
      setError('Failed to deactivate code');
    } finally {
      setLoading(false);
    }
  };

  // Create a new household (for users without a household)
  const handleCreateHousehold = async (name: string, addressData?: {
    address?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  }) => {
    try {
      setLoading(true);
      const newHousehold = await createHousehold(user.uid, name, addressData);
      setHousehold(newHousehold);
      return newHousehold;
    } catch (err) {
      console.error('Error creating household:', err);
      setError('Failed to create household');
      return null;
    } finally {
      setLoading(false);
    }
  };

  if (loading && !accessCodes.length && !household) {
    return (
      <div className="w-full">
        <h1 className="text-3xl font-bold mb-8 text-gray-800 dark:text-white">Resident Dashboard</h1>
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="w-full">
      <h1 className="text-3xl font-bold mb-8 text-gray-800 dark:text-white">Resident Dashboard</h1>
      
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-300 px-6 py-4 rounded-xl shadow-card mb-8">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-medium">{error}</p>
          </div>
        </div>
      )}
      
      {!user.householdId && !household && (
        <div className="bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-400 text-yellow-800 dark:text-yellow-200 px-6 py-4 rounded-xl shadow-card mb-8">
          <div className="flex">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-semibold text-lg">Welcome to Musa!</h3>
              <p className="mt-1">You need to create or join a household before generating access codes.</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Access Codes Section */}
      <div className="space-y-8">
        {/* Section Header */}
        <div className="flex items-center mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mr-3 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1721 9z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Access Codes</h2>
        </div>
      
      <div className="space-y-8">
        <div className="space-y-8">
          {/* Address Missing Warning */}
          {user.householdId && household && !household.address && (
            <div className="bg-orange-50 dark:bg-orange-900/30 border-l-4 border-orange-400 text-orange-700 dark:text-orange-200 px-6 py-4 rounded-xl shadow-card mb-8">
              <div className="flex">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <h3 className="font-semibold text-lg">Missing Address Information</h3>
                  <p className="mt-1">Your household has no address set. When guards scan access codes, they won't see where visitors are going. 
                    <button 
                      onClick={() => document.querySelector('#household-section')?.scrollIntoView({ behavior: 'smooth' })} 
                      className="ml-1 font-medium underline hover:text-orange-800">
                      Add your address now
                    </button>
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="card">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Generate New Access Code
              </h2>
              <p className="text-gray-600 dark:text-gray-300">Create a new access code for guests or service providers.</p>
              {user.householdId && household && household.address && (
                <p className="text-sm text-green-600 dark:text-green-400 mt-1 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Guards will see this address when verifying visitor access codes
                </p>
              )}
            </div>
            
            {!user.householdId && !household ? (
              <div className="bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-400 p-4 mb-4 rounded">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700 dark:text-yellow-200">
                      <strong>Household Required:</strong> You need to create or join a household before you can generate access codes.
                    </p>
                    <div className="mt-2">
                      <button 
                        onClick={() => document.querySelector('#household-section')?.scrollIntoView({ behavior: 'smooth' })} 
                        className="text-sm font-medium text-yellow-700 dark:text-yellow-200 hover:text-yellow-600 dark:hover:text-yellow-300 underline"
                      >
                        Go to Household Management
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : error ? (
              <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-400 p-4 mb-4 rounded">
                <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
              </div>
            ) : null}

            <div className="bg-musa-bg dark:bg-gray-900/50 rounded-xl p-6">
              <CreateAccessCodeForm 
                onCreateCode={handleCreateAccessCode} 
                disabled={!user.householdId && !household}
                noHouseholdMessage="You need to create or join a household before generating access codes"
              />
            </div>
          </div>
          
          <div className="card">
            <div className="mb-6">
              <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white mb-2 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 md:h-7 md:w-7 mr-2 md:mr-3 text-primary dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7 5.955c-.34-.059-.68-.114-1.021-.165C10.981 15.564 9.5 16.5 8 16.5s-2.98-.936-4.979-1.71C2.68 14.886 2.34 14.941 2 15a6 6 0 117-5.955m5 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Your Access Codes
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Generate secure access codes for your visitors and guests.
              </p>
            </div>
            
            {accessCodes.length === 0 ? (
              <div className="bg-musa-bg dark:bg-gray-900/50 rounded-xl p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">No Access Codes</h3>
                <p className="text-gray-500 dark:text-gray-300 max-w-md mx-auto">
                  You haven't created any access codes yet. Create your first code using the form above.
                </p>
                {household && !household.address && (
                  <div className="mt-4 text-sm text-orange-600 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/30 p-3 rounded-lg inline-block border border-orange-200 dark:border-orange-700/50">
                    <span className="font-semibold">Tip:</span> Guards won't be able to see your address when scanning codes. 
                    <button 
                      onClick={() => document.querySelector('#household-section')?.scrollIntoView({ behavior: 'smooth' })} 
                      className="ml-1 underline hover:text-orange-700 dark:hover:text-orange-200 transition-colors"
                    >
                      Add your address
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:gap-6 lg:grid-cols-2 w-full max-w-full overflow-hidden">
                {accessCodes.map(code => (
                  <div key={code.id} className="w-full overflow-hidden">
                    <AccessCodeCard 
                      accessCode={code}
                      onDeactivate={() => handleDeactivateCode(code.id)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Guest Communication Card */}

        </div>
      </div>
      
      {/* Household Management Section */}
      <div id="household-section" className="space-y-8 mt-12">
        {/* Section Header */}
        <div className="flex items-center mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mr-3 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Household Management</h2>
        </div>
        
        {/* Show pending invitations for users without a household */}
        {!user.householdId && !household && (
          <div className="card">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-primary dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Pending Invitations
              </h2>
              <p className="text-gray-600 dark:text-gray-300">Check for household invitations from other residents.</p>
            </div>
            
            <PendingInvitations 
              user={user} 
              onInvitationAccepted={() => {
                // Reload the page to refresh user data after accepting an invitation
                window.location.reload();
              }} 
            />
          </div>
        )}
        
        <div className="card">
          <div className="mb-4">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
              {household ? 'Manage Your Household' : 'Create or Join a Household'}
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              {household ? 'Manage your household members and settings.' : 'Create a new household or join an existing one.'}
            </p>
          </div>
          
          <div className="bg-musa-bg dark:bg-gray-900/50 rounded-xl p-6">
            {household ? (
              <HouseholdManager 
                user={user}
                household={household}
                onCreateHousehold={handleCreateHousehold}
                refreshHousehold={refreshHousehold}
              />
            ) : (
              <CreateHouseholdForm
                onCreateHousehold={handleCreateHousehold}
                disabled={loading}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
