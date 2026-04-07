'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { verifyAccessCode } from '@/services/accessCodeService';
import GuestMessageForm from '@/components/guest/GuestMessageForm';
import Link from 'next/link';
import Head from 'next/head';

export default function GuestPage() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [householdName, setHouseholdName] = useState<string | null>(null);
  const [accessCodeId, setAccessCodeId] = useState<string | null>(null);
  
  useEffect(() => {
    const code = searchParams?.get('code');
    if (!code) {
      setError('No access code provided');
      setIsLoading(false);
      return;
    }

    const verifyCode = async () => {
      try {
        const result = await verifyAccessCode(code);
        if (!result.isValid) {
          setError(result.message || 'Invalid access code');
          return;
        }

        if (!result.household) {
          setError('Could not find household information');
          return;
        }

        setHouseholdId(result.household.id);
        setHouseholdName(result.household.name || 'Resident');
        setAccessCodeId(result.accessCodeId || null);
      } catch (err) {
        console.error('Error verifying code:', err);
        setError('Failed to verify access code');
      } finally {
        setIsLoading(false);
      }
    };

    verifyCode();
  }, [searchParams]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col justify-center items-center p-4 gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 animate-pulse">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>
        <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Verifying access code...</p>
      </div>
    );
  }

  if (error || !householdId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-gray-800/80 p-6 sm:p-8 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
            <svg className="h-7 w-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-base font-bold text-gray-900 dark:text-white mb-2">
            {error || 'Error verifying access code'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Please try scanning the QR code again or contact the resident for assistance.
          </p>
          <Link 
            href="/"
            className="inline-flex items-center justify-center w-full px-5 py-3 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl shadow-md shadow-blue-500/20 transition-all touch-manipulation"
          >
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/20">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 dark:text-white">Message {householdName}</h1>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">Let the resident know you&apos;ve arrived</p>
            </div>
          </div>
        
          <GuestMessageForm 
            householdId={householdId} 
            accessCodeId={accessCodeId || undefined}
            onCancel={() => window.history.back()}
          />
        
          <div className="mt-5 text-center">
            <Link 
              href="/"
              className="text-xs font-medium text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors inline-block py-2 px-4 touch-manipulation"
            >
              Return Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
