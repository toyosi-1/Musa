import { rtdb } from '@/lib/firebase';
import { ref, push, set, get, query, orderByChild, equalTo, update, remove } from 'firebase/database';
import * as QRCodeLib from 'qrcode';
import { AccessCode } from '@/types/user';

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
  expiresAt?: number
): Promise<{ code: string; qrCode: string }> => {
  // Ensure the database is initialized
  console.log('Using Firebase rtdb for access code operations:', rtdb);

  try {
    console.log('Creating access code for user:', userId, 'household:', householdId);
    
    // Generate a unique code
    const code = generateAccessCode();
    console.log('Generated unique code:', code);
    
    // Generate QR code
    console.log('Generating QR code...');
    const qrCode = await QRCodeLib.toDataURL(code);
    console.log('QR code generated successfully, length:', qrCode?.length || 0);
    
    // Create the access code record
    console.log('Creating access code record in Firebase...');
    const accessCodesRef = ref(rtdb, 'accessCodes');
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
    await update(ref(rtdb), updates);
    console.log('Index entries created successfully');
    
    // Explicitly log and construct the return value
    const result = { code, qrCode };
    console.log('Returning result:', { code, qrCodeLength: qrCode?.length || 0 });
    return result;
  } catch (error) {
    console.error('Error creating access code:', error);
    throw new Error('Failed to create access code');
  }
};

// Verify if an access code is valid
export const verifyAccessCode = async (code: string): Promise<{ isValid: boolean; message?: string }> => {
  // Ensure the database is initialized
  console.log('Verifying access code:', code);

  try {
    if (!code || code.trim() === '') {
      console.log('Empty code provided');
      return { isValid: false, message: 'Please provide an access code' };
    }

    // Check if the code exists in our quick lookup index
    console.log('Checking if code exists in database...');
    const codeKeyRef = ref(rtdb, `accessCodesByCode/${code}`);
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
    const codeRef = ref(rtdb, `accessCodes/${codeId}`);
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
      currentTime: Date.now()
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
    return { isValid: true, message: 'Access granted' };
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
  // Ensure the database is initialized
  console.log('Using Firebase rtdb for access code operations:', rtdb);

  try {
    // Get the code IDs from the index
    const userCodesRef = ref(rtdb, `accessCodesByUser/${userId}`);
    const snapshot = await get(userCodesRef);
    
    if (!snapshot.exists()) {
      return [];
    }
    
    const codeIds = Object.keys(snapshot.val());
    
    // Fetch each access code
    const accessCodes: AccessCode[] = [];
    for (const codeId of codeIds) {
      const codeRef = ref(rtdb, `accessCodes/${codeId}`);
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
  // Ensure the database is initialized
  console.log('Using Firebase rtdb for access code operations:', rtdb);

  try {
    // Get the code IDs from the index
    const householdCodesRef = ref(rtdb, `accessCodesByHousehold/${householdId}`);
    const snapshot = await get(householdCodesRef);
    
    if (!snapshot.exists()) {
      return [];
    }
    
    const codeIds = Object.keys(snapshot.val());
    
    // Fetch each access code
    const accessCodes: AccessCode[] = [];
    for (const codeId of codeIds) {
      const codeRef = ref(rtdb, `accessCodes/${codeId}`);
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
  // Ensure the database is initialized
  console.log('Using Firebase rtdb for access code operations:', rtdb);

  try {
    // Get the access code
    const codeRef = ref(rtdb, `accessCodes/${codeId}`);
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
