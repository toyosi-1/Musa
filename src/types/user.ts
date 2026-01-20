export type UserRole = 'guard' | 'resident' | 'admin' | 'estate_admin';

export type UserStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  status: UserStatus;
  isEmailVerified: boolean;
  // Each user belongs to a specific estate (multi-tenant boundary)
  estateId?: string;
  householdId?: string;
  isHouseholdHead?: boolean;
  createdAt: number;
  lastLogin?: number;
  approvedBy?: string; // UID of admin who approved
  approvedAt?: number; // Timestamp of approval
  rejectedBy?: string; // UID of admin who rejected
  rejectedAt?: number; // Timestamp of rejection
  rejectionReason?: string; // Reason if rejected
  // Estate admin specific fields
  canApproveUsers?: boolean; // For estate_admin role
  canAssignHoH?: boolean; // For estate_admin role
  createdBy?: string; // UID of admin who created this user
}

export interface Household {
  id: string;
  name: string;
  headId: string; // The family head's user ID
  members: Record<string, boolean>; // User IDs of household members
  // The estate this household belongs to
  estateId?: string;
  address?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  createdAt: number;
  updatedAt: number;
}

export interface AccessCode {
  id: string;
  code: string;
  userId: string;
  householdId: string;
  // The estate this code belongs to (enforces cross-estate isolation)
  estateId?: string;
  description?: string;
  qrCode?: string;
  createdAt: number;
  expiresAt?: number;
  isActive: boolean;
  usageCount: number;
}

export interface HouseholdInvite {
  id: string;
  householdId: string;
  invitedBy: string;
  email: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: number;
  expiresAt: number;
}

export interface Estate {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  // Admin who created the estate
  createdBy?: string;
  // If true, estate is locked for new approvals/creations depending on policy
  isLocked?: boolean;
}
