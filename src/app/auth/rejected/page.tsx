"use client";

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RejectedPage() {
  const { currentUser, loading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If user is not logged in or is already approved, redirect appropriately
    if (!loading) {
      if (!currentUser) {
        router.push('/auth/login');
      } else if (currentUser.status === 'approved') {
        router.push('/dashboard');
      } else if (currentUser.status === 'pending') {
        router.push('/auth/pending');
      }
    }
  }, [currentUser, loading, router]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/auth/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-[#080d1a]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-700 border-t-red-400 mb-4" />
        <p className="text-gray-400 text-sm font-medium">Loading...</p>
      </div>
    );
  }

  const rejectionReason = currentUser?.rejectionReason || 'No reason provided';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 bg-[#080d1a] relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-80 h-80 bg-red-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-[-40px] w-64 h-64 bg-rose-500/8 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm space-y-6">
        {/* Nav */}
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Home
          </Link>
          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Sign Out
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>

        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500/20 to-rose-500/20 border border-red-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
        </div>

        {/* Heading */}
        <div className="text-center">
          <h1 className="text-2xl font-extrabold text-white">Account Not Approved</h1>
          <p className="text-gray-400 text-[15px] mt-1.5">
            Your application has been reviewed by an administrator.
          </p>
        </div>

        {/* Main card */}
        <div className="relative rounded-2xl bg-white/[0.06] backdrop-blur-md border border-white/10 p-6 shadow-2xl">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />
          <div className="relative z-10 space-y-5">
            {/* Rejection reason */}
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4">
              <p className="text-[11px] uppercase tracking-wider text-red-400/70 font-medium mb-1.5">Reason</p>
              <p className="text-red-300/90 text-sm leading-relaxed">{rejectionReason}</p>
            </div>

            <p className="text-xs text-gray-500 text-center leading-relaxed">
              If you believe this is an error or would like more information, please contact the estate administrator for further assistance.
            </p>

            {/* Sign out button */}
            <button
              onClick={handleSignOut}
              className="w-full h-11 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 shadow-lg shadow-red-900/25 transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>

            <p className="text-center text-xs text-gray-600">
              Need help?{' '}
              <a href="mailto:support@musa-security.com" className="text-blue-400 hover:text-blue-300 transition-colors">
                Contact Support
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
