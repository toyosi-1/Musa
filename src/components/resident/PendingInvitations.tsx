"use client";

import { useState, useEffect } from 'react';
import { User, HouseholdInvite, Household } from '@/types/user';
import { getPendingInvitationsByEmail, acceptHouseholdInvite, getHousehold } from '@/services/householdService';
import { getUserProfile } from '@/services/userService';

interface PendingInvitationsProps {
  user: User;
  onInvitationAccepted: () => void;
}

export default function PendingInvitations({ user, onInvitationAccepted }: PendingInvitationsProps) {
  const [pendingInvites, setPendingInvites] = useState<HouseholdInvite[]>([]);
  const [inviteDetails, setInviteDetails] = useState<Record<string, { householdName: string; inviterName: string }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [processingInviteId, setProcessingInviteId] = useState<string | null>(null);

  // Fetch pending invitations when component mounts
  useEffect(() => {
    const fetchInvitations = async () => {
      if (!user || !user.email) return;
      
      try {
        setIsLoading(true);
        setError('');
        
        const invites = await getPendingInvitationsByEmail(user.email);
        console.log('Fetched pending invitations:', invites);
        setPendingInvites(invites);
        
        // Fetch details for each invitation
        const details: Record<string, { householdName: string; inviterName: string }> = {};
        
        for (const invite of invites) {
          details[invite.id] = { householdName: 'Loading...', inviterName: 'Loading...' };
          
          // Fetch household name
          try {
            const household = await getHousehold(invite.householdId);
            if (household) {
              details[invite.id].householdName = household.name;
            }
          } catch (e) {
            console.error(`Error fetching household for invitation ${invite.id}:`, e);
          }
          
          // Fetch inviter name
          try {
            const inviter = await getUserProfile(invite.invitedBy);
            if (inviter) {
              details[invite.id].inviterName = inviter.displayName || inviter.email;
            }
          } catch (e) {
            console.error(`Error fetching inviter for invitation ${invite.id}:`, e);
          }
        }
        
        setInviteDetails(details);
      } catch (err) {
        console.error('Error fetching invitations:', err);
        setError('Failed to load invitations. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchInvitations();
  }, [user]);

  // Handle accepting an invitation
  const handleAcceptInvite = async (inviteId: string) => {
    if (!user || !user.email) return;
    
    try {
      setProcessingInviteId(inviteId);
      setError('');
      
      // Get household name for success message
      const invite = pendingInvites.find(inv => inv.id === inviteId);
      if (!invite) {
        throw new Error('Invitation not found');
      }
      
      const household = await getHousehold(invite.householdId);
      const householdName = household ? household.name : 'Unknown Household';
      
      // Accept the invitation
      await acceptHouseholdInvite(inviteId, user.uid, user.email);
      
      // Update UI and show success message
      setPendingInvites(prevInvites => prevInvites.filter(inv => inv.id !== inviteId));
      setSuccess(`You've successfully joined "${householdName}"`);
      
      // Clear success message after a few seconds
      setTimeout(() => setSuccess(''), 5000);
      
      // Notify parent component that an invitation was accepted
      onInvitationAccepted();
    } catch (err) {
      console.error('Error accepting invitation:', err);
      setError(err instanceof Error ? err.message : 'Failed to accept invitation.');
    } finally {
      setProcessingInviteId(null);
    }
  };

  // If there are no pending invitations, don't render anything
  if (!isLoading && pendingInvites.length === 0 && !error && !success) {
    return null;
  }

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-3">Pending Invitations</h3>
      
      {isLoading ? (
        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <div className="animate-pulse space-y-2">
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      ) : (
        <>
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg">
              {success}
            </div>
          )}
          
          {pendingInvites.length > 0 ? (
            <div className="space-y-3">
              {pendingInvites.map(invite => (
                <div 
                  key={invite.id} 
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-sm"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Invited by: {inviteDetails[invite.id]?.inviterName || 'Unknown User'}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Household: {inviteDetails[invite.id]?.householdName || 'Unknown Household'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Expires: {new Date(invite.expiresAt).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleAcceptInvite(invite.id)}
                      disabled={processingInviteId === invite.id}
                      className="btn-primary px-4 py-2 text-sm"
                    >
                      {processingInviteId === invite.id ? 'Accepting...' : 'Accept'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 dark:text-gray-400">
              No pending invitations.
            </p>
          )}
        </>
      )}
    </div>
  );
}
