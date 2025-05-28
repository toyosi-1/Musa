"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/user';

// Form validation schema
const authSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().optional(),
  role: z.enum(['guard', 'resident', 'admin']).optional(),
});

type AuthFormInputs = z.infer<typeof authSchema>;

interface AuthFormProps {
  mode: 'login' | 'register';
  defaultRole?: UserRole;
}

export default function AuthForm({ mode, defaultRole }: AuthFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { signIn, signUp } = useAuth();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<AuthFormInputs>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      role: defaultRole === 'admin' ? undefined : defaultRole, // Don't allow admin registration through form
    },
  });

  const onSubmit = async (data: AuthFormInputs) => {
    setLoading(true);
    setError('');

    try {
      console.log(`Attempting ${mode} with email: ${data.email}`);
      
      if (mode === 'login') {
        // Validate input before attempting login
        if (!data.email || !data.password) {
          throw new Error('Email and password are required');
        }

        try {
          // First attempt without timeout to check for immediate errors
          const user = await signIn(data.email, data.password);
          console.log('Login successful, user:', user);
          
          // Add a small delay before navigation to ensure auth state is updated
          setTimeout(() => {
            router.push('/dashboard');
          }, 800);
        } catch (loginError) {
          console.error('Initial login attempt failed:', loginError);
          // Handle Firebase auth errors with user-friendly messages
          if (loginError instanceof Error) {
            const errorMessage = loginError.message || '';
            if (errorMessage.includes('auth/user-not-found') || errorMessage.includes('user-not-found')) {
              throw new Error('Account not found. Please check your email or register.');
            } else if (errorMessage.includes('auth/wrong-password') || errorMessage.includes('wrong-password')) {
              throw new Error('Incorrect password. Please try again.');
            } else if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
              throw new Error('Network error. Please check your connection and try again.');
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
        console.log('Registration successful');
        router.push('/dashboard');
      }
    } catch (err) {
      console.error('Authentication error:', err);
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-center mb-6">
        {mode === 'login' ? 'Sign In to Musa' : 'Create Your Musa Account'}
      </h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {mode === 'register' && (
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Full Name
            </label>
            <input
              id="displayName"
              type="text"
              {...register('displayName')}
              className="input w-full"
              placeholder="Your full name"
              disabled={loading}
            />
            {errors.displayName && (
              <p className="text-red-600 text-sm mt-1">{errors.displayName.message}</p>
            )}
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            {...register('email')}
            className="input w-full"
            placeholder="you@example.com"
            disabled={loading}
          />
          {errors.email && (
            <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            {...register('password')}
            className="input w-full"
            placeholder="********"
            disabled={loading}
          />
          {errors.password && (
            <p className="text-red-600 text-sm mt-1">{errors.password.message}</p>
          )}
        </div>

        {mode === 'register' && !defaultRole && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                  className={`block border rounded-md p-3 text-center cursor-pointer transition-colors ${
                    errors.role ? 'border-red-500' : 'border-gray-300'
                  } ${watch('role') === 'resident' ? 'bg-primary-50 border-primary-500 ring-2 ring-primary-500' : ''}`}
                >
                  <span className="block text-lg mb-1">👪</span>
                  Resident
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
                  className={`block border rounded-md p-3 text-center cursor-pointer transition-colors ${
                    errors.role ? 'border-red-500' : 'border-gray-300'
                  } ${watch('role') === 'guard' ? 'bg-primary-50 border-primary-500 ring-2 ring-primary-500' : ''}`}
                >
                  <span className="block text-lg mb-1">👮</span>
                  Guard
                </label>
              </div>
            </div>
            {errors.role && (
              <p className="text-red-600 text-sm mt-1">{errors.role.message}</p>
            )}
          </div>
        )}

        <button
          type="submit"
          className="btn-primary w-full"
          disabled={loading}
        >
          {loading ? (
            <span>Loading...</span>
          ) : mode === 'login' ? (
            'Sign In'
          ) : (
            'Create Account'
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        {mode === 'login' ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Don&apos;t have an account?{' '}
            <Link href="/auth/register" className="text-primary hover:underline">
              Register
            </Link>
          </p>
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-primary hover:underline">
              Sign In
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
