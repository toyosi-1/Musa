"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { User, AccessCode, Household, Estate } from '@/types/user';
import { getResidentAccessCodes, createAccessCode, deactivateAccessCode } from '@/services/accessCodeService';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import CreateHouseholdForm from './CreateHouseholdForm';
import PendingInvitations from './PendingInvitations';
import AccessCodeCard from './AccessCodeCard';
import { ActionTile } from '@/components/ui/ProfessionalCard';
import { WelcomeBanner, AlertBanner } from '@/components/ui/ModernBanner';
import { useDeviceAuthorization } from '@/hooks/useDeviceAuthorization';
import { getFirebaseDatabase, waitForAuthUser } from '@/lib/firebase';
import { ref, get } from 'firebase/database';

interface ResidentDashboardProps {
  user: User;
}

export default function ResidentDashboard({ user }: ResidentDashboardProps) {
  const router = useRouter();
  const [accessCodes, setAccessCodes] = useState<AccessCode[]>([]);
  const [household, setHousehold] = useState<Household | null>(null);
  const [estate, setEstate] = useState<Estate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Removed activeTab state since we now show both sections simultaneously

  // Device authorization for HoH accounts
  const { needsApproval, isChecking: isCheckingDevice } = useDeviceAuthorization();

  // Reference to track if we've already attempted householdId refresh
  const householdIdCheckedRef = useRef(false);

  useEffect(() => {
    loadData();
  }, [user.uid]);

  const loadData = async (retryCount = 0) => {
    try {
      setLoading(true);
      setError('');

      console.log(`[ResidentDashboard] loadData attempt ${retryCount + 1}/3`);

      // CRITICAL: Wait for Firebase Auth to restore the session
      // On PWA cold starts, the cached user is set from localStorage but
      // Firebase Auth hasn't restored the session yet. Database security
      // rules require authentication, so queries will fail without this.
      console.log('[ResidentDashboard] Waiting for auth session...');
      const authReady = await waitForAuthUser();
      if (!authReady) {
        console.warn('[ResidentDashboard] Auth session not restored');
        setError('SESSION_EXPIRED');
        return;
      }
      console.log('[ResidentDashboard] Auth session ready, loading data...');
      
      console.log('[ResidentDashboard] Loading access codes...');
      // Load access codes
      const codes = await getResidentAccessCodes(user.uid);
      console.log(`[ResidentDashboard] Loaded ${codes.length} access codes`);
      setAccessCodes(codes);

      // Load household data
      if (user.householdId) {
        try {
          const householdData = await getHousehold(user.householdId);
          setHousehold(householdData);
        } catch (householdError) {
          console.error('Error loading household:', householdError);
          // If household doesn't exist but user has householdId, clear it
          if (householdError instanceof Error && householdError.message.includes('not found')) {
            console.log('Household not found, clearing householdId from user');
            // Note: In a real app, you'd want to update the user's householdId to null
          }
        }
      }

      // Load estate data if user has estateId
      if (user.estateId) {
        try {
          const db = await getFirebaseDatabase();
          const estateRef = ref(db, `estates/${user.estateId}`);
          const snapshot = await get(estateRef);
          if (snapshot.exists()) {
            setEstate(snapshot.val() as Estate);
          }
        } catch (estateError) {
          console.error('Error loading estate:', estateError);
        }
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      
      // Auto-retry up to 2 times
      if (retryCount < 2) {
        console.log(`[ResidentDashboard] Error occurred, will retry (${retryCount + 1}/2)`);
        return loadData(retryCount + 1);
      }
      
      setError('Failed to load dashboard data. Please try refreshing the page.');
    } finally {
      setLoading(false);
    }
  };

  // Refresh household data
  const refreshHousehold = async () => {
    if (user.householdId) {
      try {
        const householdData = await getHousehold(user.householdId);
        setHousehold(householdData);
      } catch (err) {
        console.error('Error refreshing household:', err);
      }
    }
  };

  // Handle access code creation
  const handleCreateCode = async (
    description: string,
    expiresAt?: number
  ) => {
    try {
      setError('');

      // Device authorization check for Head of Household accounts
      if (user.isHouseholdHead && needsApproval) {
        const errorMessage = 'Device authorization required. Please check your email and authorize this device before creating access codes.';
        setError(errorMessage);
        throw new Error(errorMessage);
      }

      const newCode = await createAccessCode(
        user.uid,
        household?.id || '',
        description,
        expiresAt,
        user.estateId || household?.estateId
      );
      // Refresh access codes after creating new one
      await loadData();
      return newCode;
    } catch (err) {
      console.error('Error creating access code:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create access code';
      setError(errorMessage);
      throw err;
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
      const errorMessage = err instanceof Error ? err.message : 'Failed to create household';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Handle access code deactivation
  const handleDeactivateCode = async (codeId: string) => {
    try {
      // Update local state immediately for better UX
      setAccessCodes(prev => prev.map(code => 
        code.id === codeId ? { ...code, isActive: false } : code
      ));
      
      // Note: In a real implementation, you'd call an API to deactivate the code
      await deactivateAccessCode(codeId, user.uid);
    } catch (err) {
      console.error('Error deactivating access code:', err);
      // Revert the local state change if the API call fails
      loadData();
    }
  };

  if (loading && !accessCodes.length && !household) {
    return (
      <div className="w-full">
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-2xl"></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="h-28 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700"></div>
            <div className="h-28 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700"></div>
            <div className="h-28 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700"></div>
            <div className="h-28 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* ─── Welcome Banner ─── */}
      <WelcomeBanner 
        userName={user.displayName || 'Resident'}
        estateName={estate?.name}
        className="mb-6"
      />

      {/* ─── Quick Action Tiles ─── */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        {/* Visitors */}
        <button
          onClick={() => router.push('/dashboard/visitors')}
          className="group flex flex-col items-center justify-center gap-2.5 p-5 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700/60 shadow-sm hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-200 active:scale-[0.97]"
        >
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/40 dark:to-blue-800/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
            <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-gray-800 dark:text-white">Visitors</span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 -mt-1">Manage access</span>
        </button>

        {/* Utility */}
        <button
          onClick={() => router.push('/dashboard/utilities')}
          className="group flex flex-col items-center justify-center gap-2.5 p-5 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700/60 shadow-sm hover:shadow-lg hover:border-amber-200 dark:hover:border-amber-800 transition-all duration-200 active:scale-[0.97]"
        >
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/40 dark:to-amber-800/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
            <svg className="h-6 w-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-gray-800 dark:text-white">Utility</span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 -mt-1">Pay bills</span>
        </button>

        {/* Emergency */}
        <button
          onClick={() => router.push('/dashboard/emergency')}
          className="group flex flex-col items-center justify-center gap-2.5 p-5 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700/60 shadow-sm hover:shadow-lg hover:border-red-200 dark:hover:border-red-800 transition-all duration-200 active:scale-[0.97]"
        >
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/40 dark:to-red-800/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
            <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-gray-800 dark:text-white">Emergency</span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 -mt-1">SOS alerts</span>
        </button>

        {/* Technicians (Coming Soon) */}
        <button
          disabled
          className="relative flex flex-col items-center justify-center gap-2.5 p-5 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700/60 opacity-50 cursor-not-allowed"
        >
          <span className="absolute top-2.5 right-2.5 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500">Soon</span>
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/40 dark:to-purple-800/30 flex items-center justify-center">
            <svg className="h-6 w-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-gray-800 dark:text-white">Technicians</span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 -mt-1">Request help</span>
        </button>
      </div>
      
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-300 px-6 py-4 rounded-xl shadow-card mb-6">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 flex-shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-medium text-sm">
              {error === 'SESSION_EXPIRED' ? 'Your session needs to be refreshed.' : error}
            </p>
            <button onClick={() => window.location.reload()} className="ml-auto px-3 py-1 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700">Reload</button>
          </div>
        </div>
      )}

      {!user.householdId && !household && (
        <div className="bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-400 text-yellow-800 dark:text-yellow-200 px-5 py-3 rounded-xl shadow-card mb-6">
          <h3 className="font-semibold">Welcome to Musa!</h3>
          <p className="text-sm mt-1">Create or join a household below to start generating access codes for your visitors.</p>
        </div>
      )}

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
