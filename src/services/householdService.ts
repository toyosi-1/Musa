import { getFirebaseDatabase } from '@/lib/firebase';
import { ref, push, set, get, update, remove, query, orderByChild, equalTo } from 'firebase/database';
import { Household, HouseholdInvite } from '@/types/user';

// Create a new household with the current user as head
export const createHousehold = async (
  userId: string,
  name: string,
  addressData?: {
    address?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  }
): Promise<Household> => {
  // Ensure the database is initialized
  try {
    // Get Firebase database
    const db = await getFirebaseDatabase();

    // Create the household record
    const householdsRef = ref(db, 'households');
    const newHouseholdRef = push(householdsRef);
    
    if (!newHouseholdRef.key) {
      throw new Error('Failed to generate household ID');
    }
    
    const now = Date.now();
    const household: Household = {
      id: newHouseholdRef.key,
      name,
      headId: userId,
      members: { [userId]: true }, // Add head as a member
      createdAt: now,
      updatedAt: now,
      // Add optional address fields if provided
      ...(addressData?.address && { address: addressData.address }),
      ...(addressData?.addressLine2 && { addressLine2: addressData.addressLine2 }),
      ...(addressData?.city && { city: addressData.city }),
      ...(addressData?.state && { state: addressData.state }),
      ...(addressData?.postalCode && { postalCode: addressData.postalCode }),
      ...(addressData?.country && { country: addressData.country })
    };
    
    // Save the household
    await set(newHouseholdRef, household);
    
    // Update user profile with household info
    const updates: { [key: string]: any } = {};
    updates[`users/${userId}/householdId`] = newHouseholdRef.key;
    updates[`users/${userId}/isHouseholdHead`] = true;
    await update(ref(db), updates);
    
    return household;
  } catch (error) {
    console.error('Error creating household:', error);
    throw new Error('Failed to create household');
  }
};

