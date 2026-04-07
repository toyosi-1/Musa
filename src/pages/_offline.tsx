import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function OfflinePage() {
  const router = useRouter();
  const [manualCode, setManualCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ isValid: boolean; message?: string; destinationAddress?: string } | null>(null);
  const [cachedRole, setCachedRole] = useState<string | null>(null);
  const [cachedName, setCachedName] = useState<string | null>(null);
  const [cachedEstateId, setCachedEstateId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Recover cached user info from localStorage
  useEffect(() => {
    let role: string | null = null;
    let name: string | null = null;
    let estate: string | null = null;

    try {
      // Primary source: full user profile cache (has estateId)
      const profileCache = localStorage.getItem('musa_user_profile_cache');
      if (profileCache) {
        const { user } = JSON.parse(profileCache);
        if (user) {
          role = user.role || null;
          name = user.displayName || null;
          estate = user.estateId || null;
        }
      }
    } catch (e) { /* ignore */ }

    try {
      // Fallback: session backup (no estateId but has role)
      if (!role) {
        const sessionBackup = localStorage.getItem('musa_session_backup');
        if (sessionBackup) {
          const parsed = JSON.parse(sessionBackup);
          role = parsed.role || null;
          name = parsed.displayName || null;
        }
      }
    } catch (e) { /* ignore */ }

    setCachedRole(role);
    setCachedName(name);
    setCachedEstateId(estate);
  }, []);

  // Check for internet connection and redirect back if online
  useEffect(() => {
    const handleOnline = () => {
      window.location.href = '/';
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const handleRetry = () => {
    if (navigator.onLine) {
      window.location.reload();
    }
  };

  // Offline code verification using cached data
  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim() || isProcessing) return;

    setIsProcessing(true);
    try {
      // Use the offline guard service's cached data (keys match offlineGuardService.ts)
      const cacheKey = `musa_guard_codes_${cachedEstateId || ''}`;
      const raw = localStorage.getItem(cacheKey);
      if (!raw) {
        setVerifyResult({ isValid: false, message: 'No cached codes available. Please sync when you have network.' });
        return;
      }
      const codeMap = JSON.parse(raw);
      const ac = codeMap[manualCode.trim()];
      if (!ac) {
        setVerifyResult({ isValid: false, message: 'Invalid access code' });
        return;
      }
      if (ac.expiresAt && ac.expiresAt < Date.now()) {
        setVerifyResult({ isValid: false, message: 'Access code has expired' });
        return;
      }
      if (!ac.isActive) {
        setVerifyResult({ isValid: false, message: 'Access code is inactive' });
        return;
      }

      // Try to get household address from cache (keys match offlineGuardService.ts)
      const hhKey = `musa_guard_households_${cachedEstateId || ''}`;
      const hhRaw = localStorage.getItem(hhKey);
      let destinationAddress = '';
      if (hhRaw) {
        const hhMap = JSON.parse(hhRaw);
        const hh = hhMap[ac.householdId];
        if (hh) {
          const parts: string[] = [];
          if (hh.address) parts.push(hh.address);
          if (hh.city) parts.push(hh.city);
          destinationAddress = parts.join(', ');
        }
      }

      setVerifyResult({ isValid: true, message: 'Access granted (offline)', destinationAddress });
    } catch (err) {
      setVerifyResult({ isValid: false, message: 'Error verifying code offline' });
    } finally {
      setIsProcessing(false);
      setTimeout(() => {
        setVerifyResult(null);
        setManualCode('');
      }, 8000);
    }
  };

  const isGuard = cachedRole === 'guard';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
      <Head>
        <title>Offline Mode | Musa</title>
        <meta name="description" content="You are offline. Limited features are available." />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="max-w-md w-full space-y-4">
        {/* Offline Status Banner */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-800/30 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-bold text-amber-800 dark:text-amber-200">You&apos;re Offline</h1>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {isGuard ? 'Guard mode — you can still verify cached access codes' : 'Limited features available'}
            </p>
          </div>
        </div>

        {/* Guard: Offline Code Verification */}
        {isGuard && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/20">
                  <svg className="h-4.5 w-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">
                    {cachedName ? `Hi ${cachedName.split(' ')[0]}` : 'Guard'} — Offline Verification
                  </h2>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">Verify access codes from cached data</p>
                </div>
              </div>

              <form onSubmit={handleVerifyCode} className="space-y-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  placeholder="e.g. MUSA1234"
                  className="block w-full text-center text-xl font-bold font-mono tracking-[0.15em] py-4 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900/50 border-2 border-gray-200 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-2xl transition-all placeholder:text-gray-300 dark:placeholder:text-gray-600 placeholder:tracking-[0.1em] placeholder:font-medium placeholder:text-base"
                  disabled={isProcessing}
                  autoCapitalize="characters"
                  autoComplete="off"
                  maxLength={10}
                />
                <button
                  type="submit"
                  className="w-full py-3.5 text-sm font-bold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/25"
                  disabled={!manualCode.trim() || isProcessing}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Verify Code (Offline)
                </button>
              </form>
            </div>

            {/* Verification Result */}
            {verifyResult && (
              <div className={`p-5 text-center border-t ${
                verifyResult.isValid
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
              }`}>
                <div className={`w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center ${
                  verifyResult.isValid ? 'bg-emerald-500' : 'bg-red-500'
                }`}>
                  {verifyResult.isValid ? (
                    <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
                <h3 className={`text-lg font-bold ${
                  verifyResult.isValid ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'
                }`}>
                  {verifyResult.isValid ? 'Access Granted' : 'Access Denied'}
                </h3>
                <p className={`text-sm mt-1 ${
                  verifyResult.isValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {verifyResult.message}
                </p>
                {verifyResult.destinationAddress && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 font-medium">
                    📍 {verifyResult.destinationAddress}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Non-guard users: general offline info */}
        {!isGuard && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No Internet Connection</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Please check your Wi-Fi or mobile data connection and try again. Most features require an internet connection.
            </p>
            <button
              onClick={handleRetry}
              className="w-full py-3 text-sm font-bold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retry Connection
            </button>
          </div>
        )}

        {/* Quick links */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Quick Links</h3>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href={isGuard ? '/dashboard/guard' : '/dashboard/resident'}
              className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              <svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Dashboard
            </Link>
            <Link
              href="/dashboard/profile"
              className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              <svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Profile
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-2">
          Connection will be restored automatically when available.
        </p>
      </div>
    </div>
  );
}
