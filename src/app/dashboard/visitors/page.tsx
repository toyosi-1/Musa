"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AccessCode, Household } from '@/types/user';
import { getResidentAccessCodes, createAccessCode, deactivateAccessCode } from '@/services/accessCodeService';
import { getHousehold } from '@/services/householdService';
import AccessCodeCard from '@/components/resident/AccessCodeCard';
import CreateAccessCodeForm from '@/components/resident/CreateAccessCodeForm';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useDeviceAuthorization } from '@/hooks/useDeviceAuthorization';
import { waitForAuthUser } from '@/lib/firebase';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function VisitorsPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [accessCodes, setAccessCodes] = useState<AccessCode[]>([]);
  const [household, setHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { needsApproval } = useDeviceAuthorization();

  useEffect(() => {
    if (!authLoading && currentUser) {
      loadData();
    }
  }, [authLoading, currentUser?.uid]);

  const loadData = async (retryCount = 0) => {
    if (!currentUser) return;
    try {
      setLoading(true);
      setError('');

      const authReady = await waitForAuthUser();
      if (!authReady) {
        setError('SESSION_EXPIRED');
        return;
      }

      const codes = await getResidentAccessCodes(currentUser.uid);
      setAccessCodes(codes);

      if (currentUser.householdId) {
        try {
          const householdData = await getHousehold(currentUser.householdId);
          setHousehold(householdData);
        } catch (householdError) {
          console.error('Error loading household:', householdError);
        }
      }
    } catch (err) {
      console.error('Error loading visitor data:', err);
      if (retryCount < 2) {
        return loadData(retryCount + 1);
      }
      setError('Failed to load data. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCode = async (description: string, expiresAt?: number) => {
    if (!currentUser) return;
    try {
      setError('');

      if (currentUser.isHouseholdHead && needsApproval) {
        const msg = 'Device authorization required. Please check your email and authorize this device.';
        setError(msg);
        throw new Error(msg);
      }

      await createAccessCode(
        currentUser.uid,
        household?.id || '',
        description,
        expiresAt,
        currentUser.estateId || household?.estateId
      );
      await loadData();
    } catch (err) {
      console.error('Error creating access code:', err);
      const msg = err instanceof Error ? err.message : 'Failed to create access code';
      setError(msg);
      throw err;
    }
  };

  const handleDeactivateCode = async (codeId: string) => {
    if (!currentUser) return;
    try {
      setAccessCodes(prev => prev.map(code =>
        code.id === codeId ? { ...code, isActive: false } : code
      ));
      await deactivateAccessCode(codeId, currentUser.uid);
    } catch (err) {
      console.error('Error deactivating access code:', err);
      loadData();
    }
  };

  if (authLoading || !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Visitors</h1>
      </div>

      {loading && !accessCodes.length ? (
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      ) : (
        <div className="space-y-8">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-300 px-6 py-4 rounded-xl shadow-card">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 flex-shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <p className="font-medium">
                    {error === 'SESSION_EXPIRED' ? 'Your session needs to be refreshed.' : error}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => window.location.reload()} className="px-4 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors">Reload</button>
                    <button onClick={() => loadData()} className="px-4 py-1.5 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 text-sm rounded-lg hover:bg-red-200 dark:hover:bg-red-700 transition-colors">Retry</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Address Missing Warning */}
          {currentUser.householdId && household && !household.address && (
            <div className="bg-orange-50 dark:bg-orange-900/30 border-l-4 border-orange-400 text-orange-700 dark:text-orange-200 px-5 py-3 rounded-xl">
              <p className="text-sm font-medium">Your household has no address set. Guards won't see where visitors are going.</p>
            </div>
          )}

          {/* Generate New Access Code */}
          <div className="card">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Generate New Access Code
              </h2>
              <p className="text-gray-600 dark:text-gray-300">Create a new access code for guests or service providers.</p>
              {currentUser.householdId && household && household.address && (
                <p className="text-sm text-green-600 dark:text-green-400 mt-1 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Guards will see this address when verifying codes
                </p>
              )}
            </div>

            {!currentUser.householdId && !household ? (
              <div className="bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-400 p-4 mb-4 rounded">
                <p className="text-sm text-yellow-700 dark:text-yellow-200">
                  <strong>Household Required:</strong> You need to create or join a household before you can generate access codes.
                  <button
                    onClick={() => router.push('/dashboard/resident')}
                    className="ml-2 font-medium underline hover:text-yellow-600 dark:hover:text-yellow-300"
                  >
                    Go to Home
                  </button>
                </p>
              </div>
            ) : null}

            <div className="bg-musa-bg dark:bg-gray-900/50 rounded-xl p-6">
              <CreateAccessCodeForm
                onCreateCode={handleCreateCode}
                disabled={!currentUser.householdId && !household}
                noHouseholdMessage="You need to create or join a household before generating access codes"
              />
            </div>
          </div>

          {/* Your Access Codes */}
          <div className="card">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-primary dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1721 9z" />
                </svg>
                Your Access Codes
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Manage your active and past access codes.
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
                  You haven&apos;t created any access codes yet. Create your first code using the form above.
                </p>
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
        </div>
      )}
    </div>
  );
}
