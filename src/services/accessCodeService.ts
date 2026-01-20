import { getFirebaseDatabase } from '@/lib/firebase';
import { ref, push, set, get, query, orderByChild, equalTo, update, remove } from 'firebase/database';
import * as QRCodeLib from 'qrcode';
import { AccessCode } from '@/types/user';
// import { verifyHouseholdMembership } from './householdService'; // TODO: Re-enable if needed

// Rate limiting constants
const MAX_CODES_PER_HOUR = 10;
const MAX_CODES_PER_DAY = 50;
const RATE_LIMIT_RESET_HOUR = 60 * 60 * 1000; // 1 hour in milliseconds
const RATE_LIMIT_RESET_DAY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Security logging function
const logSecurityEvent = async (event: string, userId: string, details: Record<string, any> = {}) => {
  try {
    const db = await getFirebaseDatabase();
    const securityLogRef = ref(db, 'securityLogs');
    const newLogRef = push(securityLogRef);

    if (newLogRef.key) {
      const logEntry = {
        id: newLogRef.key,
        event,
        userId,
        timestamp: Date.now(),
        details,
        userAgent: typeof window !== 'undefined' ? window.navigator?.userAgent : 'Server',
      };

      await set(newLogRef, logEntry);
      console.log(`🔐 Security Event Logged: ${event} for user ${userId}`);
    }
  } catch (error) {
    console.error('Failed to log security event:', error);
    // Don't throw error - logging failure shouldn't break the main functionality
  }
};

