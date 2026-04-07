import { getFirebaseDatabase } from '@/lib/firebase';
import { ref, set, get, remove, query, orderByChild, equalTo } from 'firebase/database';
import { User } from '@/types/user';
import { logSecurityEvent } from './securityLogService';

/**
 * Create a new estate admin account
 * Only callable by super admins
 */
export const createEstateAdmin = async (
  email: string,
  estateId: string,
  createdBy: string,
  displayName?: string
): Promise<{ uid: string; tempPassword: string }> => {
  const db = await getFirebaseDatabase();

  // Verify the creator is a super admin
  const creatorRef = ref(db, `users/${createdBy}`);
  const creatorSnapshot = await get(creatorRef);
  
  if (!creatorSnapshot.exists() || creatorSnapshot.val().role !== 'admin') {
    throw new Error('Only super admins can create estate admins');
  }

  // Verify estate exists
  const estateRef = ref(db, `estates/${estateId}`);
  const estateSnapshot = await get(estateRef);
  
  if (!estateSnapshot.exists()) {
    throw new Error('Estate does not exist');
  }

  // Check if email already exists
  const usersRef = ref(db, 'users');
  const emailQuery = query(usersRef, orderByChild('email'), equalTo(email));
  const existingUserSnapshot = await get(emailQuery);
  
  if (existingUserSnapshot.exists()) {
    throw new Error('User with this email already exists');
  }

  // Generate a temporary UID (in production, this would use Firebase Auth)
  const tempUid = `estate_admin_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const tempPassword = Math.random().toString(36).substring(2, 15);

  // Create estate admin user record
  const newEstateAdmin: User = {
    uid: tempUid,
    email,
    displayName: displayName || email.split('@')[0],
    role: 'estate_admin',
    status: 'approved', // Estate admins are pre-approved
    isEmailVerified: false,
    estateId,
    canApproveUsers: true,
    canAssignHoH: true,
    createdAt: Date.now(),
    createdBy,
    approvedBy: createdBy,
    approvedAt: Date.now()
  };

  const userRef = ref(db, `users/${tempUid}`);
  await set(userRef, newEstateAdmin);

  // Log the creation
  await logSecurityEvent('ESTATE_ADMIN_CREATED', createdBy, {
    estateAdminUid: tempUid,
    estateAdminEmail: email,
    estateId,
    estateName: estateSnapshot.val().name
  });

  return {
    uid: tempUid,
    tempPassword
  };
};

/**
 * List all estate admins in the system
 * Only callable by super admins
 */
export const listEstateAdmins = async (requestingUserId: string): Promise<User[]> => {
  const db = await getFirebaseDatabase();

  // Verify requester is super admin
  const requesterRef = ref(db, `users/${requestingUserId}`);
  const requesterSnapshot = await get(requesterRef);
  
  if (!requesterSnapshot.exists() || requesterSnapshot.val().role !== 'admin') {
    throw new Error('Only super admins can list estate admins');
  }

  const usersRef = ref(db, 'users');
  const estateAdminQuery = query(usersRef, orderByChild('role'), equalTo('estate_admin'));
  const snapshot = await get(estateAdminQuery);

  if (!snapshot.exists()) {
    return [];
  }

  const estateAdmins: User[] = [];
  snapshot.forEach((child) => {
    estateAdmins.push(child.val() as User);
  });

  return estateAdmins;
};

/**
 * Get a specific estate admin by UID
 */
export const getEstateAdmin = async (
  uid: string,
  requestingUserId: string
): Promise<User | null> => {
  const db = await getFirebaseDatabase();

  // Verify requester is super admin
  const requesterRef = ref(db, `users/${requestingUserId}`);
  const requesterSnapshot = await get(requesterRef);
  
  if (!requesterSnapshot.exists() || requesterSnapshot.val().role !== 'admin') {
    throw new Error('Only super admins can view estate admin details');
  }

  const estateAdminRef = ref(db, `users/${uid}`);
  const snapshot = await get(estateAdminRef);

  if (!snapshot.exists()) {
    return null;
  }

  const user = snapshot.val() as User;
  
  if (user.role !== 'estate_admin') {
    throw new Error('User is not an estate admin');
  }

  return user;
};

/**
 * Remove an estate admin (convert to regular resident or delete)
 * Only callable by super admins
 */
export const removeEstateAdmin = async (
  uid: string,
  removedBy: string,
  action: 'delete' | 'demote' = 'delete'
): Promise<void> => {
  const db = await getFirebaseDatabase();

  // Verify remover is super admin
  const removerRef = ref(db, `users/${removedBy}`);
  const removerSnapshot = await get(removerRef);
  
  if (!removerSnapshot.exists() || removerSnapshot.val().role !== 'admin') {
    throw new Error('Only super admins can remove estate admins');
  }

  const estateAdminRef = ref(db, `users/${uid}`);
  const snapshot = await get(estateAdminRef);

  if (!snapshot.exists()) {
    throw new Error('Estate admin not found');
  }

  const estateAdmin = snapshot.val() as User;

  if (estateAdmin.role !== 'estate_admin') {
    throw new Error('User is not an estate admin');
  }

  if (action === 'delete') {
    // Delete the estate admin account
    await remove(estateAdminRef);

    await logSecurityEvent('ESTATE_ADMIN_DELETED', removedBy, {
      estateAdminUid: uid,
      estateAdminEmail: estateAdmin.email,
      estateId: estateAdmin.estateId
    });
  } else {
    // Demote to resident
    const updates = {
      role: 'resident',
      canApproveUsers: false,
      canAssignHoH: false
    };

    await set(estateAdminRef, { ...estateAdmin, ...updates });

    await logSecurityEvent('ESTATE_ADMIN_DEMOTED', removedBy, {
      estateAdminUid: uid,
      estateAdminEmail: estateAdmin.email,
      estateId: estateAdmin.estateId,
      newRole: 'resident'
    });
  }
};

/**
 * Update estate admin's assigned estate
 * Only callable by super admins
 */
export const updateEstateAdminEstate = async (
  uid: string,
  newEstateId: string,
  updatedBy: string
): Promise<void> => {
  const db = await getFirebaseDatabase();

  // Verify updater is super admin
  const updaterRef = ref(db, `users/${updatedBy}`);
  const updaterSnapshot = await get(updaterRef);
  
  if (!updaterSnapshot.exists() || updaterSnapshot.val().role !== 'admin') {
    throw new Error('Only super admins can update estate admin assignments');
  }

  // Verify new estate exists
  const estateRef = ref(db, `estates/${newEstateId}`);
  const estateSnapshot = await get(estateRef);
  
  if (!estateSnapshot.exists()) {
    throw new Error('Estate does not exist');
  }

  const estateAdminRef = ref(db, `users/${uid}`);
  const snapshot = await get(estateAdminRef);

  if (!snapshot.exists()) {
    throw new Error('Estate admin not found');
  }

  const estateAdmin = snapshot.val() as User;

  if (estateAdmin.role !== 'estate_admin') {
    throw new Error('User is not an estate admin');
  }

  const oldEstateId = estateAdmin.estateId;

  // Update estate assignment
  await set(estateAdminRef, { ...estateAdmin, estateId: newEstateId });

  await logSecurityEvent('ESTATE_ADMIN_REASSIGNED', updatedBy, {
    estateAdminUid: uid,
    estateAdminEmail: estateAdmin.email,
    oldEstateId,
    newEstateId
  });
};

/**
 * Check if a user is an estate admin for a specific estate
 */
export const isEstateAdmin = async (
  uid: string,
  estateId?: string
): Promise<boolean> => {
  const db = await getFirebaseDatabase();

  const userRef = ref(db, `users/${uid}`);
  const snapshot = await get(userRef);

  if (!snapshot.exists()) {
    return false;
  }

  const user = snapshot.val() as User;

  if (user.role !== 'estate_admin') {
    return false;
  }

  // If estateId is provided, verify it matches
  if (estateId && user.estateId !== estateId) {
    return false;
  }

  return true;
};

/**
 * Get estate admins for a specific estate
 */
export const getEstateAdminsByEstate = async (
  estateId: string,
  requestingUserId: string
): Promise<User[]> => {
  const db = await getFirebaseDatabase();

  // Verify requester is super admin
  const requesterRef = ref(db, `users/${requestingUserId}`);
  const requesterSnapshot = await get(requesterRef);
  
  if (!requesterSnapshot.exists() || requesterSnapshot.val().role !== 'admin') {
    throw new Error('Only super admins can list estate admins');
  }

  const usersRef = ref(db, 'users');
  const snapshot = await get(usersRef);

  if (!snapshot.exists()) {
    return [];
  }

  const estateAdmins: User[] = [];
  snapshot.forEach((child) => {
    const user = child.val() as User;
    if (user.role === 'estate_admin' && user.estateId === estateId) {
      estateAdmins.push(user);
    }
  });

  return estateAdmins;
};
