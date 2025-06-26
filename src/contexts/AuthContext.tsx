"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole, UserStatus } from '@/types/user';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { ref, get, set, update, onValue } from 'firebase/database';
import { getFirebaseAuth, getFirebaseDatabase, waitForFirebase } from '@/lib/firebase';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  initError: string | null;
  signUp: (email: string, password: string, displayName: string, role: UserRole) => Promise<User>;
  signIn: (email: string, password: string) => Promise<User>;
  signOut: () => Promise<void>;
  getUserProfile: (uid: string) => Promise<User | null>;
  approveUser: (uid: string, adminUid: string) => Promise<void>;
  rejectUser: (uid: string, adminUid: string, reason: string) => Promise<void>;
  getPendingUsers: () => Promise<User[]>;
  batchApproveUsers: (uids: string[], adminUid: string) => Promise<void>;
  batchRejectUsers: (uids: string[], adminUid: string, reason: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  // Convert Firebase user to our User type with optimized database operations
  const formatUser = async (firebaseUser: FirebaseUser): Promise<User | null> => {
    try {
      const startTime = performance.now();
      const db = await getFirebaseDatabase();
      const userRef = ref(db, `users/${firebaseUser.uid}`);
      
      // Create a promise with timeout
      const fetchPromise = get(userRef);
      const timeoutPromise = new Promise<null>((_, reject) => {
        setTimeout(() => reject(new Error('Database operation timed out')), 5000);
      });
      
      // Race the fetch against the timeout
      let snapshot;
      try {
        snapshot = await Promise.race([fetchPromise, timeoutPromise]) as any;
      } catch (dbError) {
        logError('Database fetch error', dbError);
        throw dbError;
      }
      
      if (snapshot && snapshot.exists()) {
        // User exists in our database, return with role and other metadata
        console.log(`User database lookup completed in ${performance.now() - startTime}ms`);
        const userData = snapshot.val();
        
        // Perform additional validation on user data
        if (!userData) {
          throw new Error('User data is null or undefined');
        }
        
        const formattedUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: userData.displayName || firebaseUser.displayName || 'User',
          role: userData.role || 'resident',
          status: userData.status || 'approved',
          isEmailVerified: firebaseUser.emailVerified,
          createdAt: userData.createdAt || Date.now(),
          // Include household information
          ...(userData.householdId && { householdId: userData.householdId }),
          ...(userData.isHouseholdHead && { isHouseholdHead: userData.isHouseholdHead }),
          // Include additional fields if they exist
          ...(userData.approvedBy && { approvedBy: userData.approvedBy }),
          ...(userData.approvedAt && { approvedAt: userData.approvedAt }),
          ...(userData.rejectedBy && { rejectedBy: userData.rejectedBy }),
          ...(userData.rejectedAt && { rejectedAt: userData.rejectedAt }),
          ...(userData.rejectionReason && { rejectionReason: userData.rejectionReason })
        };
        
        // Log the user data for debugging
        console.log('Formatted user:', {
          uid: formattedUser.uid,
          email: formattedUser.email,
          role: formattedUser.role,
          status: formattedUser.status
        });
        
        // Cache the user data
        try {
          userProfileCache.set(firebaseUser.uid, {
            user: formattedUser,
            timestamp: Date.now()
          });
        } catch (cacheError) {
          console.warn('Failed to cache user data:', cacheError);
          // Non-critical error, continue
        }
        
        return formattedUser;
      } else {
        // User not found in our database, create a new entry
        console.log(`User ${firebaseUser.uid} not found in database, creating new entry`);
        
        const newUser: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || 'User',
          role: 'resident', // Default role
          status: 'pending', // New users need approval
          isEmailVerified: firebaseUser.emailVerified,
          createdAt: Date.now()
        };
        
        // Save user to database with timeout
        try {
          const savePromise = set(userRef, newUser);
          const saveTimeoutPromise = new Promise<null>((_, reject) => {
            setTimeout(() => reject(new Error('Save operation timed out')), 5000);
          });
          
          await Promise.race([savePromise, saveTimeoutPromise]);
          console.log(`New user saved to database: ${newUser.uid}`);
          
          // Add to pending users for admin approval - skip if timed out above
          const pendingUserRef = ref(db, `pendingUsers/${firebaseUser.uid}`);
          await set(pendingUserRef, true).catch(err => {
            console.warn('Failed to add user to pending list:', err);
            // Continue anyway as the user object is created
          });
        } catch (saveError) {
          logError('Failed to save new user to database', saveError);
          // Continue and return the user object anyway
        }
        
        // Cache the user data
        try {
          userProfileCache.set(firebaseUser.uid, {
            user: newUser,
            timestamp: Date.now()
          });
        } catch (cacheError) {
          console.warn('Failed to cache new user data:', cacheError);
          // Non-critical error, continue
        }
        
        console.log(`New user created in ${performance.now() - startTime}ms:`, {
          uid: newUser.uid,
          email: newUser.email,
          role: newUser.role,
          status: newUser.status
        });
        return newUser;
      }
    } catch (error) {
      logError('Error formatting user', error);
      
      // If we time out or have database errors, return a basic user object anyway so the user isn't locked out
      if (error instanceof Error) {
        console.log('Creating fallback user due to error:', error.message);
        const fallbackUser: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || 'User',
          role: 'resident' as UserRole, // Default role with type assertion
          status: 'approved' as UserStatus, // Assume approved for error cases
          isEmailVerified: firebaseUser.emailVerified,
          createdAt: Date.now()
        };
        
        return fallbackUser;
      }
      
      return null;
    }
  };

  // Sign up a new user
  const signUp = async (
    email: string, 
    password: string, 
    displayName: string,
    role: UserRole
  ): Promise<User> => {
    try {
      const auth = await getFirebaseAuth();
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create user in our database
      const db = await getFirebaseDatabase();
      const userRef = ref(db, `users/${result.user.uid}`);
      const newUser: User = {
        uid: result.user.uid,
        email,
        displayName,
        role,
        status: 'pending', // New users need approval
        isEmailVerified: result.user.emailVerified,
        createdAt: Date.now()
      };
      
      // Save user to database
      await set(userRef, newUser);
      
      // Add to pending users for admin approval
      const pendingUserRef = ref(db, `pendingUsers/${result.user.uid}`);
      await set(pendingUserRef, true);
      
      console.log('New user signed up and added to pending list:', newUser.uid);
      return newUser;
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  };

  // Cache for user profiles to reduce database reads - declare at the top of AuthProvider
  const userProfileCache = new Map<string, {user: User, timestamp: number}>();
  const CACHE_EXPIRY = 10 * 60 * 1000; // 10 minutes in milliseconds
  
  // Add debug function to log errors with more detail
  const logError = (message: string, error: any) => {
    console.error(`🔴 ${message}:`, error);
    if (error instanceof Error) {
      console.error(`  Message: ${error.message}`);
      console.error(`  Stack: ${error.stack}`);
    } else {
      console.error('  Non-Error object:', error);
    }
  };

  // Get user profile with caching
  const getCachedUserProfile = async (uid: string): Promise<User | null> => {
    // Check if we have a cached version
    const cachedData = userProfileCache.get(uid);
    const now = Date.now();
    
    if (cachedData && (now - cachedData.timestamp < CACHE_EXPIRY)) {
      console.log('Using cached user profile data');
      return cachedData.user;
    }
    
    // No cache or expired, fetch from database with timeout
    try {
      const db = await getFirebaseDatabase();
      const userRef = ref(db, `users/${uid}`);
      
      // Create a promise with timeout
      const fetchPromise = get(userRef);
      const timeoutPromise = new Promise<null>((_, reject) => {
        setTimeout(() => reject(new Error('Database operation timed out')), 5000);
      });
      
      // Race the fetch against the timeout
      const snapshot = await Promise.race([fetchPromise, timeoutPromise]) as any;
      
      if (snapshot && snapshot.exists()) {
        const userData = snapshot.val() as User;
        // Cache the result
        userProfileCache.set(uid, {user: userData, timestamp: now});
        return userData;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  };

  // Sign in an existing user
  const signIn = async (email: string, password: string): Promise<User> => {
    try {
      const startTime = performance.now();
      console.log(`Attempting to sign in user: ${email}`, new Date().toISOString());
      
      if (!await getFirebaseAuth()) {
        throw new Error('Authentication service is not initialized');
      }
      
      // Try to authenticate with Firebase
      console.log('Calling Firebase signInWithEmailAndPassword...');
      const authStartTime = performance.now();
      
      let result;
      try {
        const auth = await getFirebaseAuth();
        result = await signInWithEmailAndPassword(auth, email, password);
        console.log(`Firebase authentication completed in ${performance.now() - authStartTime}ms`);
      } catch (authError) {
        logError('Firebase authentication failed', authError);
        throw authError; // Re-throw to be handled by outer catch
      }
      
      if (!result || !result.user) {
        throw new Error('Authentication succeeded but user data is missing');
      }
      
      // Get additional user data from our database
      console.log('Fetching user profile...');
      const dbStartTime = performance.now();
      
      // Try to get from cache first, fall back to formatUser
      let formattedUser;
      try {
        formattedUser = await getCachedUserProfile(result.user.uid);
        
        // If not in cache or cache expired, format the user
        if (!formattedUser) {
          formattedUser = await formatUser(result.user);
        }
        console.log(`Database operations completed in ${performance.now() - dbStartTime}ms`);
      } catch (dbError) {
        logError('Error fetching user profile', dbError);
        
        // Always fallback to basic user info on database errors
        formattedUser = {
          uid: result.user.uid,
          email: result.user.email || '',
          displayName: result.user.displayName || 'User',
          role: 'resident' as UserRole, // Default role with type assertion
          status: 'approved' as UserStatus, // Default status with type assertion
          isEmailVerified: result.user.emailVerified,
          createdAt: Date.now()
        };
      }
      
      if (!formattedUser) {
        console.error('User authenticated but failed to retrieve profile from database');
        
        // Fallback to basic user info to let them in anyway
        formattedUser = {
          uid: result.user.uid,
          email: result.user.email || '',
          displayName: result.user.displayName || 'User',
          role: 'resident' as UserRole, // Default role with type assertion
          status: 'approved' as UserStatus, // Default status with type assertion
          isEmailVerified: result.user.emailVerified,
          createdAt: Date.now()
        };
      }
      
      // Update cache with the latest user data
      try {
        userProfileCache.set(result.user.uid, {
          user: formattedUser, 
          timestamp: Date.now()
        });
      } catch (cacheError) {
        console.warn('Failed to update user cache:', cacheError);
        // Non-critical error, continue
      }
      
      console.log(`User sign-in completed successfully in ${performance.now() - startTime}ms.`);
      console.log(`User details - UID: ${formattedUser.uid}, Role: ${formattedUser.role}, Status: ${formattedUser.status}`);
      
      return formattedUser;
    } catch (error) {
      logError('Error details for sign-in failure', error);
      
      // Handle specific Firebase Auth errors
      if (error instanceof Error) {
        const errorCode = (error as any).code || '';
        const errorMessage = error.message || '';
        
        // Check for error code first (more reliable)
        if (errorCode === 'auth/invalid-credential' || errorCode === 'auth/invalid-login-credentials') {
          throw new Error('Invalid email or password. Please check your credentials and try again.');
        } else if (errorCode === 'auth/user-not-found') {
          throw new Error('No account found with this email address. Please sign up first.');
        } else if (errorCode === 'auth/wrong-password') {
          throw new Error('Incorrect password. Please try again.');
        } else if (errorCode === 'auth/too-many-requests') {
          throw new Error('Too many failed login attempts. Please try again later.');
        } else if (errorCode === 'auth/network-request-failed' || errorMessage.includes('network') || errorMessage.includes('timed out')) {
          throw new Error('Connection to authentication service timed out. Please check your internet connection and try again.');
        } else {
          // Include error code in message if available
          throw new Error(`Authentication error${errorCode ? ` (${errorCode})` : ''}. Please try again.`);
        }
      }
      
      throw error;
    }
  };

  // Sign out the current user
  const signOut = async (): Promise<void> => {
    try {
      const auth = await getFirebaseAuth();
      await firebaseSignOut(auth);
      setCurrentUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  // Get a user profile by UID with timeout and caching
  const getUserProfile = async (uid: string): Promise<User | null> => {
    return getCachedUserProfile(uid);
  };

  // Approve a pending user
  const approveUser = async (uid: string, adminUid: string): Promise<void> => {
    try {
      const db = await getFirebaseDatabase();
      const userRef = ref(db, `users/${uid}`);
      const pendingUserRef = ref(db, `pendingUsers/${uid}`);
      
      // Get user data before updating for email notification
      const userSnapshot = await get(userRef);
      const userData = userSnapshot.val() as User;
      
      // Update user status to approved
      await update(userRef, {
        status: 'approved',
        approvedBy: adminUid,
        approvedAt: Date.now()
      });
      
      // Remove from pending list
      await set(pendingUserRef, null);
      
      // Email notification removed - will be added later
      console.log(`User ${uid} approved by admin ${adminUid}`);
    } catch (error) {
      console.error('Error approving user:', error);
      throw error;
    }
  };

  // Reject a pending user
  const rejectUser = async (uid: string, adminUid: string, reason: string): Promise<void> => {
    try {
      const db = await getFirebaseDatabase();
      const userRef = ref(db, `users/${uid}`);
      const pendingUserRef = ref(db, `pendingUsers/${uid}`);
      
      // Get user data before updating for email notification
      const userSnapshot = await get(userRef);
      const userData = userSnapshot.val() as User;
      
      // Update user status to rejected
      await update(userRef, {
        status: 'rejected',
        rejectedBy: adminUid,
        rejectionReason: reason,
        rejectedAt: Date.now()
      });
      
      // Remove from pending list
      await set(pendingUserRef, null);
      
      console.log(`User ${uid} rejected by admin ${adminUid} for reason: ${reason}`);
    } catch (error) {
      console.error('Error rejecting user:', error);
      throw error;
    }
  };

  // Get all pending users
  const getPendingUsers = async (): Promise<User[]> => {
    try {
      const db = await getFirebaseDatabase();
      const pendingUsersRef = ref(db, 'pendingUsers');
      const snapshot = await get(pendingUsersRef);
      
      if (snapshot.exists()) {
        // Get full user profiles for each pending user
        const pendingUserIds = Object.keys(snapshot.val());
        const pendingUsers: User[] = [];
        
        for (const uid of pendingUserIds) {
          const userProfile = await getUserProfile(uid);
          if (userProfile) {
            pendingUsers.push(userProfile);
          }
        }
        
        return pendingUsers;
      }
      
      return [];
    } catch (error) {
      console.error('Error getting pending users:', error);
      return [];
    }
  };

  // Batch approve multiple users
  const batchApproveUsers = async (uids: string[], adminUid: string): Promise<void> => {
    try {
      if (!uids.length) return;
      
      // Get all user data first for email notifications
      const approvedUsers: User[] = [];
      const updates: Record<string, any> = {};
      const timestamp = Date.now();
      
      // Build updates and collect user data
      for (const uid of uids) {
        const db = await getFirebaseDatabase();
        const userSnapshot = await get(ref(db, `users/${uid}`));
        if (userSnapshot.exists()) {
          const userData = userSnapshot.val() as User;
          
          // Add to batch updates
          updates[`users/${uid}/status`] = 'approved';
          updates[`users/${uid}/approvedBy`] = adminUid;
          updates[`users/${uid}/approvedAt`] = timestamp;
          updates[`pendingUsers/${uid}`] = null; // Remove from pending list
          
          // Add to collection for email notifications
          userData.status = 'approved';
          userData.approvedBy = adminUid;
          userData.approvedAt = timestamp;
          approvedUsers.push(userData);
        }
      }
      
      // Apply all database updates in a single transaction
      await update(ref(await getFirebaseDatabase()), updates);
      
      // Email notifications removed - will be added later
      
      console.log(`Batch approved ${uids.length} users by admin ${adminUid}`);
    } catch (error) {
      console.error('Error batch approving users:', error);
      throw error;
    }
  };

  // Batch reject multiple users
  const batchRejectUsers = async (uids: string[], adminUid: string, reason: string): Promise<void> => {
    try {
      if (!uids.length) return;
      
      // Get all user data first for email notifications
      const rejectedUsers: User[] = [];
      const updates: Record<string, any> = {};
      const timestamp = Date.now();
      
      // Build updates and collect user data
      for (const uid of uids) {
        const db = await getFirebaseDatabase();
        const userSnapshot = await get(ref(db, `users/${uid}`));
        if (userSnapshot.exists()) {
          const userData = userSnapshot.val() as User;
          
          // Add to batch updates
          updates[`users/${uid}/status`] = 'rejected';
          updates[`users/${uid}/rejectedBy`] = adminUid;
          updates[`users/${uid}/rejectedAt`] = timestamp;
          updates[`users/${uid}/rejectionReason`] = reason;
          updates[`pendingUsers/${uid}`] = null; // Remove from pending list
          
          // Add to collection for email notifications
          userData.status = 'rejected';
          userData.rejectedBy = adminUid;
          userData.rejectedAt = timestamp;
          userData.rejectionReason = reason;
          rejectedUsers.push(userData);
        }
      }
      
      // Apply all database updates in a single transaction
      await update(ref(await getFirebaseDatabase()), updates);
      
      // Email notifications removed - will be added later
      
      console.log(`Batch rejected ${uids.length} users by admin ${adminUid}`);
    } catch (error) {
      console.error('Error batch rejecting users:', error);
      throw error;
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    let unsubscribe: () => void = () => {}; // Empty function as default
    let connectedListener: () => void = () => {};
    
    // Set a shorter timeout to prevent getting stuck in loading state
    const initializeAuth = async () => {
      try {
        // Wait for Firebase to be ready
        const isReady = await waitForFirebase();
        if (!isReady) {
          throw new Error('Firebase initialization failed');
        }

        const auth = await getFirebaseAuth();
        const db = await getFirebaseDatabase();

        // Set up auth state change listener
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          try {
            if (firebaseUser) {
              const user = await formatUser(firebaseUser);
              setCurrentUser(user);
            } else {
              setCurrentUser(null);
            }
            setInitError(null);
          } catch (error) {
            console.error('Auth state change error:', error);
            setCurrentUser(null);
            setInitError('Error processing authentication. Please try again.');
          } finally {
            setLoading(false);
          }
        });

        // Verify Firebase connection
        const connectedRef = ref(db, '.info/connected');
        const connectedListener = onValue(connectedRef, (snapshot) => {
          if (snapshot.val() === true) {
            console.log('Firebase connection verified');
          } else {
            console.warn('Firebase disconnected - auth may not work properly');
          }
        });

        // Set a timeout for auth state change
        const authTimeout = setTimeout(() => {
          console.log('Auth state detection timed out');
          if (loading) {
            setLoading(false);
            setInitError('Authentication service timed out. Please refresh the page.');
          }
        }, 5000);

        return () => {
          clearTimeout(authTimeout);
          unsubscribe();
          connectedListener();
        };
      } catch (error) {
        console.error('Error initializing auth:', error);
        setInitError('Failed to initialize authentication. Please refresh the page');
        setLoading(false);
        return () => {};
      }
    };

    initializeAuth();
  }, []);

  const value: AuthContextType = {
    currentUser,
    loading,
    initError,
    signUp,
    signIn,
    signOut,
    getUserProfile,
    approveUser,
    rejectUser,
    getPendingUsers,
    batchApproveUsers,
    batchRejectUsers
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