// Check rate limits for access code creation
const checkRateLimit = async (userId: string): Promise<{ allowed: boolean; message?: string }> => {
  const db = await getFirebaseDatabase();
  const now = Date.now();

  try {
    // Get user's recent access codes
    const userCodesRef = ref(db, `accessCodesByUser/${userId}`);
    const snapshot = await get(userCodesRef);

    if (!snapshot.exists()) {
      return { allowed: true }; // No codes yet, allow creation
    }

    const codeIds = Object.keys(snapshot.val());
    const codes: AccessCode[] = [];

    // Fetch all codes to check timestamps
    for (const codeId of codeIds) {
      const codeRef = ref(db, `accessCodes/${codeId}`);
      const codeSnapshot = await get(codeRef);
      if (codeSnapshot.exists()) {
        codes.push(codeSnapshot.val() as AccessCode);
      }
    }

    // Check hourly limit
    const oneHourAgo = now - RATE_LIMIT_RESET_HOUR;
    const codesInLastHour = codes.filter(code => code.createdAt > oneHourAgo);

    if (codesInLastHour.length >= MAX_CODES_PER_HOUR) {
      const resetTime = new Date(oneHourAgo + RATE_LIMIT_RESET_HOUR).toLocaleTimeString();
      return {
        allowed: false,
        message: `Rate limit exceeded. You can create up to ${MAX_CODES_PER_HOUR} codes per hour. Try again after ${resetTime}.`
      };
    }

    // Check daily limit
    const oneDayAgo = now - RATE_LIMIT_RESET_DAY;
    const codesInLastDay = codes.filter(code => code.createdAt > oneDayAgo);

    if (codesInLastDay.length >= MAX_CODES_PER_DAY) {
      const resetTime = new Date(oneDayAgo + RATE_LIMIT_RESET_DAY).toLocaleTimeString();
      return {
        allowed: false,
        message: `Daily limit exceeded. You can create up to ${MAX_CODES_PER_DAY} codes per day. Try again tomorrow.`
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Error checking rate limit:', error);
    // On error, allow creation but log the issue
    return { allowed: true };
  }
};

// Generate a random access code
export const generateAccessCode = (): string => {
  const prefix = 'MUSA';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  
  // Generate 6 random characters
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return `${prefix}${result}`;
};

// Create a new access code for a resident
export const createAccessCode = async (
  userId: string,
  householdId: string,
  description?: string,
  expiresAt?: number,
  estateId?: string
): Promise<{ code: string; qrCode: string }> => {
  // Ensure the database is initialized via lazy loading
  const db = await getFirebaseDatabase();

  try {
    console.log('Creating access code for user:', userId, 'household:', householdId, 'estate:', estateId);

    // Enhanced Security: Verify household membership before proceeding
    // TODO: Re-enable household membership verification if needed
    // console.log('🔒 Verifying household membership for security...');
    // const isValidMember = await verifyHouseholdMembership(userId, householdId);
    // if (!isValidMember) {
    //   console.error('❌ Security violation: User is not a valid household member');
    //   await logSecurityEvent('HOUSEHOLD_MEMBERSHIP_VIOLATION', userId, {
    //     attemptedHouseholdId: householdId,
    //     reason: 'User is not a valid household member'
    //   });
    //   throw new Error('Unauthorized: You must be a member of the household to create access codes');
    // }
    // console.log('✅ Household membership verified successfully');

    // Enhanced Estate Security: Verify estate boundaries
    // Get user data to verify their estate
    const userRef = ref(db, `users/${userId}`);
    const userSnapshot = await get(userRef);
    if (!userSnapshot.exists()) {
      throw new Error('User not found');
    }
    const user = userSnapshot.val();

    // Get household data to verify its estate
    const householdRef = ref(db, `households/${householdId}`);
    const householdSnapshot = await get(householdRef);
    if (!householdSnapshot.exists()) {
      throw new Error('Household not found');
    }
    const household = householdSnapshot.val();

    // Use the user's estateId if not provided
    if (!estateId) {
      estateId = user.estateId || household.estateId;
    }

    if (!estateId) {
      throw new Error('Estate ID is required for access code creation');
    }

    console.log('🔒 Verifying estate boundaries...', { userEstate: user.estateId, householdEstate: household.estateId, providedEstate: estateId });

    // Verify estate consistency - user must belong to the estate
    if (user.estateId && user.estateId !== estateId) {
      console.error('❌ Estate violation: User estate mismatch', { userEstate: user.estateId, providedEstate: estateId });

      await logSecurityEvent('ESTATE_BOUNDARY_VIOLATION', userId, {
        userEstateId: user.estateId,
        providedEstateId: estateId,
        householdId,
        reason: 'User does not belong to the specified estate'
      });

      throw new Error('Unauthorized: You do not have access to create codes for this estate');
    }

    // Verify household belongs to the same estate (if household has an estate)
    if (household.estateId && household.estateId !== estateId) {
      console.error('❌ Estate violation: Household estate mismatch', { householdEstate: household.estateId, providedEstate: estateId });

      await logSecurityEvent('ESTATE_BOUNDARY_VIOLATION', userId, {
        householdEstateId: household.estateId,
        providedEstateId: estateId,
        householdId,
        reason: 'Household does not belong to the specified estate'
      });

      throw new Error('Unauthorized: Household does not belong to the specified estate');
    }

    console.log('✅ Estate boundaries verified successfully');

    // Check rate limits
    console.log('🔒 Checking rate limits...');
    const rateLimitCheck = await checkRateLimit(userId);
    if (!rateLimitCheck.allowed) {
      console.error('❌ Rate limit exceeded for user:', userId);

      // Log rate limit violation
      await logSecurityEvent('RATE_LIMIT_VIOLATION', userId, {
        limitType: 'access_code_creation',
        message: rateLimitCheck.message
      });

      throw new Error(rateLimitCheck.message || 'Rate limit exceeded');
    }
    console.log('✅ Rate limit check passed');

    // Generate a unique code
    const code = generateAccessCode();
    console.log('Generated unique code:', code);
    
    // Generate QR code
    console.log('Generating QR code...');
    const qrCode = await QRCodeLib.toDataURL(code);
    console.log('QR code generated successfully, length:', qrCode?.length || 0);
    
    // Create the access code record
    console.log('Creating access code record in Firebase...');
    const accessCodesRef = ref(db, 'accessCodes');
    const newCodeRef = push(accessCodesRef);
    
    if (!newCodeRef.key) {
      console.error('Failed to generate access code ID');
      throw new Error('Failed to generate access code ID');
    }
    
    console.log('Generated access code ID:', newCodeRef.key);
    const now = Date.now();
    const accessCode: AccessCode = {
      id: newCodeRef.key,
      code,
      userId,
      householdId,
      estateId, // Include estate ID for proper isolation
      description,
      qrCode,
      createdAt: now,
      expiresAt,
      isActive: true,
      usageCount: 0
    };
    
    // Save the access code
    console.log('Saving access code to Firebase...');
    await set(newCodeRef, accessCode);
    console.log('Access code saved successfully');
    
    // Save access code indexes for quick lookups
    console.log('Creating index entries...');
    const updates: { [key: string]: any } = {};
    updates[`accessCodesByCode/${code}`] = newCodeRef.key;
    updates[`accessCodesByUser/${userId}/${newCodeRef.key}`] = true;
    updates[`accessCodesByHousehold/${householdId}/${newCodeRef.key}`] = true;
    if (estateId) {
      updates[`accessCodesByEstate/${estateId}/${newCodeRef.key}`] = true;
    }
    await update(ref(db), updates);
    console.log('Index entries created successfully');

    // Log successful access code creation
    await logSecurityEvent('ACCESS_CODE_CREATED', userId, {
      accessCodeId: newCodeRef.key,
      householdId,
      estateId,
      description,
      expiresAt
    });

    // Explicitly log and construct the return value
    const result = { code, qrCode };
    console.log('Returning result:', { code, qrCodeLength: qrCode?.length || 0 });
    return result;
  } catch (error) {
    console.error('Error creating access code:', error);
    throw new Error('Failed to create access code');
  }
};

// Import the getHousehold function from householdService
import { getHousehold } from './householdService';
import { Household } from '@/types/user';

// Verify if an access code is valid
export const verifyAccessCode = async (
  code: string,
  options?: { estateId?: string }
): Promise<{ 
  isValid: boolean; 
  message?: string; 
  household?: Household;
  destinationAddress?: string;
  accessCodeId?: string;
  estateId?: string;
}> => {
  // Ensure the database is initialized
  const db = await getFirebaseDatabase();
  console.log('Verifying access code:', code);

  try {
    if (!code || code.trim() === '') {
      console.log('Empty code provided');
      return { isValid: false, message: 'Please provide an access code' };
    }

    // Check if the code exists in our quick lookup index
    console.log('Checking if code exists in database...');
    const codeKeyRef = ref(db, `accessCodesByCode/${code}`);
    const codeKeySnapshot = await get(codeKeyRef);
    
    if (!codeKeySnapshot.exists()) {
      console.log('Code not found in lookup index');
      return { isValid: false, message: 'Invalid access code' };
    }
    
    const codeId = codeKeySnapshot.val();
    console.log('Found code ID:', codeId);

    if (!codeId) {
      console.log('Code ID is empty or invalid');
      return { isValid: false, message: 'Invalid access code reference' };
    }
    
    // Get the actual access code data
    console.log('Getting access code data...');
    const codeRef = ref(db, `accessCodes/${codeId}`);
    const codeSnapshot = await get(codeRef);
    
    if (!codeSnapshot.exists()) {
      console.log('Access code not found at path:', `accessCodes/${codeId}`);
      return { isValid: false, message: 'Access code not found' };
    }
    
    const accessCode = codeSnapshot.val() as AccessCode;
    console.log('Access code details:', { 
      id: accessCode.id,
      isActive: accessCode.isActive,
      expiresAt: accessCode.expiresAt,
      estateId: accessCode.estateId,
      currentTime: Date.now()
    });

    // Enhanced Estate Security: MANDATORY estate verification
    // Both guard and access code MUST have estateId for verification to proceed
    
    if (!options?.estateId) {
      console.error('❌ CRITICAL: Guard has no estateId assigned');
      await logSecurityEvent('GUARD_NO_ESTATE', 'system', {
        accessCodeId: accessCode.id,
        reason: 'Guard attempting verification without estate assignment'
      });
      return { 
        isValid: false, 
        message: 'Security error: Guard must be assigned to an estate to verify codes.'
      };
    }

    if (!accessCode.estateId) {
      console.error('❌ CRITICAL: Access code has no estateId');
      await logSecurityEvent('CODE_NO_ESTATE', 'system', {
        accessCodeId: accessCode.id,
        guardEstateId: options.estateId,
        reason: 'Access code missing estate assignment'
      });
      return { 
        isValid: false, 
        message: 'Security error: This access code is invalid (no estate assignment).'
      };
    }

    // Now verify they match
    if (accessCode.estateId !== options.estateId) {
      console.error('❌ Estate boundary violation: Code belongs to different estate', {
        codeEstate: accessCode.estateId,
        guardEstate: options.estateId
      });

      await logSecurityEvent('ESTATE_BOUNDARY_VIOLATION', 'system', {
        accessCodeId: accessCode.id,
        codeEstateId: accessCode.estateId,
        guardEstateId: options.estateId,
        reason: 'Access code does not belong to guard\'s estate'
      });

      // Generic error message - don't reveal estate details to guard
      return { 
        isValid: false, 
        message: 'Code invalid'
      };
    }
    
    console.log('✅ Estate boundary check passed:', {
      codeEstate: accessCode.estateId,
      guardEstate: options.estateId
    });

    // Check if code is expired
    if (accessCode.expiresAt && accessCode.expiresAt < Date.now()) {
      console.log('Access code expired', { 
        expiresAt: new Date(accessCode.expiresAt).toISOString(), 
        now: new Date().toISOString() 
      });
      return { isValid: false, message: 'Access code has expired' };
    }

    // Check if code is active
    if (!accessCode.isActive) {
      console.log('Access code is inactive');
      return { isValid: false, message: 'Access code is inactive' };
    }

    // Fetch household information using the householdId from access code
    console.log('Fetching household information for ID:', accessCode.householdId);
    const householdData = await getHousehold(accessCode.householdId);
    const household = householdData || undefined; // Convert null to undefined to match type
    let destinationAddress = '';
    
    if (household) {
      // Construct a formatted destination address from household info
      const addressParts = [];
      if (household.address) addressParts.push(household.address);
      if (household.addressLine2) addressParts.push(household.addressLine2);
      
      const cityStatePostal = [];
      if (household.city) cityStatePostal.push(household.city);
      if (household.state) cityStatePostal.push(household.state);
      if (household.postalCode) cityStatePostal.push(household.postalCode);
      
      if (cityStatePostal.length > 0) addressParts.push(cityStatePostal.join(', '));
      if (household.country) addressParts.push(household.country);
      
      destinationAddress = addressParts.join('\n');
      console.log('Destination address found:', destinationAddress || 'No address on record');
    } else {
      console.log('No household found for ID:', accessCode.householdId);
    }

    // Increment usage count
    console.log('Access code is valid, incrementing usage count...');
    const newUsageCount = (accessCode.usageCount || 0) + 1;
    try {
      await update(codeRef, { 
        usageCount: newUsageCount,
        lastUsed: Date.now()
      });
      console.log('Usage count updated successfully');
    } catch (updateError) {
      // Not critical, still return valid but log the error
      console.error('Failed to update usage count:', updateError);
    }

    console.log('Access code verification successful!');
    return { 
      isValid: true, 
      message: 'Access granted', 
      household, 
      destinationAddress,
      accessCodeId: accessCode.id,
      estateId: accessCode.estateId
    };
  } catch (error) {
    console.error('Error verifying access code:', error);
    // Return a user-friendly error instead of throwing
    return { 
      isValid: false, 
      message: 'An error occurred while verifying the access code. Please try again.'
    };
  }
};

// Get all active access codes for a resident
export const getResidentAccessCodes = async (userId: string): Promise<AccessCode[]> => {
  // Ensure the database is initialized via lazy loading
  const db = await getFirebaseDatabase();

  try {
    // Get the code IDs from the index
    const userCodesRef = ref(db, `accessCodesByUser/${userId}`);
    const snapshot = await get(userCodesRef);
    
    if (!snapshot.exists()) {
      return [];
    }
    
    const codeIds = Object.keys(snapshot.val());
    
    // Fetch each access code
    const accessCodes: AccessCode[] = [];
    for (const codeId of codeIds) {
      const codeRef = ref(db, `accessCodes/${codeId}`);
      const codeSnapshot = await get(codeRef);
      
      if (codeSnapshot.exists()) {
        accessCodes.push(codeSnapshot.val() as AccessCode);
      }
    }
    
    return accessCodes;
  } catch (error) {
    console.error('Error getting resident access codes:', error);
    throw new Error('Failed to get access codes');
  }
};

// Get all active access codes for a household
export const getHouseholdAccessCodes = async (householdId: string): Promise<AccessCode[]> => {
  // Ensure the database is initialized via lazy loading
  const db = await getFirebaseDatabase();

  try {
    // Get the code IDs from the index
    const householdCodesRef = ref(db, `accessCodesByHousehold/${householdId}`);
    const snapshot = await get(householdCodesRef);
    
    if (!snapshot.exists()) {
      return [];
    }
    
    const codeIds = Object.keys(snapshot.val());
    
    // Fetch each access code
    const accessCodes: AccessCode[] = [];
    for (const codeId of codeIds) {
      const codeRef = ref(db, `accessCodes/${codeId}`);
      const codeSnapshot = await get(codeRef);
      
      if (codeSnapshot.exists()) {
        accessCodes.push(codeSnapshot.val() as AccessCode);
      }
    }
    
    return accessCodes;
  } catch (error) {
    console.error('Error getting household access codes:', error);
    throw new Error('Failed to get access codes');
  }
};

// Deactivate an access code
export const deactivateAccessCode = async (codeId: string, userId: string): Promise<void> => {
  // Ensure the database is initialized via lazy loading
  const db = await getFirebaseDatabase();

  try {
    // Get the access code
    const codeRef = ref(db, `accessCodes/${codeId}`);
    const snapshot = await get(codeRef);
    
    if (!snapshot.exists()) {
      throw new Error('Access code not found');
    }
    
    const accessCode = snapshot.val() as AccessCode;
    
    // Ensure the user owns this code
    if (accessCode.userId !== userId) {
      throw new Error('Unauthorized access to this code');
    }
    
    // Deactivate the code
    await update(codeRef, { isActive: false });
  } catch (error) {
    console.error('Error deactivating access code:', error);
    throw new Error('Failed to deactivate access code');
  }
};
