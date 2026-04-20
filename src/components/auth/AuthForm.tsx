"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/user';
import { isFirebaseReady } from '@/lib/firebase';
import {
  isBiometricAvailable,
  hasBiometricRegistered,
  getBiometricEmail,
  authenticateWithBiometric,
} from '@/utils/biometricAuth';
import { getDashboardRoute } from '@/utils/dashboardRoute';
import { translateAuthError, translateLoginError } from '@/utils/authFormErrors';
import { useFirebaseReadiness } from '@/hooks/useFirebaseReadiness';
import { useEstatesList } from '@/hooks/useEstatesList';
import { PasswordField } from './_fields/PasswordField';
import { RoleSelector } from './_fields/RoleSelector';
import { EstatePicker } from './_fields/EstatePicker';
import { TermsCheckbox } from './_fields/TermsCheckbox';
import { BiometricLoginButton } from './_fields/BiometricLoginButton';

// Form schema — kept here because the inferred type is the form's contract.
const authSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().optional(),
  role: z.enum(['guard', 'resident', 'admin']).optional(),
  estateId: z.string().optional(),
  agreedToTerms: z.boolean().optional(),
});

type AuthFormInputs = z.infer<typeof authSchema>;

interface AuthFormProps {
  mode: 'login' | 'register';
  defaultRole?: UserRole;
}

const LOGIN_TIMEOUT_MS = 10_000;
const POST_LOGIN_NAV_DELAY_MS = 500;

