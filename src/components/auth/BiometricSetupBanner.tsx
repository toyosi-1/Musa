"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { isBiometricAvailable, hasBiometricRegistered, registerBiometric } from '@/utils/biometricAuth';

/**
 * Shows a banner prompting the user to enable Face ID / Fingerprint login.
 * Only appears when:
 * - The device supports platform biometrics
 * - The user hasn't already registered a credential
 * - The user hasn't dismissed the banner
 */
export default function BiometricSetupBanner() {
  // TEMPORARILY DISABLED: Biometric feature requires Firebase Admin SDK configuration on server
  // Will re-enable once FIREBASE_SERVICE_ACCOUNT_KEY is added to Netlify environment variables
  return null;
  
  /* const { currentUser } = useAuth();
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!currentUser) return;
    // Don't show if dismissed this session
    if (sessionStorage.getItem('musa_biometric_dismissed')) return;
    // Don't show if already registered
    if (hasBiometricRegistered()) return;

    (async () => {
      const available = await isBiometricAvailable();
      if (available) setShow(true);
    })();
  }, [currentUser]);

  if (!show || !currentUser) return null; */

  const handleEnable = async () => {
    setStatus('loading');
    const result = await registerBiometric(
      currentUser.uid,
      currentUser.email,
      currentUser.displayName
    );
    if (result.success) {
      setStatus('success');
      setMessage(result.message);
      setTimeout(() => setShow(false), 2000);
    } else {
      // If it's a server config error, hide the banner entirely
      if (result.message.includes('Server configuration error') || result.message.includes('contact support')) {
        console.warn('Biometric feature not available due to server configuration');
        setShow(false);
        return;
      }
      setStatus('error');
      setMessage(result.message);
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem('musa_biometric_dismissed', 'true');
    setShow(false);
  };

  return (
    <div className="mx-3 sm:mx-4 mb-4 p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
      {status === 'success' ? (
        <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm font-medium">{message}</span>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 p-2 bg-blue-100 dark:bg-blue-800/30 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 dark:text-white">Enable Quick Login</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Use Face ID or fingerprint to sign in faster next time.
            </p>
            {status === 'error' && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">{message}</p>
            )}
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleEnable}
                disabled={status === 'loading'}
                className="text-xs font-medium px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {status === 'loading' ? 'Setting up...' : 'Enable'}
              </button>
              <button
                onClick={handleDismiss}
                className="text-xs font-medium px-3 py-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                Not now
              </button>
            </div>
          </div>
          <button onClick={handleDismiss} className="flex-shrink-0 text-gray-400 hover:text-gray-600">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
