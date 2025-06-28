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

export default function HouseholdManager({ user, household, onCreateHousehold, refreshHousehold }: HouseholdManagerProps) {
  const [householdName, setHouseholdName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  interface HouseholdMember extends Omit<User, 'uid'> {
    uid: string; // Using uid instead of id to match User interface
  }

  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [db, setDb] = useState<any>(null);

  // Initialize Firebase database
  useEffect(() => {
    const initDb = async () => {
      const database = await getFirebaseDatabase();
      setDb(database);
    };
    initDb();
  }, []);
  const [showMembers, setShowMembers] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  
  // Address form fields
  const [address, setAddress] = useState(household?.address || '');
  const [addressLine2, setAddressLine2] = useState(household?.addressLine2 || '');
  const [city, setCity] = useState(household?.city || '');
  const [state, setState] = useState(household?.state || '');
  const [postalCode, setPostalCode] = useState(household?.postalCode || '');
  const [country, setCountry] = useState(household?.country || '');

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

  // Load household members with details
  const loadMembers = async () => {
    if (!household) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const memberIds = await getHouseholdMembers(household.id);
      // Get member details
      const membersWithDetails = await Promise.all(
        memberIds.map(async (memberId) => {
          const userRef = ref(db, `users/${memberId}`);
          const userSnapshot = await get(userRef);
          if (userSnapshot.exists()) {
            const userData = userSnapshot.val();
            return {
              ...userData,
              uid: memberId,
              email: userData.email || '',
              displayName: userData.displayName || userData.email || 'Unknown User',
              role: userData.role || 'resident',
              status: userData.status || 'approved',
              isEmailVerified: userData.isEmailVerified || false,
              createdAt: userData.createdAt || Date.now()
            } as HouseholdMember;
          }
          return null;
        })
      );
      
      setMembers(membersWithDetails.filter((member): member is HouseholdMember => member !== null));
      setShowMembers(true);
    } catch (err) {
      console.error('Error loading members:', err);
      setError('Failed to load household members');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle member removal
  const handleRemoveMember = async (memberId: string) => {
    if (!household || !confirm('Are you sure you want to remove this member?')) {
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      await removeHouseholdMember(household.id, user.uid, memberId);
      setSuccess('Member removed successfully');
      await loadMembers(); // Refresh the member list
      
      // Refresh parent component's household data
      if (refreshHousehold) {
        await refreshHousehold();
      }
      
      // Reset success message after a few seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error removing member:', err);
      setError(`Failed to remove member: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle address update form submission
  const handleUpdateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!household) return;
    
    if (!address || !city || !state || !postalCode || !country) {
      setError('Please fill in all required address fields');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const updatedHousehold = await updateHouseholdAddress(
        household.id,
        user.uid,
        {
          address,
          addressLine2,
          city,
          state,
          postalCode,
          country
        }
      );
      
      // Update local state with new values from the database
      setAddress(updatedHousehold.address || '');
      setAddressLine2(updatedHousehold.addressLine2 || '');
      setCity(updatedHousehold.city || '');
      setState(updatedHousehold.state || '');
      setPostalCode(updatedHousehold.postalCode || '');
      setCountry(updatedHousehold.country || '');
      
      // Refresh parent component's household data
      if (refreshHousehold) {
        await refreshHousehold();
      }
      
      setSuccess('Address updated successfully!');
      setShowAddressForm(false);
      
      // Reset after a few seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      console.error('Error updating address:', err);
      setError(`Failed to update address: ${err instanceof Error ? err.message : 'Unknown error'}`);
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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-300 px-6 py-4 rounded-xl mb-6">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="font-medium">{error}</p>
              </div>
            </div>
          )}
        
          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              {success}
            </div>
          )}
      
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
          
          {/* Address Display */}
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
            
            {!showAddressForm && (
              <div className="text-sm text-gray-700 dark:text-gray-300">
                {household.address ? (
                  <div className="space-y-1">
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
                  <p className="text-gray-500 dark:text-gray-400 italic">
                    No address added yet. Guards won't be able to see where visitors are going.
                  </p>
                )}
              </div>
            )}
            
            {/* Address Form */}
            {showAddressForm && (
              <form onSubmit={handleUpdateAddress} className="mt-4 space-y-4">
                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Street Address*
                  </label>
                  <input
                    id="address"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="123 Main St"
                    className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="addressLine2" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Address Line 2
                  </label>
                  <input
                    id="addressLine2"
                    type="text"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    placeholder="Apt, Suite, Unit, etc."
                    className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      City*
                    </label>
                    <input
                      id="city"
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="City"
                      className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="state" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      State/Province*
                    </label>
                    <input
                      id="state"
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="State/Province"
                      className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Postal Code*
                    </label>
                    <input
                      id="postalCode"
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="Postal/Zip Code"
                      className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="country" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Country*
                    </label>
                    <input
                      id="country"
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="Country"
                      className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                </div>
                
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    {isLoading ? 'Updating...' : 'Update Address'}
                  </button>
                </div>
              </form>
            )}
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
              <div className="mt-2">
                {isLoading && members.length === 0 ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  </div>
                ) : members.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">No members found</p>
                ) : (
                  <ul className="space-y-2">
                    {members.map((member) => (
                      <li key={member.uid} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div>
                          <p className="font-medium">{member.displayName || member.email || 'Unknown User'}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{member.email || member.uid}</p>
                        </div>
                        {user.isHouseholdHead && member.uid !== user.uid && (
                          <button 
                            className="px-3 py-1 text-sm bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 rounded-md transition-colors"
                            onClick={() => handleRemoveMember(member.uid)}
                            disabled={isLoading}
                          >
                            Remove
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    {/* Invite New Member */}
    {user.isHouseholdHead && (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Invite New Member</h3>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          <form onSubmit={handleInviteMember} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email Address
              </label>
              <div className="mt-1">
                <input
                  type="email"
                  id="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                  placeholder="member@example.com"
                  required
                />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {isLoading ? 'Sending...' : 'Send Invitation'}
            </button>
          </form>
        </div>
      </div>
    )}
  </div>
);
}
