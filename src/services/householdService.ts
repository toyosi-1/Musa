import { getFirebaseDatabase } from '@/lib/firebase';
import { Household, HouseholdInvite } from '@/types/user';
import { ref, get, set, push, update, remove } from 'firebase/database';
import { sendHouseholdInvitationEmail as sendHouseholdInvitationSMTP } from './smtpEmailService';
import { withRetry } from '@/lib/withRetry';

// Reject a household invitation
export const rejectHouseholdInvite = async (
  inviteId: string,
  userId: string,
  userEmail: string
): Promise<void> => {
  try {
    const db = await getFirebaseDatabase();
    
    // Get the invitation
    const inviteRef = ref(db, `householdInvites/${inviteId}`);
    const inviteSnapshot = await get(inviteRef);
    
    if (!inviteSnapshot.exists()) {
      throw new Error('Invitation not found');
    }
    
    const invite = inviteSnapshot.val() as HouseholdInvite;
    
    // Verify the invitation is for this user
    if (invite.email.toLowerCase() !== userEmail.toLowerCase()) {
      throw new Error('This invitation is not for your email address');
    }
    
    // Check if invitation is still pending
    if (invite.status !== 'pending') {
      throw new Error(`This invitation has already been ${invite.status}`);
    }
    
    // Check if invitation has expired
    if (invite.expiresAt < Date.now()) {
      throw new Error('This invitation has expired');
    }
    
    // Update invitation status to rejected
    await update(inviteRef, {
      status: 'rejected',
      rejectedAt: Date.now(),
      rejectedBy: userId
    });
    
  } catch (error) {
    console.error('Error rejecting household invitation:', error);
    throw error;
  }
};

// Leave a household
export const leaveHousehold = async (
  userId: string,
  householdId: string
): Promise<void> => {
  try {
    const db = await getFirebaseDatabase();

    const householdSnapshot = await withRetry(
      () => get(ref(db, `households/${householdId}`)),
      { maxAttempts: 3, baseDelayMs: 600, label: 'leaveHousehold-read' },
    );

    if (!householdSnapshot.exists()) {
      throw new Error('Household not found');
    }

    const household = householdSnapshot.val() as Household;

    if (!household.members || !household.members[userId]) {
      throw new Error('You are not a member of this household');
    }

    if (household.headId === userId) {
      const memberCount = Object.keys(household.members).length;
      if (memberCount > 1) {
        throw new Error('As the household head, you cannot leave while there are other members. Please transfer ownership or remove other members first.');
      }
      // Head is the only member — delete the whole household then clear user record
      await withRetry(() => remove(ref(db, `households/${householdId}`)), { label: 'leaveHousehold-remove' });
      await withRetry(
        () => update(ref(db, `users/${userId}`), { householdId: null, isHouseholdHead: false, updatedAt: Date.now() }),
        { label: 'leaveHousehold-user-clear' },
      );
    } else {
      // Regular member — use a single atomic multi-path update so either
      // both writes succeed or neither does. Each path is independently
      // authorised: members/$userId by the new member-level rule, and
      // users/$userId by the user's own-record write rule.
      await withRetry(
        () => update(ref(db), {
          [`households/${householdId}/members/${userId}`]: null,
          [`users/${userId}/householdId`]: null,
          [`users/${userId}/updatedAt`]: Date.now(),
        }),
        { maxAttempts: 3, baseDelayMs: 600, label: 'leaveHousehold-atomic' },
      );
    }
  } catch (error) {
    console.error('Error leaving household:', error);
    throw error;
  }
};

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

    // Get user's estateId first
    const userRef = ref(db, `users/${userId}`);
    const userSnapshot = await get(userRef);
    if (!userSnapshot.exists()) {
      throw new Error('User not found');
    }
    const userData = userSnapshot.val();
    const estateId = userData.estateId;

    if (!estateId) {
      throw new Error('User must be assigned to an estate before creating a household');
    }

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
      estateId, // Include estate ID
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

    // Log to activity feed
    try {
      const { logActivity } = await import('./activityService');
      await logActivity({
        type: 'household_created',
        description: `Created household "${name}"`,
        timestamp: now,
        userId,
        estateId: estateId!,
        householdId: newHouseholdRef.key,
        metadata: { householdName: name },
      });
    } catch (e) {
      console.warn('[householdService] Activity log failed (non-fatal):', e);
    }
    
    return household;
  } catch (error) {
    console.error('Error creating household:', error);
    throw new Error('Failed to create household');
  }
};

