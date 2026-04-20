"use client";

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { User, UserRole } from '@/types/user';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { ref, update, onValue } from 'firebase/database';
import { getFirebaseAuth, getFirebaseDatabase } from '@/lib/firebase';
import {
  isPwaMode,
  backupSession,
  getSessionBackup,
  clearSessionBackup,
  refreshSessionBackup,
} from '@/utils/pwaUtils';
import {
  getInitialUser,
  setMemoryCached,
  evictMemoryCached,
  persistUserProfile,
  getPersistedUserProfile,
  clearPersistedUserProfile,
  coerceUserRole,
} from '@/utils/userProfileCache';
import {
  approveUser as approveUserService,
  rejectUser as rejectUserService,
  getPendingUsers as getPendingUsersService,
  batchApproveUsers as batchApproveUsersService,
  batchRejectUsers as batchRejectUsersService,
} from '@/services/userAdminService';
import {
  enforceHouseholdDeviceApproval,
  NEW_DEVICE_APPROVAL_REQUIRED,
} from '@/services/householdDeviceCheck';
import { formatUser, fetchUserProfile } from '@/services/userProfileService';
import { configureAuthPersistence, isIosPwa } from '@/services/authPersistence';
import { setupPwaSessionEvents } from '@/services/pwaSessionEvents';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  initError: string | null;
  signUp: (email: string, password: string, displayName: string, role: UserRole, estateId?: string) => Promise<User>;
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

