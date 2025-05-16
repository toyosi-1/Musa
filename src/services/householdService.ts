import { rtdb } from '@/lib/firebase';
import { ref, push, set, get, update, remove, query, orderByChild, equalTo } from 'firebase/database';
import { Household, HouseholdInvite } from '@/types/user';

// Create a new household with the current user as head
export const createHousehold = async (
  userId: string,
  name: string
): Promise<Household> => {
  // Ensure the database is initialized
  console.log('Creating household with rtdb:', rtdb);

  try {
    // Create the household record
    const householdsRef = ref(rtdb, 'households');
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
      updatedAt: now
    };
    
    // Save the household
    await set(newHouseholdRef, household);
    
    // Update user profile with household info
    const updates: { [key: string]: any } = {};
    updates[`users/${userId}/householdId`] = newHouseholdRef.key;
    updates[`users/${userId}/isHouseholdHead`] = true;
    await update(ref(rtdb), updates);
    
    return household;
  } catch (error) {
    console.error('Error creating household:', error);
    throw new Error('Failed to create household');
  }
};

// Get household by ID
export const getHousehold = async (householdId: string): Promise<Household | null> => {
  // Ensure the database is initialized
  console.log('Creating household with rtdb:', rtdb);

  try {
    const householdRef = ref(rtdb, `households/${householdId}`);
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
  console.log('Creating household with rtdb:', rtdb);

  try {
    const householdRef = ref(rtdb, `households/${householdId}`);
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
  console.log('Creating household invite with parameters:', { householdId, invitedBy, email });

  try {
    // Check if the user is the household head
    console.log('Checking if user is household head...');
    const householdRef = ref(rtdb, `households/${householdId}`);
    const householdSnapshot = await get(householdRef);
    
    if (!householdSnapshot.exists()) {
      console.error('Household not found with ID:', householdId);
      throw new Error('Household not found');
    }
    
    const household = householdSnapshot.val() as Household;
    console.log('Found household:', { id: householdId, headId: household.headId, invitedBy });
    
    if (household.headId !== invitedBy) {
      console.error('User is not household head', { headId: household.headId, userId: invitedBy });
      throw new Error('Only the household head can invite members');
    }
    
    // Check if an invite already exists for this email
    console.log('Checking for existing invites for email:', email);
    const invitesRef = ref(rtdb, 'householdInvites');
    const invitesQuery = query(
      invitesRef,
      orderByChild('email'),
      equalTo(email)
    );
    
    const existingInvitesSnapshot = await get(invitesQuery);
    console.log('Existing invites found:', existingInvitesSnapshot.exists());
    
    if (existingInvitesSnapshot.exists()) {
      const invites = Object.values(existingInvitesSnapshot.val() as { [key: string]: HouseholdInvite });
      console.log('Number of existing invites:', invites.length);
      
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
    console.log('Creating new invitation...');
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
    
    console.log('Saving invitation to Firebase:', invite.id);
    // Save the invitation
    await set(inviteRef, invite);
    
    // Create an index entry for quick lookups by email
    const emailKey = email.replace(/\./g, ',').toLowerCase();
    console.log('Creating index entry with key:', emailKey);
    await set(ref(rtdb, `invitesByEmail/${emailKey}/${invite.id}`), true);
    
    console.log('Invitation created successfully:', invite.id);
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
  console.log('Creating household with rtdb:', rtdb);

  try {
    // Get the invitation
    const inviteRef = ref(rtdb, `householdInvites/${inviteId}`);
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
    
    await update(ref(rtdb), updates);
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
  console.log('Creating household with rtdb:', rtdb);

  try {
    // Check if the user is the household head
    const householdRef = ref(rtdb, `households/${householdId}`);
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
    
    await update(ref(rtdb), updates);
  } catch (error) {
    console.error('Error removing household member:', error);
    throw new Error('Failed to remove member');
  }
};

// Get pending invitations for a user's email
export const getPendingInvitationsByEmail = async (email: string): Promise<HouseholdInvite[]> => {
  console.log('Fetching pending invitations for email:', email);
  
  try {
    // Query invitations by email
    const invitesQuery = query(
      ref(rtdb, 'householdInvites'),
      orderByChild('email'),
      equalTo(email.toLowerCase())
    );
    
    const snapshot = await get(invitesQuery);
    
    if (!snapshot.exists()) {
      console.log('No invitations found for email:', email);
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
    
    console.log(`Found ${invites.length} pending invitations for ${email}`);
    return invites;
  } catch (error) {
    console.error('Error getting pending invitations:', error);
    throw new Error('Failed to get pending invitations');
  }
};
