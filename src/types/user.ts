export type UserRole = 'guard' | 'resident' | 'admin';

export type UserStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  status: UserStatus;
  isEmailVerified: boolean;
  householdId?: string;
  isHouseholdHead?: boolean;
  createdAt: number;
  lastLogin?: number;
  approvedBy?: string; // UID of admin who approved
  approvedAt?: number; // Timestamp of approval
  rejectedBy?: string; // UID of admin who rejected
  rejectedAt?: number; // Timestamp of rejection
  rejectionReason?: string; // Reason if rejected
}

export interface Household {
  id: string;
  name: string;
  headId: string; // The family head's user ID
  members: Record<string, boolean>; // User IDs of household members
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