function logError(message: string, error: unknown) {
  console.error(`🔴 ${message}:`, error);
  if (error instanceof Error) {
    console.error(`  Message: ${error.message}`);
    console.error(`  Stack: ${error.stack}`);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const initialUser = getInitialUser();
  const [currentUser, setCurrentUser] = useState<User | null>(initialUser);
  const [loading, setLoading] = useState(initialUser === null);
  const [initError, setInitError] = useState<string | null>(null);

  // Live refs so long-lived event handlers always see the latest state.
  const currentUserRef = useRef<User | null>(initialUser);
  const loadingRef = useRef<boolean>(initialUser === null);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);
  useEffect(() => { loadingRef.current = loading; }, [loading]);

  /** Sign up a new user and write their profile to the database atomically. */
  const signUp = async (
    email: string,
    password: string,
    displayName: string,
    role: UserRole,
    estateId?: string,
  ): Promise<User> => {
    try {
      const auth = await getFirebaseAuth();
      const result = await createUserWithEmailAndPassword(auth, email, password);

      const db = await getFirebaseDatabase();
      const newUser: User = {
        uid: result.user.uid,
        email,
        displayName,
        role,
        status: 'pending',
        isEmailVerified: result.user.emailVerified,
        createdAt: Date.now(),
        ...(estateId && { estateId }),
      };

      const atomicUpdates: Record<string, any> = {};
      atomicUpdates[`users/${result.user.uid}`] = newUser;
      atomicUpdates[`pendingUsers/${result.user.uid}`] = true;
      await update(ref(db), atomicUpdates);

      // Non-blocking welcome email
      import('@/services/smtpEmailService')
        .then(({ sendWelcomeEmail }) =>
          sendWelcomeEmail({ userName: displayName, userEmail: email, userRole: role }),
        )
        .then((sent) =>
          console.log(sent ? `✅ Welcome email sent to ${email}` : `⚠️ Welcome email failed for ${email}`),
        )
        .catch((err) => console.error('❌ Welcome email error:', err));

      console.log('New user signed up and added to pending list:', newUser.uid, estateId ? `for estate: ${estateId}` : '');
      return newUser;
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  };

  /** Sign in an existing user, then run the Head-of-House device check. */
  const signIn = async (email: string, password: string): Promise<User> => {
    try {
      const startTime = performance.now();
      console.log(`Attempting to sign in user: ${email}`, new Date().toISOString());

      const auth = await getFirebaseAuth();
      if (!auth) throw new Error('Authentication service is not initialized');

      let result;
      try {
        result = await signInWithEmailAndPassword(auth, email, password);
      } catch (authError) {
        logError('Firebase authentication failed', authError);
        throw authError;
      }

      if (!result?.user) throw new Error('Authentication succeeded but user data is missing');

      let formattedUser: User | null = null;
      try {
        formattedUser = await fetchUserProfile(result.user.uid);
        if (!formattedUser) formattedUser = await formatUser(result.user);
      } catch (dbError) {
        logError('Error fetching user profile', dbError);
        throw new Error('Unable to verify user account details. Please try again or contact support.');
      }

      if (!formattedUser) {
        console.error('User authenticated but failed to retrieve profile from database');
        throw new Error('Unable to retrieve user profile from database. Please try again or contact support.');
      }

      setMemoryCached(formattedUser);

      // Head-of-House new-device enforcement (throws NEW_DEVICE_APPROVAL_REQUIRED if blocked)
      try {
        await enforceHouseholdDeviceApproval(formattedUser);
      } catch (deviceErr: any) {
        if (deviceErr?.message === NEW_DEVICE_APPROVAL_REQUIRED) {
          setCurrentUser(null);
          throw deviceErr;
        }
        // Other errors are non-fatal — already logged in the service
      }

      try {
        backupSession(formattedUser.uid, formattedUser.email, formattedUser.role, formattedUser.displayName);
      } catch (backupError) {
        console.warn('Failed to create session backup:', backupError);
      }

      console.log(`User sign-in completed in ${performance.now() - startTime}ms. UID: ${formattedUser.uid}, Role: ${formattedUser.role}`);

      // Non-blocking activity log
      import('@/services/activityService')
        .then(({ logActivity }) =>
          logActivity({
            type: 'login' as any,
            description: `${formattedUser!.displayName || 'User'} logged in`,
            timestamp: Date.now(),
            userId: formattedUser!.uid,
            estateId: formattedUser!.estateId || '',
            householdId: (formattedUser as any).householdId || '',
          }),
        )
        .catch((err) => console.warn('Login activity log failed (non-fatal):', err));

      return formattedUser;
    } catch (error) {
      logError('Error details for sign-in failure', error);
      if (error instanceof Error) {
        const errorCode = (error as any).code || '';
        const errorMessage = error.message || '';
        if (errorCode === 'auth/invalid-credential' || errorCode === 'auth/invalid-login-credentials') {
          throw new Error('Invalid email or password. Please check your credentials and try again.');
        }
        if (errorCode === 'auth/user-not-found') {
          throw new Error('No account found with this email address. Please sign up first.');
        }
        if (errorCode === 'auth/wrong-password') {
          throw new Error('Incorrect password. Please try again.');
        }
        if (errorCode === 'auth/too-many-requests') {
          throw new Error('Too many failed login attempts. Please try again later.');
        }
        if (errorCode === 'auth/network-request-failed' || errorMessage.includes('network') || errorMessage.includes('timed out')) {
          throw new Error('Connection to authentication service timed out. Please check your internet connection and try again.');
        }
        throw new Error('Incorrect email or password. Please check and try again.');
      }
      throw error;
    }
  };

  /** Sign out the current user and clear all session/cache state. */
  const signOut = async (): Promise<void> => {
    try {
      const auth = await getFirebaseAuth();
      await firebaseSignOut(auth);
      setCurrentUser(null);
      clearSessionBackup();

      if (typeof window !== 'undefined' && 'indexedDB' in window) {
        try {
          window.indexedDB.deleteDatabase('firebaseLocalStorageDb');
          window.indexedDB.deleteDatabase('MusaAuthStorage');
        } catch (e) {
          console.warn('Failed to clear IndexedDB:', e);
        }
      }
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const getUserProfile = (uid: string): Promise<User | null> => fetchUserProfile(uid);

  /** Force-refetch the current user's profile from the database. */
  const refreshCurrentUser = async (): Promise<void> => {
    try {
      const auth = await getFirebaseAuth();
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) return;
      evictMemoryCached(firebaseUser.uid);
      const updatedUser = await fetchUserProfile(firebaseUser.uid);
      if (updatedUser) setCurrentUser(updatedUser);
    } catch (error) {
      console.error('Error refreshing current user:', error);
    }
  };

  // ───────────────────────── auth state listener ─────────────────────────

  useEffect(() => {
    let unsubscribe: () => void;
    let authTimeout: NodeJS.Timeout;
    let authStateTimeout: NodeJS.Timeout;
    let sessionRefreshInterval: NodeJS.Timeout | undefined;
    let connectedListener = () => {};
    let pwaCleanup: () => void = () => {};

    const initializeAuth = async () => {
      try {
        console.log('🔄 Initializing Firebase auth...');

        authTimeout = setTimeout(() => {
          console.log('⚠️ Firebase auth initialization timed out');
          if (loadingRef.current) {
            setLoading(false);
            setInitError('Authentication service is taking longer than expected. Please check your connection and refresh the page.');
          }
        }, 5000);

        const auth = await getFirebaseAuth();
        console.log('✅ Auth ready, initializing database in background...');

        const dbPromise = getFirebaseDatabase();
        try {
          await Promise.race([
            dbPromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('DB timeout')), 2000)),
          ]);
          console.log('✅ Database ready');
        } catch {
          console.warn('⚠️ Database initialization slow, continuing with auth only');
          dbPromise.then(() => console.log('✅ Database eventually ready'));
        }

        clearTimeout(authTimeout);

        await configureAuthPersistence(auth);

        // PWA session refresh — keep backup fresh while the app is open.
        if (isPwaMode()) {
          sessionRefreshInterval = setInterval(() => {
            if (currentUserRef.current) refreshSessionBackup();
          }, 60000);
        }

        console.log('🔒 Setting up auth state listener...');
        let authStateResolved = false;
        let isInitialAuthState = true;

        await new Promise<void>((resolve) => {
          authStateTimeout = setTimeout(() => {
            if (authStateResolved) return;
            console.warn('Auth state change listener timed out');
            const sessionBackup = getSessionBackup();
            if (sessionBackup?.userId) {
              console.log('🔄 Attempting to recover session from backup...', sessionBackup);
              fetchUserProfile(sessionBackup.userId)
                .then(async (user) => {
                  if (user?.uid) {
                    const role = coerceUserRole(sessionBackup.role);
                    if (role && !user.role) user.role = role;
                    if (sessionBackup.email && !user.email) user.email = sessionBackup.email;
                    if (sessionBackup.displayName && !user.displayName) user.displayName = sessionBackup.displayName;
                    setCurrentUser(user);
                  }
                })
                .catch((e) => console.error('Failed to recover session:', e))
                .finally(() => {
                  setLoading(false);
                  resolve();
                });
            } else {
              setLoading(false);
              resolve();
            }
          }, 8000);

          unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            try {
              console.log('🔄 Auth state changed:', firebaseUser ? `User: ${firebaseUser.email}` : 'No user');

              if (firebaseUser) {
                isInitialAuthState = false;
                const user = await formatUser(firebaseUser);
                console.log('✅ User formatted successfully:', user.displayName);
                setCurrentUser(user);
                backupSession(user.uid, user.email, user.role, user.displayName);
                persistUserProfile(user);
                if (isPwaMode()) {
                  if (sessionRefreshInterval) clearInterval(sessionRefreshInterval);
                  sessionRefreshInterval = setInterval(() => refreshSessionBackup(), 30000);
                }
              } else {
                // First null on cold start might just be "firebase hasn't restored session yet"
                if (isInitialAuthState) {
                  isInitialAuthState = false;
                  if (initialUser) {
                    console.log('🔄 Initial auth null but we have instant-recovered user — keeping:', initialUser.displayName);
                    setCurrentUser(initialUser);
                    return;
                  }
                  const sessionBackup = getSessionBackup();
                  if (sessionBackup?.userId) {
                    const cachedUser = getPersistedUserProfile(sessionBackup.userId);
                    if (cachedUser) {
                      console.log('📦 Recovered user from persisted profile:', cachedUser.displayName);
                      setCurrentUser(cachedUser);
                      return;
                    }
                  }
                  console.log('👋 No persisted session found on cold start');
                  setCurrentUser(null);
                } else {
                  // Genuine sign-out
                  console.log('👋 User signed out');
                  setCurrentUser(null);
                  clearSessionBackup();
                  clearPersistedUserProfile();
                  if (sessionRefreshInterval) {
                    clearInterval(sessionRefreshInterval);
                    sessionRefreshInterval = undefined;
                  }
                }
              }
            } catch (error) {
              console.error('Auth state change error:', error);

              // Auto-retry once for transient errors
              if (firebaseUser) {
                console.log('🔄 Retrying authentication after transient error...');
                try {
                  await new Promise((res) => setTimeout(res, 1500));
                  const retryUser = await formatUser(firebaseUser);
                  console.log('✅ Auth retry succeeded');
                  setCurrentUser(retryUser);
                  persistUserProfile(retryUser);
                  return;
                } catch (retryError) {
                  console.error('Auth retry also failed:', retryError);
                }

                const cachedUser = getPersistedUserProfile(firebaseUser.uid);
                if (cachedUser) {
                  console.log('📦 Using persisted profile as fallback for:', cachedUser.displayName);
                  setCurrentUser(cachedUser);
                  setTimeout(async () => {
                    try {
                      const freshUser = await formatUser(firebaseUser);
                      setCurrentUser(freshUser);
                      persistUserProfile(freshUser);
                    } catch {
                      /* keep cached data */
                    }
                  }, 5000);
                  return;
                }
              }

              setCurrentUser(null);
              if (isIosPwa()) {
                setTimeout(() => {
                  if (!currentUserRef.current && loadingRef.current) {
                    setInitError('Authentication initialization failed. Please close and reopen the app.');
                  }
                }, 2000);
              } else {
                setInitError('Error processing authentication. Please refresh the page and try again.');
              }
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

        // Database connection monitor
        console.log('🔌 Setting up database connection listener...');
        const database = await getFirebaseDatabase();
        const connectedRef = ref(database, '.info/connected');
        connectedListener = onValue(connectedRef, (snapshot) => {
          const isConnected = snapshot.val() === true;
          console.log(isConnected ? '✅ Database connected' : '❌ Database disconnected');
        });

        // PWA session recovery — no-op when not running as a PWA.
        pwaCleanup = setupPwaSessionEvents({
          getCurrentUser: () => currentUserRef.current,
          getLoading: () => loadingRef.current,
          setCurrentUser,
          setLoading,
          setInitError,
          getUserProfile: fetchUserProfile,
        });
      } catch (error) {
        console.error('Error initializing auth:', error);
        setInitError('Failed to initialize authentication. Please refresh the page');
        setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      clearTimeout(authTimeout);
      clearTimeout(authStateTimeout);
      if (sessionRefreshInterval) clearInterval(sessionRefreshInterval);
      if (unsubscribe) unsubscribe();
      if (connectedListener) connectedListener();
      if (pwaCleanup) pwaCleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: AuthContextType = {
    currentUser,
    loading,
    initError,
    signUp,
    signIn,
    signOut,
    getUserProfile,
    refreshCurrentUser,
    approveUser: approveUserService,
    rejectUser: rejectUserService,
    getPendingUsers: getPendingUsersService,
    batchApproveUsers: batchApproveUsersService,
    batchRejectUsers: batchRejectUsersService,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