// Get household by ID
export const getHousehold = async (householdId: string, retryCount = 0): Promise<Household | null> => {
  const maxRetries = 3;
  
  try {
    // Ensure the database is initialized
    const db = await getFirebaseDatabase();
    const householdRef = ref(db, `households/${householdId}`);
    const snapshot = await get(householdRef);
    
    if (snapshot.exists()) {
      return snapshot.val() as Household;
    }
    
    return null;
  } catch (error: any) {
    console.error(`Error getting household (attempt ${retryCount + 1}/${maxRetries + 1}):`, error);
    
    // Retry with exponential backoff for database connection errors
    if (retryCount < maxRetries && (
      error?.message?.includes('database') ||
      error?.message?.includes('connection') ||
      error?.message?.includes('network') ||
      error?.code === 'PERMISSION_DENIED'
    )) {
      const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
      console.log(`Retrying getHousehold in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return getHousehold(householdId, retryCount + 1);
    }
    
    throw error;
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
    const db = await getFirebaseDatabase();
    const emailKey = email.replace(/\./g, ',').toLowerCase();

    // Use invitesByEmail index (O(1)) instead of scanning all householdInvites
    const householdRef = ref(db, `households/${householdId}`);
    const emailIndexRef = ref(db, `invitesByEmail/${emailKey}`);

    const [householdSnapshot, emailIndexSnapshot] = await withRetry(
      () => Promise.all([get(householdRef), get(emailIndexRef)]),
      { maxAttempts: 3, baseDelayMs: 700, label: 'createHouseholdInvite-reads' },
    );

    if (!householdSnapshot.exists()) {
      console.error('Household not found with ID:', householdId);
      throw new Error('Household not found');
    }

    const household = householdSnapshot.val() as Household;

    if (household.headId !== invitedBy) {
      console.error('User is not household head', { headId: household.headId, userId: invitedBy });
      throw new Error('Only the household head can invite members');
    }

    // Check for an active pending invite using the email index
    // OPTIMIZATION: Fetch all invites at once instead of N+1 queries
    if (emailIndexSnapshot.exists()) {
      const inviteIds = Object.keys(emailIndexSnapshot.val() as Record<string, boolean>);
      
      if (inviteIds.length > 0) {
        // Fetch all invites in parallel
        const invitePromises = inviteIds.map(id => 
          get(ref(db, `householdInvites/${id}`)).catch(() => null)
        );
        const inviteSnapshots = await Promise.all(invitePromises);
        
        // Check for active pending invite for this household
        for (const invSnap of inviteSnapshots) {
          if (invSnap && invSnap.exists()) {
            const inv = invSnap.val() as HouseholdInvite;
            if (inv.householdId === householdId && inv.status === 'pending' && inv.expiresAt > Date.now()) {
              throw new Error('An active invitation already exists for this email');
            }
          }
        }
      }
    }
    
    // Create the invitation
    const inviteRef = push(ref(db, 'householdInvites'));
    
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
      email: email.toLowerCase(), // Store email in lowercase for consistent querying
      status: 'pending',
      createdAt: now,
      expiresAt,
      autoApprove: true // Head's approval cascades to invitees - they skip the waiting room
    };
    
    // Save invite + email index in one atomic write (emailKey already computed above)
    await update(ref(db), {
      [`householdInvites/${invite.id}`]: invite,
      [`invitesByEmail/${emailKey}/${invite.id}`]: true,
    });
    
    // Send invitation email — fire-and-forget, never block the UI
    void (async () => {
      try {
        const inviterRef = ref(db, `users/${invitedBy}`);
        const inviterSnapshot = await get(inviterRef);
        const inviterName = inviterSnapshot.exists()
          ? inviterSnapshot.val().displayName || 'Someone'
          : 'Someone';
        const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://musa-security.com'}/invite/${invite.id}`;
        await sendHouseholdInvitationSMTP({
          householdName: household.name,
          inviterName,
          acceptUrl: invitationLink,
          recipientEmail: email,
        });
        console.log('✅ Household invitation email sent');
      } catch (e) {
        console.warn('⚠️ Invitation email failed (non-fatal):', e);
      }
    })();
    
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

    // Log to activity feed
    try {
      const { logActivity } = await import('./activityService');
      await logActivity({
        type: 'household_joined',
        description: `Joined household "${household.name}"`,
        timestamp: Date.now(),
        userId,
        estateId: household.estateId || '',
        householdId: invite.householdId,
        metadata: { householdName: household.name },
      });
    } catch (e) {
      console.warn('[householdService] Activity log failed (non-fatal):', e);
    }
  } catch (error) {
    console.error('Error accepting household invite:', error);
    if (error instanceof Error) throw error;
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
    console.log(`🔍 Searching for invitations for email: ${email}`);
    const db = await getFirebaseDatabase();
    const userEmail = email.toLowerCase();
    console.log(`🔍 Normalized email: ${userEmail}`);
    
    // Get all invitations and filter client-side to handle case mismatches
    // This is necessary because existing invitations might have been stored with different casing
    const invitesRef = ref(db, 'householdInvites');
    const snapshot = await get(invitesRef);
    
    if (!snapshot.exists()) {
      console.log('❌ No invitations found in database');
      return [];
    }
    
    const invites: HouseholdInvite[] = [];
    let totalInvites = 0;
    let matchingEmails = 0;
    let pendingInvites = 0;
    let nonExpiredInvites = 0;
    
    // Convert the snapshot to an array of invites
    snapshot.forEach((childSnapshot) => {
      const invite = childSnapshot.val() as HouseholdInvite;
      totalInvites++;
      
      console.log(`📧 Checking invitation ${childSnapshot.key}: email=${invite.email}, status=${invite.status}, expires=${new Date(invite.expiresAt).toISOString()}`);
      
      // Check email match
      const emailMatches = invite.email && invite.email.toLowerCase() === userEmail;
      if (emailMatches) {
        matchingEmails++;
        console.log(`✅ Email matches for invitation ${childSnapshot.key}`);
      }
      
      // Check status
      if (invite.status === 'pending') {
        pendingInvites++;
      }
      
      // Check expiration
      if (invite.expiresAt > Date.now()) {
        nonExpiredInvites++;
      }
      
      // Check if email matches (case-insensitive) and invitation is valid
      if (
        invite.email && 
        invite.email.toLowerCase() === userEmail &&
        invite.status === 'pending' && 
        invite.expiresAt > Date.now()
      ) {
        console.log(`🎯 Found valid invitation ${childSnapshot.key}`);
        invites.push({
          ...invite,
          id: childSnapshot.key as string
        });
      }
    });
    
    console.log(`📊 Summary: Total=${totalInvites}, EmailMatches=${matchingEmails}, Pending=${pendingInvites}, NonExpired=${nonExpiredInvites}, Valid=${invites.length}`);
    console.log(`Found ${invites.length} pending invitations for email: ${email}`);
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
