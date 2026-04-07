"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/user';
import { Estate } from '@/types/estate';
import { isFirebaseReady, waitForFirebase, getFirebaseDatabase, ref, get } from '@/lib/firebase';
import { isBiometricAvailable, hasBiometricRegistered, getBiometricEmail, authenticateWithBiometric } from '@/utils/biometricAuth';

// Form validation schema
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

export default function AuthForm({ mode, defaultRole }: AuthFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [firebaseStatus, setFirebaseStatus] = useState<'checking' | 'ready' | 'error'>('checking');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [estates, setEstates] = useState<Estate[]>([]);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricReady, setBiometricReady] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { signIn, signUp, initError } = useAuth();

  // Check biometric availability on mount (login mode only)
  useEffect(() => {
    if (mode !== 'login') return;
    (async () => {
      const available = await isBiometricAvailable();
      setBiometricSupported(available);
      if (available && hasBiometricRegistered()) {
        setBiometricReady(true);
      }
    })();
  }, [mode]);
  
  // Check Firebase status on mount
  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;
    let showLoadingTimeoutId: NodeJS.Timeout;
    
    // Start with no visible loading state
    setFirebaseStatus('ready');
    
    const initializeFirebase = async () => {
      try {
        // Check if Firebase is already initialized
        if (isFirebaseReady()) {
          if (isMounted) {
            setFirebaseStatus('ready');
          }
          return;
        }
        
        // Only show loading state after a short delay (if still initializing)
        showLoadingTimeoutId = setTimeout(() => {
          if (isMounted && !isFirebaseReady()) {
            setFirebaseStatus('checking');
          }
        }, 300); // Only show loading after 300ms delay
        
        const isReady = await waitForFirebase();
        if (isMounted) {
          if (isReady) {
            setFirebaseStatus('ready');
            setError('');
          } else {
            setFirebaseStatus('error');
            setError('Failed to initialize authentication service. Please refresh the page.');
          }
        }
      } catch (error) {
        console.error('Error initializing Firebase:', error);
        if (isMounted) {
          setFirebaseStatus('error');
          setError('Error initializing authentication service. Please refresh the page.');
        }
      }
    };
    
    // Set a timeout to show error if Firebase takes too long
    timeoutId = setTimeout(() => {
      if (isMounted && !isFirebaseReady()) {
        console.warn('Firebase initialization timed out');
        setFirebaseStatus('error');
        setError('Connection to authentication service is taking longer than expected. Please refresh the page.');
      }
    }, 8000);
    
    // Initialize Firebase
    initializeFirebase();
    
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      clearTimeout(showLoadingTimeoutId);
    };
  }, []);

  // Fetch estates for registration
  useEffect(() => {
    if (mode === 'register' && firebaseStatus === 'ready') {
      const fetchEstates = async () => {
        try {
          const db = await getFirebaseDatabase();
          const estatesRef = ref(db, 'estates');
          const snapshot = await get(estatesRef);
          if (snapshot.exists()) {
            const estatesData = snapshot.val();
            const estatesList = Object.entries(estatesData).map(([id, data]: [string, any]) => ({
              id,
              ...data
            })) as Estate[];
            setEstates(estatesList);
          }
        } catch (error) {
          console.error('Error fetching estates:', error);
        }
      };
      fetchEstates();
    }
  }, [mode, firebaseStatus]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<AuthFormInputs>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      role: (['guard','resident','admin'] as const).includes(defaultRole as 'guard'|'resident'|'admin') ? defaultRole as 'guard'|'resident'|'admin' : undefined,
      agreedToTerms: false,
    },
  });

  const onSubmit = async (data: AuthFormInputs) => {
    // Start performance monitoring
    const startTime = performance.now();
    console.log(`[${new Date().toISOString()}] Starting ${mode} process`);
    
    setLoading(true);
    setError('');
    
    // Check Firebase status before proceeding
    if (firebaseStatus === 'error') {
      console.warn('Attempting login with potentially uninitialized Firebase');
      setError('Authentication service is not ready. Please refresh the page and try again.');
      setLoading(false);
      return;
    }
    
    // For registration, check if terms are agreed to
    if (mode === 'register' && !agreedToTerms) {
      setError('You must agree to the Terms and Privacy Policy to create an account.');
      setLoading(false);
      return;
    }
    
    // Double-check Firebase is actually ready before proceeding
    if (!isFirebaseReady()) {
      console.error('Firebase is not ready but status was not error');
      setError('Authentication service is not initialized. Please refresh the page.');
      setLoading(false);
      return;
    }

    try {
      console.log(`Attempting ${mode} with email: ${data.email}`);
      
      if (mode === 'login') {
        // Validate input before attempting login
        if (!data.email || !data.password) {
          throw new Error('Email and password are required');
        }

        try {
          // Create login timeout to prevent hanging in "Processing..." state
          const loginTimeout = setTimeout(() => {
            console.warn(`[${new Date().toISOString()}] Login process taking longer than expected`);
            setError('Login is taking longer than expected. Please try again.');
            setLoading(false);
          }, 10000); // Reduced to 10 second timeout for better user experience
          
          const authStartTime = performance.now();
          console.log(`[${new Date().toISOString()}] Starting authentication process...`);
          
          // Attempt login with improved error handling
          console.log(`[${new Date().toISOString()}] Calling signIn function...`);
          let user;
          try {
            user = await signIn(data.email, data.password);
          } catch (signInError) {
            clearTimeout(loginTimeout);
            console.error('Error during signIn call:', signInError);
            throw signInError; // Re-throw to be caught by outer catch block
          }
          
          // Verify user was returned
          if (!user) {
            clearTimeout(loginTimeout);
            throw new Error('Authentication failed: No user data returned');
          }
          
          const authDuration = performance.now() - authStartTime;
          console.log(`[${new Date().toISOString()}] signIn completed in ${authDuration.toFixed(2)}ms`);
          
          // Log if authentication was slow
          if (authDuration > 2000) {
            console.warn(`Authentication was slow: ${authDuration.toFixed(2)}ms`);
          }
          
          // Clear the timeout since login succeeded
          clearTimeout(loginTimeout);
          
          console.log('Login successful, user status:', user?.status);
          
          // Check if user status is valid before proceeding
          if (!user) {
            throw new Error('Authentication succeeded but user data is missing');
          }
          
          // Route based on user status
          if (user.status === 'pending') {
            console.log('User is pending approval');
            router.push('/auth/pending');
            return;
          } else if (user.status === 'rejected') {
            console.log('User was rejected');
            router.push('/auth/rejected');
            return;
          } else if (user.status !== 'approved') {
            console.log('Unknown user status:', user.status);
            throw new Error(`Account has an unknown status: ${user.status}`);
          }
          
          // Add a small delay before navigation to ensure auth state is updated
          console.log(`[${new Date().toISOString()}] User is approved, navigating to dashboard...`);
          
          // Log total login process time
          const totalDuration = performance.now() - startTime;
          console.log(`[${new Date().toISOString()}] Total login process completed in ${totalDuration.toFixed(2)}ms`);
          
          setTimeout(() => {
            // Redirect to role-specific dashboard based on user role
            if (user.role === 'guard') {
              console.log('Redirecting to guard dashboard...');
              router.push('/dashboard/guard');
            } else if (user.role === 'admin') {
              console.log('Redirecting to admin dashboard...');
              router.push('/admin/dashboard');
            } else if (user.role === 'estate_admin') {
              console.log('Redirecting to estate admin dashboard...');
              router.push('/estate-admin/dashboard');
            } else if (user.role === 'resident') {
              console.log('Redirecting to resident dashboard...');
              router.push('/dashboard/resident');
            } else {
              console.error('SECURITY ERROR: Unknown user role after login:', user.role);
              console.log('Forcing re-authentication for security');
              router.push('/auth/login');
            }
          }, 500); // Reduced from 800ms to 500ms for faster experience
        } catch (loginError) {
          console.error('Login attempt failed:', loginError);
          
          // Handle Firebase auth errors with user-friendly messages
          if (loginError instanceof Error) {
            const errorMessage = loginError.message || '';
            console.log('Login error message:', errorMessage);
            
            if (errorMessage.includes('NEW_DEVICE_APPROVAL_REQUIRED')) {
              throw new Error('🔐 New device detected! A verification email has been sent to your inbox. Please approve this device before signing in.');
            } else if (errorMessage.includes('auth/user-not-found') || errorMessage.includes('user-not-found')) {
              throw new Error('Account not found. Please check your email or register.');
            } else if (errorMessage.includes('auth/wrong-password') || errorMessage.includes('wrong-password')) {
              throw new Error('Incorrect password. Please try again.');
            } else if (errorMessage.includes('auth/invalid-login-credentials') || errorMessage.includes('invalid-login-credentials')) {
              throw new Error('Invalid email or password. The account may not exist or the password is incorrect.');
            } else if (errorMessage.includes('network') || errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
              throw new Error('Connection timed out. The server may be slow or your internet connection is unstable. Please try again.');
            } else {
              throw loginError; // Re-throw if it's another type of error
            }
          } else {
            throw loginError;
          }
        }
      } else {
        // Registration
        if (!data.displayName) {
          throw new Error('Name is required for registration');
        }
        if (!data.role) {
          throw new Error('Please select a role');
        }
        if (!data.estateId) {
          throw new Error('Please select your estate');
        }

        try {
          await signUp(data.email, data.password, data.displayName, data.role, data.estateId);
          console.log('Registration successful - user needs approval for estate:', data.estateId);
          router.push('/auth/pending');
          return; // Exit early on success
        } catch (signUpError: any) {
          // Filter out misleading permission errors that occur during successful registration
          const errorMsg = signUpError?.message || '';
          if (errorMsg.includes('PERMISSION_DENIED') || errorMsg.includes('Permission denied')) {
            // Account was likely created successfully despite the error
            console.log('Registration completed despite permission warning');
            router.push('/auth/pending');
            return;
          }
          throw signUpError; // Re-throw other errors
        }
      }
    } catch (err) {
      console.error('Authentication error:', err);
      
      // Convert Firebase error messages to user-friendly messages
      let userFriendlyMessage = 'Authentication failed';
      
      if (err instanceof Error) {
        const errorMessage = err.message;
        
        // Registration-specific errors
        if (mode === 'register') {
          if (errorMessage.includes('auth/email-already-in-use') || errorMessage.includes('email-already-in-use')) {
            userFriendlyMessage = 'Email already has been used';
          } else if (errorMessage.includes('auth/weak-password') || errorMessage.includes('weak-password')) {
            userFriendlyMessage = 'Password is too weak. Please use a stronger password';
          } else if (errorMessage.includes('auth/invalid-email') || errorMessage.includes('invalid-email')) {
            userFriendlyMessage = 'Invalid email address format';
          }
        }
        // Login-specific errors are already handled above in the login block
        
        // General errors for both login and registration
        if (errorMessage.includes('auth/network-request-failed') || errorMessage.includes('network-request-failed')) {
          userFriendlyMessage = 'Network connection error. Please check your internet connection';
        } else if (errorMessage.includes('auth/too-many-requests') || errorMessage.includes('too-many-requests')) {
          userFriendlyMessage = 'Too many attempts. Please try again later';
        } else if (errorMessage.includes('auth/user-disabled') || errorMessage.includes('user-disabled')) {
          userFriendlyMessage = 'This account has been disabled';
        } else if (userFriendlyMessage === 'Authentication failed' && !errorMessage.includes('Firebase')) {
          // If we don't have a specific handler but the error is not a raw Firebase message
          userFriendlyMessage = errorMessage;
        }
      }
      
      setError(userFriendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle biometric (Face ID / Fingerprint) login
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
        // Sign in with the custom token from the server
        const { getFirebaseAuth } = await import('@/lib/firebase');
        const { signInWithCustomToken } = await import('firebase/auth');
        const auth = await getFirebaseAuth();
        await signInWithCustomToken(auth, result.customToken);
        // Auth state listener will handle the rest (redirect, etc.)
        router.push('/dashboard');
      } else if (result.sessionRecovery && result.userId) {
        // Firebase Admin not configured — recover from persisted profile
        const cached = localStorage.getItem('musa_user_profile_cache');
        if (cached) {
          const { user } = JSON.parse(cached);
          if (user?.uid === result.userId) {
            // Redirect based on role
            const target = user.role === 'estate_admin' ? '/estate-admin/dashboard'
              : user.role === 'admin' ? '/admin/dashboard'
              : user.role === 'guard' ? '/dashboard/guard'
              : '/dashboard/resident';
            router.push(target);
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
      {firebaseStatus === 'checking' && (
        <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 p-3.5 rounded-2xl mb-5 flex items-center gap-2.5 text-sm">
          <svg className="animate-spin h-4 w-4 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
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

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="password" className="block text-sm font-medium text-gray-300">
              Password
            </label>
            {mode === 'login' && (
              <Link href="/auth/forgot-password" className="text-xs text-blue-400 hover:text-blue-300 font-medium">
                Forgot password?
              </Link>
            )}
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              {...register('password')}
              className="w-full h-12 px-4 pr-11 rounded-xl bg-white/[0.08] border border-white/15 text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
              placeholder="••••••••"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-500 hover:text-gray-300 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-red-400 text-xs mt-1.5">{errors.password.message}</p>
          )}
        </div>

        {mode === 'register' && !defaultRole && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              I am a:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input type="radio" id="resident" value="resident" {...register('role')} className="sr-only" disabled={loading} />
                <label
                  htmlFor="resident"
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    watch('role') === 'resident'
                      ? 'bg-blue-500/15 border-blue-500 text-white'
                      : 'bg-white/[0.05] border-white/10 text-gray-400 hover:border-white/25'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${watch('role') === 'resident' ? 'bg-blue-500/30' : 'bg-white/5'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold">Resident</span>
                </label>
              </div>
              <div>
                <input type="radio" id="guard" value="guard" {...register('role')} className="sr-only" disabled={loading} />
                <label
                  htmlFor="guard"
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    watch('role') === 'guard'
                      ? 'bg-green-500/15 border-green-500 text-white'
                      : 'bg-white/[0.05] border-white/10 text-gray-400 hover:border-white/25'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${watch('role') === 'guard' ? 'bg-green-500/30' : 'bg-white/5'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0117.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold">Guard</span>
                </label>
              </div>
            </div>
            {errors.role && (
              <p className="text-red-400 text-xs mt-1.5">{errors.role.message}</p>
            )}
          </div>
        )}

        {mode === 'register' && (
          <div>
            <label htmlFor="estateId" className="block text-sm font-medium text-gray-300 mb-1.5">
              Select Your Estate <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <select
                id="estateId"
                {...register('estateId', { required: 'Please select your estate' })}
                className="w-full h-12 pl-10 pr-10 rounded-xl bg-white/[0.08] border border-white/15 text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm appearance-none"
                style={{ colorScheme: 'dark', WebkitAppearance: 'none', MozAppearance: 'none' }}
                disabled={loading || estates.length === 0}
              >
                <option value="" className="bg-[#1a2035] text-gray-400">Choose your estate...</option>
                {estates.map(estate => (
                  <option key={estate.id} value={estate.id} className="bg-[#1a2035] text-white">{estate.name}</option>
                ))}
              </select>
              {/* Custom chevron — replaces native iOS arrow */}
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            {errors.estateId && (
              <p className="text-red-400 text-xs mt-1.5">{errors.estateId.message}</p>
            )}
            {estates.length === 0 && (
              <p className="text-amber-400/80 text-xs mt-1.5">Loading estates...</p>
            )}
          </div>
        )}

        {mode === 'register' && (
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => setAgreedToTerms(!agreedToTerms)}
              className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                agreedToTerms
                  ? 'bg-blue-500 border-blue-500'
                  : 'bg-white/[0.05] border-white/20 hover:border-blue-500/50'
              }`}
            >
              {agreedToTerms && (
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
            <p
              className="text-xs text-gray-400 cursor-pointer select-none leading-relaxed"
              onClick={() => setAgreedToTerms(!agreedToTerms)}
            >
              I agree to the{' '}
              <Link href="/terms" target="_blank" className="text-blue-400 hover:underline" onClick={(e) => e.stopPropagation()}>
                Terms and Conditions
              </Link>
              {' '}and Privacy Policy
            </p>
          </div>
        )}

        <button
          type="submit"
          className="w-full h-12 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 shadow-lg shadow-blue-500/25 transition-all duration-200 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          disabled={loading}
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {mode === 'login' ? 'Signing in...' : 'Creating account...'}
            </>
          ) : mode === 'login' ? (
            'Sign In'
          ) : (
            'Create Account'
          )}
        </button>

        {/* Biometric Login Button */}
        {mode === 'login' && biometricReady && (
          <div className="mt-3">
            <div className="relative flex items-center justify-center my-4">
              <div className="border-t border-white/10 w-full"></div>
              <span className="px-3 text-xs text-gray-500 bg-transparent absolute">or</span>
            </div>
            <button
              type="button"
              onClick={handleBiometricLogin}
              disabled={biometricLoading || loading}
              className="w-full h-12 rounded-xl font-medium border border-white/15 bg-white/[0.06] text-gray-300 hover:border-blue-500/50 hover:text-white transition-all flex items-center justify-center gap-2.5 text-sm"
            >
              {biometricLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  Verifying...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                  </svg>
                  Sign in with Face ID / Fingerprint
                </>
              )}
            </button>
          </div>
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
