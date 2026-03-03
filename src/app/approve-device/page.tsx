"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function ApproveDevicePage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid approval link — no token provided.');
      return;
    }

    const verifyDevice = async () => {
      try {
        const res = await fetch('/api/device-approval', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'verify', token }),
        });
        const data = await res.json();
        if (data.success) {
          setStatus('success');
          setMessage(data.message || 'Device approved successfully!');
        } else {
          setStatus('error');
          setMessage(data.message || 'Failed to approve device.');
        }
      } catch {
        setStatus('error');
        setMessage('Network error. Please try again.');
      }
    };

    verifyDevice();
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
        {status === 'loading' && (
          <>
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600 dark:text-gray-300">Verifying device approval...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-3">Device Approved</h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>
            <Link href="/auth/login" className="inline-block bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-600 transition-colors">
              Go to Login
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-3">Approval Failed</h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>
            <Link href="/auth/login" className="inline-block bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-600 transition-colors">
              Back to Login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
