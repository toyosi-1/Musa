"use client";

import { useState, useEffect } from 'react';
import { User, Household } from '@/types/user';
import { createHouseholdInvite, getHouseholdMembers, updateHouseholdAddress, removeHouseholdMember } from '@/services/householdService';
import { ref, get } from 'firebase/database';
import { getFirebaseDatabase } from '@/lib/firebase';

interface HouseholdManagerProps {
  user: User;
  household: Household | null;
  onCreateHousehold: (name: string) => Promise<Household | null>;
  refreshHousehold?: () => Promise<void>;
}

function HouseholdManager({ user, household, onCreateHousehold, refreshHousehold }: HouseholdManagerProps) {
  const [householdName, setHouseholdName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showMembers, setShowMembers] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [db, setDb] = useState<any>(null);

  // Address form state
  const [address, setAddress] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');

  // Initialize Firebase database
  useEffect(() => {
    const initDb = async () => {
      const database = await getFirebaseDatabase();
      setDb(database);
    };
    initDb();
  }, []);

  // Load household members
  useEffect(() => {
    if (household?.id && db) {
      const loadMembers = async () => {
        try {
          const membersList = await getHouseholdMembers(household.id, db);
          setMembers(membersList);
        } catch (err) {
          console.error('Error loading household members:', err);
          setError('Failed to load household members');
        }
      };
      loadMembers();
    }
  }, [household, db]);

  const handleCreateHousehold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!householdName.trim()) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      await onCreateHousehold(householdName);
      setSuccess('Household created successfully!');
      setHouseholdName('');
    } catch (err) {
      console.error('Error creating household:', err);
      setError('Failed to create household. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !household?.id) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      await createHouseholdInvite(household.id, inviteEmail, db);
      setSuccess('Invitation sent successfully!');
      setInviteEmail('');
    } catch (err) {
      console.error('Error sending invitation:', err);
      setError('Failed to send invitation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!household?.id) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      await updateHouseholdAddress(
        household.id,
        {
          address,
          addressLine2,
          city,
          state,
          postalCode,
          country
        },
        db
      );
      
      setSuccess('Address updated successfully!');
      setShowAddressForm(false);
      if (refreshHousehold) await refreshHousehold();
    } catch (err) {
      console.error('Error updating address:', err);
      setError('Failed to update address. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!household?.id || !confirm('Are you sure you want to remove this member?')) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      await removeHouseholdMember(household.id, memberId, db);
      setMembers(members.filter(m => m.uid !== memberId));
      setSuccess('Member removed successfully!');
    } catch (err) {
      console.error('Error removing member:', err);
      setError('Failed to remove member. Please try again.');
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
              className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
              required
            />
          </div>
          
          <button
            type="submit"
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            disabled={isLoading}
          >
            {isLoading ? 'Creating...' : 'Create Household'}
          </button>
        </form>
      </div>
    );
  }

  return (
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
        
        {/* Address Section */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Address</span>
            <button 
              onClick={() => setShowAddressForm(!showAddressForm)}
              className="text-xs font-medium text-primary hover:text-primary-dark transition"
            >
              {showAddressForm ? 'Cancel' : household.address ? 'Edit' : 'Add'}
            </button>
          </div>
          
          {showAddressForm ? (
            <form onSubmit={handleUpdateAddress} className="mt-2 space-y-3">
              <div>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street address"
                  className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>
              <div>
                <input
                  type="text"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  placeholder="Apt, suite, etc. (optional)"
                  className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City"
                    className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="State/Province"
                    className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="ZIP/Postal code"
                    className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="Country"
                    className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddressForm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                >
                  {isLoading ? 'Saving...' : 'Save Address'}
                </button>
              </div>
            </form>
          ) : household.address ? (
            <div className="text-sm text-gray-700 dark:text-gray-300">
              <p>{household.address}</p>
              {household.addressLine2 && <p>{household.addressLine2}</p>}
              <p>
                {[household.city, household.state, household.postalCode]
                  .filter(Boolean)
                  .join(', ')}
              </p>
              {household.country && <p>{household.country}</p>}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">No address saved</p>
          )}
        </div>
        
        {/* Members Section */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Household Members
            </span>
            <button 
              onClick={() => setShowMembers(!showMembers)}
              className="text-xs font-medium text-primary hover:text-primary-dark transition"
            >
              {showMembers ? 'Hide' : 'Show'}
            </button>
          </div>
          
          {showMembers && (
            <div className="mt-2">
              {members.length > 0 ? (
                <div className="space-y-3">
                  {members.map((member) => {
                    // Get initials for avatar
                    const getInitials = (name: string) => {
                      return name
                        .split(' ')
                        .map(part => part[0])
                        .join('')
                        .toUpperCase();
                    };
                    
                    const memberName = member.displayName || member.email.split('@')[0];
                    const initials = member.displayName ? getInitials(member.displayName) : member.email[0].toUpperCase();
                    const isCurrentUser = member.uid === user.uid;
                    
                    return (
                      <div 
                        key={member.uid} 
                        className={`flex items-center justify-between p-3 rounded-lg border ${isCurrentUser ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary dark:text-primary-300 font-medium">
                            {initials}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <p className="font-medium text-gray-900 dark:text-white">
                                {memberName}
                                {isCurrentUser && <span className="ml-2 text-xs px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 rounded-full">You</span>}
                              </p>
                              {member.isHouseholdHead && (
                                <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 rounded-full">
                                  Head of Household
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{member.email}</p>
                            <div className="mt-1 flex items-center text-xs text-gray-500 dark:text-gray-400">
                              <span>Member since: {new Date(member.joinedAt || household?.createdAt || Date.now()).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        {user.isHouseholdHead && !isCurrentUser && (
                          <button 
                            className="px-3 py-1.5 text-sm bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 rounded-md transition-colors flex items-center space-x-1"
                            onClick={() => handleRemoveMember(member.uid)}
                            disabled={isLoading}
                            title="Remove from household"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span>Remove</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No members found</p>
              )}
            </div>
          )}
        </div>
        
        {/* Invite Member Section */}
        {user.isHouseholdHead && (
          <div className="mt-6">
            <h3 className="text-md font-medium mb-3">Invite New Member</h3>
            <form onSubmit={handleInviteMember} className="space-y-3">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                  placeholder="Enter email address"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
              >
                {isLoading ? 'Sending Invite...' : 'Send Invitation'}
              </button>
            </form>
            {error && (
              <div className="mt-3 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}
            {success && (
              <div className="mt-3 text-sm text-green-600 dark:text-green-400">
                {success}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default HouseholdManager;
