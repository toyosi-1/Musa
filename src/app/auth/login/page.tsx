"use client";

import { useSearchParams } from 'next/navigation';
import AuthForm from '@/components/auth/AuthForm';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    // Check for device approval success
    if (searchParams.get('deviceApproved') === 'true') {
      setMessage({
        type: 'success',
        text: '✅ Device authorized successfully! You can now log in and use all features.',
      });
    }

    // Check for device approval errors
    const error = searchParams.get('error');
    if (error === 'device_approval_failed') {
      const errorMessage = searchParams.get('message') || 'Device approval failed';
      setMessage({
        type: 'error',
        text: `❌ ${errorMessage}`,
      });
    } else if (error === 'device_approval_error') {
      setMessage({
        type: 'error',
        text: '❌ An error occurred during device approval. Please try again.',
      });
    } else if (error === 'missing_token') {
      setMessage({
        type: 'error',
        text: '❌ Invalid approval link. Please use the link from your email.',
      });
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex flex-col bg-musa-bg dark:bg-gray-900">
      {/* Header */}
      <header className="bg-musa-lightmint dark:bg-gray-800 p-4 shadow-sm">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
            <span className="ml-2 text-xl font-semibold text-gray-800 dark:text-white">Musa</span>
          </Link>
        </div>
      </header>
      
      {/* Main content */}
      <div className="container max-w-md mx-auto px-4 py-12 flex-1 flex flex-col justify-center">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white dark:bg-gray-800 rounded-full shadow-md flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-primary" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v-1l1-1 1-1-.257-.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Welcome Back</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Sign in to your Musa account
          </p>
        </div>

        {/* Device approval messages */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
          }`}>
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        )}
        
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-card p-8">
          <AuthForm mode="login" />
        </div>
        
        <div className="text-center mt-8">
          <p className="text-gray-600 dark:text-gray-300">
            Don't have an account?{' '}
            <Link href="/auth/register" className="text-primary font-medium hover:underline">
              Register now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
