export type UserRole = 'guard' | 'resident';

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  isEmailVerified: boolean;
  householdId?: string;
  isHouseholdHead?: boolean;
  createdAt: number;
  lastLogin?: number;
}

export interface Household {
  id: string;
  name: string;
  headId: string; // The family head's user ID
  members: Record<string, boolean>; // User IDs of household members
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
