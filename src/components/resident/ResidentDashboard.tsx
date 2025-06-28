"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import GuestCommunicationCard from '@/components/dashboard/GuestCommunicationCard';

interface ResidentDashboardProps {
  user: User;
}

export default function ResidentDashboard({ user }: ResidentDashboardProps) {
  const [accessCodes, setAccessCodes] = useState<AccessCode[]>([]);
  const [household, setHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('access'); // 'access' or 'household'
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
  const handleCreateAccessCode = useCallback(async (description: string, expiresAt?: number) => {
    if (!user.householdId) {
      console.error('No household ID found for user:', user.uid);
      setError('You need to create or join a household first');
      return null;
    }
    
    try {
      setLoading(true);
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
  }, [user.uid, user.householdId]);

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
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-8 text-gray-800 dark:text-white">Resident Dashboard</h1>
        <div className="animate-pulse space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-card p-8">
            <div className="h-7 bg-gray-100 dark:bg-gray-700 rounded-full w-1/4 mb-6"></div>
            <div className="space-y-4">
              <div className="h-5 bg-gray-100 dark:bg-gray-700 rounded-full w-3/4"></div>
              <div className="h-5 bg-gray-100 dark:bg-gray-700 rounded-full w-1/2"></div>
              <div className="h-5 bg-gray-100 dark:bg-gray-700 rounded-full w-2/3"></div>
            </div>
            <div className="mt-8 h-10 bg-gray-100 dark:bg-gray-700 rounded-xl w-1/3"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 min-h-screen">
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
      
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Resident Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
            Welcome back, {user.displayName?.split(' ')[0] || 'Resident'}
          </p>
        </div>
        
        {/* Conditional Content */}
        {!user.householdId && !household ? (
          <div className="bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-400 text-yellow-800 dark:text-yellow-200 px-6 py-4 rounded-xl shadow-card">
            <div className="flex">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-yellow-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="font-semibold text-lg">Welcome to Musa!</h3>
                <p className="mt-1">You need to create or join a household before generating access codes.</p>
              </div>
            </div>
            
            {/* Household Creation Form */}
            <div className="mt-4">
              <CreateHouseholdForm
                onCreateHousehold={handleCreateHousehold}
                disabled={loading}
              />
            </div>
          </div>
        ) : (
          <>
            {/* Tabs Navigation */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
              <button
                onClick={() => setActiveTab('access')}
                className={`px-4 py-2 font-medium text-sm ${activeTab === 'access' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
              >
                Access Codes
              </button>
              <button
                onClick={() => setActiveTab('household')}
                className={`px-4 py-2 font-medium text-sm ${activeTab === 'household' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
              >
                Household
              </button>
            </div>

            {activeTab === 'access' && (
              <div className="space-y-6">
                {/* Access Codes Content */}
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white">Access Codes</h2>
                </div>
                
                {user.householdId && household && !household.address && (
                  <div className="bg-orange-50 dark:bg-orange-900/30 border-l-4 border-orange-400 text-orange-700 dark:text-orange-200 px-6 py-4 rounded-xl shadow-card mb-8">
                    <div className="flex">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div>
                        <h3 className="font-semibold text-lg">Missing Address Information</h3>
                        <p className="mt-1">Your household has no address set. When guards scan access codes, they won't see where visitors are going.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Access Code Generation */}
                <div className="card">
                  <div className="mb-4">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Generate New Access Code
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">Create a new access code for guests or service providers.</p>
                  </div>
                  
                  <div className="bg-musa-bg dark:bg-gray-900/50 rounded-xl p-6">
                    <CreateAccessCodeForm 
                      onCreateCode={handleCreateAccessCode} 
                      disabled={!user.householdId && !household}
                      noHouseholdMessage="You need to create or join a household before generating access codes"
                    />
                  </div>
                </div>

                {/* Active Access Codes */}
                <div className="card">
                  <div className="mb-4">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                      </svg>
                      Your Access Codes
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">Manage your active access codes.</p>
                  </div>
                  
                  <div className="space-y-4">
                    {loading ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                      </div>
                    ) : accessCodes.length > 0 ? (
                      <div className="space-y-4">
                        {accessCodes.map((code) => (
                          <AccessCodeCard 
                            key={code.id} 
                            code={code} 
                            onDeactivate={handleDeactivateCode}
                            showActions={true}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-musa-bg dark:bg-gray-900/50 rounded-xl">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No access codes</h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          Get started by creating a new access code.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Guest Communication */}
                {household?.id && (
                  <div className="card mt-8">
                    <div className="mb-6">
                      <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                        Guest Communication
                      </h2>
                      <p className="text-gray-600 dark:text-gray-400">View messages from guests and visitors.</p>
                    </div>
                    
                    <GuestCommunicationCard householdId={household.id} />
                  </div>
                )}
              </div>
            )}

            {activeTab === 'household' && (
              <div className="space-y-6">
                {/* Pending Invitations */}
                {!user.householdId && !household && (
                  <div className="card">
                    <div className="mb-6">
                      <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                        </svg>
                        Pending Invitations
                      </h2>
                      <p className="text-gray-600 dark:text-gray-400">View and respond to household invitations.</p>
                    </div>
                    
                    <PendingInvitations 
                      user={user}
                      onAccept={async () => {
                        await refreshHousehold();
                      }} 
                    />
                  </div>
                )}

                {/* Household Management */}
                <div className="card">
                  <div className="mb-4">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      {household ? 'Household Management' : 'Create a Household'}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
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
            )}
          </>
        )}
      </div>
    </div>
  );
}
