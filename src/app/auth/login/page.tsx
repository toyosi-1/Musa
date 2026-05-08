"use client";

import { useSearchParams } from 'next/navigation';
import AuthForm from '@/components/auth/AuthForm';
import Link from 'next/link';
import { useEffect, useState, Suspense } from 'react';
import MusaCharacterSVG from '@/components/ui/illustrations/MusaCharacterSVG';

function LoginContent() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (searchParams.get('deviceApproved') === 'true') {
      setMessage({ type: 'success', text: 'Device authorized successfully! You can now log in.' });
    }
    const error = searchParams.get('error');
    if (error === 'device_approval_failed') {
      setMessage({ type: 'error', text: searchParams.get('message') || 'Device approval failed' });
    } else if (error === 'device_approval_error') {
      setMessage({ type: 'error', text: 'An error occurred during device approval. Please try again.' });
    } else if (error === 'missing_token') {
      setMessage({ type: 'error', text: 'Invalid approval link. Please use the link from your email.' });
    }
  }, [searchParams]);

  return (
    <div
      className="min-h-screen flex flex-col bg-[#080d1a] relative overflow-hidden"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* Background glow effects */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-[-60px] w-72 h-72 bg-indigo-600/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      {/* Top navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 pt-4 pb-2">
        <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium">Back</span>
        </Link>
        <Link href="/auth/register" className="text-sm text-gray-400">
          New here?{' '}
          <span className="text-blue-400 font-semibold">Sign up</span>
        </Link>
      </nav>

      {/* Main content — scrollable so keyboard doesn't break layout */}
      <div className="relative z-10 flex-1 overflow-y-auto px-6 pt-8 pb-10">
        {/* Heading */}
        <div className="mb-8">
          <h1 className="text-[2rem] font-extrabold text-white tracking-tight leading-tight mb-2">
            Welcome back
          </h1>
          <p className="text-gray-400 text-[15px]">Sign in to your Musa account</p>
        </div>

        {/* Device approval / error message */}
        {message && (
          <div className={`mb-5 p-4 rounded-2xl flex items-start gap-3 ${
            message.type === 'success'
              ? 'bg-green-500/10 border border-green-500/25 text-green-400'
              : 'bg-amber-500/10 border border-amber-500/25 text-amber-400'
          }`}>
            <span className="text-lg shrink-0 mt-0.5">
              {message.type === 'success' ? '✅' : '⚠️'}
            </span>
            <p className="text-sm font-medium leading-snug">{message.text}</p>
          </div>
        )}

        {/* Form card */}
        <div className="relative bg-white/[0.06] backdrop-blur-md border border-white/10 rounded-3xl p-6 shadow-2xl">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />
          <div className="relative z-10">
            <AuthForm mode="login" redirectTo={searchParams.get('redirect') || undefined} />
          </div>
        </div>

        {/* Register link */}
        <p className="text-center text-gray-500 text-sm mt-8">
          Don&apos;t have an account?{' '}
          <Link href="/auth/register" className="text-blue-400 font-semibold hover:text-blue-300 transition-colors">
            Register now
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#080d1a]">
        <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
