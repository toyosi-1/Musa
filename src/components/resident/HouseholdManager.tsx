"use client";

import { useState, useEffect } from 'react';
import { User, Household } from '@/types/user';
import { createHouseholdInvite, getHouseholdMembers, updateHouseholdAddress } from '@/services/householdService';
import { getUserProfile } from '@/services/userService';
import LeaveHouseholdButton from '@/components/household/LeaveHouseholdButton';

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
  const [members, setMembers] = useState<Array<{ id: string; displayName: string | null; email: string | null }>>([]);
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
      
      // Create a more descriptive success message
      setSuccess(`Invitation sent to ${inviteEmail}. They will appear in your household after accepting.`);
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
    if (!household) {
      console.error('No household available');
      setError('No household available');
      return;
    }
    
    setIsLoading(true);
    try {
      const memberIds = await getHouseholdMembers(household.id);
      const memberDetails = await Promise.all(
        memberIds.map(async (id) => {
          try {
            const userProfile = await getUserProfile(id);
            return {
              id,
              displayName: userProfile?.displayName || null,
              email: userProfile?.email || null
            };
          } catch (error) {
            console.error(`Error fetching details for user ${id}:`, error);
            return { id, displayName: null, email: null };
          }
        })
      );
      setMembers(memberDetails);
      setShowMembers(true);
    } catch (err) {
      console.error('Error loading members:', err);
      setError('Failed to load household members');
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6">
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
    <div className="space-y-4 sm:space-y-6 max-w-full overflow-hidden">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6">
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
      
        <div className="flex justify-between items-center mb-4 gap-2">
          <h2 className="text-base sm:text-lg font-semibold">Household Details</h2>
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
            <span className="text-sm text-gray-500 dark:text-gray-300">Name:</span>
            <p className="font-medium">{household.name}</p>
          </div>
          
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-300">Created:</span>
            <p className="font-medium">{new Date(household.createdAt).toLocaleDateString()}</p>
          </div>
          
          {/* Address Display */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-300">Address</span>
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
                  <p className="text-gray-500 dark:text-gray-300 italic">
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
                    className="input w-full text-sm sm:text-base"
                    disabled={isLoading}
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
                    className="input w-full text-sm sm:text-base"
                    disabled={isLoading}
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      className="input w-full text-sm sm:text-base"
                      disabled={isLoading}
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
                      className="input w-full text-sm sm:text-base"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      className="input w-full text-sm sm:text-base"
                      disabled={isLoading}
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
                      className="input w-full text-sm sm:text-base"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>
                
                <div className="pt-2">
                  <button
                    type="submit"
                    className="btn-primary w-full"
                    disabled={isLoading}
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
              <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                <p className="text-sm font-medium mb-1">Household Members:</p>
                <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                  {members.map(member => (
                    <li key={member.id} className="truncate flex justify-between items-center py-1">
                      <div>
                        <span className="font-medium">
                          {member.displayName || member.email || 'Unknown User'}
                          {member.id === user.uid && ' (You)'}
                        </span>
                        {member.email && member.displayName && (
                          <span className="text-xs text-gray-500 dark:text-gray-300 block">{member.email}</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {household && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Invite New Member
          </h2>
          
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
      
      {/* Leave Household Section */}
      {household && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4 border-red-500">
          <h2 className="text-lg font-semibold mb-4 text-red-600 dark:text-red-400 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            Danger Zone
          </h2>
          
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Once you leave this household, you will lose access to all household features and will need to be re-invited to rejoin.
          </p>
          
          <LeaveHouseholdButton 
            household={household} 
            onLeave={refreshHousehold}
          />
        </div>
      )}
    </div>
  );
}
