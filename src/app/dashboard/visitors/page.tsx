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
import ModernBanner from '@/components/ui/ModernBanner';
import { UsersIcon } from '@heroicons/react/24/solid';
import { isAccessCodeActive } from '@/utils/accessCodeStatus';
import ErrorState from '@/components/ui/ErrorState';

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
    if (!currentUser) return null;
    try {
      setError('');

      if (currentUser.isHouseholdHead && needsApproval) {
        const msg = 'Device authorization required. Please check your email and authorize this device.';
        setError(msg);
        throw new Error(msg);
      }

      const householdId = household?.id || currentUser.householdId || '';
      const result = await createAccessCode(
        currentUser.uid,
        householdId,
        description,
        expiresAt,
        currentUser.estateId || household?.estateId
      );
      await loadData();
      return result;
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
          className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeftIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>
        <ModernBanner
          title="Visitors"
          subtitle="Manage access codes for your guests"
          icon={<UsersIcon className="h-7 w-7 text-white" />}
          gradient="primary"
          className="flex-1"
        />
      </div>

      {loading && !accessCodes.length ? (
        <div className="animate-pulse space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-lg w-2/3 mb-3"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-1/2 mb-6"></div>
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl w-full mb-3"></div>
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl w-full"></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-lg w-1/3 mb-4"></div>
            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl w-full"></div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {error && (
            <ErrorState
              compact
              title="We couldn't load your access codes"
              description={error === 'SESSION_EXPIRED' ? 'Your session needs to be refreshed.' : error}
              onRetry={() => loadData()}
              secondaryAction={{ label: 'Reload page', onClick: () => window.location.reload() }}
            />
          )}

          {/* Address Missing Warning */}
          {currentUser.householdId && household && !household.address && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-amber-800 dark:text-amber-200">No address set</p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">Guards won&apos;t see where visitors are going. Set your household address on the home page.</p>
              </div>
            </div>
          )}

          {/* Generate New Access Code */}
          <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
            <div className="mb-4">
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">Generate Access Code</h2>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">For guests or service providers</p>
                </div>
              </div>
              {currentUser.householdId && household && household.address && (
                <div className="ml-[46px] mt-1 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Guards will see your address when verifying codes
                </div>
              )}
            </div>

            {!currentUser.householdId && !household ? (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 mb-4">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <span className="font-bold">Household Required:</span> You need to create or join a household first.{' '}
                  <button
                    onClick={() => router.push('/dashboard/resident')}
                    className="font-semibold underline hover:text-amber-600 dark:hover:text-amber-300"
                  >
                    Go to Home
                  </button>
                </p>
              </div>
            ) : null}

            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5">
              <CreateAccessCodeForm
                onCreateCode={handleCreateCode}
                disabled={!currentUser.householdId && !household}
                noHouseholdMessage="You need to create or join a household before generating access codes"
              />
            </div>
          </div>

          {/* Your Access Codes */}
          <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
            <div className="mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md shadow-violet-500/20">
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">Your Access Codes</h2>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">
                    {accessCodes.length} code{accessCodes.length !== 1 ? 's' : ''} &middot; {accessCodes.filter(isAccessCodeActive).length} active
                  </p>
                </div>
              </div>
            </div>

            {accessCodes.length === 0 ? (
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-8 text-center">
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <svg className="h-7 w-7 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">No Access Codes Yet</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
                  Create your first code using the form above to invite visitors.
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
