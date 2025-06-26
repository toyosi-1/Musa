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
    const code = searchParams.get('code');
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md px-4">
          <div className="flex justify-center mb-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
          <h1 className="text-xl font-semibold text-center text-gray-700 dark:text-gray-300">
            Verifying access code...
          </h1>
        </div>
      </div>
    );
  }

  if (error || !householdId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 p-5 sm:p-6 rounded-lg shadow-md">
          <h1 className="text-xl font-semibold text-center text-red-600 dark:text-red-400 mb-4">
            {error || 'Error verifying access code'}
          </h1>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
            Please try scanning the QR code again or contact the resident for assistance.
          </p>
          <div className="flex justify-center">
            <Link 
              href="/"
              className="px-5 py-3 bg-primary text-white rounded-md hover:bg-primary-dark transition duration-200 touch-manipulation text-center w-full sm:w-auto"
            >
              Return Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h1 className="text-xl sm:text-2xl font-semibold text-center text-gray-800 dark:text-white mb-4 sm:mb-6">
          Message {householdName}
        </h1>
        
        <div className="mb-6">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Let the resident know you&apos;ve arrived or send them a message.
          </p>
        </div>
        
        <GuestMessageForm 
          householdId={householdId} 
          accessCodeId={accessCodeId || undefined}
          onCancel={() => window.history.back()}
        />
        
        <div className="mt-6 text-center">
          <Link 
            href="/"
            className="text-sm text-primary hover:underline inline-block py-2 px-4 touch-manipulation"
          >
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}
