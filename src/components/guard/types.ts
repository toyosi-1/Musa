export interface Household {
  id: string;
  address: string;
}

export interface VerificationRecord {
  id: string;
  timestamp: number;
  code: string;
  guardId: string;
  isValid: boolean;
  message: string;
  householdId?: string;
  destinationAddress?: string;
}

export interface VerificationResult {
  isValid: boolean;
  message: string;
  household?: Household;
  destinationAddress?: string;
}

export interface ActivityStats {
  totalVerifications: number;
  validAccess: number;
  deniedAccess: number;
  todayVerifications: number;
}
