"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { acceptHouseholdInvite } from '@/services/householdService';
import { HouseholdInvite, Household } from '@/types/user';
import { ref, get } from 'firebase/database';
import { getFirebaseDatabase } from '@/lib/firebase';
import Link from 'next/link';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const { currentUser, loading: authLoading } = useAuth();
  const [invite, setInvite] = useState<HouseholdInvite | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [inviterName, setInviterName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const inviteId = params.inviteId as string;

  useEffect(() => {
    const loadInvitation = async () => {
      try {
        if (!inviteId) {
          setError('Invalid invitation link');
          return;
        }

        const db = await getFirebaseDatabase();
        
        // Get invitation details
        const inviteRef = ref(db, `householdInvites/${inviteId}`);
        const inviteSnapshot = await get(inviteRef);
        
        if (!inviteSnapshot.exists()) {
          setError('Invitation not found or has expired');
          return;
        }

        const inviteData = inviteSnapshot.val() as HouseholdInvite;
        
        // Check if invitation is still valid
        if (inviteData.status !== 'pending') {
          setError(`This invitation has already been ${inviteData.status}`);
          return;
        }

        if (inviteData.expiresAt < Date.now()) {
          setError('This invitation has expired');
          return;
        }

        setInvite(inviteData);

        // Get household details
        const householdRef = ref(db, `households/${inviteData.householdId}`);
        const householdSnapshot = await get(householdRef);
        
        if (householdSnapshot.exists()) {
          setHousehold(householdSnapshot.val() as Household);
        }

        // Get inviter's name
        const inviterRef = ref(db, `users/${inviteData.invitedBy}`);
        const inviterSnapshot = await get(inviterRef);
        
        if (inviterSnapshot.exists()) {
          setInviterName(inviterSnapshot.val().displayName || 'Someone');
        }

      } catch (error) {
        console.error('Error loading invitation:', error);
        setError('Failed to load invitation details');
      } finally {
        setLoading(false);
      }
    };

    loadInvitation();
  }, [inviteId]);

  const handleAcceptInvitation = async () => {
    if (!currentUser || !invite) return;

    // Check if user's email matches the invitation
    if (currentUser.email.toLowerCase() !== invite.email.toLowerCase()) {
      setError('This invitation is not for your email address. Please sign in with the correct account.');
      return;
    }

    setAccepting(true);
    setError('');

    try {
      await acceptHouseholdInvite(invite.id, currentUser.uid, currentUser.email);
      setSuccess(true);
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push('/dashboard/resident');
      }, 2000);
    } catch (error) {
      console.error('Error accepting invitation:', error);
      setError(error instanceof Error ? error.message : 'Failed to accept invitation');
    } finally {
      setAccepting(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-musa-bg dark:bg-gray-900">
        <LoadingSpinner size="lg" color="primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-musa-bg dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
              Invitation Error
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {error}
            </p>
            <Link 
              href="/auth/login"
              className="btn-primary inline-block"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-musa-bg dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
              Welcome to the Household!
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              You have successfully joined <strong>{household?.name}</strong>. 
              Redirecting you to your dashboard...
            </p>
            <div className="flex justify-center">
              <LoadingSpinner size="sm" color="primary" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-musa-bg dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
              Sign In Required
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Please sign in to accept this household invitation.
            </p>
            <Link 
              href={`/auth/login?redirect=/invite/${inviteId}`}
              className="btn-primary inline-block"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-musa-bg dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
              Household Invitation
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              You've been invited to join a household
            </p>
          </div>

          {invite && household && (
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 dark:text-white mb-2">
                  Invitation Details
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Household:</span>
                    <span className="ml-2 font-medium text-gray-800 dark:text-white">
                      {household.name}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Address:</span>
                    <span className="ml-2 font-medium text-gray-800 dark:text-white">
                      {household.address}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Invited by:</span>
                    <span className="ml-2 font-medium text-gray-800 dark:text-white">
                      {inviterName}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Expires:</span>
                    <span className="ml-2 font-medium text-gray-800 dark:text-white">
                      {new Date(invite.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Note:</strong> This invitation is for {invite.email}. 
                  Make sure you're signed in with the correct account.
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleAcceptInvitation}
                  disabled={accepting}
                  className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {accepting ? (
                    <div className="flex items-center justify-center">
                      <LoadingSpinner size="sm" color="white" />
                      <span className="ml-2">Accepting...</span>
                    </div>
                  ) : (
                    'Accept Invitation'
                  )}
                </button>
                <Link
                  href="/dashboard"
                  className="flex-1 btn-outline text-center"
                >
                  Decline
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
