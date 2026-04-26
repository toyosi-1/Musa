"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { acceptHouseholdInvite, rejectHouseholdInvite } from '@/services/householdService';
import { HouseholdInvite, Household } from '@/types/user';
import { ref, get } from 'firebase/database';
import { getFirebaseDatabase } from '@/lib/firebase';
import Link from 'next/link';
import PageLoading from '@/components/ui/PageLoading';
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
  const [rejecting, setRejecting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [rejected, setRejected] = useState(false);

  const inviteId = params?.inviteId as string;

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

  const handleRejectInvitation = async () => {
    if (!currentUser || !invite) return;

    // Check if user's email matches the invitation
    if (currentUser.email.toLowerCase() !== invite.email.toLowerCase()) {
      setError('This invitation is not for your email address. Please sign in with the correct account.');
      return;
    }

    setRejecting(true);
    setError('');

    try {
      await rejectHouseholdInvite(invite.id, currentUser.uid, currentUser.email);
      setRejected(true);
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (error) {
      console.error('Error rejecting invitation:', error);
      setError(error instanceof Error ? error.message : 'Failed to reject invitation');
    } finally {
      setRejecting(false);
    }
  };

  if (loading || authLoading) {
    return (
      <PageLoading
        accent="blue"
        label="Loading invitation..."
        icon={
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        }
      />
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-8 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
              <svg className="h-7 w-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-base font-bold text-gray-900 dark:text-white mb-2">Invitation Error</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{error}</p>
            <Link 
              href="/auth/login"
              className="inline-flex items-center justify-center w-full px-5 py-3 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl shadow-md shadow-blue-500/20 transition-all"
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-8 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
              <svg className="h-7 w-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-base font-bold text-gray-900 dark:text-white mb-2">Welcome to the Household!</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              You have successfully joined <strong className="text-gray-700 dark:text-gray-200">{household?.name}</strong>. 
              Redirecting you to your dashboard...
            </p>
            <div className="w-5 h-5 mx-auto border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (rejected) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-8 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <svg className="h-7 w-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-base font-bold text-gray-900 dark:text-white mb-2">Invitation Declined</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              You have declined the invitation to join <strong className="text-gray-700 dark:text-gray-200">{household?.name}</strong>. 
              Redirecting you to your dashboard...
            </p>
            <div className="w-5 h-5 mx-auto border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-8 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <svg className="h-7 w-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 className="text-base font-bold text-gray-900 dark:text-white mb-2">Sign In Required</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Please sign in to accept this household invitation.
            </p>
            <Link 
              href={`/auth/login?redirect=/invite/${inviteId}`}
              className="inline-flex items-center justify-center w-full px-5 py-3 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl shadow-md shadow-blue-500/20 transition-all"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
              <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <h1 className="text-base font-bold text-gray-900 dark:text-white mb-1">
              Household Invitation
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              You&apos;ve been invited to join a household
            </p>
          </div>

          {invite && household && (
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
                <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  Invitation Details
                </h3>
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Household</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {household.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Address</span>
                    <span className="font-medium text-gray-900 dark:text-white text-right max-w-[60%]">
                      {household.address}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Invited by</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {inviterName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Expires</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {new Date(invite.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/15 border border-blue-100 dark:border-blue-800/40 rounded-xl p-3.5">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  <strong>Note:</strong> This invitation is for {invite.email}. 
                  Make sure you&apos;re signed in with the correct account.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleAcceptInvitation}
                  disabled={accepting || rejecting}
                  className="flex-1 px-4 py-3 text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 rounded-xl shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {accepting ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Accepting...</span>
                    </div>
                  ) : (
                    'Accept Invitation'
                  )}
                </button>
                <button
                  onClick={handleRejectInvitation}
                  disabled={accepting || rejecting}
                  className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {rejecting ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                      <span>Declining...</span>
                    </div>
                  ) : (
                    'Decline'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