export default function AuthForm({ mode, defaultRole }: AuthFormProps) {
  const router = useRouter();
  const { signIn, signUp, initError } = useAuth();
  const firebase = useFirebaseReadiness();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [biometricReady, setBiometricReady] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

  const estates = useEstatesList(mode === 'register' && firebase.status === 'ready');

  // Biometric availability — login mode only.
  useEffect(() => {
    if (mode !== 'login') return;
    (async () => {
      const available = await isBiometricAvailable();
      if (available && hasBiometricRegistered()) setBiometricReady(true);
    })();
  }, [mode]);

  // Reflect hook error into local state (unchanged behavior vs. original).
  useEffect(() => {
    if (firebase.error) setError(firebase.error);
  }, [firebase.error]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<AuthFormInputs>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      role: (['guard', 'resident', 'admin'] as const).includes(defaultRole as any)
        ? (defaultRole as 'guard' | 'resident' | 'admin')
        : undefined,
      agreedToTerms: false,
    },
  });

  const performLogin = async (email: string, password: string) => {
    const timeoutId = setTimeout(() => {
      setError('Login is taking longer than expected. Please try again.');
      setLoading(false);
    }, LOGIN_TIMEOUT_MS);

    let user;
    try {
      user = await signIn(email, password);
    } catch (signInError) {
      clearTimeout(timeoutId);
      const friendly = translateLoginError(signInError);
      throw friendly ? new Error(friendly) : signInError;
    }
    clearTimeout(timeoutId);

    if (!user) throw new Error('Authentication failed: No user data returned');

    // Route by approval status before routing by role.
    if (user.status === 'pending') {
      router.push('/auth/pending');
      return;
    }
    if (user.status === 'rejected') {
      router.push('/auth/rejected');
      return;
    }
    if (user.status !== 'approved') {
      throw new Error(`Account has an unknown status: ${user.status}`);
    }

    // Small delay so the auth state listener settles before nav.
    setTimeout(() => router.push(getDashboardRoute(user.role)), POST_LOGIN_NAV_DELAY_MS);
  };

  const performRegister = async (data: AuthFormInputs) => {
    if (!data.displayName) throw new Error('Name is required for registration');
    if (!data.role) throw new Error('Please select a role');
    if (!data.estateId) throw new Error('Please select your estate');
    await signUp(data.email, data.password, data.displayName, data.role, data.estateId);
    router.push('/auth/pending');
  };

  const onSubmit = async (data: AuthFormInputs) => {
    setLoading(true);
    setError('');

    if (firebase.status === 'error' || !isFirebaseReady()) {
      setError('Authentication service is not ready. Please refresh the page and try again.');
      setLoading(false);
      return;
    }
    if (mode === 'register' && !agreedToTerms) {
      setError('You must agree to the Terms and Privacy Policy to create an account.');
      setLoading(false);
      return;
    }

    try {
      if (mode === 'login') {
        await performLogin(data.email, data.password);
      } else {
        await performRegister(data);
      }
    } catch (err) {
      console.error('Authentication error:', err);
      setError(translateAuthError(err, mode));
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    const email = getBiometricEmail();
    if (!email) {
      setError('No biometric credentials found. Please sign in with your password first.');
      return;
    }
    setBiometricLoading(true);
    setError('');
    try {
      const result = await authenticateWithBiometric(email);
      if (!result.success) {
        setError(result.message || 'Biometric authentication failed.');
        return;
      }

      if (result.customToken) {
        const { getFirebaseAuth } = await import('@/lib/firebase');
        const { signInWithCustomToken } = await import('firebase/auth');
        const auth = await getFirebaseAuth();
        await signInWithCustomToken(auth, result.customToken);
        router.push('/dashboard');
        return;
      }

      if (result.sessionRecovery && result.userId) {
        const cached = localStorage.getItem('musa_user_profile_cache');
        if (cached) {
          const { user } = JSON.parse(cached);
          if (user?.uid === result.userId) {
            router.push(getDashboardRoute(user.role));
            return;
          }
        }
        setError('Session expired. Please sign in with your password.');
      }
    } catch (err: any) {
      setError(err?.message || 'Biometric login failed.');
    } finally {
      setBiometricLoading(false);
    }
  };

  return (
    <div>
      {firebase.status === 'checking' && (
        <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 p-3.5 rounded-2xl mb-5 flex items-center gap-2.5 text-sm">
          <svg className="animate-spin h-4 w-4 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Connecting to auth service...</span>
        </div>
      )}

      {(error || initError) && (
        <div className="bg-red-500/10 border border-red-500/25 text-red-400 p-3.5 rounded-2xl mb-5 flex items-start gap-2.5">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium leading-snug">{error || initError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {mode === 'register' && (
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-300 mb-1.5">
              Full Name
            </label>
            <input
              id="displayName"
              type="text"
              {...register('displayName')}
              className="w-full h-12 px-4 rounded-xl bg-white/[0.08] border border-white/15 text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
              placeholder="Your full name"
              disabled={loading}
            />
            {errors.displayName && (
              <p className="text-red-400 text-xs mt-1.5">{errors.displayName.message}</p>
            )}
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            {...register('email')}
            className="w-full h-12 px-4 rounded-xl bg-white/[0.08] border border-white/15 text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
            placeholder="you@example.com"
            autoCapitalize="none"
            autoCorrect="off"
            disabled={loading}
          />
          {errors.email && (
            <p className="text-red-400 text-xs mt-1.5">{errors.email.message}</p>
          )}
        </div>

        <PasswordField
          id="password"
          label={
            <span className="flex items-center justify-between w-full">
              Password
              {mode === 'login' && (
                <Link href="/auth/forgot-password" className="text-xs text-blue-400 hover:text-blue-300 font-medium">
                  Forgot password?
                </Link>
              )}
            </span>
          }
          disabled={loading}
          errorMessage={errors.password?.message}
          register={register('password')}
        />

        {mode === 'register' && !defaultRole && (
          <RoleSelector
            selected={watch('role')}
            register={register('role')}
            disabled={loading}
            errorMessage={errors.role?.message}
          />
        )}

        {mode === 'register' && (
          <EstatePicker
            estates={estates}
            register={register('estateId', { required: 'Please select your estate' })}
            disabled={loading}
            errorMessage={errors.estateId?.message}
          />
        )}

        {mode === 'register' && (
          <TermsCheckbox checked={agreedToTerms} onChange={setAgreedToTerms} />
        )}

        <button
          type="submit"
          className="w-full h-12 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 shadow-lg shadow-blue-500/25 transition-all duration-200 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          disabled={loading}
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {mode === 'login' ? 'Signing in...' : 'Creating account...'}
            </>
          ) : mode === 'login' ? (
            'Sign In'
          ) : (
            'Create Account'
          )}
        </button>

        {mode === 'login' && biometricReady && (
          <BiometricLoginButton
            loading={biometricLoading}
            disabled={loading}
            onClick={handleBiometricLogin}
          />
        )}
      </form>

      {mode === 'register' && (
        <div className="mt-5 text-center">
          <p className="text-xs text-gray-600 leading-relaxed">
            New accounts require admin approval before access is granted.
          </p>
        </div>
      )}
    </div>
  );
}
