"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/user';
import { isFirebaseReady, waitForFirebase } from '@/lib/firebase';

// Form validation schema
const authSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().optional(),
  role: z.enum(['guard', 'resident', 'admin']).optional(),
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
  const router = useRouter();
  const { signIn, signUp, initError } = useAuth();
  
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

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<AuthFormInputs>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      role: defaultRole, // Temporarily allow admin registration for testing
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
            } else {
              console.log('Redirecting to resident dashboard...');
              router.push('/dashboard/resident');
            }
          }, 500); // Reduced from 800ms to 500ms for faster experience
        } catch (loginError) {
          console.error('Login attempt failed:', loginError);
          
          // Handle Firebase auth errors with user-friendly messages
          if (loginError instanceof Error) {
            const errorMessage = loginError.message || '';
            console.log('Login error message:', errorMessage);
            
            if (errorMessage.includes('auth/user-not-found') || errorMessage.includes('user-not-found')) {
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

        await signUp(data.email, data.password, data.displayName, data.role);
        console.log('Registration successful - user needs approval');
        router.push('/auth/pending');
      }
    } catch (err) {
      console.error('Authentication error:', err);
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {firebaseStatus === 'checking' && (
        <div className="bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-500 text-yellow-700 dark:text-yellow-400 p-4 rounded-xl mb-6 flex items-start opacity-80 transition-opacity">
          <svg xmlns="http://www.w3.org/2000/svg" className="animate-spin h-5 w-5 mr-3 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10" strokeWidth="4" stroke="none"></circle>
            <path d="M12 2a10 10 0 0 1 10 10" strokeWidth="4"></path>
          </svg>
          <span>Loading...</span>
        </div>
      )}
      
      {(error || initError) && (
        <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-400 p-4 rounded-xl mb-6 flex items-start">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>{error || initError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {mode === 'register' && (
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Full Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                id="displayName"
                type="text"
                {...register('displayName')}
                className="input w-full pl-10 input-with-icon"
                placeholder="Your full name"
                disabled={loading}
              />
            </div>
            {errors.displayName && (
              <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.displayName.message}</p>
            )}
          </div>
        )}

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
              {...register('email')}
              className="input w-full pl-10 input-with-icon"
              placeholder="you@example.com"
              disabled={loading}
            />
          </div>
          {errors.email && (
            <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.email.message}</p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Password
            </label>
            {mode === 'login' && (
              <a href="#" className="text-sm text-primary hover:underline">
                Forgot password?
              </a>
            )}
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              id="password"
              type="password"
              {...register('password')}
              className="input w-full pl-10 input-with-icon"
              placeholder="••••••••"
              disabled={loading}
            />
          </div>
          {errors.password && (
            <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.password.message}</p>
          )}
        </div>

        {mode === 'register' && !defaultRole && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              I am a:
            </label>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <input
                  type="radio"
                  id="resident"
                  value="resident"
                  {...register('role')}
                  className="sr-only"
                  disabled={loading}
                />
                <label
                  htmlFor="resident"
                  className={`block border-2 rounded-xl p-4 text-center cursor-pointer transition-colors ${
                    errors.role ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } ${watch('role') === 'resident' ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 dark:border-blue-400' : ''}`}
                >
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500 dark:text-blue-300" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                    </svg>
                  </div>
                  <span className="font-medium">Resident</span>
                </label>
              </div>
              <div>
                <input
                  type="radio"
                  id="guard"
                  value="guard"
                  {...register('role')}
                  className="sr-only"
                  disabled={loading}
                />
                <label
                  htmlFor="guard"
                  className={`block border-2 rounded-xl p-4 text-center cursor-pointer transition-colors ${
                    errors.role ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } ${watch('role') === 'guard' ? 'bg-green-50 dark:bg-green-900/30 border-green-500 dark:border-green-400' : ''}`}
                >
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500 dark:text-green-300" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="font-medium">Guard</span>
                </label>
              </div>
            </div>
            {errors.role && (
              <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.role.message}</p>
            )}
          </div>
        )}

        {mode === 'register' && (
          <div className="flex items-start space-x-2">
            <div 
              className={`w-4 h-4 mt-0.5 border-2 rounded cursor-pointer flex items-center justify-center transition-colors ${
                agreedToTerms 
                  ? 'bg-primary border-primary' 
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-primary'
              }`}
              onClick={() => setAgreedToTerms(!agreedToTerms)}
            >
              {agreedToTerms && (
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <label 
              className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer select-none flex-1"
              onClick={() => setAgreedToTerms(!agreedToTerms)}
            >
              I agree to the{' '}
              <Link href="/terms" target="_blank" className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                Terms and Conditions
              </Link>
              {' '}and Privacy Policy
            </label>
          </div>
        )}

        <button
          type="submit"
          className={`w-full py-3 px-4 rounded-xl font-medium shadow-button flex items-center justify-center ${mode === 'login' ? 'bg-primary hover:bg-blue-600' : 'bg-musa-red hover:bg-red-500'} text-white transition-colors`}
          disabled={loading}
        >
          {loading ? (
            <div className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </div>
          ) : mode === 'login' ? (
            'Sign In'
          ) : (
            'Create Account'
          )}
        </button>
      </form>

      {mode === 'register' && (
        <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            By registering, you understand that new accounts require admin approval before access is granted.
          </p>
        </div>
      )}
    </div>
  );
}
