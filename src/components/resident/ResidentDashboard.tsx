"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { User, AccessCode, Household, Estate } from '@/types/user';
import { getResidentAccessCodes, createAccessCode, deactivateAccessCode } from '@/services/accessCodeService';
import { getHousehold, createHousehold } from '@/services/householdService';
import { getUserProfile } from '@/services/userService';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import CreateHouseholdForm from './CreateHouseholdForm';
import HouseholdManager from './HouseholdManager';
import PendingInvitations from './PendingInvitations';
import AccessCodeCard from './AccessCodeCard';
import { ActionTile } from '@/components/ui/ProfessionalCard';
import { WelcomeBanner, AlertBanner } from '@/components/ui/ModernBanner';
import { useDeviceAuthorization } from '@/hooks/useDeviceAuthorization';
import { getFirebaseDatabase, waitForAuthUser } from '@/lib/firebase';
import { ref, get } from 'firebase/database';
import { cacheAccessCodes, getCachedAccessCodes, cacheHousehold, getCachedHousehold } from '@/utils/offlineCache';

interface ResidentDashboardProps {
  user: User;
}

export default function ResidentDashboard({ user }: ResidentDashboardProps) {
  const router = useRouter();
  const [accessCodes, setAccessCodes] = useState<AccessCode[]>([]);
  const [household, setHousehold] = useState<Household | null>(null);
  const [headOfHouseName, setHeadOfHouseName] = useState<string | null>(null);
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
      // Cache for offline use
      cacheAccessCodes(user.uid, codes);

      // Load household data
      if (user.householdId) {
        try {
          const householdData = await getHousehold(user.householdId);
          setHousehold(householdData);
          // Cache for offline use
          cacheHousehold(user.uid, householdData);
          // Fetch head of household name
          if (householdData?.headId) {
            try {
              const headProfile = await getUserProfile(householdData.headId);
              setHeadOfHouseName(headProfile?.displayName || headProfile?.email || null);
            } catch (e) {
              console.warn('Could not fetch head of household name:', e);
            }
          }
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
      
      // ── Offline fallback: serve cached data if available ──
      const cachedCodes = getCachedAccessCodes(user.uid);
      const cachedHH = getCachedHousehold(user.uid);
      if (cachedCodes || cachedHH) {
        console.log('[ResidentDashboard] Network failed — serving cached data');
        if (cachedCodes) setAccessCodes(cachedCodes as AccessCode[]);
        if (cachedHH) setHousehold(cachedHH as Household);
        setError('You\'re viewing cached data. Some info may be outdated.');
      } else {
        setError('Failed to load dashboard data. Please check your connection and try again.');
      }
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
      <div className="w-full space-y-5">
        <div className="animate-pulse">
          <div className="h-28 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-gray-800 dark:to-gray-700 rounded-2xl" />
        </div>
        <div className="grid grid-cols-2 gap-3 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-[120px] bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-800" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* ─── Welcome Banner ─── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 p-6 shadow-lg">
        <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-sm" />
        <div className="absolute left-1/2 -bottom-8 w-40 h-40 bg-white/5 rounded-full blur-md" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_60%)]" />
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/70 mb-0.5">
                {estate?.name || 'Your Estate'}
              </p>
              <h1 className="text-2xl font-bold text-white">
                {user.displayName?.split(' ')[0] || 'Resident'}
              </h1>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
            </div>
          </div>
          {/* Quick stat pills */}
          <div className="flex items-center gap-2 mt-4">
            <div className="px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-xs font-medium text-white">
              {accessCodes.filter(c => c.isActive).length} active codes
            </div>
            {household && (
              <div className="px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-xs font-medium text-white">
                {household.name}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Household Card ─── */}
      {household && (
        <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/20 flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">{household.name}</h3>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                {headOfHouseName && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <svg className="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 2a1 1 0 011 1v.586l2.707-2.707a1 1 0 011.414 1.414L12.414 5H14a1 1 0 011 1v3a6 6 0 01-12 0V6a1 1 0 011-1h1.586L2.879 2.293a1 1 0 011.414-1.414L7 3.586V3a1 1 0 012 0v.586l.293-.293A1 1 0 0110 3V2z" />
                    </svg>
                    <span><strong className="text-gray-700 dark:text-gray-300">Head:</strong> {headOfHouseName}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{Object.keys(household.members || {}).length} member{Object.keys(household.members || {}).length !== 1 ? 's' : ''}</span>
                </div>
              </div>
              {household.address && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 truncate">
                  {[household.address, household.city, household.state].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
            <span className={`text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${
              user.isHouseholdHead 
                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' 
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}>
              {user.isHouseholdHead ? 'Head' : 'Member'}
            </span>
          </div>
        </div>
      )}

      {/* ─── Quick Action Tiles ─── */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-1">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          {/* Visitors */}
          <button
            onClick={() => router.push('/dashboard/visitors')}
            className="group relative overflow-hidden flex flex-col items-start gap-3 p-4 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-700/50 transition-all duration-200 active:scale-[0.97]"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full -mr-6 -mt-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="relative">
              <span className="block text-sm font-bold text-gray-900 dark:text-white">Visitors</span>
              <span className="block text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Manage access</span>
            </div>
          </button>

          {/* Utility */}
          <button
            onClick={() => router.push('/dashboard/utilities')}
            className="group relative overflow-hidden flex flex-col items-start gap-3 p-4 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-lg hover:border-amber-200 dark:hover:border-amber-700/50 transition-all duration-200 active:scale-[0.97]"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-amber-50 dark:bg-amber-900/20 rounded-full -mr-6 -mt-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="relative">
              <span className="block text-sm font-bold text-gray-900 dark:text-white">Utility</span>
              <span className="block text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Pay bills</span>
            </div>
          </button>

          {/* Emergency */}
          <button
            onClick={() => router.push('/dashboard/emergency')}
            className="group relative overflow-hidden flex flex-col items-start gap-3 p-4 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-lg hover:border-red-200 dark:hover:border-red-700/50 transition-all duration-200 active:scale-[0.97]"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full -mr-6 -mt-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-md shadow-red-500/20 group-hover:scale-105 transition-transform">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="relative">
              <span className="block text-sm font-bold text-gray-900 dark:text-white">Emergency</span>
              <span className="block text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">SOS alerts</span>
            </div>
          </button>

          {/* Technicians */}
          <button
            onClick={() => router.push('/dashboard/vendors')}
            className="group relative overflow-hidden flex flex-col items-start gap-3 p-4 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-lg hover:border-purple-200 dark:hover:border-purple-700/50 transition-all duration-200 active:scale-[0.97]"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-purple-50 dark:bg-purple-900/20 rounded-full -mr-6 -mt-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-md shadow-purple-500/20 group-hover:scale-105 transition-transform">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.1-3.26m0 0l-.18-.12a3 3 0 01-.96-3.74l.18-.3a3 3 0 013.74-.96l.18.12m2.14 8.26l5.1-3.26m0 0l.18-.12a3 3 0 00.96-3.74l-.18-.3a3 3 0 00-3.74-.96l-.18.12" />
              </svg>
            </div>
            <div className="relative">
              <span className="block text-sm font-bold text-gray-900 dark:text-white">Technicians</span>
              <span className="block text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Request help</span>
            </div>
          </button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
            <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="font-medium text-sm flex-1">
            {error === 'SESSION_EXPIRED' ? 'Your session needs to be refreshed.' : error}
          </p>
          <button onClick={() => window.location.reload()} className="px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition-colors">Reload</button>
        </div>
      )}

      {!user.householdId && !household && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-sm text-amber-800 dark:text-amber-200">Welcome to Musa!</h3>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">Create or join a household below to start generating access codes for your visitors.</p>
          </div>
        </div>
      )}

      {/* Household Management Section */}
      <div id="household-section" className="space-y-5">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1">Household</h2>
        
        {/* Show pending invitations for users without a household */}
        {!user.householdId && !household && (
          <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
            <div className="mb-4">
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <svg className="h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Pending Invitations</h3>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 ml-[42px]">Check for household invitations from other residents.</p>
            </div>
            
            <PendingInvitations 
              user={user} 
              onInvitationAccepted={() => {
                window.location.reload();
              }} 
            />
          </div>
        )}
        
        <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
              {household ? 'Manage Your Household' : 'Create or Join a Household'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {household ? 'Manage your household members and settings.' : 'Create a new household or join an existing one.'}
            </p>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5">
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
