"use client";

import { useState } from 'react';
import Link from 'next/link';
import { sendPasswordResetEmail } from 'firebase/auth';
import { getFirebaseAuth, isFirebaseReady, waitForFirebase } from '@/lib/firebase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    try {
      setLoading(true);

      // Ensure Firebase is initialized
      if (!isFirebaseReady()) {
        await waitForFirebase();
      }

      const auth = await getFirebaseAuth();

      await sendPasswordResetEmail(auth, email);
      setSuccess('If an account exists for this email, a password reset link has been sent. Please check your inbox.');
    } catch (err: any) {
      console.error('Failed to send reset email:', err);
      const code = err?.code as string | undefined;
      if (code === 'auth/invalid-email') setError('Please enter a valid email address');
      else if (code === 'auth/user-not-found') setSuccess('If an account exists for this email, a password reset link has been sent.');
      else if (code === 'auth/too-many-requests') setError('Too many attempts. Please try again later.');
      else setError('Could not send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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

          <Link href="/auth/login" className="text-sm text-primary hover:underline">
            Back to Sign In
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
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Reset Password</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">Enter your email to receive a password reset link.</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-card p-8">
          {success ? (
            <div className="text-center">
              <p className="text-green-600 dark:text-green-400 font-medium mb-4">{success}</p>
              <Link href="/auth/login" className="text-primary hover:underline">Return to sign in</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input w-full pl-10 input-with-icon"
                    placeholder="you@example.com"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl font-medium shadow-button bg-primary hover:bg-blue-600 text-white transition-colors disabled:opacity-60"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending reset link...
                  </div>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
