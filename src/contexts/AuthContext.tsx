"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole, UserStatus } from '@/types/user';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  inMemoryPersistence,
  indexedDBLocalPersistence,
  User as FirebaseUser
} from 'firebase/auth';
import { ref, get, set, update, onValue } from 'firebase/database';
import { getFirebaseAuth, getFirebaseDatabase, waitForFirebase } from '@/lib/firebase';
import { 
  isPwaMode, 
  backupSession, 
  getSessionBackup, 
  clearSessionBackup,
  refreshSessionBackup,
  registerPwaLifecycleEvents,
  optimizePwaPageReload
} from '@/utils/pwaUtils';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  initError: string | null;
  signUp: (email: string, password: string, displayName: string, role: UserRole) => Promise<User>;
  signIn: (email: string, password: string) => Promise<User>;
  signOut: () => Promise<void>;
  getUserProfile: (uid: string) => Promise<User | null>;
  refreshCurrentUser: () => Promise<void>;
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
        
        // On database errors, we cannot safely assume a role
        // This should rarely happen, but if it does, we need to handle it gracefully
        console.error('Database error during authentication - cannot determine user role safely');
        throw new Error('Unable to verify user account details. Please try again or contact support.');
        
        // Note: Removed the fallback to 'resident' role as it was causing guards to be misrouted
      }
      
      if (!formattedUser) {
        console.error('User authenticated but failed to retrieve profile from database');
        
        // Cannot safely determine user role - this is a critical error
        throw new Error('Unable to retrieve user profile from database. Please try again or contact support.');
        
        // Note: Removed the fallback to 'resident' role as it was causing guards to be misrouted
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
      
      // Create backup of the authentication session for PWA resilience
      try {
        backupSession(formattedUser.uid);
        console.log('Created session backup for PWA persistence');
      } catch (backupError) {
        console.warn('Failed to create session backup:', backupError);
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
      
      // Clear all session backup data from all storage locations
      clearSessionBackup();
      
      // Clear any IndexedDB data related to auth
      if (typeof window !== 'undefined' && 'indexedDB' in window) {
        try {
          // Clear Firebase IndexedDB data
          const deleteRequest = window.indexedDB.deleteDatabase('firebaseLocalStorageDb');
          deleteRequest.onerror = () => console.error('Error deleting Firebase IndexedDB');
          deleteRequest.onsuccess = () => console.log('Cleared Firebase IndexedDB');
          
          // Clear our custom IndexedDB data
          const deleteMusaRequest = window.indexedDB.deleteDatabase('MusaAuthStorage');
          deleteMusaRequest.onsuccess = () => console.log('Cleared Musa auth storage IndexedDB');
        } catch (e) {
          console.warn('Failed to clear IndexedDB:', e);
        }
      }
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  // Get a user profile by UID with timeout and caching
  const getUserProfile = async (uid: string): Promise<User | null> => {
    return getCachedUserProfile(uid);
  };

  // Refresh current user's profile from database
  const refreshCurrentUser = async (): Promise<void> => {
    try {
      const auth = await getFirebaseAuth();
      const firebaseUser = auth.currentUser;
      
      if (firebaseUser) {
        // Clear cache for this user to force fresh fetch
        userProfileCache.delete(firebaseUser.uid);
        
        // Fetch fresh user profile from database
        const updatedUser = await getCachedUserProfile(firebaseUser.uid);
        if (updatedUser) {
          setCurrentUser(updatedUser);
        }
      }
    } catch (error) {
      console.error('Error refreshing current user:', error);
    }
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
    let authTimeout: NodeJS.Timeout;
    let authStateTimeout: NodeJS.Timeout;
    let sessionRefreshInterval: NodeJS.Timeout;
    
    // Set a shorter timeout to prevent getting stuck in loading state
    const initializeAuth = async () => {
      try {
        console.log('🔄 Initializing Firebase auth...');
        
        // Set a timeout for the entire initialization process
        authTimeout = setTimeout(() => {
          console.log('⚠️ Firebase auth initialization timed out');
          if (loading) {
            setLoading(false);
            setInitError('Authentication service is taking longer than expected. Please check your connection and refresh the page.');
          }
        }, 5000); // Reduced to 5 seconds for faster feedback

        // Optimized Firebase initialization - start auth immediately
        console.log('⚡ Starting optimized Firebase initialization...');
        
        // Get auth instance first (fastest)
        const auth = await getFirebaseAuth();
        console.log('✅ Auth ready, initializing database in background...');
        
        // Initialize database in parallel without blocking
        const dbPromise = getFirebaseDatabase();
        
        // Don't wait for database if it's slow
        let db;
        try {
          db = await Promise.race([
            dbPromise,
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('DB timeout')), 2000)
            )
          ]);
          console.log('✅ Database ready');
        } catch (e) {
          console.warn('⚠️ Database initialization slow, continuing with auth only');
          // Continue without database for now, it will be available later
          dbPromise.then(() => console.log('✅ Database eventually ready'));
        }

        // Clear the timeout since we've successfully connected
        clearTimeout(authTimeout);
        
        // Set persistence based on environment
        try {
          const isPwa = isPwaMode();
          console.log(`🔒 Setting up auth persistence for ${isPwa ? 'PWA' : 'browser'} mode`);

          // For iOS PWA, we use multiple persistence methods for maximum compatibility
          if (isPwa) {
            // First try IndexedDB (works on most Android and newer iOS)
            try {
              await setPersistence(auth, indexedDBLocalPersistence);
              console.log('✅ Using IndexedDB persistence (most reliable for PWAs)');
            } catch (e) {
              console.warn('⚠️ IndexedDB persistence failed, falling back to localStorage:', e);
              
              // Fall back to localStorage (works on most browsers)
              try {
                await setPersistence(auth, browserLocalPersistence);
                console.log('✅ Using localStorage persistence');
              } catch (e2) {
                console.warn('⚠️ localStorage persistence failed, falling back to in-memory:', e2);
                
                // Last resort: in-memory (session only, but at least it works)
                await setPersistence(auth, inMemoryPersistence);
                console.log('⚠️ Using in-memory persistence (session only)');
              }
            }
            
            // Register PWA-specific lifecycle events for better session handling
            registerPwaLifecycleEvents();
            optimizePwaPageReload();
            
            // Periodically refresh the session backup to keep it alive
            sessionRefreshInterval = setInterval(() => {
              if (currentUser) {
                refreshSessionBackup();
              }
            }, 60000); // Every minute
          } else {
            // For regular browser mode, localStorage is sufficient
            await setPersistence(auth, browserLocalPersistence);
            console.log('✅ Using standard localStorage persistence');
          }
        } catch (e) {
          console.warn('⚠️ Failed to set auth persistence:', e);
        }
        
        console.log('🔒 Setting up auth state listener...');
        let authStateResolved = false;
        
        // Set up auth state change listener with its own timeout
        await new Promise<void>((resolve) => {
          authStateTimeout = setTimeout(() => {
            if (!authStateResolved) {
              console.warn('Auth state change listener timed out');
              
              // Try to recover session from backup
              const sessionBackup = getSessionBackup();
              if (sessionBackup?.userId) {
                console.log('🔄 Attempting to recover session from backup...');
                
                // Try to get user data from database directly
                getUserProfile(sessionBackup.userId)
                  .then(user => {
                    if (user && user.uid) {
                      console.log('✅ Session recovered from backup for:', user?.uid);
                      setCurrentUser(user);
                    } else {
                      console.warn('Session recovery found invalid user data');
                    }
                  })
                  .catch(e => console.error('Failed to recover session:', e))
                  .finally(() => {
                    setLoading(false);
                    resolve();
                  });
              } else {
                setLoading(false);
                resolve();
              }
            }
          }, 8000); // 8 seconds for auth state

          unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            try {
              console.log('👤 Auth state changed:', firebaseUser ? 'User signed in' : 'No user');
              if (firebaseUser) {
                const user = await formatUser(firebaseUser);
                setCurrentUser(user);
                
                // Create a backup of the session for PWA resilience
                backupSession(user.uid);
              } else {
                setCurrentUser(null);
                clearSessionBackup();
              }
              setInitError(null);
            } catch (error) {
              console.error('Auth state change error:', error);
              setCurrentUser(null);
              setInitError('Error processing authentication. Please try again.');
            } finally {
              if (!authStateResolved) {
                authStateResolved = true;
                clearTimeout(authStateTimeout);
                resolve();
              }
              setLoading(false);
            }
          });
        });

        // Set up database connection listener
        console.log('🔌 Setting up database connection listener...');
        const connectedRef = ref(db, '.info/connected');
        connectedListener = onValue(connectedRef, (snapshot) => {
          const isConnected = snapshot.val() === true;
          console.log(isConnected ? '✅ Database connected' : '❌ Database disconnected');
        });
      } catch (error) {
        console.error('Error initializing auth:', error);
        setInitError('Failed to initialize authentication. Please refresh the page');
        setLoading(false);
      }
    };

    initializeAuth();

    // Cleanup function
    return () => {
      clearTimeout(authTimeout);
      clearTimeout(authStateTimeout);
      clearInterval(sessionRefreshInterval);
      unsubscribe();
      connectedListener();
    };
  }, []);

  const value = {
    currentUser,
    loading,
    initError,
    signUp,
    signIn,
    signOut,
    getUserProfile,
    refreshCurrentUser,
    approveUser,
    rejectUser,
    getPendingUsers,
    batchApproveUsers,
    batchRejectUsers,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
