"use client";

import { useState, useEffect } from 'react';
import { getFirebaseDatabase } from '@/lib/firebase';
import { ref, get } from 'firebase/database';
import { User, HouseholdInvite } from '@/types/user';

interface InvitationDebugProps {
  user: User;
}

export default function InvitationDebug({ user }: InvitationDebugProps) {
  const [allInvitations, setAllInvitations] = useState<any[]>([]);
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const debugInvitations = async () => {
      try {
        const db = await getFirebaseDatabase();
        
        // Get all invitations from database
        const invitesRef = ref(db, 'householdInvites');
        const snapshot = await get(invitesRef);
        
        if (snapshot.exists()) {
          const invites: any[] = [];
          snapshot.forEach((childSnapshot) => {
            const invite = childSnapshot.val();
            invites.push({
              id: childSnapshot.key,
              ...invite,
              emailMatch: invite.email?.toLowerCase() === user.email?.toLowerCase(),
              isExpired: invite.expiresAt < Date.now(),
              timeUntilExpiry: invite.expiresAt - Date.now()
            });
          });
          setAllInvitations(invites);
        }
        
        setUserEmail(user.email || 'No email found');
      } catch (error) {
        console.error('Debug error:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      debugInvitations();
    }
  }, [user]);

  if (loading) {
    return <div className="p-4 bg-yellow-100 rounded-lg">Loading debug info...</div>;
  }

  return (
    <div className="p-4 bg-yellow-100 dark:bg-yellow-900 rounded-lg mb-4">
      <h3 className="font-bold text-lg mb-2">🐛 Invitation Debug Info</h3>
      
      <div className="space-y-2 text-sm">
        <p><strong>User Email:</strong> {userEmail}</p>
        <p><strong>User ID:</strong> {user.uid}</p>
        <p><strong>Total Invitations in Database:</strong> {allInvitations.length}</p>
        
        {allInvitations.length > 0 && (
          <div className="mt-4">
            <h4 className="font-semibold mb-2">All Invitations:</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {allInvitations.map((invite, index) => (
                <div key={invite.id} className="p-2 bg-white dark:bg-gray-800 rounded border text-xs">
                  <p><strong>ID:</strong> {invite.id}</p>
                  <p><strong>Email:</strong> {invite.email}</p>
                  <p><strong>Status:</strong> {invite.status}</p>
                  <p><strong>Invited By:</strong> {invite.invitedBy}</p>
                  <p><strong>Household ID:</strong> {invite.householdId}</p>
                  <p><strong>Created:</strong> {new Date(invite.createdAt).toLocaleString()}</p>
                  <p><strong>Expires:</strong> {new Date(invite.expiresAt).toLocaleString()}</p>
                  <p><strong>Email Match:</strong> {invite.emailMatch ? '✅ Yes' : '❌ No'}</p>
                  <p><strong>Expired:</strong> {invite.isExpired ? '❌ Yes' : '✅ No'}</p>
                  <p><strong>Time Until Expiry:</strong> {Math.round(invite.timeUntilExpiry / (1000 * 60 * 60))} hours</p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="mt-4 p-2 bg-blue-100 dark:bg-blue-900 rounded">
          <p className="text-xs">
            <strong>Expected Behavior:</strong> Invitations should show if:
            <br />• Email matches (case-insensitive)
            <br />• Status is 'pending'
            <br />• Not expired (expiresAt &gt; current time)
          </p>
        </div>
      </div>
    </div>
  );
}