// Get household by ID
export const getHousehold = async (householdId: string): Promise<Household | null> => {
  // Ensure the database is initialized
  try {
    const db = await getFirebaseDatabase();
    const householdRef = ref(db, `households/${householdId}`);
    const snapshot = await get(householdRef);
    
    if (snapshot.exists()) {
      return snapshot.val() as Household;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting household:', error);
    throw new Error('Failed to get household');
  }
};

// Get all members in a household
export const getHouseholdMembers = async (householdId: string): Promise<string[]> => {
  // Ensure the database is initialized
  try {
    const db = await getFirebaseDatabase();
    const householdRef = ref(db, `households/${householdId}`);
    const snapshot = await get(householdRef);
    
    if (!snapshot.exists()) {
      throw new Error('Household not found');
    }
    
    const household = snapshot.val() as Household;
    return Object.keys(household.members || {});
  } catch (error) {
    console.error('Error getting household members:', error);
    throw new Error('Failed to get household members');
  }
};

// Create an invitation to join a household
export const createHouseholdInvite = async (
  householdId: string,
  invitedBy: string,
  email: string
): Promise<HouseholdInvite> => {
  // Ensure the database is initialized
  try {
    // Check if the user is the household head
    const db = await getFirebaseDatabase();
    const householdRef = ref(db, `households/${householdId}`);
    const householdSnapshot = await get(householdRef);
    
    if (!householdSnapshot.exists()) {
      console.error('Household not found with ID:', householdId);
      throw new Error('Household not found');
    }
    
    const household = householdSnapshot.val() as Household;
    
    if (household.headId !== invitedBy) {
      console.error('User is not household head', { headId: household.headId, userId: invitedBy });
      throw new Error('Only the household head can invite members');
    }
    
    // Check if an invite already exists for this email
    const invitesRef = ref(db, 'householdInvites');
    const invitesQuery = query(
      invitesRef,
      orderByChild('email'),
      equalTo(email.toLowerCase())
    );
    
    const existingInvitesSnapshot = await get(invitesQuery);
    
    if (existingInvitesSnapshot.exists()) {
      const invites = Object.values(existingInvitesSnapshot.val() as { [key: string]: HouseholdInvite });
      
      const activeInvite = invites.find(
        (invite) => 
          invite.householdId === householdId && 
          invite.status === 'pending' && 
          invite.expiresAt > Date.now()
      );
      
      if (activeInvite) {
        console.error('Active invitation already exists for this email');
        throw new Error('An active invitation already exists for this email');
      }
    }
    
    // Create the invitation
    const inviteRef = push(invitesRef);
    
    if (!inviteRef.key) {
      console.error('Failed to generate invitation ID');
      throw new Error('Failed to generate invitation ID');
    }
    
    const now = Date.now();
    const expiresAt = now + (7 * 24 * 60 * 60 * 1000); // 7 days expiration
    
    const invite: HouseholdInvite = {
      id: inviteRef.key,
      householdId,
      invitedBy,
      email,
      status: 'pending',
      createdAt: now,
      expiresAt
    };
    
    // Save the invitation
    await set(inviteRef, invite);
    
    // Create an index entry for quick lookups by email
    const emailKey = email.replace(/\./g, ',').toLowerCase();
    await set(ref(db, `invitesByEmail/${emailKey}/${invite.id}`), true);
    
    return invite;
  } catch (error) {
    console.error('Error creating household invite:', error);
    if (error instanceof Error) {
      throw error; // Preserve the original error message
    } else {
      throw new Error('Failed to create invitation');
    }
  }
};

// Accept a household invitation
export const acceptHouseholdInvite = async (
  inviteId: string,
  userId: string,
  userEmail: string
): Promise<void> => {
  // Ensure the database is initialized
  try {
    // Get the invitation
    const db = await getFirebaseDatabase();
    const inviteRef = ref(db, `householdInvites/${inviteId}`);
    const inviteSnapshot = await get(inviteRef);
    
    if (!inviteSnapshot.exists()) {
      throw new Error('Invitation not found');
    }
    
    const invite = inviteSnapshot.val() as HouseholdInvite;
    
    // Verify the invitation is for this user's email
    if (invite.email.toLowerCase() !== userEmail.toLowerCase()) {
      throw new Error('This invitation is not for your email address');
    }
    
    // Check if invitation is still valid
    if (invite.status !== 'pending') {
      throw new Error(`Invitation has already been ${invite.status}`);
    }
    
    if (invite.expiresAt < Date.now()) {
      throw new Error('Invitation has expired');
    }
    
    // Get the household
    const household = await getHousehold(invite.householdId);
    
    if (!household) {
      throw new Error('Household not found');
    }
    
    // Update invitation status
    await update(inviteRef, { status: 'accepted' });
    
    // Add user as household member
    const updates: { [key: string]: any } = {};
    updates[`households/${invite.householdId}/members/${userId}`] = true;
    updates[`users/${userId}/householdId`] = invite.householdId;
    updates[`users/${userId}/isHouseholdHead`] = false;
    
    await update(ref(db), updates);
  } catch (error) {
    console.error('Error accepting household invite:', error);
    throw new Error('Failed to accept invitation');
  }
};

// Remove a member from a household
export const removeHouseholdMember = async (
  householdId: string,
  headId: string,
  memberId: string
): Promise<void> => {
  // Ensure the database is initialized
  try {
    // Check if the user is the household head
    const db = await getFirebaseDatabase();
    const householdRef = ref(db, `households/${householdId}`);
    const householdSnapshot = await get(householdRef);
    
    if (!householdSnapshot.exists()) {
      throw new Error('Household not found');
    }
    
    const household = householdSnapshot.val() as Household;
    
    if (household.headId !== headId) {
      throw new Error('Only the household head can remove members');
    }
    
    // Cannot remove the head
    if (memberId === headId) {
      throw new Error('Cannot remove the household head');
    }
    
    // Check if the user is a member of this household
    if (!household.members[memberId]) {
      throw new Error('User is not a member of this household');
    }
    
    // Remove the member
    const updates: { [key: string]: any } = {};
    updates[`households/${householdId}/members/${memberId}`] = null;
    updates[`users/${memberId}/householdId`] = null;
    updates[`users/${memberId}/isHouseholdHead`] = null;
    
    await update(ref(db), updates);
  } catch (error) {
    console.error('Error removing household member:', error);
    throw new Error('Failed to remove member');
  }
};

// Get pending invitations for a user's email
export const getPendingInvitationsByEmail = async (email: string): Promise<HouseholdInvite[]> => {
  try {
    // Query invitations by email
    const db = await getFirebaseDatabase();
    const invitesQuery = query(
      ref(db, 'householdInvites'),
      orderByChild('email'),
      equalTo(email.toLowerCase())
    );
    
    const snapshot = await get(invitesQuery);
    
    if (!snapshot.exists()) {
      return [];
    }
    
    const invites: HouseholdInvite[] = [];
    
    // Convert the snapshot to an array of invites
    snapshot.forEach((childSnapshot) => {
      const invite = childSnapshot.val() as HouseholdInvite;
      
      // Only include pending invitations that haven't expired
      if (invite.status === 'pending' && invite.expiresAt > Date.now()) {
        invites.push({
          ...invite,
          id: childSnapshot.key as string
        });
      }
    });
    
    return invites;
  } catch (error) {
    console.error('Error getting pending invitations:', error);
    throw new Error('Failed to get pending invitations');
  }
};

// Update household address information
export const updateHouseholdAddress = async (
  householdId: string,
  userId: string,
  addressData: {
    address: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  }
): Promise<Household> => {
  try {
    // Verify the household exists and user has permission to update it
    const db = await getFirebaseDatabase();
    const householdRef = ref(db, `households/${householdId}`);
    const householdSnapshot = await get(householdRef);
    
    if (!householdSnapshot.exists()) {
      console.error('Household not found with ID:', householdId);
      throw new Error('Household not found');
    }
    
    const household = householdSnapshot.val() as Household;
    
    // Check if the user is a member of this household
    if (!household.members[userId]) {
      console.error('User is not a member of this household');
      throw new Error('You are not a member of this household');
    }
    
    // Update the address fields
    const updatedFields = {
      address: addressData.address,
      addressLine2: addressData.addressLine2 || null,
      city: addressData.city,
      state: addressData.state,
      postalCode: addressData.postalCode,
      country: addressData.country,
      updatedAt: Date.now()
    };
    
    await update(householdRef, updatedFields);
    
    // Fetch the updated household data
    const updatedSnapshot = await get(householdRef);
    if (!updatedSnapshot.exists()) {
      throw new Error('Failed to retrieve updated household data');
    }
    
    return updatedSnapshot.val() as Household;
  } catch (error) {
    console.error('Error updating household address:', error);
    if (error instanceof Error) {
      throw error; // Preserve the original error message
    } else {
      throw new Error('Failed to update household address');
    }
  }
};
