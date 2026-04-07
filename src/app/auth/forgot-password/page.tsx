"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { sendPasswordResetEmail } from 'firebase/auth';
import { getFirebaseAuth, isFirebaseReady, waitForFirebase } from '@/lib/firebase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const sendReset = useCallback(async () => {
    if (!email.trim() || loading || cooldown > 0) return;
    setError(null);

    try {
      setLoading(true);
      console.log('[ForgotPassword] Sending reset for:', email);

      if (!isFirebaseReady()) {
        await waitForFirebase();
      }

      const auth = await getFirebaseAuth();
      console.log('[ForgotPassword] Auth ready, authDomain:', auth.config.authDomain);

      // Build actionCodeSettings to use our custom reset-password page with confirm password
      const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';
      const baseUrl = isDev
        ? window.location.origin
        : 'https://' + (auth.config.authDomain || 'musa-security.com');

      const actionCodeSettings = {
        url: baseUrl + '/auth/reset-password',
        handleCodeInApp: false,
      };

      // Send with actionCodeSettings to redirect to our custom reset-password page
      await sendPasswordResetEmail(auth, email, actionCodeSettings);
      console.log('[ForgotPassword] Reset email sent successfully');
      setSuccess(true);
      setCooldown(60);
    } catch (err: any) {
      console.error('[ForgotPassword] Error:', err?.code, err?.message);
      const code = err?.code as string | undefined;
      if (code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (code === 'auth/user-not-found') {
        // Don't reveal whether user exists — show success
        setSuccess(true);
        setCooldown(60);
      } else if (code === 'auth/too-many-requests') {
        setError('Too many attempts. Firebase is rate-limiting this email. Please wait 5–10 minutes before trying again.');
        setCooldown(300);
      } else if (code === 'auth/unauthorized-continue-uri') {
        console.error('[ForgotPassword] Domain not authorized in Firebase Console!');
        setError('Configuration error — please contact support.');
      } else {
        setError(`Could not send reset email (${code || 'unknown'}). Please try again.`);
      }
    } finally {
      setLoading(false);
    }
  }, [email, loading, cooldown]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendReset();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 bg-[#080d1a] relative overflow-hidden">
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-80 h-80 bg-blue-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-[-40px] w-64 h-64 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
      <div className="relative z-10 w-full max-w-sm space-y-8">
        {/* Back link */}
        <Link href="/auth/login" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Sign In
        </Link>

        {/* Header */}
        <div>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/10 flex items-center justify-center mb-5">
            <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-white">Reset your password</h1>
          <p className="text-gray-400 text-[15px] mt-1.5">Enter your email and we&apos;ll send you a reset link.</p>
        </div>

        {/* Form card */}
        <div className="relative rounded-2xl bg-white/[0.06] backdrop-blur-md border border-white/10 p-6 shadow-2xl">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />
          <div className="relative z-10">
          {success ? (
            <div className="space-y-5 py-2">
              <div className="text-center space-y-3">
                <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                </div>
                <p className="text-emerald-400 text-sm font-medium">
                  Reset link sent to {email}
                </p>
              </div>

              {/* Where to find the email */}
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3.5 space-y-2">
                <p className="text-amber-400 text-xs font-semibold uppercase tracking-wider">Can&apos;t find it?</p>
                <ul className="text-amber-300/80 text-xs space-y-1.5 list-none">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5">1.</span>
                    <span>Check your <strong>Spam</strong> or <strong>Junk</strong> folder — Firebase emails often land there</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5">2.</span>
                    <span>Search your email for <strong>&quot;noreply@</strong>&quot; or <strong>&quot;password reset&quot;</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5">3.</span>
                    <span>If using Gmail, check the <strong>Promotions</strong> or <strong>Updates</strong> tab</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5">4.</span>
                    <span>It can take <strong>1–3 minutes</strong> to arrive</span>
                  </li>
                </ul>
              </div>

              {/* Resend button with cooldown */}
              <div className="text-center space-y-3">
                <button
                  onClick={() => { setSuccess(false); setError(null); sendReset(); }}
                  disabled={loading || cooldown > 0}
                  className="text-sm font-medium text-blue-400 hover:text-blue-300 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Sending...' : cooldown > 0 ? `Resend available in ${cooldown}s` : 'Resend reset email'}
                </button>
                <div>
                  <Link href="/auth/login" className="inline-block text-sm text-gray-400 hover:text-white font-medium transition-colors">
                    Return to Sign In
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl bg-white/[0.08] border border-white/15 text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                  placeholder="you@example.com"
                  autoCapitalize="none"
                  autoCorrect="off"
                  disabled={loading}
                  required
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/25 text-red-400 p-3 rounded-xl flex items-start gap-2">
                  <svg className="h-4 w-4 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full h-12 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 disabled:opacity-50 transition-all"
                disabled={loading || cooldown > 0}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Sending...
                  </span>
                ) : cooldown > 0 ? (
                  `Wait ${cooldown}s before resending`
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
