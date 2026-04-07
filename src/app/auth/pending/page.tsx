"use client";

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function PendingPage() {
  const { currentUser, loading, signOut, refreshCurrentUser } = useAuth();
  const router = useRouter();
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [nextCheckIn, setNextCheckIn] = useState(45);
  const [isBackgroundChecking, setIsBackgroundChecking] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // If user is not logged in or is already approved, redirect appropriately
    if (!loading) {
      if (!currentUser) {
        router.push('/auth/login');
      } else if (currentUser.status === 'approved') {
        router.push('/dashboard');
      } else if (currentUser.status === 'rejected') {
        router.push('/auth/rejected');
      }
    }
  }, [currentUser, loading, router]);

  // Smooth background polling without visual flicker
  useEffect(() => {
    // Initialize polling only once for pending users
    if (currentUser && currentUser.status === 'pending' && !loading && !hasInitialized) {
      setHasInitialized(true);
      setLastChecked(new Date());
      
      console.log('🔄 Starting smooth approval status polling...');
      
      // Countdown timer (updates every second)
      countdownRef.current = setInterval(() => {
        setNextCheckIn(prev => {
          if (prev <= 1) {
            return 45; // Reset to 45 seconds for less aggressive polling
          }
          return prev - 1;
        });
      }, 1000);
      
      // Background status check (every 45 seconds)
      pollingRef.current = setInterval(async () => {
        try {
          setIsBackgroundChecking(true);
          console.log('🔍 Silently checking approval status...');
          
          // Use a silent refresh that doesn't trigger re-renders
          await refreshCurrentUser();
          setLastChecked(new Date());
          setNextCheckIn(45); // Reset countdown
          
          console.log('✅ Background check completed');
        } catch (error) {
          console.error('❌ Error during background approval check:', error);
        } finally {
          // Small delay to prevent any visual flicker
          setTimeout(() => {
            setIsBackgroundChecking(false);
          }, 100);
        }
      }, 45000); // Check every 45 seconds (more professional interval)
    }
    
    // Cleanup function
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      console.log('🛑 Stopped approval status polling');
    };
  }, [currentUser, loading, hasInitialized, refreshCurrentUser]);

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
      <div className="flex justify-center items-center min-h-screen bg-musa-bg dark:bg-gray-900">
        <LoadingSpinner size="lg" color="primary" />
      </div>
    );
  }

  // Calculate estimated time based on registration time
  const waitingTime = currentUser?.createdAt ? Math.floor((Date.now() - currentUser.createdAt) / (1000 * 60 * 60)) : 0;
  const registrationDate = currentUser?.createdAt ? new Date(currentUser.createdAt).toLocaleDateString() : 'Unknown';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 bg-[#080d1a] relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-80 h-80 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-[-40px] w-64 h-64 bg-yellow-500/8 rounded-full blur-[100px] pointer-events-none" />
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
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-500/20 border border-amber-500/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="absolute -inset-1 rounded-2xl border-2 border-amber-400/30 animate-pulse" />
          </div>
        </div>

        {/* Heading */}
        <div className="text-center">
          <h1 className="text-2xl font-extrabold text-white">Pending Approval</h1>
          <p className="text-gray-400 text-[15px] mt-1.5">
            Hi <span className="text-white font-medium">{currentUser?.displayName}</span>, your account is being reviewed.
          </p>
        </div>

        {/* Main card */}
        <div className="relative rounded-2xl bg-white/[0.06] backdrop-blur-md border border-white/10 p-6 shadow-2xl">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />
          <div className="relative z-10 space-y-5">
            {/* Info message */}
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4">
              <p className="text-amber-300/90 text-sm leading-relaxed">
                Your account is awaiting administrator approval. You&apos;ll be automatically redirected once approved.
              </p>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3 text-center">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Registered</p>
                <p className="text-sm font-semibold text-white">{registrationDate}</p>
              </div>
              <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3 text-center">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Status</p>
                <p className="text-sm font-semibold text-amber-400 flex items-center justify-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  Pending
                </p>
              </div>
            </div>

            {/* Waiting message */}
            <p className="text-xs text-gray-500 text-center leading-relaxed">
              {waitingTime < 24
                ? 'Please allow up to 24 hours for your account to be approved.'
                : 'Your approval is taking longer than expected. Please contact support if this continues.'}
            </p>

            {/* Polling indicator */}
            {hasInitialized && (
              <div className="rounded-xl bg-blue-500/10 border border-blue-500/15 p-3">
                <div className="flex items-center justify-center gap-2 text-xs">
                  {isBackgroundChecking ? (
                    <>
                      <svg className="w-3 h-3 animate-spin text-blue-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span className="text-blue-400">Checking for updates...</span>
                    </>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-gray-400">Auto-checking in <span className="text-white font-medium">{nextCheckIn}s</span></span>
                    </>
                  )}
                </div>
                {lastChecked && (
                  <p className="text-[10px] text-gray-600 text-center mt-1.5">
                    Last checked: {lastChecked.toLocaleTimeString()}
                  </p>
                )}
              </div>
            )}

            {/* Sign out button */}
            <button
              onClick={handleSignOut}
              className="w-full h-11 rounded-xl font-semibold text-sm text-gray-300 bg-white/[0.06] border border-white/10 hover:bg-white/[0.1] hover:text-white transition-all"
            >
              Sign Out
            </button>

            <p className="text-center text-xs text-gray-600">
              Need help?{' '}
              <Link href="mailto:support@musa-security.com" className="text-blue-400 hover:text-blue-300 transition-colors">
                Contact Support
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
