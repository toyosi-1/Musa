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
    <div className="max-w-7xl mx-auto p-4 min-h-screen">
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
        {/* Welcome Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-card p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome back, {user.displayName?.split(' ')[0] || 'Resident'}!</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Here's what's happening with your property access.</p>
            </div>
            <div className="mt-4 md:mt-0">
              <button className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                Generate New Code
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-card p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Active Codes</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">3</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-card p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Household Members</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">4</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-card p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Upcoming Visits</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">2</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-card p-6">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Notifications</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">5</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Access Codes */}
          <div className="lg:col-span-2 space-y-6">
            {/* Access Codes Section */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-card p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Access Codes</h2>
                <div className="flex space-x-2">
                  <button className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors">
                    All
                  </button>
                  <button className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg transition-colors">
                    Active
                  </button>
                  <button className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors">
                    Expired
                  </button>
                </div>
              </div>
              
              <div className="space-y-4">
                {accessCodes.length > 0 ? (
                  accessCodes.map((code) => (
                    <AccessCodeCard 
                      key={code.id} 
                      accessCode={code} 
                      onDeactivate={handleDeactivateCode}
                      showActions={true}
                    />
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v16m8-8H4"></path>
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No access codes yet</h3>
                    <p className="text-gray-500 dark:text-gray-400">Generate your first access code to get started</p>
                    <button className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                      Generate Code
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Guest Communication */}
            {household?.id && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-card p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Guest Communication</h2>
                <GuestCommunicationCard householdId={household.id} />
              </div>
            )}
          </div>
          
          {/* Right Column - Household */}
          <div className="space-y-6">
            {/* Household Management */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-card p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Household</h2>
                <button className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
                  </svg>
                </button>
              </div>
              
              {!user.householdId && !household ? (
                <div className="text-center py-8">
                  <div className="mx-auto w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m-1-6h4m2 0h4m-8-4h.01M9 17h.01"></path>
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No household found</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">Create or join a household to start managing access codes</p>
                  <CreateHouseholdForm
                    onCreateHousehold={handleCreateHousehold}
                    disabled={loading}
                  />
                </div>
                ) : (
                  <HouseholdManager 
                    user={user}
                    household={household}
                    onCreateHousehold={handleCreateHousehold}
                    refreshHousehold={refreshHousehold}
                  />
                )}
            </div>
            
            {/* Recent Activity */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-card p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recent Activity</h2>
                <button className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium">
                  View All
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full mr-4">
                    <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Access code used</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Front gate • 10:30 AM</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full mr-4">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">New member added</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">John Doe • Yesterday</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full mr-4">
                    <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Access code expired</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Temporary Guest • 2 days ago</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
