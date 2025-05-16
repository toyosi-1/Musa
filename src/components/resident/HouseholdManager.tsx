"use client";

import { useState } from 'react';
import { User, Household } from '@/types/user';
import { createHouseholdInvite, getHouseholdMembers } from '@/services/householdService';

interface HouseholdManagerProps {
  user: User;
  household: Household | null;
  onCreateHousehold: (name: string) => Promise<Household | null>;
}

export default function HouseholdManager({ user, household, onCreateHousehold }: HouseholdManagerProps) {
  const [householdName, setHouseholdName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [members, setMembers] = useState<string[]>([]);
  const [showMembers, setShowMembers] = useState(false);

  // Create a new household
  const handleCreateHousehold = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!householdName.trim()) {
      setError('Please enter a household name');
      return;
    }
    
    setIsLoading(true);
    setError('');
    console.log('Creating household with name:', householdName, 'for user:', user);
    
    try {
      // Calling the parent component's onCreateHousehold function
      console.log('Attempting to create household...');
      const result = await onCreateHousehold(householdName);
      console.log('Household creation result:', result);
      
      if (result) {
        setSuccess('Household created successfully!');
        setHouseholdName('');
        
        // Reset after a few seconds
        setTimeout(() => {
          setSuccess('');
        }, 3000);
      } else {
        setError('Could not create household. Check console for details.');
      }
    } catch (err) {
      console.error('Error creating household:', err);
      setError(`Failed to create household: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Invite a member to the household
  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!household) {
      console.error('No household found for invitation');
      setError('No household to invite to');
      return;
    }
    
    if (!inviteEmail.trim()) {
      setError('Please enter an email address');
      return;
    }
    
    setIsLoading(true);
    setError('');
    console.log('Inviting member to household:', { 
      householdId: household.id, 
      userId: user.uid, 
      email: inviteEmail 
    });
    
    try {
      console.log('Calling createHouseholdInvite...');
      const invite = await createHouseholdInvite(household.id, user.uid, inviteEmail);
      console.log('Invitation created successfully:', invite);
      
      setSuccess(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      
      // Reset after a few seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      console.error('Error inviting member:', err);
      // Display more specific error message
      if (err instanceof Error) {
        setError(`Failed to send invitation: ${err.message}`);
      } else {
        setError('Failed to send invitation: Unknown error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Load household members
  const loadMembers = async () => {
    if (!household) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const memberIds = await getHouseholdMembers(household.id);
      setMembers(memberIds);
      setShowMembers(true);
    } catch (err) {
      console.error('Error loading members:', err);
      setError('Failed to load household members');
    } finally {
      setIsLoading(false);
    }
  };

  if (!household) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">Create a Household</h2>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}
        
        <form onSubmit={handleCreateHousehold} className="space-y-4">
          <div>
            <label htmlFor="householdName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Household Name
            </label>
            <input
              id="householdName"
              type="text"
              value={householdName}
              onChange={(e) => setHouseholdName(e.target.value)}
              placeholder="e.g., Smith Family"
              className="input w-full"
              disabled={isLoading}
            />
          </div>
          
          <div className="pt-2">
            <button
              type="submit"
              className="btn-primary w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Creating...' : 'Create Household'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Household Details</h2>
          <span className={`px-2 py-1 text-xs rounded-full ${
            user.isHouseholdHead 
              ? 'bg-primary/10 text-primary' 
              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
          }`}>
            {user.isHouseholdHead ? 'Head' : 'Member'}
          </span>
        </div>
        
        <div className="space-y-4">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Name:</span>
            <p className="font-medium">{household.name}</p>
          </div>
          
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Created:</span>
            <p className="font-medium">{new Date(household.createdAt).toLocaleDateString()}</p>
          </div>
          
          <div>
            <button
              onClick={loadMembers}
              className="text-primary hover:text-primary-dark text-sm flex items-center"
              disabled={isLoading}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
              </svg>
              {showMembers ? 'Hide Members' : 'Show Members'}
            </button>
            
            {showMembers && (
              <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                <p className="text-sm font-medium mb-1">Member IDs:</p>
                <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                  {members.map(memberId => (
                    <li key={memberId} className="truncate">
                      {memberId === user.uid ? `${memberId} (You)` : memberId}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {user.isHouseholdHead && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Invite New Member</h2>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              {success}
            </div>
          )}
          
          <form onSubmit={handleInviteMember} className="space-y-4">
            <div>
              <label htmlFor="inviteEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email Address
              </label>
              <input
                id="inviteEmail"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="member@example.com"
                className="input w-full"
                disabled={isLoading}
              />
            </div>
            
            <div className="pt-2">
              <button
                type="submit"
                className="btn-primary w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
