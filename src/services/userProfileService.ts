/**
 * User-profile service.
 *
 * Formerly lived inline in `AuthContext.tsx`. Extracted so that profile
 * fetching, retry-on-cold-start logic, and memory caching can be reasoned
 * about (and tested) independently of the React context.
 */
import type { User as FirebaseUser } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { getFirebaseDatabase } from '@/lib/firebase';
import type { User } from '@/types/user';
import {
  getMemoryCached,
  setMemoryCached,
  persistUserProfile,
} from '@/utils/userProfileCache';

const DB_TIMEOUT_MS = 5000;
const PROFILE_MAX_RETRIES = 6;
const PROFILE_RETRY_DELAY_MS = 500;

function logError(message: string, error: unknown): void {
  console.error(`🔴 ${message}:`, error);
  if (error instanceof Error) {
    console.error(`  Message: ${error.message}`);
    console.error(`  Stack: ${error.stack}`);
  }
}

/**
 * Wrap a Firebase DB fetch in a timeout so a slow network doesn't hang auth.
 * Returns the snapshot value or null on timeout.
 */
async function fetchWithTimeout(uid: string) {
  const db = await getFirebaseDatabase();
  const userRef = ref(db, `users/${uid}`);
  const fetchPromise = get(userRef);
  const timeoutPromise = new Promise<null>((_, reject) => {
    setTimeout(() => reject(new Error('Database operation timed out')), DB_TIMEOUT_MS);
  });
  return (await Promise.race([fetchPromise, timeoutPromise])) as any;
}

/**
 * Convert a Firebase Auth user + our DB record into our app's `User` type.
 *
 * Retries on cold-start races where the `users/$uid` node hasn't been written
 * yet (common immediately after signUp). Caches the result on success.
 */
export async function formatUser(firebaseUser: FirebaseUser): Promise<User> {
  const startTime = performance.now();
  let snapshot: any = null;

  for (let attempt = 0; attempt < PROFILE_MAX_RETRIES; attempt++) {
    try {
      snapshot = await fetchWithTimeout(firebaseUser.uid);
    } catch (dbError) {
      logError('Database fetch error', dbError);
      if (attempt < PROFILE_MAX_RETRIES - 1) {
        await new Promise((res) => setTimeout(res, PROFILE_RETRY_DELAY_MS));
        continue;
      }
      throw dbError;
    }

    if (snapshot && snapshot.exists()) break;

    if (attempt < PROFILE_MAX_RETRIES - 1) {
      console.warn(`User record not found yet, retrying (${attempt + 1}/${PROFILE_MAX_RETRIES - 1})...`);
      await new Promise((res) => setTimeout(res, PROFILE_RETRY_DELAY_MS));
    }
  }

  if (!snapshot || !snapshot.exists()) {
    console.error('SECURITY ERROR: User not found in database during formatUser:', firebaseUser.uid);
    throw new Error('User not found in database and role unknown');
  }

  console.log(`User database lookup completed in ${performance.now() - startTime}ms`);
  const userData = snapshot.val();
  if (!userData) throw new Error('User data is null or undefined');

  const formattedUser: User = {
    uid: firebaseUser.uid,
    email: firebaseUser.email || '',
    displayName: userData.displayName || firebaseUser.displayName || 'User',
    role: userData.role || 'resident',
    status: userData.status || 'approved',
    isEmailVerified: firebaseUser.emailVerified,
    createdAt: userData.createdAt || Date.now(),
    ...(userData.estateId && { estateId: userData.estateId }),
    ...(userData.householdId && { householdId: userData.householdId }),
    ...(userData.isHouseholdHead && { isHouseholdHead: userData.isHouseholdHead }),
    ...(userData.approvedBy && { approvedBy: userData.approvedBy }),
    ...(userData.approvedAt && { approvedAt: userData.approvedAt }),
    ...(userData.rejectedBy && { rejectedBy: userData.rejectedBy }),
    ...(userData.rejectedAt && { rejectedAt: userData.rejectedAt }),
    ...(userData.rejectionReason && { rejectionReason: userData.rejectionReason }),
  };

  try {
    setMemoryCached(formattedUser);
    persistUserProfile(formattedUser);
  } catch (cacheError) {
    console.warn('Failed to cache user data:', cacheError);
  }

  return formattedUser;
}

/**
 * Fetch a user profile by uid, preferring the in-memory cache.
 * Returns null if the user is not found or the DB is unreachable — callers
 * treat a null here as "we don't know" rather than an authoritative absence.
 */
export async function fetchUserProfile(uid: string): Promise<User | null> {
  const cached = getMemoryCached(uid);
  if (cached) {
    console.log('Using cached user profile data');
    return cached;
  }

  try {
    const snapshot = await fetchWithTimeout(uid);
    if (snapshot && snapshot.exists()) {
      const userData = snapshot.val() as User;
      setMemoryCached(userData);
      return userData;
    }
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
}
